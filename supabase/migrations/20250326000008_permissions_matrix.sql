-- Actualización integral del sistema de permisos y políticas RLS
-- Implementa la matriz completa solicitada para Admin / Coordinador / Vendedor

-- 1. Actualizar permisos por rol
DO $$
DECLARE
  admin_permisos jsonb := jsonb_build_array(
    'clientes.ver_todos',
    'clientes.ver_asignados',
    'clientes.crear',
    'clientes.editar_todos',
    'clientes.editar_asignados',
    'clientes.eliminar',
    'clientes.reasignar',
    'clientes.importar_masivo',
    'clientes.exportar',
    'clientes.ver_historial_completo',
    'proyectos.ver',
    'proyectos.crear',
    'proyectos.editar',
    'proyectos.eliminar',
    'lotes.ver',
    'lotes.crear',
    'lotes.editar',
    'lotes.eliminar',
    'precios.modificar',
    'precios.ver_costo',
    'inventario.gestionar',
    'reservas.ver_todas',
    'reservas.ver_propias',
    'reservas.crear',
    'reservas.aprobar',
    'reservas.rechazar',
    'reservas.cancelar',
    'reservas.cancelar_propias',
    'ventas.ver_todas',
    'ventas.ver_propias',
    'ventas.crear',
    'ventas.modificar',
    'ventas.anular',
    'descuentos.aplicar',
    'descuentos.aplicar_limitado',
    'pagos.ver_todos',
    'pagos.ver_propios',
    'pagos.registrar',
    'pagos.modificar',
    'pagos.anular',
    'cuotas.gestionar',
    'mora.calcular',
    'reportes_financieros.ver',
    'comisiones.ver_todas',
    'comisiones.ver_propias',
    'campanas.ver',
    'campanas.crear',
    'campanas.editar',
    'campanas.eliminar',
    'plantillas.ver',
    'plantillas.crear',
    'whatsapp.enviar_masivo',
    'whatsapp.enviar_individual',
    'automatizaciones.gestionar',
    'leads.importar',
    'reportes.globales',
    'reportes.equipo',
    'reportes.personales',
    'dashboard.global',
    'dashboard.vendedor',
    'kpis.ver_todos',
    'kpis.ver_propios',
    'exportar.excel',
    'exportar.pdf',
    'usuarios.ver',
    'usuarios.crear',
    'usuarios.crear_vendedores',
    'usuarios.editar',
    'usuarios.editar_vendedores',
    'usuarios.eliminar',
    'usuarios.activar_desactivar',
    'roles.asignar',
    'metas.asignar',
    'metas.ver_propias',
    'configuracion.sistema',
    'configuracion.cuenta',
    'documentos.ver_todos',
    'documentos.ver_asignados',
    'documentos.subir',
    'documentos.editar',
    'documentos.editar_propios',
    'documentos.eliminar',
    'carpetas.gestionar',
    'drive.sincronizar',
    'eventos.ver_todos',
    'eventos.ver_propios',
    'eventos.crear',
    'eventos.editar_propios',
    'eventos.eliminar_propios',
    'recordatorios.configurar',
    'calendario.equipo'
  );

  coordinador_permisos jsonb := jsonb_build_array(
    'clientes.ver_todos',
    'clientes.ver_asignados',
    'clientes.crear',
    'clientes.editar_todos',
    'clientes.editar_asignados',
    'clientes.eliminar',
    'clientes.reasignar',
    'clientes.importar_masivo',
    'clientes.exportar',
    'clientes.ver_historial_completo',
    'proyectos.ver',
    'lotes.ver',
    'lotes.crear',
    'lotes.editar',
    'precios.modificar',
    'precios.ver_costo',
    'inventario.gestionar',
    'reservas.ver_todas',
    'reservas.ver_propias',
    'reservas.crear',
    'reservas.aprobar',
    'reservas.rechazar',
    'reservas.cancelar',
    'reservas.cancelar_propias',
    'ventas.ver_todas',
    'ventas.ver_propias',
    'ventas.crear',
    'ventas.modificar',
    'ventas.anular',
    'descuentos.aplicar',
    'pagos.ver_todos',
    'pagos.ver_propios',
    'pagos.registrar',
    'pagos.modificar',
    'pagos.anular',
    'cuotas.gestionar',
    'mora.calcular',
    'reportes_financieros.ver',
    'comisiones.ver_todas',
    'comisiones.ver_propias',
    'campanas.ver',
    'campanas.crear',
    'campanas.editar',
    'plantillas.ver',
    'plantillas.crear',
    'whatsapp.enviar_masivo',
    'whatsapp.enviar_individual',
    'automatizaciones.gestionar',
    'leads.importar',
    'reportes.globales',
    'reportes.equipo',
    'reportes.personales',
    'dashboard.global',
    'dashboard.vendedor',
    'kpis.ver_todos',
    'kpis.ver_propios',
    'exportar.excel',
    'exportar.pdf',
    'usuarios.ver',
    'usuarios.crear_vendedores',
    'usuarios.editar_vendedores',
    'usuarios.activar_desactivar',
    'metas.asignar',
    'metas.ver_propias',
    'configuracion.cuenta',
    'documentos.ver_todos',
    'documentos.ver_asignados',
    'documentos.subir',
    'documentos.editar',
    'documentos.eliminar',
    'carpetas.gestionar',
    'eventos.ver_todos',
    'eventos.ver_propios',
    'eventos.crear',
    'eventos.editar_propios',
    'eventos.eliminar_propios',
    'recordatorios.configurar',
    'calendario.equipo'
  );

  vendedor_permisos jsonb := jsonb_build_array(
    'clientes.ver_asignados',
    'clientes.crear',
    'clientes.editar_asignados',
    'clientes.exportar',
    'clientes.ver_historial_completo',
    'proyectos.ver',
    'lotes.ver',
    'reservas.ver_propias',
    'reservas.crear',
    'reservas.cancelar_propias',
    'ventas.ver_propias',
    'ventas.crear',
    'descuentos.aplicar_limitado',
    'pagos.ver_propios',
    'pagos.registrar',
    'mora.calcular',
    'comisiones.ver_propias',
    'campanas.ver',
    'plantillas.ver',
    'whatsapp.enviar_individual',
    'reportes.personales',
    'dashboard.vendedor',
    'kpis.ver_propios',
    'exportar.excel',
    'exportar.pdf',
    'metas.ver_propias',
    'configuracion.cuenta',
    'documentos.ver_asignados',
    'documentos.subir',
    'documentos.editar_propios',
    'eventos.ver_propios',
    'eventos.crear',
    'eventos.editar_propios',
    'eventos.eliminar_propios',
    'recordatorios.configurar'
  );
