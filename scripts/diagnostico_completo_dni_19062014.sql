-- Script de diagnóstico completo para DNI 19062014
-- Ejecutar para obtener información detallada

-- 1. Verificar si existe el DNI exacto
SELECT 
    'Consulta 1: DNI exacto' as consulta,
    CASE 
        WHEN COUNT(*) > 0 THEN 'ENCONTRADO'
        ELSE 'NO ENCONTRADO'
    END as resultado,
    COUNT(*) as cantidad
FROM crm.usuario_perfil 
WHERE dni = '19062014';

-- 2. Mostrar todos los registros con DNI exacto
SELECT 
    'Consulta 2: Registros con DNI exacto' as consulta,
    id,
    email,
    nombre_completo,
    dni,
    activo,
    rol_id,
    created_at
FROM crm.usuario_perfil 
WHERE dni = '19062014';

-- 3. Buscar variaciones del DNI
SELECT 
    'Consulta 3: Variaciones del DNI' as consulta,
    id,
    email,
    nombre_completo,
    dni,
    activo,
    rol_id,
    length(dni) as longitud_dni
FROM crm.usuario_perfil 
WHERE dni LIKE '%19062014%' 
   OR dni LIKE '%1906201%'
   OR dni LIKE '%9062014%';

-- 4. Mostrar todos los DNIs para comparar
SELECT 
    'Consulta 4: Todos los DNIs' as consulta,
    id,
    email,
    nombre_completo,
    dni,
    activo,
    rol_id,
    length(dni) as longitud_dni
FROM crm.usuario_perfil 
ORDER BY dni;

-- 5. Verificar usuarios inactivos
SELECT 
    'Consulta 5: Usuarios inactivos' as consulta,
    COUNT(*) as total_inactivos
FROM crm.usuario_perfil 
WHERE activo = false;

-- 6. Mostrar usuarios inactivos
SELECT 
    'Consulta 6: Lista de usuarios inactivos' as consulta,
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

-- 7. Verificar si hay usuarios con DNI NULL
SELECT 
    'Consulta 7: Usuarios con DNI NULL' as consulta,
    COUNT(*) as total_dni_null
FROM crm.usuario_perfil 
WHERE dni IS NULL;

-- 8. Mostrar usuarios con DNI NULL
SELECT 
    'Consulta 8: Lista de usuarios con DNI NULL' as consulta,
    id,
    email,
    nombre_completo,
    dni,
    activo,
    rol_id,
    created_at
FROM crm.usuario_perfil 
WHERE dni IS NULL
ORDER BY created_at;

-- 9. Verificar roles disponibles
SELECT 
    'Consulta 9: Roles disponibles' as consulta,
    id,
    nombre,
    descripcion,
    activo
FROM crm.rol 
ORDER BY nombre;

-- 10. Contar total de usuarios
SELECT 
    'Consulta 10: Resumen de usuarios' as consulta,
    COUNT(*) as total_usuarios,
    COUNT(CASE WHEN activo = true THEN 1 END) as usuarios_activos,
    COUNT(CASE WHEN activo = false THEN 1 END) as usuarios_inactivos,
    COUNT(CASE WHEN dni IS NOT NULL THEN 1 END) as usuarios_con_dni,
    COUNT(CASE WHEN dni IS NULL THEN 1 END) as usuarios_sin_dni
FROM crm.usuario_perfil;
