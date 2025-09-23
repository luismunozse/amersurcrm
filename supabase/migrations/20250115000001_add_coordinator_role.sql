-- Migración para agregar rol de Coordinador de Ventas
-- Fecha: 2025-01-15

-- Insertar rol de Coordinador de Ventas
INSERT INTO crm.rol (nombre, descripcion, permisos) VALUES
('ROL_COORDINADOR_VENTAS', 'Coordinador de Ventas con permisos intermedios', '["ver_todos_clientes", "ver_propiedades", "crear_reservas", "validar_reservas", "ver_reportes_equipo", "gestionar_vendedores", "ver_reportes_globales"]'::jsonb)
ON CONFLICT (nombre) DO NOTHING;

-- Agregar campos adicionales a usuario_perfil si no existen
ALTER TABLE crm.usuario_perfil 
ADD COLUMN IF NOT EXISTS dni VARCHAR(20);

-- Crear índices para los nuevos campos
CREATE INDEX IF NOT EXISTS idx_usuario_perfil_dni ON crm.usuario_perfil(dni);

-- Actualizar políticas RLS si es necesario
-- Los coordinadores pueden ver y gestionar vendedores
CREATE POLICY IF NOT EXISTS "coordinadores_gestionan_vendedores" ON crm.usuario_perfil
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM crm.usuario_perfil up
            JOIN crm.rol r ON up.rol_id = r.id
            WHERE up.id = auth.uid() 
            AND r.nombre IN ('ROL_ADMIN', 'ROL_COORDINADOR_VENTAS')
        )
    );
