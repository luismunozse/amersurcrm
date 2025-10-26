-- Fix RLS policy for cliente DELETE operations
-- Fecha: 2025-01-26
-- Descripción: Permitir que admins eliminen cualquier cliente y usuarios eliminen los que crearon

set search_path = public, crm;

-- Eliminar la política de DELETE restrictiva existente
DROP POLICY IF EXISTS delete_own ON crm.cliente;

-- Crear nueva política de DELETE que permite:
-- 1. Admins eliminar cualquier cliente
-- 2. Usuarios eliminar clientes que ellos crearon
CREATE POLICY "cliente_delete_admin_or_owner" ON crm.cliente
FOR DELETE TO authenticated
USING (
  -- El usuario es el creador del cliente
  auth.uid() = created_by
  OR
  -- El usuario tiene rol de admin
  auth.uid() IN (
    SELECT up.id
    FROM crm.usuario_perfil up
    JOIN crm.rol r ON r.id = up.rol_id
    WHERE r.nombre = 'ROL_ADMIN'
  )
);

-- Verificación: Mostrar todas las políticas de cliente
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'crm' AND tablename = 'cliente'
ORDER BY cmd, policyname;
