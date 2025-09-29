-- Script de diagnóstico esencial para DNI 19062014
-- Ejecutar para obtener información clave

-- 1. ¿Existe el DNI exacto?
SELECT 
    '¿Existe DNI 19062014?' as pregunta,
    CASE 
        WHEN COUNT(*) > 0 THEN 'SÍ'
        ELSE 'NO'
    END as respuesta,
    COUNT(*) as cantidad
FROM crm.usuario_perfil 
WHERE dni = '19062014';

-- 2. Mostrar todos los DNIs existentes
SELECT 
    'DNIs existentes' as tipo,
    dni,
    nombre_completo,
    activo,
    rol_id
FROM crm.usuario_perfil 
WHERE dni IS NOT NULL
ORDER BY dni;

-- 3. Mostrar usuarios sin DNI
SELECT 
    'Usuarios sin DNI' as tipo,
    id,
    email,
    nombre_completo,
    dni,
    activo,
    rol_id
FROM crm.usuario_perfil 
WHERE dni IS NULL;

-- 4. Buscar variaciones del DNI
SELECT 
    'Variaciones de DNI' as tipo,
    dni,
    nombre_completo,
    activo,
    length(dni) as longitud
FROM crm.usuario_perfil 
WHERE dni LIKE '%19062014%' 
   OR dni LIKE '%1906201%'
   OR dni LIKE '%9062014%';

-- 5. Verificar roles disponibles
SELECT 
    'Roles disponibles' as tipo,
    id,
    nombre,
    descripcion,
    activo
FROM crm.rol 
ORDER BY nombre;
