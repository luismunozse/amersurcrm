-- supabase/migrations/20260720000002_coordinador_teams_rls_followup.sql
-- Coordinador Teams follow-up: restore team-scoped (not zero) access on the
-- five policies that OR crm.es_visibilidad_global() directly instead of going
-- through crm.p1_puede_ver_cliente()/crm.usuario_puede_ver_cliente() — those
-- two already picked up the coordinador-team branch from
-- 20260720000001_coordinador_teams_rls.sql automatically; these five did not:
--   1. proceso_update (crm.proceso_adquisicion, UPDATE)
--   2. proceso_etapa_update (crm.proceso_etapa, UPDATE)
--   3. meta_vendedor_select (crm.meta_vendedor, SELECT)
--   4. comision_select (crm.comision, SELECT)
--   5. venta_select_policy (crm.venta, SELECT) — added in review of Task 2:
--      this policy (20260706000000_venta_select_visibilidad_global.sql) also
--      ORs es_visibilidad_global() directly and was missed by the original
--      plan. Fixed additively below: every existing OR-branch is left
--      byte-identical, with two new team-scope OR-branches appended (venta's
--      own vendedor_username, and the linked cliente's vendedor_username/
--      vendedor_asignado), mirroring how meta_vendedor_select/comision_select
--      extend their own-field check with an equipo_usernames() branch. This
--      is a pure OR-superset, so it cannot regress admin/gerente (still
--      gated by crm.es_admin_o_gerente() / crm.es_visibilidad_global(), both
--      TRUE only for ROL_ADMIN/ROL_GERENTE) or vendedor (equipo_usernames()
--      for a non-coordinador uid returns only that uid's own username, a
--      no-op given the pre-existing own-username/own-uid branches).

-- ============================================================
-- 1. proceso_adquisicion UPDATE: coordinador can still update a team
-- member's proceso (not just their own), via crm.p1_puede_ver_cliente().
-- ============================================================

DROP POLICY IF EXISTS "proceso_update" ON crm.proceso_adquisicion;
CREATE POLICY "proceso_update" ON crm.proceso_adquisicion
  FOR UPDATE TO authenticated
  USING (
    crm.es_visibilidad_global()
    OR vendedor_username = crm.get_current_username()
    OR crm.p1_puede_ver_cliente(cliente_id)
  )
  WITH CHECK (
    crm.es_visibilidad_global()
    OR (vendedor_username = crm.get_current_username() AND estado <> 'cancelado')
    OR (crm.p1_puede_ver_cliente(cliente_id) AND estado <> 'cancelado')
  );

-- ============================================================
-- 2. proceso_etapa UPDATE: same team branch, via the parent proceso's
-- cliente_id.
-- ============================================================

DROP POLICY IF EXISTS "proceso_etapa_update" ON crm.proceso_etapa;
CREATE POLICY "proceso_etapa_update" ON crm.proceso_etapa
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm.proceso_adquisicion p
      WHERE p.id = proceso_id
        AND (
          crm.es_visibilidad_global()
          OR p.vendedor_username = crm.get_current_username()
          OR crm.p1_puede_ver_cliente(p.cliente_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm.proceso_adquisicion p
      WHERE p.id = proceso_id
        AND (
          crm.es_visibilidad_global()
          OR p.vendedor_username = crm.get_current_username()
          OR crm.p1_puede_ver_cliente(p.cliente_id)
        )
    )
  );

-- ============================================================
-- 3. meta_vendedor SELECT: coordinador sees their team's metas, not just
-- their own. Safe for every other role too — crm.equipo_usernames(uid) for
-- a non-coordinador uid returns only that uid's own username, so this
-- branch is a no-op (already covered by the existing own-username OR) for
-- anyone who isn't a coordinador with a team.
-- ============================================================

DROP POLICY IF EXISTS "meta_vendedor_select" ON crm.meta_vendedor;
CREATE POLICY "meta_vendedor_select" ON crm.meta_vendedor
  FOR SELECT TO authenticated
  USING (
    crm.es_visibilidad_global()
    OR vendedor_username = crm.get_current_username()
    OR vendedor_username IN (SELECT crm.equipo_usernames(auth.uid()))
  );

-- ============================================================
-- 4. comision SELECT: same team branch as meta_vendedor, keyed on
-- beneficiario_username instead of vendedor_username.
-- ============================================================

DROP POLICY IF EXISTS "comision_select" ON crm.comision;
CREATE POLICY "comision_select" ON crm.comision
  FOR SELECT TO authenticated
  USING (
    crm.es_visibilidad_global()
    OR beneficiario_username = crm.get_current_username()
    OR beneficiario_username IN (SELECT crm.equipo_usernames(auth.uid()))
  );

-- ============================================================
-- 5. venta_select_policy SELECT: same coordinador-team treatment, added in
-- review of Task 2. crm.venta has no p1_puede_ver_cliente() call to piggy-
-- back on (unlike proceso_update above), so this recreates the policy from
-- 20260706000000_venta_select_visibilidad_global.sql VERBATIM (every
-- existing OR-branch untouched) and appends two team-scope OR-branches:
--   - vendedor_username IN equipo_usernames(): the venta's own vendedor is
--     on the caller's team.
--   - cliente_id IN (... vendedor_username/vendedor_asignado IN
--     equipo_usernames() ...): the linked cliente's vendedor is on the
--     caller's team — the same two columns crm.p1_puede_ver_cliente() and
--     crm.usuario_puede_ver_cliente() already use for their own team branch
--     (20260720000001_coordinador_teams_rls.sql).
-- Purely additive (OR-superset of the current policy): cannot regress
-- admin/gerente (es_admin_o_gerente()/es_visibilidad_global(), both TRUE
-- only for ROL_ADMIN/ROL_GERENTE, untouched) or vendedor (own-username/
-- own-uid branches untouched; equipo_usernames() is a no-op superset for
-- non-coordinador callers).
-- ============================================================

DROP POLICY IF EXISTS "venta_select_policy" ON crm.venta;
CREATE POLICY "venta_select_policy" ON crm.venta
  FOR SELECT TO authenticated
  USING (
    crm.es_admin_o_gerente()
    OR vendedor_username = crm.get_current_username()
    OR cliente_id IN (
      SELECT id FROM crm.cliente
      WHERE vendedor_username = crm.get_current_username()
         OR vendedor_asignado = crm.get_current_username()
         OR created_by = auth.uid()
    )
    OR crm.es_visibilidad_global()
    OR vendedor_username IN (SELECT crm.equipo_usernames(auth.uid()))
    OR cliente_id IN (
      SELECT id FROM crm.cliente
      WHERE vendedor_username IN (SELECT crm.equipo_usernames(auth.uid()))
         OR vendedor_asignado IN (SELECT crm.equipo_usernames(auth.uid()))
    )
  );

COMMENT ON POLICY "venta_select_policy" ON crm.venta IS
  'Original admin/gerente/personal-ownership/es_visibilidad_global conditions (20260706000000) left verbatim, plus two coordinador-team OR-branches (venta.vendedor_username and cliente.vendedor_username/vendedor_asignado IN crm.equipo_usernames(auth.uid())) so ROL_COORDINADOR_VENTAS keeps team-scoped venta visibility after 20260720000001 narrowed es_visibilidad_global() to admin/gerente only.';