BEGIN
  UPDATE crm.rol
  SET permisos = admin_permisos, updated_at = NOW()
  WHERE nombre = 'ROL_ADMIN';

  UPDATE crm.rol
  SET permisos = coordinador_permisos, updated_at = NOW()
  WHERE nombre = 'ROL_COORDINADOR_VENTAS';

  UPDATE crm.rol
  SET permisos = coordinador_permisos, updated_at = NOW()
  WHERE nombre = 'ROL_GERENTE';

  UPDATE crm.rol
  SET permisos = vendedor_permisos, updated_at = NOW()
  WHERE nombre = 'ROL_VENDEDOR';
END;
$$;

-- 2. Funciones auxiliares para reutilizar en políticas RLS
DROP FUNCTION IF EXISTS crm.usuario_username_actual();
CREATE OR REPLACE FUNCTION crm.usuario_username_actual()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, crm
AS $$
DECLARE
  v_username text;
BEGIN
  SELECT username INTO v_username
  FROM crm.usuario_perfil
  WHERE id = auth.uid();

  RETURN v_username;
END;
$$;
COMMENT ON FUNCTION crm.usuario_username_actual IS 'Retorna el username del usuario autenticado actual';

DROP FUNCTION IF EXISTS crm.cliente_pertenece_a_usuario(uuid);
CREATE OR REPLACE FUNCTION crm.cliente_pertenece_a_usuario(p_cliente_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, crm
AS $$
DECLARE
  v_usuario_id uuid := auth.uid();
  v_username text := crm.usuario_username_actual();
BEGIN
  IF v_usuario_id IS NULL OR p_cliente_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM crm.cliente c
    WHERE c.id = p_cliente_id
      AND (
        c.created_by = v_usuario_id
        OR c.vendedor_asignado = v_usuario_id
        OR (v_username IS NOT NULL AND c.vendedor_username = v_username)
      )
  );
