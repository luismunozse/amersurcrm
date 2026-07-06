-- Migration: venta_select_policy — restore coordinador global visibility
-- through embedded joins (dashboard-rol PR2a review round 1, fix 3).
--
-- Context: RLS policies apply PER TABLE, including to a table reached only
-- via an embedded PostgREST join (`!inner`/`!left`). `crm.command-center`'s
-- getAlertasSinGestionarCount (and the pre-existing obtenerAlertasCobranza
-- it mirrors, _actions-cobranza.ts) select
-- `alerta_cobranza -> cuota!inner -> venta!inner`. Even after
-- 20260705000000_cobranza_alertas_p2.sql re-scoped `alerta_cobranza_select`
-- and `cuota_select` to bypass caller RLS via SECURITY DEFINER helpers
-- (p1_puede_ver_cuota / p1_puede_ver_venta), the embedded `venta` leg of
-- that chain is still evaluated under crm.venta's OWN row-level policy —
-- re-scoping the parent tables' policies does not touch what the joined
-- child table itself allows. So the fix from 20260705000000 was
-- short-circuited one join deeper by `venta_select_policy`
-- (20260224100000_fix_clientes_fase1_estabilizacion.sql:262-273), which only
-- opens crm.venta to `es_admin_o_gerente()` or personal ownership
-- (vendedor_username / a cliente the caller owns) — NOT to
-- `es_visibilidad_global()` (ROL_ADMIN/ROL_GERENTE/ROL_COORDINADOR_VENTAS),
-- the semantics every other re-scoped policy in this fix chain uses. A
-- coordinador without personal ownership of a given venta was silently
-- excluded from the join, undercounting `getAlertasSinGestionarCount` (and
-- `obtenerAlertasCobranza`'s existing !inner chain) for that role — the
-- exact same bug class already fixed for alerta_cobranza_select/cuota_select.
--
-- Fix: recreate venta_select_policy with its ORIGINAL conditions (unchanged,
-- verbatim from 20260224100000) plus `OR crm.es_visibilidad_global()`, so
-- crm.venta's own SELECT policy is consistent with the visibility semantics
-- used everywhere else in the app (getCachedPipelineClientes,
-- sidebar-badges, the SECURITY DEFINER helpers above). This is evaluated
-- directly by Postgres — unlike the inline-EXISTS bug the SECURITY DEFINER
-- helpers were introduced to fix, es_visibilidad_global() itself is already
-- SECURITY DEFINER, so calling it here does not reintroduce a caller-RLS
-- problem.
--
-- Table grant: no explicit `GRANT ... ON crm.venta TO authenticated` was
-- found anywhere in this migration history (grepped). This is consistent
-- with other core tables this policy chain depends on (crm.cliente,
-- crm.lote, crm.proyecto) that are also never explicitly granted to
-- `authenticated` in a migration, yet are read successfully today — all of
-- them apparently rely on an ambient/schema-level grant applied outside
-- migrations (e.g. Supabase Studio's schema exposure setup), not tracked in
-- this repo. Not adding a speculative GRANT here; if venta reads ever start
-- failing with a permission-denied (42501) rather than an RLS empty-result,
-- that ambient grant is the first thing to check.
--
-- Idempotent: DROP POLICY IF EXISTS before CREATE POLICY.

BEGIN;

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
  );

COMMENT ON POLICY "venta_select_policy" ON crm.venta IS
  'Original admin/gerente/personal-ownership conditions (20260224100000) plus OR es_visibilidad_global(), so ROL_COORDINADOR_VENTAS gets the same venta visibility as everywhere else in the app. Closes an undercount in embedded venta!inner joins (e.g. getAlertasSinGestionarCount, obtenerAlertasCobranza) for coordinadores without personal ownership of a given venta — see header comment for the full chain.';

COMMIT;
