-- Ajusta la RLS para permitir inserciones legítimas en crm.cliente

ALTER TABLE crm.cliente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cliente_insert_autorizados ON crm.cliente;

CREATE POLICY cliente_insert_autorizados
  ON crm.cliente
  FOR INSERT
  TO authenticated
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
