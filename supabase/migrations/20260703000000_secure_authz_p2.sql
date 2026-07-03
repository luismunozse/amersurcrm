-- Migration: secure-authz-p2
-- 1. Scope the last USING(true) SELECT policy left out of secure-authz-p1:
--    crm.alerta_cobranza. Ownership chain: cuota_id -> cuota.venta_id ->
--    venta.cliente_id, mirroring the cuota_select policy from
--    20260629000000_secure_authz_p1.
-- 2. Drop the ad-hoc "Todos pueden ver sync config" policy on
--    crm.google_drive_sync_config. It exists only in the live DB (no
--    migration created it) and exposes Google OAuth credentials
--    (client_secret, refresh_token, access_token) to every authenticated
--    user via PostgREST. The original "Solo admins gestionan sync config"
--    policy (20251016000000) covers the admin config page and OAuth
--    callback; all other readers use the service-role client.
-- (The other two USING(true) tables from the audit — independizacion and
-- independizacion_documento — were already dropped in the live DB by
-- 20260514000000_drop_independizacion.)
-- Idempotent: DROP IF EXISTS before CREATE.

DROP POLICY IF EXISTS "Autenticados pueden ver alertas cobranza" ON crm.alerta_cobranza;
DROP POLICY IF EXISTS "alerta_cobranza_select" ON crm.alerta_cobranza;
CREATE POLICY "alerta_cobranza_select" ON crm.alerta_cobranza
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM crm.cuota q
      JOIN crm.venta v ON v.id = q.venta_id
      WHERE q.id = cuota_id
        AND crm.p1_puede_ver_cliente(v.cliente_id)
    )
  );

-- google_drive_sync_config: remove the ad-hoc permissive SELECT policy.
-- "Solo admins gestionan sync config" (FOR ALL, ROL_ADMIN check) remains
-- as the only authenticated-facing policy on this table.
DROP POLICY IF EXISTS "Todos pueden ver sync config" ON crm.google_drive_sync_config;
