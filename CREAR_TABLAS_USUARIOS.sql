-- Script para crear tablas de usuarios y roles
-- Ejecutar en Supabase Dashboard > SQL Editor

-- Crear tabla de roles
CREATE TABLE IF NOT EXISTS crm.rol (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    permisos JSONB DEFAULT '[]'::jsonb,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar roles predefinidos
INSERT INTO crm.rol (nombre, descripcion, permisos) VALUES
('ROL_ADMIN', 'Administrador del sistema', '["ver_todos_clientes", "crear_propiedades", "modificar_precios", "ver_reportes_globales", "gestionar_usuarios", "validar_reservas"]'::jsonb),
('ROL_VENDEDOR', 'Vendedor con permisos limitados', '["ver_clientes_asignados", "ver_propiedades", "crear_reservas", "ver_reportes_personales", "gestionar_agenda"]'::jsonb),
('ROL_COORDINADOR_VENTAS', 'Coordinador de Ventas', '["ver_todos_clientes", "ver_propiedades", "crear_reservas", "validar_reservas", "ver_reportes_equipo", "gestionar_vendedores", "ver_reportes_globales"]'::jsonb)
ON CONFLICT (nombre) DO NOTHING;

-- Crear tabla de perfil de usuario
CREATE TABLE IF NOT EXISTS crm.usuario_perfil (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    rol_id UUID REFERENCES crm.rol(id) ON DELETE SET NULL,
    vendedor_asignado UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    nombre_completo VARCHAR(255),
    dni VARCHAR(20),
    telefono VARCHAR(20),
    activo BOOLEAN DEFAULT true,
    fecha_ingreso DATE DEFAULT CURRENT_DATE,
    comision_porcentaje DECIMAL(5,2) DEFAULT 0.00,
    meta_mensual_ventas INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_usuario_perfil_rol ON crm.usuario_perfil(rol_id);
CREATE INDEX IF NOT EXISTS idx_usuario_perfil_vendedor ON crm.usuario_perfil(vendedor_asignado);
CREATE INDEX IF NOT EXISTS idx_usuario_perfil_activo ON crm.usuario_perfil(activo);
CREATE INDEX IF NOT EXISTS idx_usuario_perfil_dni ON crm.usuario_perfil(dni);

-- Crear perfiles para usuarios existentes
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
    CASE 
        WHEN u.email = 'admin@amersur.test' THEN 'Administrador AMERSUR'
        WHEN u.email = 'vendedor@amersur.test' THEN 'Vendedor Demo'
        ELSE COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
    END as nombre_completo,
    true as activo,
    CASE 
        WHEN u.email = 'admin@amersur.test' THEN 0.00
        ELSE 2.50
    END as comision_porcentaje,
    CASE 
        WHEN u.email = 'admin@amersur.test' THEN 0
        ELSE 50000
    END as meta_mensual_ventas
FROM auth.users u
CROSS JOIN crm.rol r
WHERE u.email IN ('admin@amersur.test', 'vendedor@amersur.test')
  AND r.nombre = CASE 
    WHEN u.email = 'admin@amersur.test' THEN 'ROL_ADMIN'
    ELSE 'ROL_VENDEDOR'
  END
ON CONFLICT (id) DO UPDATE SET
    rol_id = EXCLUDED.rol_id,
    nombre_completo = EXCLUDED.nombre_completo,
    activo = EXCLUDED.activo,
    updated_at = NOW();

-- Verificar que se crearon correctamente
SELECT 
    u.email,
    up.nombre_completo,
    r.nombre as rol,
    r.descripcion,
    up.activo,
    up.comision_porcentaje,
    up.meta_mensual_ventas
FROM auth.users u
JOIN crm.usuario_perfil up ON u.id = up.id
JOIN crm.rol r ON up.rol_id = r.id
WHERE u.email IN ('admin@amersur.test', 'vendedor@amersur.test')
ORDER BY u.email;