END;
$$;
COMMENT ON FUNCTION crm.cliente_pertenece_a_usuario IS 'Indica si el cliente pertenece o fue creado por el usuario actual';

DROP FUNCTION IF EXISTS crm.usuario_puede_ver_cliente(uuid);
CREATE OR REPLACE FUNCTION crm.usuario_puede_ver_cliente(p_cliente_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, crm
AS $$
DECLARE
  v_usuario_id uuid := auth.uid();
BEGIN
  IF v_usuario_id IS NULL OR p_cliente_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF crm.tiene_permiso(v_usuario_id, 'clientes.ver_todos') THEN
    RETURN TRUE;
  END IF;

  IF crm.tiene_permiso(v_usuario_id, 'clientes.ver_asignados') THEN
    RETURN crm.cliente_pertenece_a_usuario(p_cliente_id);
  END IF;

  RETURN FALSE;
END;
$$;
COMMENT ON FUNCTION crm.usuario_puede_ver_cliente IS 'True si el usuario puede ver el cliente según sus permisos';

DROP FUNCTION IF EXISTS crm.usuario_puede_editar_cliente(uuid);
CREATE OR REPLACE FUNCTION crm.usuario_puede_editar_cliente(p_cliente_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, crm
AS $$
DECLARE
  v_usuario_id uuid := auth.uid();
BEGIN
  IF v_usuario_id IS NULL OR p_cliente_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF crm.tiene_permiso(v_usuario_id, 'clientes.editar_todos') THEN
    RETURN TRUE;
  END IF;

  IF crm.tiene_permiso(v_usuario_id, 'clientes.editar_asignados') THEN
    RETURN crm.cliente_pertenece_a_usuario(p_cliente_id);
  END IF;

  RETURN FALSE;
END;
$$;
COMMENT ON FUNCTION crm.usuario_puede_editar_cliente IS 'True si el usuario puede editar el cliente (todos o asignados)';

-- 3. Reglas RLS para clientes e interacciones relacionadas
ALTER TABLE crm.cliente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vendedores_ven_sus_clientes ON crm.cliente;
DROP POLICY IF EXISTS cliente_delete_admin_or_owner ON crm.cliente;
DROP POLICY IF EXISTS cliente_insert_autorizados ON crm.cliente;
DROP POLICY IF EXISTS cliente_select_autorizados ON crm.cliente;
DROP POLICY IF EXISTS cliente_update_autorizados ON crm.cliente;
DROP POLICY IF EXISTS clientes_select_permiso ON crm.cliente;
DROP POLICY IF EXISTS clientes_insert_permiso ON crm.cliente;
DROP POLICY IF EXISTS clientes_update_permiso ON crm.cliente;
DROP POLICY IF EXISTS clientes_delete_permiso ON crm.cliente;

CREATE POLICY clientes_select_permiso
  ON crm.cliente
  FOR SELECT
  TO authenticated
  USING (crm.usuario_puede_ver_cliente(id));

CREATE POLICY clientes_insert_permiso
  ON crm.cliente
  FOR INSERT
  TO authenticated
  WITH CHECK (crm.tiene_permiso(auth.uid(), 'clientes.crear'));

CREATE POLICY clientes_update_permiso
  ON crm.cliente
  FOR UPDATE
  TO authenticated
  USING (crm.usuario_puede_editar_cliente(id))
  WITH CHECK (crm.usuario_puede_editar_cliente(id));

CREATE POLICY clientes_delete_permiso
  ON crm.cliente
  FOR DELETE
  TO authenticated
  USING (crm.tiene_permiso(auth.uid(), 'clientes.eliminar'));

-- Tablas derivadas del cliente
ALTER TABLE crm.cliente_interaccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.cliente_propiedad_interes ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.visita_propiedad ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_users_all" ON crm.cliente_interaccion;
DROP POLICY IF EXISTS "auth_users_all" ON crm.cliente_propiedad_interes;
DROP POLICY IF EXISTS "auth_users_all" ON crm.visita_propiedad;

DROP POLICY IF EXISTS cliente_interaccion_select ON crm.cliente_interaccion;
DROP POLICY IF EXISTS cliente_interaccion_write ON crm.cliente_interaccion;
DROP POLICY IF EXISTS cliente_propiedad_interes_rw ON crm.cliente_propiedad_interes;
DROP POLICY IF EXISTS visita_propiedad_rw ON crm.visita_propiedad;

CREATE POLICY cliente_interaccion_select
  ON crm.cliente_interaccion
  FOR SELECT
  TO authenticated
  USING (crm.usuario_puede_ver_cliente(cliente_id));

CREATE POLICY cliente_interaccion_insert
  ON crm.cliente_interaccion
  FOR INSERT
  TO authenticated
  WITH CHECK (crm.usuario_puede_editar_cliente(cliente_id));

CREATE POLICY cliente_interaccion_update
  ON crm.cliente_interaccion
  FOR UPDATE
  TO authenticated
  USING (crm.usuario_puede_editar_cliente(cliente_id))
  WITH CHECK (crm.usuario_puede_editar_cliente(cliente_id));

CREATE POLICY cliente_interaccion_delete
  ON crm.cliente_interaccion
  FOR DELETE
  TO authenticated
  USING (crm.usuario_puede_editar_cliente(cliente_id));

CREATE POLICY cliente_propiedad_interes_select
  ON crm.cliente_propiedad_interes
  FOR SELECT
  TO authenticated
  USING (crm.usuario_puede_ver_cliente(cliente_id));

CREATE POLICY cliente_propiedad_interes_write
  ON crm.cliente_propiedad_interes
  FOR ALL
  TO authenticated
  USING (crm.usuario_puede_editar_cliente(cliente_id))
  WITH CHECK (crm.usuario_puede_editar_cliente(cliente_id));

CREATE POLICY visita_propiedad_select
  ON crm.visita_propiedad
  FOR SELECT
  TO authenticated
  USING (crm.usuario_puede_ver_cliente(cliente_id));

CREATE POLICY visita_propiedad_write
  ON crm.visita_propiedad
  FOR ALL
  TO authenticated
  USING (crm.usuario_puede_editar_cliente(cliente_id))
  WITH CHECK (crm.usuario_puede_editar_cliente(cliente_id));

-- 4. Políticas para reservas, ventas y pagos
ALTER TABLE crm.reserva ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.pago ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_users_all" ON crm.reserva;
DROP POLICY IF EXISTS "auth_users_all" ON crm.venta;
DROP POLICY IF EXISTS "auth_users_all" ON crm.pago;

DROP POLICY IF EXISTS reserva_select_permiso ON crm.reserva;
DROP POLICY IF EXISTS reserva_write_permiso ON crm.reserva;
DROP POLICY IF EXISTS venta_select_permiso ON crm.venta;
DROP POLICY IF EXISTS venta_write_permiso ON crm.venta;
DROP POLICY IF EXISTS pago_select_permiso ON crm.pago;
DROP POLICY IF EXISTS pago_write_permiso ON crm.pago;

CREATE POLICY reserva_select_permiso
  ON crm.reserva
  FOR SELECT
  TO authenticated
  USING (
    crm.tiene_permiso(auth.uid(), 'reservas.ver_todas')
    OR (
      crm.tiene_permiso(auth.uid(), 'reservas.ver_propias')
      AND (
        crm.usuario_puede_ver_cliente(cliente_id)
        OR (
          crm.usuario_username_actual() IS NOT NULL
          AND vendedor_username = crm.usuario_username_actual()
        )
      )
    )
  );

CREATE POLICY reserva_insert_permiso
  ON crm.reserva
  FOR INSERT
  TO authenticated
  WITH CHECK (
    crm.tiene_permiso(auth.uid(), 'reservas.crear')
    AND (
      crm.tiene_permiso(auth.uid(), 'reservas.ver_todas')
      OR crm.usuario_puede_ver_cliente(cliente_id)
      OR (
        crm.usuario_username_actual() IS NOT NULL
        AND vendedor_username = crm.usuario_username_actual()
      )
    )
  );

CREATE POLICY reserva_update_permiso
  ON crm.reserva
  FOR UPDATE
  TO authenticated
  USING (
    crm.tiene_permiso(auth.uid(), 'reservas.aprobar')
    OR (
      crm.tiene_permiso(auth.uid(), 'reservas.cancelar_propias')
      AND crm.usuario_username_actual() IS NOT NULL
      AND vendedor_username = crm.usuario_username_actual()
    )
  )
  WITH CHECK (
    crm.tiene_permiso(auth.uid(), 'reservas.aprobar')
    OR (
      crm.tiene_permiso(auth.uid(), 'reservas.cancelar_propias')
      AND crm.usuario_username_actual() IS NOT NULL
      AND vendedor_username = crm.usuario_username_actual()
    )
  );

CREATE POLICY reserva_delete_permiso
  ON crm.reserva
  FOR DELETE
  TO authenticated
  USING (
    crm.tiene_permiso(auth.uid(), 'reservas.cancelar')
    OR (
      crm.tiene_permiso(auth.uid(), 'reservas.cancelar_propias')
      AND crm.usuario_username_actual() IS NOT NULL
      AND vendedor_username = crm.usuario_username_actual()
    )
  );

CREATE POLICY venta_select_permiso
  ON crm.venta
  FOR SELECT
  TO authenticated
  USING (
    crm.tiene_permiso(auth.uid(), 'ventas.ver_todas')
    OR (
      crm.tiene_permiso(auth.uid(), 'ventas.ver_propias')
      AND (
        crm.usuario_puede_ver_cliente(cliente_id)
        OR (
          crm.usuario_username_actual() IS NOT NULL
          AND vendedor_username = crm.usuario_username_actual()
        )
      )
    )
  );

CREATE POLICY venta_insert_permiso
  ON crm.venta
  FOR INSERT
  TO authenticated
  WITH CHECK (crm.tiene_permiso(auth.uid(), 'ventas.crear'));

CREATE POLICY venta_update_permiso
  ON crm.venta
  FOR UPDATE
  TO authenticated
  USING (crm.tiene_permiso(auth.uid(), 'ventas.modificar'))
  WITH CHECK (crm.tiene_permiso(auth.uid(), 'ventas.modificar'));

CREATE POLICY venta_delete_permiso
  ON crm.venta
  FOR DELETE
  TO authenticated
  USING (crm.tiene_permiso(auth.uid(), 'ventas.anular'));

CREATE POLICY pago_select_permiso
  ON crm.pago
  FOR SELECT
  TO authenticated
  USING (
    crm.tiene_permiso(auth.uid(), 'pagos.ver_todos')
    OR (
      crm.tiene_permiso(auth.uid(), 'pagos.ver_propios')
      AND (
        crm.usuario_username_actual() IS NOT NULL
        AND (
          registrado_por = crm.usuario_username_actual()
          OR EXISTS (
            SELECT 1
            FROM crm.venta v
            WHERE v.id = venta_id
              AND (
                v.vendedor_username = crm.usuario_username_actual()
                OR crm.usuario_puede_ver_cliente(v.cliente_id)
              )
          )
        )
      )
    )
  );

CREATE POLICY pago_insert_permiso
  ON crm.pago
  FOR INSERT
  TO authenticated
  WITH CHECK (
    crm.tiene_permiso(auth.uid(), 'pagos.registrar')
    AND (
      crm.tiene_permiso(auth.uid(), 'pagos.ver_todos')
      OR EXISTS (
        SELECT 1
        FROM crm.venta v
        WHERE v.id = venta_id
          AND (
            v.vendedor_username = crm.usuario_username_actual()
            OR crm.usuario_puede_ver_cliente(v.cliente_id)
          )
      )
    )
  );

CREATE POLICY pago_update_permiso
  ON crm.pago
  FOR UPDATE
  TO authenticated
  USING (
    crm.tiene_permiso(auth.uid(), 'pagos.modificar')
    OR (
      crm.tiene_permiso(auth.uid(), 'pagos.ver_propios')
      AND crm.usuario_username_actual() IS NOT NULL
      AND registrado_por = crm.usuario_username_actual()
    )
  )
  WITH CHECK (
    crm.tiene_permiso(auth.uid(), 'pagos.modificar')
    OR (
      crm.tiene_permiso(auth.uid(), 'pagos.ver_propios')
      AND crm.usuario_username_actual() IS NOT NULL
      AND registrado_por = crm.usuario_username_actual()
    )
  );

CREATE POLICY pago_delete_permiso
  ON crm.pago
  FOR DELETE
  TO authenticated
  USING (crm.tiene_permiso(auth.uid(), 'pagos.anular'));

-- 5. Documentos y carpetas
ALTER TABLE crm.carpeta_documento ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.documento ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.documento_actividad ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.google_drive_sync_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver carpetas" ON crm.carpeta_documento;
DROP POLICY IF EXISTS "Solo admins pueden gestionar carpetas" ON crm.carpeta_documento;
DROP POLICY IF EXISTS "Ver documentos permitidos" ON crm.documento;
DROP POLICY IF EXISTS "Usuarios pueden crear documentos" ON crm.documento;
DROP POLICY IF EXISTS "Editar documentos propios o admin" ON crm.documento;
DROP POLICY IF EXISTS "Eliminar documentos propios o admin" ON crm.documento;
DROP POLICY IF EXISTS "Ver actividades de documentos permitidos" ON crm.documento_actividad;
DROP POLICY IF EXISTS "Solo admins gestionan sync config" ON crm.google_drive_sync_config;

DROP POLICY IF EXISTS carpeta_documento_select_permiso ON crm.carpeta_documento;
DROP POLICY IF EXISTS carpeta_documento_manage_permiso ON crm.carpeta_documento;
DROP POLICY IF EXISTS documento_select_permiso ON crm.documento;
DROP POLICY IF EXISTS documento_insert_permiso ON crm.documento;
DROP POLICY IF EXISTS documento_update_permiso ON crm.documento;
DROP POLICY IF EXISTS documento_delete_permiso ON crm.documento;
DROP POLICY IF EXISTS documento_actividad_select_permiso ON crm.documento_actividad;
DROP POLICY IF EXISTS drive_sync_manage_permiso ON crm.google_drive_sync_config;

CREATE POLICY carpeta_documento_select_permiso
  ON crm.carpeta_documento
  FOR SELECT
  TO authenticated
  USING (
    crm.tiene_permiso(auth.uid(), 'documentos.ver_todos')
    OR crm.tiene_permiso(auth.uid(), 'documentos.ver_asignados')
  );

CREATE POLICY carpeta_documento_manage_permiso
  ON crm.carpeta_documento
  FOR ALL
  TO authenticated
  USING (crm.tiene_permiso(auth.uid(), 'carpetas.gestionar'))
  WITH CHECK (crm.tiene_permiso(auth.uid(), 'carpetas.gestionar'));

CREATE POLICY documento_select_permiso
  ON crm.documento
  FOR SELECT
  TO authenticated
  USING (
    es_publico = true
    OR crm.tiene_permiso(auth.uid(), 'documentos.ver_todos')
    OR (
      crm.tiene_permiso(auth.uid(), 'documentos.ver_asignados')
      AND (
        created_by = auth.uid()
        OR auth.uid() = ANY(COALESCE(compartido_con, ARRAY[]::uuid[]))
        OR crm.usuario_puede_ver_cliente(cliente_id)
      )
    )
  );

CREATE POLICY documento_insert_permiso
  ON crm.documento
  FOR INSERT
  TO authenticated
  WITH CHECK (crm.tiene_permiso(auth.uid(), 'documentos.subir'));

CREATE POLICY documento_update_permiso
  ON crm.documento
  FOR UPDATE
  TO authenticated
  USING (
    crm.tiene_permiso(auth.uid(), 'documentos.editar')
    OR (
      crm.tiene_permiso(auth.uid(), 'documentos.editar_propios')
      AND created_by = auth.uid()
    )
  )
  WITH CHECK (
    crm.tiene_permiso(auth.uid(), 'documentos.editar')
    OR (
      crm.tiene_permiso(auth.uid(), 'documentos.editar_propios')
      AND created_by = auth.uid()
    )
  );

CREATE POLICY documento_delete_permiso
  ON crm.documento
  FOR DELETE
  TO authenticated
  USING (crm.tiene_permiso(auth.uid(), 'documentos.eliminar'));

CREATE POLICY documento_actividad_select_permiso
  ON crm.documento_actividad
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM crm.documento d
      WHERE d.id = documento_id
        AND (
          d.es_publico = true
          OR crm.tiene_permiso(auth.uid(), 'documentos.ver_todos')
          OR (
            crm.tiene_permiso(auth.uid(), 'documentos.ver_asignados')
            AND (
              d.created_by = auth.uid()
              OR auth.uid() = ANY(COALESCE(d.compartido_con, ARRAY[]::uuid[]))
              OR crm.usuario_puede_ver_cliente(d.cliente_id)
            )
          )
        )
    )
  );

