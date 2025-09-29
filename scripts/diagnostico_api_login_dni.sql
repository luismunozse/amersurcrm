-- Script de diagnóstico específico para la API de login con DNI
-- Simula exactamente la consulta que hace la API

-- 1. Verificar la consulta exacta de la API
SELECT 
    'Consulta API exacta' as tipo,
    id,
    email,
    nombre_completo,
    dni,
    rol_id,
    activo
FROM crm.usuario_perfil 
WHERE dni = '19062014'
  AND activo = true;

-- 2. Verificar la consulta con trim (como hace la API)
SELECT 
    'Consulta API con trim' as tipo,
    id,
    email,
    nombre_completo,
    dni,
    rol_id,
    activo
FROM crm.usuario_perfil 
WHERE dni = TRIM('19062014')
  AND activo = true;

-- 3. Verificar la consulta con single() (como hace la API)
SELECT 
    'Consulta API con single' as tipo,
    id,
    email,
    nombre_completo,
    dni,
    rol_id,
    activo
FROM crm.usuario_perfil 
WHERE dni = '19062014'
  AND activo = true
LIMIT 1;

-- 4. Verificar la consulta con join a rol (como hace la API)
SELECT 
    'Consulta API con join rol' as tipo,
    up.id,
    up.email,
    up.nombre_completo,
    up.dni,
    up.rol_id,
    up.activo,
    r.id as rol_id_join,
    r.nombre as rol_nombre,
    r.descripcion as rol_descripcion,
    r.permisos as rol_permisos
FROM crm.usuario_perfil up
LEFT JOIN crm.rol r ON up.rol_id = r.id
WHERE up.dni = '19062014'
  AND up.activo = true;

-- 5. Verificar si hay problemas de encoding o caracteres especiales
SELECT 
    'Verificación de caracteres' as tipo,
    dni,
    length(dni) as longitud,
    ascii(substring(dni, 1, 1)) as primer_caracter_ascii,
    ascii(substring(dni, 2, 1)) as segundo_caracter_ascii,
    ascii(substring(dni, 3, 1)) as tercer_caracter_ascii,
    ascii(substring(dni, 4, 1)) as cuarto_caracter_ascii,
    ascii(substring(dni, 5, 1)) as quinto_caracter_ascii,
    ascii(substring(dni, 6, 1)) as sexto_caracter_ascii,
    ascii(substring(dni, 7, 1)) as septimo_caracter_ascii,
    ascii(substring(dni, 8, 1)) as octavo_caracter_ascii
FROM crm.usuario_perfil 
WHERE dni LIKE '%19062014%';

-- 6. Verificar la estructura de la tabla
SELECT 
    'Estructura tabla' as tipo,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'crm' 
  AND table_name = 'usuario_perfil'
  AND column_name IN ('dni', 'activo', 'rol_id');

-- 7. Verificar permisos de la tabla
SELECT 
    'Permisos tabla' as tipo,
    table_name,
    privilege_type,
    grantee
FROM information_schema.table_privileges 
WHERE table_schema = 'crm' 
  AND table_name = 'usuario_perfil';

-- 8. Verificar si hay RLS (Row Level Security) activo
SELECT 
    'RLS activo' as tipo,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'crm' 
  AND tablename = 'usuario_perfil';
