-- Script de verificación final para la estructura de usuarios
-- Ejecutar después de aplicar las migraciones

-- 1. Verificar estructura de la tabla usuario_perfil
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'crm' 
  AND table_name = 'usuario_perfil'
  AND column_name IN ('dni', 'email')
ORDER BY column_name;

-- 2. Verificar que DNI es NOT NULL
SELECT 
    CASE 
        WHEN is_nullable = 'NO' THEN '✅ DNI es obligatorio (NOT NULL)'
        ELSE '❌ DNI no es obligatorio'
    END as dni_status
FROM information_schema.columns 
WHERE table_schema = 'crm' 
  AND table_name = 'usuario_perfil' 
  AND column_name = 'dni';

-- 3. Verificar que email es nullable
SELECT 
    CASE 
        WHEN is_nullable = 'YES' THEN '✅ Email es opcional (nullable)'
        ELSE '❌ Email no es opcional'
    END as email_status
FROM information_schema.columns 
WHERE table_schema = 'crm' 
  AND table_name = 'usuario_perfil' 
  AND column_name = 'email';

-- 4. Verificar índices en usuario_perfil
SELECT 
    indexname, 
    indexdef
FROM pg_indexes 
WHERE schemaname = 'crm' 
  AND tablename = 'usuario_perfil'
ORDER BY indexname;

-- 5. Verificar que no hay valores NULL en DNI
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No hay valores NULL en DNI'
        ELSE '❌ Hay ' || COUNT(*) || ' valores NULL en DNI'
    END as dni_null_check
FROM crm.usuario_perfil 
WHERE dni IS NULL;

-- 6. Mostrar resumen de usuarios
SELECT 
    COUNT(*) as total_usuarios,
    COUNT(dni) as usuarios_con_dni,
    COUNT(email) as usuarios_con_email,
    COUNT(*) - COUNT(email) as usuarios_sin_email
FROM crm.usuario_perfil;

-- 7. Mostrar algunos usuarios de ejemplo
SELECT 
    id,
    email,
    nombre_completo,
    dni,
    created_at
FROM crm.usuario_perfil 
ORDER BY created_at
LIMIT 5;

