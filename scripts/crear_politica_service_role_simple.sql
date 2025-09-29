-- Script simple para crear política RLS para service_role
-- Ejecutar para permitir acceso a la API

-- 1. Verificar políticas existentes
SELECT 
    'Políticas existentes' as tipo,
    policyname,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'crm' 
  AND tablename = 'usuario_perfil'
ORDER BY policyname;

-- 2. Crear política para service_role (método simple)
CREATE POLICY "service_role_select_usuario_perfil" 
ON crm.usuario_perfil 
FOR SELECT 
TO service_role 
USING (true);

-- 3. Verificar que se creó correctamente
SELECT 
    'Política creada' as tipo,
    policyname,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'crm' 
  AND tablename = 'usuario_perfil'
  AND policyname = 'service_role_select_usuario_perfil';

-- 4. Verificar que el RLS sigue activo
SELECT 
    'RLS activo' as tipo,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'crm' 
  AND tablename = 'usuario_perfil';
