-- Script de verificación para la estructura de usuarios
-- Ejecutar en Supabase para verificar que todo esté configurado correctamente

-- 1. Verificar que el esquema crm existe
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name = 'crm';

-- 2. Verificar que la tabla usuario_perfil existe en el esquema crm
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'crm' AND table_name = 'usuario_perfil';

-- 3. Verificar la estructura de la tabla usuario_perfil
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'crm' AND table_name = 'usuario_perfil'
ORDER BY ordinal_position;

-- 4. Verificar que el campo dni existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'crm' 
  AND table_name = 'usuario_perfil' 
  AND column_name = 'dni';

-- 5. Verificar que la tabla rol existe
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'crm' AND table_name = 'rol';

-- 6. Verificar los roles existentes
SELECT id, nombre, descripcion, activo 
FROM crm.rol 
ORDER BY nombre;

-- 7. Verificar usuarios existentes (solo estructura, sin datos sensibles)
SELECT 
    up.id,
    up.nombre_completo,
    up.activo,
    up.dni,
    r.nombre as rol_nombre
FROM crm.usuario_perfil up
LEFT JOIN crm.rol r ON up.rol_id = r.id
LIMIT 5;

-- 8. Verificar índices en usuario_perfil
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'crm' AND tablename = 'usuario_perfil';
