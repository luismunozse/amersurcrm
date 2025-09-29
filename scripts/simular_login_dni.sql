-- Script para simular la consulta exacta del login con DNI
-- Ejecutar para replicar exactamente lo que hace la API

-- 1. Simular la consulta exacta de la API
SELECT 
    id,
    email,
    nombre_completo,
    dni,
    rol_id,
    rol.id as rol_id_detalle,
    rol.nombre as rol_nombre,
    rol.descripcion as rol_descripcion,
    rol.permisos as rol_permisos
FROM crm.usuario_perfil up
LEFT JOIN crm.rol rol ON up.rol_id = rol.id
WHERE up.dni = '19062014'
  AND up.activo = true;

-- 2. Verificar si el DNI existe pero el usuario está inactivo
SELECT 
    id,
    email,
    nombre_completo,
    dni,
    activo,
    rol_id,
    created_at
FROM crm.usuario_perfil 
WHERE dni = '19062014';

-- 3. Verificar si hay espacios o caracteres especiales en el DNI
SELECT 
    id,
    email,
    nombre_completo,
    dni,
    length(dni) as longitud,
    ascii(substring(dni, 1, 1)) as primer_caracter_ascii,
    ascii(substring(dni, -1, 1)) as ultimo_caracter_ascii,
    activo
FROM crm.usuario_perfil 
WHERE dni LIKE '%19062014%';

-- 4. Buscar el DNI sin trim (por si hay espacios)
SELECT 
    id,
    email,
    nombre_completo,
    dni,
    activo,
    rol_id
FROM crm.usuario_perfil 
WHERE dni = ' 19062014 '  -- Con espacios
   OR dni = '19062014 '   -- Con espacio al final
   OR dni = ' 19062014'   -- Con espacio al inicio
   OR dni = '19062014';   -- Sin espacios

-- 5. Verificar todos los DNIs que empiecen con 1906
SELECT 
    id,
    email,
    nombre_completo,
    dni,
    activo,
    rol_id
FROM crm.usuario_perfil 
WHERE dni LIKE '1906%'
ORDER BY dni;

-- 6. Verificar si el problema es con el rol
SELECT 
    up.id,
    up.email,
    up.nombre_completo,
    up.dni,
    up.activo,
    up.rol_id,
    r.nombre as rol_nombre,
    r.activo as rol_activo
FROM crm.usuario_perfil up
LEFT JOIN crm.rol r ON up.rol_id = r.id
WHERE up.dni = '19062014';

