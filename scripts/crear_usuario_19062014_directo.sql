-- Script para crear usuario con DNI 19062014 directamente
-- Ejecutar para crear el usuario de prueba

-- 1. Verificar si ya existe
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'Usuario ya existe con DNI 19062014'
        ELSE 'No existe usuario con DNI 19062014 - Proceder a crear'
    END as estado
FROM crm.usuario_perfil 
WHERE dni = '19062014';

-- 2. Crear usuario directamente
INSERT INTO crm.usuario_perfil (
    id,
    email,
    nombre_completo,
    dni,
    rol_id,
    activo
) 
SELECT 
    gen_random_uuid(),
    '19062014@amersur.temp',
    'Usuario Prueba DNI 19062014',
    '19062014',
    r.id,
    true
FROM crm.rol r
WHERE r.nombre = 'ROL_VENDEDOR'
  AND NOT EXISTS (
    SELECT 1 FROM crm.usuario_perfil 
    WHERE dni = '19062014'
  );

-- 3. Verificar que se creó correctamente
SELECT 
    'Usuario creado' as estado,
    id,
    email,
    nombre_completo,
    dni,
    activo,
    rol_id,
    created_at
FROM crm.usuario_perfil 
WHERE dni = '19062014';

-- 4. Verificar que puede hacer login (simular consulta de la API)
SELECT 
    'Simulación de login' as estado,
    up.id,
    up.email,
    up.nombre_completo,
    up.dni,
    up.activo,
    r.nombre as rol_nombre,
    r.activo as rol_activo
FROM crm.usuario_perfil up
LEFT JOIN crm.rol r ON up.rol_id = r.id
WHERE up.dni = '19062014'
  AND up.activo = true;

