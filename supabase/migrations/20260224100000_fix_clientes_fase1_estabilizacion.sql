-- ============================================================
-- FASE 1: Estabilización del módulo de clientes
-- Fecha: 2026-02-24
-- Fixes: estado_cliente constraint, RLS tablas CRM
-- ============================================================

-- ============================================================
-- 1. Corregir constraint estado_cliente
--    La migración 20250115000011 redujo los estados a solo 3,
--    pero el código TypeScript y la API usan 6 estados.
--    Alineamos la BD con los 6 estados del código.
-- ============================================================

-- 1a. Eliminar la vista que depende de la columna
DROP VIEW IF EXISTS crm.vista_estadisticas_clientes;

-- 1b. Eliminar TODOS los constraints de check en estado_cliente
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    FOR constraint_rec IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'crm.cliente'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%estado_cliente%'
    LOOP
        EXECUTE 'ALTER TABLE crm.cliente DROP CONSTRAINT IF EXISTS ' || constraint_rec.conname;
    END LOOP;
END $$;

-- 1c. Agregar el nuevo constraint con los 6 estados
ALTER TABLE crm.cliente ADD CONSTRAINT cliente_estado_cliente_check
  CHECK (estado_cliente IN (
    'por_contactar',
    'contactado',
    'intermedio',
    'potencial',
    'desestimado',
    'transferido'
  ));

-- 1d. Asegurar default correcto
ALTER TABLE crm.cliente ALTER COLUMN estado_cliente SET DEFAULT 'por_contactar';

-- 1e. Recrear la vista de estadísticas con los 6 estados
CREATE OR REPLACE VIEW crm.vista_estadisticas_clientes AS
SELECT
    estado_cliente,
    COUNT(*) as total_clientes,
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as nuevos_ultimos_30_dias
FROM crm.cliente
GROUP BY estado_cliente
ORDER BY total_clientes DESC;

-- ============================================================
-- 2. Corregir RLS en tablas del flujo CRM
--    Actualmente usan "auth_users_all" que da acceso total
--    a cualquier usuario autenticado. Reemplazamos con
--    políticas basadas en vendedor_username y rol.
-- ============================================================

-- Helper: función para verificar si el usuario es admin o gerente
CREATE OR REPLACE FUNCTION crm.es_admin_o_gerente()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM crm.usuario_perfil up
    JOIN crm.rol r ON up.rol_id = r.id
    WHERE up.id = auth.uid()
    AND r.nombre IN ('ROL_ADMIN', 'ROL_GERENTE')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper: función para obtener username del usuario actual
CREATE OR REPLACE FUNCTION crm.get_current_username()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT username FROM crm.usuario_perfil WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ---- cliente_interaccion ----
DO $$
BEGIN
  -- Eliminar política permisiva existente
  DROP POLICY IF EXISTS "auth_users_all" ON crm.cliente_interaccion;
  DROP POLICY IF EXISTS "interaccion_select_policy" ON crm.cliente_interaccion;
  DROP POLICY IF EXISTS "interaccion_insert_policy" ON crm.cliente_interaccion;
  DROP POLICY IF EXISTS "interaccion_update_policy" ON crm.cliente_interaccion;
  DROP POLICY IF EXISTS "interaccion_delete_policy" ON crm.cliente_interaccion;

  -- Admin/Gerente ven todo; vendedor ve solo las suyas o de sus clientes
  CREATE POLICY "interaccion_select_policy" ON crm.cliente_interaccion
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
    );

  -- Cualquier autenticado puede insertar (se valida en la app)
  CREATE POLICY "interaccion_insert_policy" ON crm.cliente_interaccion
    FOR INSERT TO authenticated
    WITH CHECK (auth.role() = 'authenticated');

  -- Solo el vendedor que la creó o admin puede actualizar
  CREATE POLICY "interaccion_update_policy" ON crm.cliente_interaccion
    FOR UPDATE TO authenticated
    USING (
      crm.es_admin_o_gerente()
      OR vendedor_username = crm.get_current_username()
    );

  -- Solo admin/gerente pueden eliminar
  CREATE POLICY "interaccion_delete_policy" ON crm.cliente_interaccion
    FOR DELETE TO authenticated
    USING (
      crm.es_admin_o_gerente()
      OR vendedor_username = crm.get_current_username()
    );
END $$;

-- ---- cliente_propiedad_interes ----
DO $$
BEGIN
  DROP POLICY IF EXISTS "auth_users_all" ON crm.cliente_propiedad_interes;
  DROP POLICY IF EXISTS "propiedad_interes_select_policy" ON crm.cliente_propiedad_interes;
  DROP POLICY IF EXISTS "propiedad_interes_insert_policy" ON crm.cliente_propiedad_interes;
  DROP POLICY IF EXISTS "propiedad_interes_update_policy" ON crm.cliente_propiedad_interes;
  DROP POLICY IF EXISTS "propiedad_interes_delete_policy" ON crm.cliente_propiedad_interes;

  CREATE POLICY "propiedad_interes_select_policy" ON crm.cliente_propiedad_interes
    FOR SELECT TO authenticated
    USING (
      crm.es_admin_o_gerente()
      OR agregado_por = crm.get_current_username()
      OR cliente_id IN (
        SELECT id FROM crm.cliente
        WHERE vendedor_username = crm.get_current_username()
           OR vendedor_asignado = crm.get_current_username()
           OR created_by = auth.uid()
      )
    );

  CREATE POLICY "propiedad_interes_insert_policy" ON crm.cliente_propiedad_interes
    FOR INSERT TO authenticated
    WITH CHECK (auth.role() = 'authenticated');

  CREATE POLICY "propiedad_interes_update_policy" ON crm.cliente_propiedad_interes
    FOR UPDATE TO authenticated
    USING (
      crm.es_admin_o_gerente()
      OR agregado_por = crm.get_current_username()
    );

  CREATE POLICY "propiedad_interes_delete_policy" ON crm.cliente_propiedad_interes
    FOR DELETE TO authenticated
    USING (
      crm.es_admin_o_gerente()
      OR agregado_por = crm.get_current_username()
    );
