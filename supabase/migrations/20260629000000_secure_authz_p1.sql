-- Migration: secure-authz-p1 / FIX B
-- Replace permissive USING(true) RLS on 13 tables with ownership-scoped policies.
-- Add crm.es_visibilidad_global() helper.
-- Add cancel audit columns to proceso_adquisicion.
-- Idempotent: DROP IF EXISTS before every CREATE.

-- ============================================================
-- 1. Helper function: crm.es_visibilidad_global()
-- Matches GLOBAL_ROLES constant in extension-auth.ts.
-- ============================================================

CREATE OR REPLACE FUNCTION crm.es_visibilidad_global()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, crm
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM crm.usuario_perfil up
    JOIN crm.rol r ON up.rol_id = r.id
    WHERE up.id = auth.uid()
      AND r.nombre IN ('ROL_ADMIN', 'ROL_GERENTE', 'ROL_COORDINADOR_VENTAS')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION crm.es_visibilidad_global() TO authenticated;
GRANT EXECUTE ON FUNCTION crm.es_visibilidad_global() TO service_role;

-- ============================================================
-- 2. Audit columns on proceso_adquisicion (used by cancelarProceso)
-- ============================================================

ALTER TABLE crm.proceso_adquisicion
  ADD COLUMN IF NOT EXISTS cancelado_por       uuid          REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS fecha_cancelacion   timestamptz,
  ADD COLUMN IF NOT EXISTS motivo_cancelacion  text;

-- ============================================================
-- 3. TABLE: solicitud_postventa (cliente_id direct FK)
-- ============================================================

DROP POLICY IF EXISTS "Autenticados pueden ver solicitudes postventa" ON crm.solicitud_postventa;
CREATE POLICY "solicitud_postventa_select" ON crm.solicitud_postventa
  FOR SELECT TO authenticated
  USING (crm.usuario_puede_ver_cliente(cliente_id));

-- ============================================================
-- 4. TABLE: entrega (cliente_id direct FK)
-- ============================================================

DROP POLICY IF EXISTS "Autenticados pueden ver entregas" ON crm.entrega;
CREATE POLICY "entrega_select" ON crm.entrega
  FOR SELECT TO authenticated
  USING (crm.usuario_puede_ver_cliente(cliente_id));

-- ============================================================
-- 5. TABLE: entrega_observacion (entrega_id → entrega.cliente_id)
-- ============================================================

DROP POLICY IF EXISTS "Autenticados pueden ver observaciones entrega" ON crm.entrega_observacion;
CREATE POLICY "entrega_observacion_select" ON crm.entrega_observacion
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm.entrega e
      WHERE e.id = entrega_id
        AND crm.usuario_puede_ver_cliente(e.cliente_id)
    )
  );

-- ============================================================
-- 6. TABLE: entrega_checklist_item (entrega_id → entrega.cliente_id)
-- ============================================================

DROP POLICY IF EXISTS "Autenticados pueden ver checklist entrega" ON crm.entrega_checklist_item;
CREATE POLICY "entrega_checklist_item_select" ON crm.entrega_checklist_item
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm.entrega e
      WHERE e.id = entrega_id
        AND crm.usuario_puede_ver_cliente(e.cliente_id)
    )
  );

-- ============================================================
-- 7. TABLE: proceso_adquisicion (cliente_id + vendedor_username)
-- SELECT: ownership via usuario_puede_ver_cliente
-- UPDATE: vendor owns or global role
-- DELETE: global role only (was permissive)
-- ============================================================

DROP POLICY IF EXISTS "Autenticados ven procesos" ON crm.proceso_adquisicion;
CREATE POLICY "proceso_select" ON crm.proceso_adquisicion
  FOR SELECT TO authenticated
  USING (crm.usuario_puede_ver_cliente(cliente_id));

DROP POLICY IF EXISTS "Autenticados actualizan procesos" ON crm.proceso_adquisicion;
CREATE POLICY "proceso_update" ON crm.proceso_adquisicion
  FOR UPDATE TO authenticated
  USING (
    crm.es_visibilidad_global()
    OR vendedor_username = crm.get_current_username()
  )
  WITH CHECK (
    crm.es_visibilidad_global()
    OR (vendedor_username = crm.get_current_username() AND estado <> 'cancelado')
  );

DROP POLICY IF EXISTS "Autenticados eliminan procesos" ON crm.proceso_adquisicion;
CREATE POLICY "proceso_delete" ON crm.proceso_adquisicion
  FOR DELETE TO authenticated
  USING (crm.es_admin_o_gerente());

-- ============================================================
-- 8. TABLE: proceso_etapa (proceso_id → proceso.cliente_id)
-- ============================================================

DROP POLICY IF EXISTS "Autenticados ven etapas" ON crm.proceso_etapa;
CREATE POLICY "proceso_etapa_select" ON crm.proceso_etapa
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm.proceso_adquisicion p
      WHERE p.id = proceso_id
        AND crm.usuario_puede_ver_cliente(p.cliente_id)
    )
  );

