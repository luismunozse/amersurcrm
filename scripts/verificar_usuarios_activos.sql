-- Script para verificar que los usuarios se crean como activos
-- Ejecutar para confirmar la configuración correcta

-- 1. Verificar el valor por defecto del campo activo
SELECT 
    column_name,
    column_default,
    is_nullable,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'crm' 
  AND table_name = 'usuario_perfil' 
  AND column_name = 'activo';

-- 2. Contar usuarios activos vs inactivos
SELECT 
    activo,
    COUNT(*) as cantidad,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as porcentaje
FROM crm.usuario_perfil 
GROUP BY activo
ORDER BY activo;

-- 3. Mostrar usuarios inactivos (si los hay)
SELECT 
    id,
    email,
    nombre_completo,
    dni,
    activo,
    created_at
FROM crm.usuario_perfil 
WHERE activo = false
ORDER BY created_at;

-- 4. Mostrar usuarios activos más recientes
SELECT 
    id,
    email,
    nombre_completo,
    dni,
    activo,
    created_at
FROM crm.usuario_perfil 
WHERE activo = true
ORDER BY created_at DESC
LIMIT 10;

-- 5. Verificar que no hay usuarios con activo NULL
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No hay usuarios con activo NULL'
        ELSE '❌ Hay ' || COUNT(*) || ' usuarios con activo NULL'
    END as activo_null_check
FROM crm.usuario_perfil 
WHERE activo IS NULL;

-- 6. Mostrar configuración de la tabla
SELECT 
    'Tabla: ' || table_name as info,
    'Esquema: ' || table_schema as esquema,
    'Tipo: ' || table_type as tipo
FROM information_schema.tables 
WHERE table_schema = 'crm' 
  AND table_name = 'usuario_perfil';

