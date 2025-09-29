-- Script para verificar registros con DNI NULL
-- Ejecutar antes de aplicar la migración para entender el problema

-- 1. Verificar estructura de la tabla
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'crm' 
  AND table_name = 'usuario_perfil'
  AND column_name = 'dni';

-- 2. Contar registros totales
SELECT COUNT(*) as total_registros
FROM crm.usuario_perfil;

-- 3. Contar registros con DNI NULL
SELECT COUNT(*) as registros_dni_null
FROM crm.usuario_perfil 
WHERE dni IS NULL;

-- 4. Mostrar registros con DNI NULL (solo estructura, sin datos sensibles)
SELECT 
    id,
    email,
    nombre_completo,
    dni,
    created_at
FROM crm.usuario_perfil 
WHERE dni IS NULL
ORDER BY created_at;

-- 5. Verificar si hay duplicados en DNI existentes
SELECT 
    dni,
    COUNT(*) as cantidad
FROM crm.usuario_perfil 
WHERE dni IS NOT NULL
GROUP BY dni
HAVING COUNT(*) > 1;

-- 6. Mostrar algunos registros con DNI válido para referencia
SELECT 
    id,
    email,
    nombre_completo,
    dni,
    created_at
FROM crm.usuario_perfil 
WHERE dni IS NOT NULL
ORDER BY created_at
LIMIT 5;
