-- Migration: cobranza-alertas (PR1 — backend)
-- 1. Dedup guard for crm.alerta_cobranza: unique (cuota_id, tipo_alerta) so the
--    daily cron can upsert with ignoreDuplicates instead of pre-checking.
-- 2. gestionada / gestionada_at columns: let the alerts list separate
--    pending from resolved without an EXISTS subquery on every render.
-- 3. New table crm.gestion_cobranza: dedicated collections follow-up record
--    (NOT reused cliente_interaccion — see design.md D1 for the rationale:
--    that table's CHECK constraints and sales-timeline UI are wrong for
--    collections outcomes, and it has no cuota/alerta linkage).
-- 4. RLS on gestion_cobranza mirrors the established p1_puede_ver_cliente
--    ownership pattern (20260629000000_secure_authz_p1.sql). The INSERT
--    policy's cuota->cliente check uses a new SECURITY DEFINER helper,
--    p1_cuota_pertenece_a_cliente(), instead of an inline subquery, to
--    avoid a coordinador RLS gap on crm.venta (see function comment).
-- Idempotent: IF NOT EXISTS / DROP IF EXISTS before every CREATE.

-- ============================================================
-- 1. Dedup index on crm.alerta_cobranza
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_alerta_cobranza_cuota_tipo
  ON crm.alerta_cobranza(cuota_id, tipo_alerta);

-- ============================================================
-- 2. gestionada / gestionada_at columns
-- ============================================================

ALTER TABLE crm.alerta_cobranza
  ADD COLUMN IF NOT EXISTS gestionada BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS gestionada_at TIMESTAMPTZ;

-- ============================================================
-- 3. TABLE: crm.gestion_cobranza
-- ============================================================

CREATE TABLE IF NOT EXISTS crm.gestion_cobranza (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alerta_id UUID NULL REFERENCES crm.alerta_cobranza(id) ON DELETE SET NULL,
  cuota_id UUID NOT NULL REFERENCES crm.cuota(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES crm.cliente(id) ON DELETE CASCADE,
  vendedor_username VARCHAR(50) NOT NULL,
  medio VARCHAR(20) NOT NULL
    CHECK (medio IN ('llamada', 'whatsapp', 'email', 'visita', 'mensaje')),
  resultado VARCHAR(30) NOT NULL
    CHECK (resultado IN
      ('contactado', 'no_contactado', 'promesa_pago', 'pago_parcial', 'renegociacion', 'ilocalizable')),
  notas TEXT,
  fecha_gestion TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gestion_cobranza_alerta ON crm.gestion_cobranza(alerta_id);
CREATE INDEX IF NOT EXISTS idx_gestion_cobranza_cuota ON crm.gestion_cobranza(cuota_id);
CREATE INDEX IF NOT EXISTS idx_gestion_cobranza_cliente ON crm.gestion_cobranza(cliente_id);

DROP TRIGGER IF EXISTS update_gestion_cobranza_updated_at ON crm.gestion_cobranza;
CREATE TRIGGER update_gestion_cobranza_updated_at
  BEFORE UPDATE ON crm.gestion_cobranza
  FOR EACH ROW
  EXECUTE FUNCTION crm.set_updated_at();

-- ============================================================
-- 4. RLS on crm.gestion_cobranza
-- ============================================================

ALTER TABLE crm.gestion_cobranza ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gestion_cobranza_select" ON crm.gestion_cobranza;
CREATE POLICY "gestion_cobranza_select" ON crm.gestion_cobranza
  FOR SELECT TO authenticated
  USING (crm.p1_puede_ver_cliente(cliente_id));

-- Helper: crm.p1_cuota_pertenece_a_cliente(uuid, uuid)
-- Checks cuota_id -> venta_id -> venta.cliente_id = cliente_id, bypassing the
-- caller's RLS on crm.venta via SECURITY DEFINER. Needed because an inline
-- scalar subquery in a WITH CHECK clause runs under the CALLER's RLS: the
-- `venta_select_policy` (20260224100000) only opens crm.venta to
-- es_admin_o_gerente() or personal ownership — NOT to a coordinador
-- (es_visibilidad_global) without personal ownership of that particular
-- venta. For such a coordinador the inline subquery would silently return
-- NULL (no visible venta row), making `cliente_id = NULL` false and
-- rejecting a legitimate insert, even though spec (D2 / gestion_cobranza
-- requirements) requires coordinador to be able to log gestión records.
-- SECURITY DEFINER + STABLE lets this check run against the full table
-- regardless of the caller's venta visibility. NULL-safe: returns false
-- (never NULL) when the cuota is not found.
CREATE OR REPLACE FUNCTION crm.p1_cuota_pertenece_a_cliente(p_cuota_id uuid, p_cliente_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, crm
AS $$
  SELECT COALESCE(
    (
      SELECT v.cliente_id = p_cliente_id
      FROM crm.cuota q
      JOIN crm.venta v ON v.id = q.venta_id
      WHERE q.id = p_cuota_id
    ),
    FALSE
  );
$$;

GRANT EXECUTE ON FUNCTION crm.p1_cuota_pertenece_a_cliente(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION crm.p1_cuota_pertenece_a_cliente(uuid, uuid) TO service_role;

-- Hardened WITH CHECK: ownership (p1_puede_ver_cliente) is not enough on its
-- own — it would let any user with access to a cliente attribute a gestión
-- to another operator (created_by spoofing) or to a cuota belonging to a
-- different cliente_id (cross-cliente linkage). Both are closed here:
--   (a) created_by must be the caller (mirrors crm.documento's INSERT policy,
--       20251016000000_documentos_google_drive.sql:198-201).
--   (b) the supplied cuota_id must actually belong to the supplied
--       cliente_id via cuota -> venta -> venta.cliente_id, checked through
--       p1_cuota_pertenece_a_cliente() (SECURITY DEFINER) rather than an
--       inline subquery, so a coordinador without personal venta ownership
--       is not incorrectly rejected (see function comment above).
DROP POLICY IF EXISTS "gestion_cobranza_insert" ON crm.gestion_cobranza;
CREATE POLICY "gestion_cobranza_insert" ON crm.gestion_cobranza
  FOR INSERT TO authenticated
  WITH CHECK (
    crm.p1_puede_ver_cliente(cliente_id)
    AND created_by = auth.uid()
    AND crm.p1_cuota_pertenece_a_cliente(cuota_id, cliente_id)
  );

DROP POLICY IF EXISTS "gestion_cobranza_service_role" ON crm.gestion_cobranza;
CREATE POLICY "gestion_cobranza_service_role" ON crm.gestion_cobranza
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Table grants: RLS policies alone do not grant table-level privileges —
-- PostgREST/postgres also need the base GRANT (pattern established in
-- 20260514000006_reporte_alertas.sql:112-113).
GRANT SELECT, INSERT ON crm.gestion_cobranza TO authenticated;
GRANT SELECT, INSERT, UPDATE ON crm.gestion_cobranza TO service_role;

COMMENT ON TABLE crm.gestion_cobranza IS
  'Collections follow-up record (fecha/medio/resultado/notas), optionally linked to the alerta_cobranza that triggered it. Dedicated table — see design.md D1 for why cliente_interaccion was rejected.';
COMMENT ON INDEX crm.idx_alerta_cobranza_cuota_tipo IS
  'Enforces one alerta_cobranza row per (cuota, tier) for the cuota''s lifetime — the anti-spam dedup guard for the daily cron upsert.';
