-- Script para crear usuarios de prueba de forma segura
-- SOLO EJECUTAR EN DESARROLLO O DESPUÉS DE VERIFICAR LA ESTRUCTURA

-- 1. Verificar que tenemos los roles necesarios
DO $$
BEGIN
    -- Verificar que existe el rol de administrador
    IF NOT EXISTS (SELECT 1 FROM crm.rol WHERE nombre = 'ROL_ADMIN') THEN
        INSERT INTO crm.rol (nombre, descripcion, permisos) VALUES
        ('ROL_ADMIN', 'Administrador del sistema', '["ver_todos_clientes", "crear_propiedades", "modificar_precios", "ver_reportes_globales", "gestionar_usuarios", "validar_reservas"]'::jsonb);
        RAISE NOTICE 'Rol ROL_ADMIN creado';
    END IF;
    
    -- Verificar que existe el rol de vendedor
    IF NOT EXISTS (SELECT 1 FROM crm.rol WHERE nombre = 'ROL_VENDEDOR') THEN
        INSERT INTO crm.rol (nombre, descripcion, permisos) VALUES
        ('ROL_VENDEDOR', 'Vendedor con permisos limitados', '["ver_clientes_asignados", "ver_propiedades", "crear_reservas", "ver_reportes_personales", "gestionar_agenda"]'::jsonb);
        RAISE NOTICE 'Rol ROL_VENDEDOR creado';
    END IF;
END $$;

-- 2. Función para crear usuario de prueba (solo si no existe)
CREATE OR REPLACE FUNCTION crear_usuario_prueba(
    p_email TEXT,
    p_password TEXT,
    p_nombre TEXT,
    p_dni TEXT DEFAULT NULL,
    p_rol_nombre TEXT DEFAULT 'ROL_VENDEDOR'
) RETURNS TEXT AS $$
DECLARE
    v_user_id UUID;
    v_rol_id UUID;
    v_resultado TEXT;
BEGIN
    -- Verificar si el usuario ya existe
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
        RETURN 'Usuario ya existe: ' || p_email;
    END IF;
    
    -- Obtener el rol
    SELECT id INTO v_rol_id FROM crm.rol WHERE nombre = p_rol_nombre;
    IF v_rol_id IS NULL THEN
        RETURN 'Rol no encontrado: ' || p_rol_nombre;
    END IF;
    
    -- Crear usuario en auth.users (esto debe hacerse desde la aplicación)
    -- Por ahora solo creamos el perfil
    v_user_id := gen_random_uuid();
    
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
        p_email,
        p_nombre,
        p_dni,
        v_rol_id,
        true
    );
    
    v_resultado := 'Perfil creado para: ' || p_nombre || ' (' || p_email || ')';
    IF p_dni IS NOT NULL THEN
        v_resultado := v_resultado || ' con DNI: ' || p_dni;
    END IF;
    
    RETURN v_resultado;
END;
$$ LANGUAGE plpgsql;

-- 3. Crear usuarios de prueba (comentado por seguridad)
/*
-- Descomentar solo si quieres crear usuarios de prueba
SELECT crear_usuario_prueba(
    'admin@amersur.com',
    'admin123',
    'Administrador Sistema',
    NULL,
    'ROL_ADMIN'
);

SELECT crear_usuario_prueba(
    'vendedor1@amersur.com',
    'vendedor123',
    'Juan Pérez',
    '12345678',
    'ROL_VENDEDOR'
);

SELECT crear_usuario_prueba(
    'vendedor2@amersur.com',
    'vendedor123',
    'María García',
    '87654321',
    'ROL_VENDEDOR'
);
*/

-- 4. Mostrar usuarios existentes
SELECT 
    up.email,
    up.nombre_completo,
    up.dni,
    r.nombre as rol,
    up.activo
FROM crm.usuario_perfil up
LEFT JOIN crm.rol r ON up.rol_id = r.id
ORDER BY up.created_at;
