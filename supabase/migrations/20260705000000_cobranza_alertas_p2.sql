-- Migration: cobranza-alertas (PR2 — UI + gestión) authorization follow-ups
-- Judgment-day review on PR1 (20260704000000_cobranza_alertas.sql) flagged 3
-- gaps in the gestión-recording flow this PR2 introduces:
--   1. gestion_cobranza_insert WITH CHECK did not verify that a supplied
--      alerta_id (when present) actually belongs to the same cuota_id being
--      inserted — a caller could attach an unrelated alert's id to a gestión
--      record for a cuota they own.
--   2. gestion_cobranza_insert WITH CHECK did not bind vendedor_username to
--      the caller — a caller with visibility on a cliente could attribute a
--      gestión to a different vendedor's username.
--   3. crm.alerta_cobranza had no authenticated UPDATE policy at all — the
--      "mark gestionada" step of registrarGestionCobranza() would fail RLS
--      for every non-service-role caller (only the pre-existing service_role
--      ALL policy allowed writes).
--
-- Judgment-day round 1 review of THIS migration (still unapplied) found two
-- more gaps in the same fix set, closed below (this file has never been
-- applied to any database yet, so points 3-4 are merged directly below
-- instead of layering a DROP/CREATE POLICY on top of itself):
--   4. (CRITICAL) crm.alerta_cobranza had ZERO GRANTs to `authenticated` in
--      the whole migration history — RLS policies restrict which rows are
--      visible, but PostgREST/Postgres also require the base table-level
--      GRANT before any row is reachable at all (same convention already
--      documented for crm.gestion_cobranza at
--      20260704000000_cobranza_alertas.sql:139-140). Also, a first draft of
--      the UPDATE policy (point 3) used an inline
--      `EXISTS (... JOIN crm.venta ...)` that runs under the CALLER's own
--      RLS on crm.venta — the exact coordinador-visibility bug class already
--      fixed for the INSERT policy via p1_cuota_pertenece_a_cliente (point 2
--      above / its function comment). Both closed here: an explicit GRANT,
--      plus a new SECURITY DEFINER helper (p1_puede_ver_cuota) the UPDATE
--      policy uses instead of an inline subquery.
--   5. (CRITICAL) registrarGestionCobranza()'s INSERT-then-UPDATE from the
--      client was not atomic: if the UPDATE's RLS check silently matched
--      zero rows (e.g. a stale/foreign alerta_id), the gestión row was
--      already committed with no visible error — an orphan gestión whose
--      alert never flips to gestionada. Closed with a single SECURITY
--      INVOKER RPC, crm.registrar_gestion_cobranza(), that performs both
--      writes in one transaction and RAISEs (aborting it) when the UPDATE
--      affects zero rows. A partial unique index on
--      gestion_cobranza(alerta_id) additionally rejects a duplicate gestión
--      for the same alert (e.g. a client retry after a network blip).
--
-- Judgment-day round 2 review of THIS migration (still unapplied) found the
-- same bug class was left standing in two PRODUCTION policies this file
-- never touched: `alerta_cobranza_select`
-- (20260703000000_secure_authz_p2.sql) and `cuota_select`
-- (20260629000000_secure_authz_p1.sql) both filter rows with an inline
-- `EXISTS (SELECT 1 ... JOIN crm.venta v ...)` subquery, which runs under
-- the CALLER's own RLS on crm.venta. `venta_select_policy`
-- (20260224100000_fix_clientes_fase1_estabilizacion.sql) only opens
-- crm.venta to es_admin_o_gerente() or personal ownership — NOT to a
-- coordinador via es_visibilidad_global() without personal ownership of
-- that particular venta — so ROL_COORDINADOR_VENTAS silently loses SELECT
-- visibility on alerta_cobranza/cuota rows it should be able to see. Same
-- root cause, same fix shape as points 2 and 4 above: point 6 below
-- re-points both policies at SECURITY DEFINER helpers so the venta/cuota
-- lookup bypasses caller RLS. The semantic scope of each policy (owner via
-- p1_puede_ver_cliente, OR global visibility through that same function) is
-- unchanged — only WHERE the lookup runs changes.
--   6. (CRITICAL) Re-scoped `cuota_select` and `alerta_cobranza_select` to
--      use SECURITY DEFINER helpers (crm.p1_puede_ver_venta — new — and the
--      pre-existing crm.p1_puede_ver_cuota from point 4) instead of an
--      inline EXISTS/JOIN on crm.venta.
-- Idempotent: DROP IF EXISTS before every CREATE, CREATE OR REPLACE for
-- functions.

