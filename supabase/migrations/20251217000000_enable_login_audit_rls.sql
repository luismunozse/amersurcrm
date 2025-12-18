-- Habilitar RLS en la tabla login_audit
ALTER TABLE crm.login_audit ENABLE ROW LEVEL SECURITY;

-- Política: Solo admins pueden ver los registros de auditoría
CREATE POLICY "Admins pueden ver login_audit"
ON crm.login_audit
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM crm.usuario_perfil up
    JOIN crm.rol r ON up.rol_id = r.id
    WHERE up.id = auth.uid()
    AND r.nombre = 'admin'
  )
);

-- Los inserts se hacen desde service_role (backend), no necesitan política para usuarios
-- Si se necesita insertar desde el cliente, agregar política de INSERT