CREATE POLICY drive_sync_manage_permiso
  ON crm.google_drive_sync_config
  FOR ALL
  TO authenticated
  USING (crm.tiene_permiso(auth.uid(), 'drive.sincronizar'))
  WITH CHECK (crm.tiene_permiso(auth.uid(), 'drive.sincronizar'));

-- 6. Condiciones especiales de permisos (límites y aprobaciones)
WITH roles AS (
  SELECT id, nombre
  FROM crm.rol
  WHERE nombre IN ('ROL_COORDINADOR_VENTAS', 'ROL_VENDEDOR')
),
limite_permisos AS (
  SELECT rol_id, permiso_codigo
  FROM crm.permiso_condicion
  WHERE permiso_codigo IN ('descuentos.aplicar', 'descuentos.aplicar_limitado', 'ventas.anular', 'pagos.anular', 'precios.modificar')
)
DELETE FROM crm.permiso_condicion
WHERE (rol_id, permiso_codigo) IN (
  SELECT rol_id, permiso_codigo FROM limite_permisos
);

INSERT INTO crm.permiso_condicion (rol_id, permiso_codigo, tipo_condicion, valor_limite, requiere_aprobacion, activo)
SELECT r.id, 'descuentos.aplicar', 'limite_monto', 0.10, false, true
FROM roles r
WHERE r.nombre = 'ROL_COORDINADOR_VENTAS'
UNION ALL
SELECT r.id, 'descuentos.aplicar_limitado', 'limite_monto', 0.05, false, true
FROM roles r
WHERE r.nombre = 'ROL_VENDEDOR'
UNION ALL
SELECT r.id, 'ventas.anular', 'requiere_aprobacion', NULL, true, true
FROM roles r
WHERE r.nombre = 'ROL_COORDINADOR_VENTAS'
UNION ALL
SELECT r.id, 'pagos.anular', 'requiere_aprobacion', NULL, true, true
FROM roles r
WHERE r.nombre = 'ROL_COORDINADOR_VENTAS'
UNION ALL
SELECT r.id, 'precios.modificar', 'requiere_aprobacion', NULL, true, true
FROM roles r
WHERE r.nombre = 'ROL_COORDINADOR_VENTAS';

COMMENT ON TABLE crm.permiso_condicion IS 'Condiciones adicionales aplicadas a permisos (límites o aprobaciones)';