-- ============================================================
-- 1. Helper: crm.p1_alerta_pertenece_a_cuota(uuid, uuid)
-- SECURITY DEFINER so the linkage check runs independent of the caller's own
-- RLS visibility into crm.alerta_cobranza — mirrors
-- crm.p1_cuota_pertenece_a_cliente (20260704000000_cobranza_alertas.sql):
-- resolving the check through a plain function call avoids the ambiguous/
-- correlated column references an inline EXISTS subquery would otherwise
-- require inside a WITH CHECK clause. NULL-safe: returns false (never NULL)
-- when the alert is not found.
-- ============================================================

CREATE OR REPLACE FUNCTION crm.p1_alerta_pertenece_a_cuota(p_alerta_id uuid, p_cuota_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, crm
AS $$
  SELECT COALESCE(
    (
      SELECT a.cuota_id = p_cuota_id
      FROM crm.alerta_cobranza a
      WHERE a.id = p_alerta_id
    ),
    FALSE
  );
$$;

GRANT EXECUTE ON FUNCTION crm.p1_alerta_pertenece_a_cuota(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION crm.p1_alerta_pertenece_a_cuota(uuid, uuid) TO service_role;

-- ============================================================
-- 2. Harden gestion_cobranza_insert: alerta<->cuota consistency (FIX 1) +
--    vendedor_username bound to the caller (FIX 2).
-- ============================================================

DROP POLICY IF EXISTS "gestion_cobranza_insert" ON crm.gestion_cobranza;
CREATE POLICY "gestion_cobranza_insert" ON crm.gestion_cobranza
  FOR INSERT TO authenticated
  WITH CHECK (
    crm.p1_puede_ver_cliente(cliente_id)
    AND created_by = auth.uid()
    AND crm.p1_cuota_pertenece_a_cliente(cuota_id, cliente_id)
    AND vendedor_username = crm.get_current_username()
    AND (alerta_id IS NULL OR crm.p1_alerta_pertenece_a_cuota(alerta_id, cuota_id))
  );

-- ============================================================
-- 3. GRANT + authenticated UPDATE on crm.alerta_cobranza (FIX 3 + FIX 4) —
--    required for the "Registrar gestión" flow (registrarGestionCobranza /
--    crm.registrar_gestion_cobranza below set gestionada = true,
--    gestionada_at = now()).
--
-- Table grant: RLS policies alone do not grant table-level privileges —
-- PostgREST/postgres also need the base GRANT (same convention as
-- crm.gestion_cobranza, 20260704000000_cobranza_alertas.sql:136-140).
-- crm.alerta_cobranza had never received one for `authenticated` in the
-- whole migration history.
--
-- Helper: crm.p1_puede_ver_cuota(uuid) resolves cuota_id -> venta.cliente_id
-- and re-checks visibility via the established p1_puede_ver_cliente()
-- ownership chain, bypassing the caller's own RLS on crm.venta via
-- SECURITY DEFINER — mirrors p1_cuota_pertenece_a_cliente
-- (20260704000000_cobranza_alertas.sql) for the identical reason: an inline
-- EXISTS/JOIN against crm.venta inside a USING or WITH CHECK clause runs
-- under the CALLER's RLS, where venta_select_policy excludes a coordinador
-- without personal ownership of that particular venta. NULL-safe: returns
-- false (never NULL) when the cuota is not found.
--
-- Accepted gap (slice 1): the UPDATE policy below does not column-restrict
-- to (gestionada, gestionada_at) — a caller with visibility on the row
-- could, in theory, PATCH other columns of it directly via PostgREST instead
-- of going through the registrar_gestion_cobranza() RPC (section 4 below).
-- No UI path does this today and the blast radius is bounded to rows the
-- caller can already see; revisit (e.g. a column-level GRANT or a
-- BEFORE UPDATE trigger) if a wider authenticated PostgREST surface is
-- exposed for this table.
-- ============================================================

GRANT SELECT, UPDATE ON crm.alerta_cobranza TO authenticated;

CREATE OR REPLACE FUNCTION crm.p1_puede_ver_cuota(p_cuota_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, crm
AS $$
  SELECT COALESCE(
    (
      SELECT crm.p1_puede_ver_cliente(v.cliente_id)
      FROM crm.cuota q
      JOIN crm.venta v ON v.id = q.venta_id
      WHERE q.id = p_cuota_id
    ),
    FALSE
  );
$$;

GRANT EXECUTE ON FUNCTION crm.p1_puede_ver_cuota(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION crm.p1_puede_ver_cuota(uuid) TO service_role;

DROP POLICY IF EXISTS "alerta_cobranza_update_gestion" ON crm.alerta_cobranza;
CREATE POLICY "alerta_cobranza_update_gestion" ON crm.alerta_cobranza
  FOR UPDATE TO authenticated
  USING (crm.p1_puede_ver_cuota(cuota_id))
  WITH CHECK (crm.p1_puede_ver_cuota(cuota_id));

-- ============================================================
-- 4. Atomic gestión registration RPC (FIX 5)
-- ============================================================

-- One gestión marks an alert gestionada — this partial unique index rejects
-- a duplicate gestión being recorded against the same alerta_id (e.g. a
-- client retry after a network blip), at the DB level rather than relying on
-- application code to dedupe.
CREATE UNIQUE INDEX IF NOT EXISTS idx_gestion_cobranza_alerta_unique
  ON crm.gestion_cobranza(alerta_id)
  WHERE alerta_id IS NOT NULL;

-- crm.registrar_gestion_cobranza: inserts the gestión row and, when linked
-- to an alert, flips it gestionada in the SAME transaction.
-- SECURITY INVOKER — deliberately NOT DEFINER: authorization stays entirely
-- in the existing RLS policies (gestion_cobranza_insert,
-- alerta_cobranza_update_gestion); this function re-implements none of it.
-- A zero-row UPDATE (alert not visible to the caller / already gone) RAISEs
-- instead of returning silently, aborting the whole transaction so no
-- orphan gestión row is ever committed.
CREATE OR REPLACE FUNCTION crm.registrar_gestion_cobranza(
  p_alerta_id uuid,
  p_cuota_id uuid,
  p_cliente_id uuid,
  p_medio text,
  p_resultado text,
  p_notas text,
  p_fecha_gestion timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, crm
AS $$
DECLARE
  v_id uuid;
  v_rows integer;
BEGIN
  INSERT INTO crm.gestion_cobranza (
    alerta_id, cuota_id, cliente_id, vendedor_username,
    medio, resultado, notas, fecha_gestion, created_by
  ) VALUES (
    p_alerta_id, p_cuota_id, p_cliente_id, crm.get_current_username(),
    p_medio, p_resultado, p_notas, p_fecha_gestion, auth.uid()
  )
  RETURNING id INTO v_id;

  IF p_alerta_id IS NOT NULL THEN
    UPDATE crm.alerta_cobranza
    SET gestionada = true, gestionada_at = now()
    WHERE id = p_alerta_id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
      RAISE EXCEPTION 'alerta no visible o inexistente' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION crm.registrar_gestion_cobranza(uuid, uuid, uuid, text, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION crm.registrar_gestion_cobranza(uuid, uuid, uuid, text, text, text, timestamptz) TO service_role;

COMMENT ON FUNCTION crm.p1_alerta_pertenece_a_cuota(uuid, uuid) IS
  'Checks alerta_cobranza.id -> cuota_id linkage, bypassing caller RLS via SECURITY DEFINER. Used by gestion_cobranza_insert WITH CHECK to reject an alerta_id that does not belong to the gestión''s cuota_id.';
COMMENT ON FUNCTION crm.p1_puede_ver_cuota(uuid) IS
  'Resolves cuota_id -> venta.cliente_id and re-checks crm.p1_puede_ver_cliente, bypassing caller RLS via SECURITY DEFINER. Used by alerta_cobranza_update_gestion instead of an inline EXISTS/JOIN on crm.venta.';
COMMENT ON POLICY "alerta_cobranza_update_gestion" ON crm.alerta_cobranza IS
  'Lets an authenticated owner (or a role with global visibility) mark an alert gestionada from the UI, via crm.p1_puede_ver_cuota(). Does not column-restrict — accepted gap, see inline comment above the policy definition.';
COMMENT ON FUNCTION crm.registrar_gestion_cobranza(uuid, uuid, uuid, text, text, text, timestamptz) IS
  'Atomically inserts a gestion_cobranza row and marks the linked alerta_cobranza gestionada in one transaction; RAISEs (42501) instead of silently no-op''ing when the alert UPDATE matches zero rows under RLS.';
COMMENT ON INDEX crm.idx_gestion_cobranza_alerta_unique IS
  'One gestión marks an alert gestionada — prevents a duplicate gestión (e.g. a client retry) from being recorded against the same alerta_id.';

-- ============================================================
-- 5. Re-scope coordinador-broken SELECT policies (FIX 6, round 2)
--
-- `cuota_select` (20260629000000_secure_authz_p1.sql) and
-- `alerta_cobranza_select` (20260703000000_secure_authz_p2.sql) both filter
-- rows with an inline `EXISTS (SELECT 1 FROM crm.venta v ...)` /
-- `EXISTS (SELECT 1 ... JOIN crm.venta v ...)` subquery. A subquery inside a
-- USING clause runs under the CALLER's own RLS on crm.venta, and
-- `venta_select_policy` (20260224100000_fix_clientes_fase1_estabilizacion.sql)
-- only opens crm.venta to es_admin_o_gerente() or personal ownership — NOT
-- to a coordinador via es_visibilidad_global() without personal ownership of
-- that particular venta. For such a coordinador the inline subquery finds no
-- visible venta row and the policy silently excludes an alerta_cobranza/
-- cuota row it should be able to see — the exact same bug class already
-- fixed above (section 3) for alerta_cobranza_update_gestion via
-- p1_puede_ver_cuota(), and originally for gestion_cobranza_insert via
-- p1_cuota_pertenece_a_cliente() (20260704000000_cobranza_alertas.sql).
--
-- Fixed by re-pointing both policies at SECURITY DEFINER helpers so the
-- venta/cuota lookup bypasses caller RLS entirely: alerta_cobranza_select
-- reuses the existing p1_puede_ver_cuota(cuota_id); cuota_select gets a new
-- p1_puede_ver_venta(venta_id) since crm.cuota already carries venta_id
-- directly (no cuota_id indirection needed for its own row). The semantic
-- scope of each policy — owner via p1_puede_ver_cliente, OR global
-- visibility through that same function — is unchanged; only WHERE the
-- venta lookup runs changes.
-- ============================================================

CREATE OR REPLACE FUNCTION crm.p1_puede_ver_venta(p_venta_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, crm
AS $$
  SELECT COALESCE(
    (
      SELECT crm.p1_puede_ver_cliente(v.cliente_id)
      FROM crm.venta v
      WHERE v.id = p_venta_id
    ),
    FALSE
  );
$$;

GRANT EXECUTE ON FUNCTION crm.p1_puede_ver_venta(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION crm.p1_puede_ver_venta(uuid) TO service_role;

DROP POLICY IF EXISTS "cuota_select" ON crm.cuota;
CREATE POLICY "cuota_select" ON crm.cuota
  FOR SELECT TO authenticated
  USING (crm.p1_puede_ver_venta(venta_id));

DROP POLICY IF EXISTS "alerta_cobranza_select" ON crm.alerta_cobranza;
CREATE POLICY "alerta_cobranza_select" ON crm.alerta_cobranza
  FOR SELECT TO authenticated
  USING (crm.p1_puede_ver_cuota(cuota_id));

COMMENT ON FUNCTION crm.p1_puede_ver_venta(uuid) IS
  'Resolves venta_id -> venta.cliente_id and re-checks crm.p1_puede_ver_cliente, bypassing caller RLS via SECURITY DEFINER. Used by cuota_select instead of an inline EXISTS on crm.venta.';
COMMENT ON POLICY "cuota_select" ON crm.cuota IS
  'Re-scoped (round 2) from an inline EXISTS on crm.venta to crm.p1_puede_ver_venta() so a coordinador without personal venta ownership is not silently excluded — see section 5 comment above. Same owner-or-global scope as before.';
COMMENT ON POLICY "alerta_cobranza_select" ON crm.alerta_cobranza IS
  'Re-scoped (round 2) from an inline EXISTS/JOIN on crm.cuota+crm.venta to crm.p1_puede_ver_cuota() so a coordinador without personal venta ownership is not silently excluded — see section 5 comment above. Same owner-or-global scope as before.';