DROP POLICY IF EXISTS "Autenticados actualizan etapas" ON crm.proceso_etapa;
CREATE POLICY "proceso_etapa_update" ON crm.proceso_etapa
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm.proceso_adquisicion p
      WHERE p.id = proceso_id
        AND (
          crm.es_visibilidad_global()
          OR p.vendedor_username = crm.get_current_username()
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
        )
    )
  );

-- ============================================================
-- 9. TABLE: proceso_checklist_item (etapa_id → etapa.proceso_id → proceso.cliente_id)
-- ============================================================

DROP POLICY IF EXISTS "Autenticados ven checklist" ON crm.proceso_checklist_item;
CREATE POLICY "proceso_checklist_item_select" ON crm.proceso_checklist_item
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM crm.proceso_etapa e
      JOIN crm.proceso_adquisicion p ON p.id = e.proceso_id
      WHERE e.id = etapa_id
        AND crm.usuario_puede_ver_cliente(p.cliente_id)
    )
  );

DROP POLICY IF EXISTS "Autenticados actualizan checklist" ON crm.proceso_checklist_item;
CREATE POLICY "proceso_checklist_item_update" ON crm.proceso_checklist_item
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM crm.proceso_etapa e
      JOIN crm.proceso_adquisicion p ON p.id = e.proceso_id
      WHERE e.id = etapa_id
        AND (
          crm.es_visibilidad_global()
          OR p.vendedor_username = crm.get_current_username()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM crm.proceso_etapa e
      JOIN crm.proceso_adquisicion p ON p.id = e.proceso_id
      WHERE e.id = etapa_id
        AND (
          crm.es_visibilidad_global()
          OR p.vendedor_username = crm.get_current_username()
        )
    )
  );

-- ============================================================
-- 10. TABLE: cuota (venta_id → venta.cliente_id, no direct cliente_id)
-- ============================================================

DROP POLICY IF EXISTS "Autenticados pueden ver cuotas" ON crm.cuota;
CREATE POLICY "cuota_select" ON crm.cuota
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm.venta v
      WHERE v.id = venta_id
        AND crm.usuario_puede_ver_cliente(v.cliente_id)
    )
  );

-- ============================================================
-- 11. TABLE: comision (beneficiario_username, no cliente_id)
-- ============================================================

DROP POLICY IF EXISTS "Autenticados ven comisiones" ON crm.comision;
CREATE POLICY "comision_select" ON crm.comision
  FOR SELECT TO authenticated
  USING (
    crm.es_visibilidad_global()
    OR beneficiario_username = crm.get_current_username()
  );

-- ============================================================
-- 12. TABLE: calificacion_bancaria (cliente_id direct FK)
-- ============================================================

DROP POLICY IF EXISTS "Autenticados pueden ver calificaciones" ON crm.calificacion_bancaria;
CREATE POLICY "calificacion_bancaria_select" ON crm.calificacion_bancaria
  FOR SELECT TO authenticated
  USING (crm.usuario_puede_ver_cliente(cliente_id));

-- ============================================================
-- 13. TABLE: calificacion_documento (calificacion_id → calificacion_bancaria.cliente_id)
-- ============================================================

DROP POLICY IF EXISTS "Autenticados pueden ver documentos calificación" ON crm.calificacion_documento;
CREATE POLICY "calificacion_documento_select" ON crm.calificacion_documento
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm.calificacion_bancaria c
      WHERE c.id = calificacion_id
        AND crm.usuario_puede_ver_cliente(c.cliente_id)
    )
  );

-- ============================================================
-- 14. TABLE: contrato (cliente_id direct FK)
-- ============================================================

DROP POLICY IF EXISTS "Autenticados pueden ver contratos" ON crm.contrato;
CREATE POLICY "contrato_select" ON crm.contrato
  FOR SELECT TO authenticated
  USING (crm.usuario_puede_ver_cliente(cliente_id));

-- ============================================================
-- 15. TABLE: meta_vendedor (vendedor_username, no cliente_id)
-- ============================================================

DROP POLICY IF EXISTS "Autenticados pueden ver metas" ON crm.meta_vendedor;
CREATE POLICY "meta_vendedor_select" ON crm.meta_vendedor
  FOR SELECT TO authenticated
  USING (
    crm.es_visibilidad_global()
    OR vendedor_username = crm.get_current_username()
  );

-- ============================================================
-- 16. VIEW: v_kpi_vendedor — enforce caller RLS (security_invoker)
-- A plain view runs as its owner (which bypasses RLS), so a direct
-- PostgREST query on the view would leak every vendor's KPIs past the
-- meta_vendedor_select policy. security_invoker = true makes the view
-- (and its correlated subqueries on venta/reserva/cliente_interaccion/
-- visita_propiedad) run under the querying user's RLS. Postgres 15+.
-- ============================================================

ALTER VIEW crm.v_kpi_vendedor SET (security_invoker = true);
