-- Script para verificar usuarios en auth.users y usuario_perfil
-- Ejecutar en Supabase Dashboard -> SQL Editor

-- 1. Ver usuarios en auth.users (tabla de autenticación de Supabase)
SELECT id, email, created_at, confirmed_at
FROM auth.users
ORDER BY created_at;

-- 2. Ver usuarios en usuario_perfil
SELECT id, username, email, nombre_completo, activo, rol_id
FROM crm.usuario_perfil
ORDER BY created_at;

-- 3. Ver usuarios que existen en auth.users pero no tienen perfil
SELECT au.id, au.email, au.created_at
FROM auth.users au
LEFT JOIN crm.usuario_perfil up ON au.id = up.id
WHERE up.id IS NULL;

-- 4. Ver usuarios que tienen perfil pero no existen en auth.users
SELECT up.id, up.username, up.email, up.nombre_completo
FROM crm.usuario_perfil up
LEFT JOIN auth.users au ON up.id = au.id
WHERE au.id IS NULL;
