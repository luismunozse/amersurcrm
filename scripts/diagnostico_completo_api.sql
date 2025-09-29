-- Script de diagnóstico completo para la API de login
-- Ejecutar para identificar todos los problemas posibles

-- 1. Verificar que la tabla existe y es accesible
SELECT 
    'Tabla existe' as verificacion,
    COUNT(*) as total_registros
FROM crm.usuario_perfil;

-- 2. Verificar el usuario específico con todos los campos
SELECT 
    'Usuario específico' as verificacion,
    id,
    email,
    nombre_completo,
    dni,
    rol_id,
    activo,
    created_at,
    updated_at
FROM crm.usuario_perfil 
WHERE dni = '19062014';

-- 3. Verificar el rol del usuario
SELECT 
    'Rol del usuario' as verificacion,
    r.id,
    r.nombre,
    r.descripcion,
    r.activo,
    r.permisos
FROM crm.usuario_perfil up
JOIN crm.rol r ON up.rol_id = r.id
WHERE up.dni = '19062014';

-- 4. Verificar si hay problemas de RLS
SELECT 
    'RLS policies' as verificacion,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'crm' 
  AND tablename = 'usuario_perfil';

-- 5. Verificar permisos específicos del rol authenticated
SELECT 
    'Permisos authenticated' as verificacion,
    table_name,
    privilege_type,
    grantee,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_schema = 'crm' 
  AND table_name = 'usuario_perfil'
  AND grantee = 'authenticated';

-- 6. Verificar si hay problemas de encoding en el DNI
SELECT 
    'Encoding DNI' as verificacion,
    dni,
    length(dni) as longitud,
    octet_length(dni) as bytes,
    encode(dni::bytea, 'hex') as hex_representation
FROM crm.usuario_perfil 
WHERE dni = '19062014';

-- 7. Verificar la estructura completa de la tabla
SELECT 
    'Estructura completa' as verificacion,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'crm' 
  AND table_name = 'usuario_perfil'
ORDER BY ordinal_position;

-- 8. Verificar si hay índices en la tabla
SELECT 
    'Índices' as verificacion,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'crm' 
  AND tablename = 'usuario_perfil';

-- 9. Verificar la consulta exacta que hace la API
SELECT 
    'Consulta API exacta' as verificacion,
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

-- 10. Verificar si hay problemas de conexión
SELECT 
    'Conexión' as verificacion,
    current_user as usuario_actual,
    current_database() as base_datos,
    current_schema() as esquema_actual,
    version() as version_postgres;

