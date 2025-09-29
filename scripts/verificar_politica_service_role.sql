-- Script para verificar que la política service_role existe y funciona
-- Ejecutar para confirmar que la API puede acceder

-- 1. Verificar que la política existe
SELECT 
    'Política service_role existe' as tipo,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'crm' 
  AND tablename = 'usuario_perfil'
  AND policyname = 'service_role_select_usuario_perfil';

-- 2. Verificar todas las políticas de la tabla
SELECT 
    'Todas las políticas' as tipo,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'crm' 
  AND tablename = 'usuario_perfil'
ORDER BY policyname;

-- 3. Verificar que el RLS sigue activo
SELECT 
    'RLS activo' as tipo,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'crm' 
  AND tablename = 'usuario_perfil';

-- 4. Probar la consulta exacta que hace la API
SELECT 
    'Consulta API exacta' as tipo,
    up.id,
    up.email,
    up.nombre_completo,
    up.dni,
    up.rol_id,
    r.id as rol_id_join,
    r.nombre as rol_nombre,
    r.descripcion as rol_descripcion,
    r.permisos as rol_permisos
FROM crm.usuario_perfil up
LEFT JOIN crm.rol r ON up.rol_id = r.id
WHERE up.dni = '19062014'
  AND up.activo = true;

-- 5. Verificar que el usuario existe y está activo
SELECT 
    'Usuario existe y activo' as tipo,
    id,
    email,
    nombre_completo,
    dni,
    activo,
    rol_id
FROM crm.usuario_perfil 
WHERE dni = '19062014';

