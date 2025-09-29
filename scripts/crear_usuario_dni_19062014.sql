-- Script para crear un usuario de prueba con DNI 19062014
-- SOLO EJECUTAR SI NO EXISTE EL USUARIO

-- 1. Verificar si ya existe un usuario con ese DNI
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'Usuario ya existe con DNI 19062014'
        ELSE 'No existe usuario con DNI 19062014'
    END as estado
FROM crm.usuario_perfil 
WHERE dni = '19062014';

-- 2. Verificar si existe el rol de vendedor
SELECT 
    id,
    nombre,
    descripcion,
    activo
FROM crm.rol 
WHERE nombre = 'ROL_VENDEDOR';

-- 3. Crear usuario de prueba (solo si no existe)
DO $$
DECLARE
    v_user_id UUID;
    v_rol_id UUID;
    v_email_temp TEXT;
BEGIN
    -- Verificar si ya existe
    IF EXISTS (SELECT 1 FROM crm.usuario_perfil WHERE dni = '19062014') THEN
        RAISE NOTICE 'Usuario con DNI 19062014 ya existe';
        RETURN;
    END IF;
    
    -- Obtener rol de vendedor
    SELECT id INTO v_rol_id FROM crm.rol WHERE nombre = 'ROL_VENDEDOR';
    IF v_rol_id IS NULL THEN
        RAISE NOTICE 'Rol ROL_VENDEDOR no encontrado';
        RETURN;
    END IF;
    
    -- Generar ID y email temporal
    v_user_id := gen_random_uuid();
    v_email_temp := '19062014@amersur.temp';
    
    -- Crear perfil de usuario
    INSERT INTO crm.usuario_perfil (
        id,
        email,
        nombre_completo,
        dni,
        rol_id,
        activo
    ) VALUES (
        v_user_id,
        v_email_temp,
        'Usuario Prueba DNI 19062014',
        '19062014',
        v_rol_id,
        true
    );
    
    RAISE NOTICE 'Usuario creado con ID: % y email: %', v_user_id, v_email_temp;
    
    -- Mostrar el usuario creado
    SELECT 
        id,
        email,
        nombre_completo,
        dni,
        activo,
        rol_id
    FROM crm.usuario_perfil 
    WHERE dni = '19062014';
    
END $$;

