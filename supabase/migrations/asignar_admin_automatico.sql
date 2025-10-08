-- Script automático para asignar rol de administrador a admin@amersur.test
-- Ejecutar en Supabase SQL Editor

-- Crear perfil de usuario para admin@amersur.test si no existe
INSERT INTO crm.usuario_perfil (
    id,
    rol_id,
    nombre_completo,
    activo,
    comision_porcentaje,
    meta_mensual_ventas
)
SELECT 
    u.id,
    r.id as rol_id,
    'Administrador AMERSUR',
    true,
    0.00,
    0
FROM auth.users u
CROSS JOIN crm.rol r
WHERE u.email = 'admin@amersur.test'
  AND r.nombre = 'ROL_ADMIN'
ON CONFLICT (id) DO UPDATE SET
    rol_id = EXCLUDED.rol_id,
    nombre_completo = EXCLUDED.nombre_completo,
    activo = EXCLUDED.activo,
    updated_at = NOW();

-- Verificar que se asignó correctamente
SELECT 
    u.email,
    up.nombre_completo,
    r.nombre as rol,
    r.permisos,
    up.activo
FROM auth.users u
JOIN crm.usuario_perfil up ON u.id = up.id
JOIN crm.rol r ON up.rol_id = r.id
WHERE u.email = 'admin@amersur.test';
