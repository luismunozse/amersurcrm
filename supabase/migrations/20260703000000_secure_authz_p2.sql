-- Migration: secure-authz-p2
-- Scope the last USING(true) SELECT policy left out of secure-authz-p1:
-- crm.alerta_cobranza. Ownership chain: cuota_id -> cuota.venta_id ->
-- venta.cliente_id, mirroring the cuota_select policy from
-- 20260629000000_secure_authz_p1.
-- (The other two USING(true) tables from the audit — independizacion and
-- independizacion_documento — are handled by applying the pending drop
-- migration 20260514000000_drop_independizacion instead.)
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
