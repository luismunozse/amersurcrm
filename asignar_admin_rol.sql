-- Script para asignar rol de administrador a admin@amersur.test
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar si el usuario existe en auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'admin@amersur.test';

-- 2. Obtener el ID del rol de administrador
SELECT id, nombre, permisos 
FROM crm.rol 
WHERE nombre = 'ROL_ADMIN';

-- 3. Crear perfil de usuario para admin@amersur.test
-- (Reemplazar 'USER_ID_AQUI' con el ID real del usuario)
INSERT INTO crm.usuario_perfil (
    id,
    rol_id,
    nombre_completo,
    activo,
    comision_porcentaje,
    meta_mensual_ventas
) VALUES (
    'USER_ID_AQUI', -- Reemplazar con el ID real
    (SELECT id FROM crm.rol WHERE nombre = 'ROL_ADMIN'),
    'Administrador AMERSUR',
    true,
    0.00,
    0
) ON CONFLICT (id) DO UPDATE SET
    rol_id = EXCLUDED.rol_id,
    nombre_completo = EXCLUDED.nombre_completo,
    activo = EXCLUDED.activo,
    updated_at = NOW();

-- 4. Verificar que se creó correctamente
SELECT 
    up.id,
    up.nombre_completo,
    r.nombre as rol,
    r.permisos,
    up.activo
FROM crm.usuario_perfil up
JOIN crm.rol r ON up.rol_id = r.id
WHERE up.id = 'USER_ID_AQUI'; -- Reemplazar con el ID real