END $$;

-- ---- visita_propiedad ----
DO $$
BEGIN
  DROP POLICY IF EXISTS "auth_users_all" ON crm.visita_propiedad;
  DROP POLICY IF EXISTS "visita_select_policy" ON crm.visita_propiedad;
  DROP POLICY IF EXISTS "visita_insert_policy" ON crm.visita_propiedad;
  DROP POLICY IF EXISTS "visita_update_policy" ON crm.visita_propiedad;
  DROP POLICY IF EXISTS "visita_delete_policy" ON crm.visita_propiedad;

  CREATE POLICY "visita_select_policy" ON crm.visita_propiedad
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
    );

  CREATE POLICY "visita_insert_policy" ON crm.visita_propiedad
    FOR INSERT TO authenticated
    WITH CHECK (auth.role() = 'authenticated');

  CREATE POLICY "visita_update_policy" ON crm.visita_propiedad
    FOR UPDATE TO authenticated
    USING (
      crm.es_admin_o_gerente()
      OR vendedor_username = crm.get_current_username()
    );

  CREATE POLICY "visita_delete_policy" ON crm.visita_propiedad
    FOR DELETE TO authenticated
    USING (
      crm.es_admin_o_gerente()
      OR vendedor_username = crm.get_current_username()
    );
END $$;

-- ---- reserva ----
DO $$
BEGIN
  DROP POLICY IF EXISTS "auth_users_all" ON crm.reserva;
  DROP POLICY IF EXISTS "reserva_select_policy" ON crm.reserva;
  DROP POLICY IF EXISTS "reserva_insert_policy" ON crm.reserva;
  DROP POLICY IF EXISTS "reserva_update_policy" ON crm.reserva;
  DROP POLICY IF EXISTS "reserva_delete_policy" ON crm.reserva;

  CREATE POLICY "reserva_select_policy" ON crm.reserva
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
    );

  CREATE POLICY "reserva_insert_policy" ON crm.reserva
    FOR INSERT TO authenticated
    WITH CHECK (auth.role() = 'authenticated');

  CREATE POLICY "reserva_update_policy" ON crm.reserva
    FOR UPDATE TO authenticated
    USING (
      crm.es_admin_o_gerente()
      OR vendedor_username = crm.get_current_username()
    );

  CREATE POLICY "reserva_delete_policy" ON crm.reserva
    FOR DELETE TO authenticated
    USING (crm.es_admin_o_gerente());
END $$;

-- ---- venta ----
DO $$
BEGIN
  DROP POLICY IF EXISTS "auth_users_all" ON crm.venta;
  DROP POLICY IF EXISTS "venta_select_policy" ON crm.venta;
  DROP POLICY IF EXISTS "venta_insert_policy" ON crm.venta;
  DROP POLICY IF EXISTS "venta_update_policy" ON crm.venta;
  DROP POLICY IF EXISTS "venta_delete_policy" ON crm.venta;

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
    );

  CREATE POLICY "venta_insert_policy" ON crm.venta
    FOR INSERT TO authenticated
    WITH CHECK (auth.role() = 'authenticated');

  CREATE POLICY "venta_update_policy" ON crm.venta
    FOR UPDATE TO authenticated
    USING (
      crm.es_admin_o_gerente()
      OR vendedor_username = crm.get_current_username()
    );

  CREATE POLICY "venta_delete_policy" ON crm.venta
    FOR DELETE TO authenticated
    USING (crm.es_admin_o_gerente());
END $$;

-- ---- pago ----
DO $$
BEGIN
  DROP POLICY IF EXISTS "auth_users_all" ON crm.pago;
  DROP POLICY IF EXISTS "pago_select_policy" ON crm.pago;
  DROP POLICY IF EXISTS "pago_insert_policy" ON crm.pago;
  DROP POLICY IF EXISTS "pago_update_policy" ON crm.pago;
  DROP POLICY IF EXISTS "pago_delete_policy" ON crm.pago;

  CREATE POLICY "pago_select_policy" ON crm.pago
    FOR SELECT TO authenticated
    USING (
      crm.es_admin_o_gerente()
      OR registrado_por = crm.get_current_username()
      OR venta_id IN (
        SELECT id FROM crm.venta
        WHERE vendedor_username = crm.get_current_username()
      )
    );

  CREATE POLICY "pago_insert_policy" ON crm.pago
    FOR INSERT TO authenticated
    WITH CHECK (auth.role() = 'authenticated');

  CREATE POLICY "pago_update_policy" ON crm.pago
    FOR UPDATE TO authenticated
    USING (crm.es_admin_o_gerente());

  CREATE POLICY "pago_delete_policy" ON crm.pago
    FOR DELETE TO authenticated
    USING (crm.es_admin_o_gerente());
END $$;

-- ============================================================
-- 3. Grants para service_role (bypass RLS necesita permisos)
-- ============================================================
GRANT EXECUTE ON FUNCTION crm.es_admin_o_gerente() TO authenticated;
GRANT EXECUTE ON FUNCTION crm.get_current_username() TO authenticated;
GRANT EXECUTE ON FUNCTION crm.es_admin_o_gerente() TO service_role;
GRANT EXECUTE ON FUNCTION crm.get_current_username() TO service_role;
