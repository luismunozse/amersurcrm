-- Script de diagnóstico específico para DNI 19062014
-- Ejecutar para entender por qué no se puede hacer login

-- 1. Buscar el DNI exacto
SELECT 
    id,
    email,
    nombre_completo,
    dni,
    activo,
    rol_id,
    created_at
FROM crm.usuario_perfil 
WHERE dni = '19062014';

-- 2. Buscar variaciones del DNI (con espacios, ceros, etc.)
SELECT 
    id,
    email,
    nombre_completo,
    dni,
    activo,
    rol_id,
    created_at,
    length(dni) as longitud_dni
FROM crm.usuario_perfil 
WHERE dni LIKE '%19062014%' 
   OR dni LIKE '%1906201%'
   OR dni LIKE '%9062014%';

-- 3. Buscar por DNI que contenga estos números
SELECT 
    id,
    email,
    nombre_completo,
    dni,
    activo,
    rol_id,
    created_at
FROM crm.usuario_perfil 
WHERE dni ~ '19062014';

-- 4. Mostrar todos los DNIs para comparar
SELECT 
    id,
    email,
    nombre_completo,
    dni,
    activo,
    rol_id,
    created_at
FROM crm.usuario_perfil 
ORDER BY dni;

-- 5. Verificar si hay usuarios inactivos
SELECT 
    COUNT(*) as total_usuarios,
    COUNT(CASE WHEN activo = true THEN 1 END) as usuarios_activos,
    COUNT(CASE WHEN activo = false THEN 1 END) as usuarios_inactivos,
    COUNT(CASE WHEN activo IS NULL THEN 1 END) as usuarios_activo_null
FROM crm.usuario_perfil;

-- 6. Mostrar usuarios inactivos
SELECT 
    id,
    email,
    nombre_completo,
    dni,
    activo,
    rol_id,
    created_at
FROM crm.usuario_perfil 
WHERE activo = false
ORDER BY created_at;

-- 7. Verificar la estructura del campo DNI
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'crm' 
  AND table_name = 'usuario_perfil' 
  AND column_name = 'dni';
