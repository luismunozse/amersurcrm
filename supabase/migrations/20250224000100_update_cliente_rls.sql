-- Ajusta las políticas de CRM.CLIENTE para que asesores asignados y roles de gestión puedan leer registros

ALTER TABLE crm.cliente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS read_own ON crm.cliente;
DROP POLICY IF EXISTS update_own ON crm.cliente;
DROP POLICY IF EXISTS cliente_update_autorizados ON crm.cliente;

CREATE POLICY cliente_select_autorizados
  ON crm.cliente
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1
      FROM crm.usuario_perfil up
      LEFT JOIN crm.rol r ON r.id = up.rol_id
      WHERE up.id = auth.uid()
        AND (
          r.nombre IN ('ROL_ADMIN', 'ROL_COORDINADOR_VENTAS', 'ROL_GERENTE')
          OR up.username = crm.cliente.vendedor_username
          OR up.username = crm.cliente.vendedor_asignado
        )
    )
  );

CREATE POLICY cliente_update_autorizados
  ON crm.cliente
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1
      FROM crm.usuario_perfil up
      LEFT JOIN crm.rol r ON r.id = up.rol_id
      WHERE up.id = auth.uid()
        AND (
          r.nombre IN ('ROL_ADMIN', 'ROL_COORDINADOR_VENTAS', 'ROL_GERENTE')
          OR up.username = crm.cliente.vendedor_username
          OR up.username = crm.cliente.vendedor_asignado
        )
    )
  )
  WITH CHECK (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1
      FROM crm.usuario_perfil up
      LEFT JOIN crm.rol r ON r.id = up.rol_id
      WHERE up.id = auth.uid()
        AND (
          r.nombre IN ('ROL_ADMIN', 'ROL_COORDINADOR_VENTAS', 'ROL_GERENTE')
          OR up.username = crm.cliente.vendedor_username
          OR up.username = crm.cliente.vendedor_asignado
        )
    )
  );
