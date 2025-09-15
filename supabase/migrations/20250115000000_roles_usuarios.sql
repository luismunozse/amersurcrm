-- Migración para sistema de roles y permisos
-- Fecha: 2025-01-15

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
('ROL_GERENTE', 'Gerente de ventas', '["ver_todos_clientes", "ver_reportes_equipo", "validar_reservas", "gestionar_vendedores"]'::jsonb)
ON CONFLICT (nombre) DO NOTHING;

-- Agregar campos de rol a la tabla de usuarios (si existe)
-- Primero verificamos si la tabla auth.users tiene los campos necesarios
-- Si no, crearemos una tabla de perfil de usuario

CREATE TABLE IF NOT EXISTS crm.usuario_perfil (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    rol_id UUID REFERENCES crm.rol(id) ON DELETE SET NULL,
    vendedor_asignado UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Para vendedores asignados a un gerente
    nombre_completo VARCHAR(255),
    telefono VARCHAR(20),
    activo BOOLEAN DEFAULT true,
    fecha_ingreso DATE DEFAULT CURRENT_DATE,
    comision_porcentaje DECIMAL(5,2) DEFAULT 0.00, -- Porcentaje de comisión
    meta_mensual_ventas INTEGER DEFAULT 0, -- Meta de ventas mensuales
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_usuario_perfil_rol ON crm.usuario_perfil(rol_id);
CREATE INDEX IF NOT EXISTS idx_usuario_perfil_vendedor ON crm.usuario_perfil(vendedor_asignado);
CREATE INDEX IF NOT EXISTS idx_usuario_perfil_activo ON crm.usuario_perfil(activo);

-- Función para obtener permisos del usuario
CREATE OR REPLACE FUNCTION crm.obtener_permisos_usuario(user_id UUID)
RETURNS JSONB AS $$
DECLARE
    permisos JSONB;
BEGIN
    SELECT r.permisos INTO permisos
    FROM crm.usuario_perfil up
    JOIN crm.rol r ON up.rol_id = r.id
    WHERE up.id = user_id AND up.activo = true AND r.activo = true;
    
    RETURN COALESCE(permisos, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si un usuario tiene un permiso específico
CREATE OR REPLACE FUNCTION crm.tiene_permiso(user_id UUID, permiso VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    permisos JSONB;
BEGIN
    permisos := crm.obtener_permisos_usuario(user_id);
    RETURN permisos ? permiso;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS para usuario_perfil
ALTER TABLE crm.usuario_perfil ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver su propio perfil
CREATE POLICY "usuarios_ven_su_perfil" ON crm.usuario_perfil
    FOR ALL USING (auth.uid()::text = id::text);

-- Política: Los admins pueden ver todos los perfiles
CREATE POLICY "admins_ven_todos_perfiles" ON crm.usuario_perfil
    FOR ALL USING (
        crm.tiene_permiso(auth.uid(), 'gestionar_usuarios')
    );

-- Actualizar tabla cliente para incluir vendedor_asignado
ALTER TABLE crm.cliente 
ADD COLUMN IF NOT EXISTS vendedor_asignado UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Crear índice para vendedor_asignado en cliente
CREATE INDEX IF NOT EXISTS idx_cliente_vendedor ON crm.cliente(vendedor_asignado);

-- RLS para cliente: vendedores solo ven sus clientes asignados
CREATE POLICY "vendedores_ven_sus_clientes" ON crm.cliente
    FOR ALL USING (
        vendedor_asignado::text = auth.uid()::text OR 
        crm.tiene_permiso(auth.uid(), 'ver_todos_clientes')
    );

-- Crear tabla de metas de vendedor
CREATE TABLE IF NOT EXISTS crm.meta_vendedor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendedor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    mes INTEGER NOT NULL,
    año INTEGER NOT NULL,
    meta_ventas INTEGER DEFAULT 0,
    ventas_realizadas INTEGER DEFAULT 0,
    meta_llamadas INTEGER DEFAULT 0,
    llamadas_realizadas INTEGER DEFAULT 0,
    meta_visitas INTEGER DEFAULT 0,
    visitas_realizadas INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(vendedor_id, mes, año)
);

-- RLS para meta_vendedor
ALTER TABLE crm.meta_vendedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendedores_ven_sus_metas" ON crm.meta_vendedor
    FOR ALL USING (
        vendedor_id::text = auth.uid()::text OR 
        crm.tiene_permiso(auth.uid(), 'ver_reportes_globales')
    );

-- Crear tabla de actividades del vendedor
CREATE TABLE IF NOT EXISTS crm.actividad_vendedor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendedor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES crm.cliente(id) ON DELETE CASCADE,
    tipo_actividad VARCHAR(50) NOT NULL, -- 'llamada', 'email', 'visita', 'reunion', 'whatsapp'
    descripcion TEXT,
    fecha_programada TIMESTAMP WITH TIME ZONE,
    fecha_realizada TIMESTAMP WITH TIME ZONE,
    resultado VARCHAR(100), -- 'exitoso', 'no_contesto', 'reagendado', etc.
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para actividad_vendedor
ALTER TABLE crm.actividad_vendedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendedores_ven_sus_actividades" ON crm.actividad_vendedor
    FOR ALL USING (
        vendedor_id::text = auth.uid()::text OR 
        crm.tiene_permiso(auth.uid(), 'ver_todos_clientes')
    );

-- Crear tabla de favoritos de propiedades
CREATE TABLE IF NOT EXISTS crm.propiedad_favorita (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendedor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    propiedad_id UUID REFERENCES crm.propiedad(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(vendedor_id, propiedad_id)
);

-- RLS para propiedad_favorita
ALTER TABLE crm.propiedad_favorita ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendedores_ven_sus_favoritos" ON crm.propiedad_favorita
    FOR ALL USING (
        vendedor_id::text = auth.uid()::text OR 
        crm.tiene_permiso(auth.uid(), 'ver_todos_clientes')
    );

-- Crear tabla de etapas del embudo de ventas
CREATE TABLE IF NOT EXISTS crm.etapa_embudo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    orden INTEGER NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Color en hex
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar etapas predefinidas del embudo
INSERT INTO crm.etapa_embudo (nombre, orden, color) VALUES
('Lead Nuevo', 1, '#6B7280'),
('Calificado', 2, '#3B82F6'),
('Propuesta Enviada', 3, '#F59E0B'),
('Reserva', 4, '#8B5CF6'),
('Venta Cerrada', 5, '#10B981')
ON CONFLICT DO NOTHING;

-- Agregar etapa_embudo_id a la tabla cliente
ALTER TABLE crm.cliente 
ADD COLUMN IF NOT EXISTS etapa_embudo_id UUID REFERENCES crm.etapa_embudo(id) ON DELETE SET NULL;

-- Crear índice para etapa_embudo_id en cliente
CREATE INDEX IF NOT EXISTS idx_cliente_etapa_embudo ON crm.cliente(etapa_embudo_id);

-- Función para obtener estadísticas del vendedor
CREATE OR REPLACE FUNCTION crm.obtener_estadisticas_vendedor(vendedor_id UUID, mes INTEGER, año INTEGER)
RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
BEGIN
    SELECT jsonb_build_object(
        'ventas_mes', COALESCE((
            SELECT COUNT(*) 
            FROM crm.cliente 
            WHERE vendedor_asignado = vendedor_id 
            AND etapa_embudo_id = (SELECT id FROM crm.etapa_embudo WHERE nombre = 'Venta Cerrada')
            AND EXTRACT(MONTH FROM updated_at) = mes
            AND EXTRACT(YEAR FROM updated_at) = año
        ), 0),
        'leads_nuevos', COALESCE((
            SELECT COUNT(*) 
            FROM crm.cliente 
            WHERE vendedor_asignado = vendedor_id 
            AND etapa_embudo_id = (SELECT id FROM crm.etapa_embudo WHERE nombre = 'Lead Nuevo')
            AND EXTRACT(MONTH FROM created_at) = mes
            AND EXTRACT(YEAR FROM created_at) = año
        ), 0),
        'actividades_realizadas', COALESCE((
            SELECT COUNT(*) 
            FROM crm.actividad_vendedor 
            WHERE vendedor_id = vendedor_id 
            AND fecha_realizada IS NOT NULL
            AND EXTRACT(MONTH FROM fecha_realizada) = mes
            AND EXTRACT(YEAR FROM fecha_realizada) = año
        ), 0),
        'meta_ventas', COALESCE((
            SELECT meta_ventas 
            FROM crm.meta_vendedor 
            WHERE vendedor_id = vendedor_id 
            AND mes = mes 
            AND año = año
        ), 0)
    ) INTO resultado;
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios para documentación
COMMENT ON TABLE crm.rol IS 'Roles del sistema con sus permisos específicos';
COMMENT ON TABLE crm.usuario_perfil IS 'Perfil extendido de usuarios con rol y configuración';
COMMENT ON TABLE crm.meta_vendedor IS 'Metas mensuales de cada vendedor';
COMMENT ON TABLE crm.actividad_vendedor IS 'Registro de actividades de vendedores con clientes';
COMMENT ON TABLE crm.propiedad_favorita IS 'Propiedades marcadas como favoritas por vendedores';
COMMENT ON TABLE crm.etapa_embudo IS 'Etapas del embudo de ventas';
COMMENT ON FUNCTION crm.obtener_permisos_usuario IS 'Obtiene los permisos de un usuario según su rol';
COMMENT ON FUNCTION crm.tiene_permiso IS 'Verifica si un usuario tiene un permiso específico';
COMMENT ON FUNCTION crm.obtener_estadisticas_vendedor IS 'Obtiene estadísticas de un vendedor para un mes/año específico';
