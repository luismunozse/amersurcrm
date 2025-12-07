-- ============================================
-- Índices para mejorar el rendimiento del dashboard
-- ============================================

-- Índices para la tabla cliente (más de 22k registros)
CREATE INDEX IF NOT EXISTS idx_cliente_created_by ON crm.cliente(created_by);
CREATE INDEX IF NOT EXISTS idx_cliente_vendedor_username ON crm.cliente(vendedor_username);
CREATE INDEX IF NOT EXISTS idx_cliente_estado_cliente ON crm.cliente(estado_cliente);
CREATE INDEX IF NOT EXISTS idx_cliente_fecha_alta ON crm.cliente(fecha_alta DESC);
CREATE INDEX IF NOT EXISTS idx_cliente_ultimo_contacto ON crm.cliente(ultimo_contacto);
CREATE INDEX IF NOT EXISTS idx_cliente_proxima_accion ON crm.cliente(proxima_accion);

-- Índice compuesto para queries de vendedores
CREATE INDEX IF NOT EXISTS idx_cliente_vendedor_estado ON crm.cliente(vendedor_username, estado_cliente);

-- Índice para búsquedas por nombre (requiere extensión pg_trgm)
-- Crear extensión si no existe
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_cliente_nombre_trgm ON crm.cliente USING gin(nombre gin_trgm_ops);

-- Índices para la tabla proyecto
CREATE INDEX IF NOT EXISTS idx_proyecto_estado ON crm.proyecto(estado);
CREATE INDEX IF NOT EXISTS idx_proyecto_created_at ON crm.proyecto(created_at DESC);

-- Índices para la tabla notificacion
CREATE INDEX IF NOT EXISTS idx_notificacion_usuario_id ON crm.notificacion(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificacion_leida ON crm.notificacion(leida);
CREATE INDEX IF NOT EXISTS idx_notificacion_usuario_leida ON crm.notificacion(usuario_id, leida);

-- Índices para la tabla lote
CREATE INDEX IF NOT EXISTS idx_lote_proyecto_id ON crm.lote(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_lote_estado ON crm.lote(estado);

-- Índices para usuario_perfil
CREATE INDEX IF NOT EXISTS idx_usuario_perfil_rol ON crm.usuario_perfil(rol);
CREATE INDEX IF NOT EXISTS idx_usuario_perfil_username ON crm.usuario_perfil(username);
CREATE INDEX IF NOT EXISTS idx_usuario_perfil_activo ON crm.usuario_perfil(activo);

-- Actualizar estadísticas para que el planificador use los nuevos índices
ANALYZE crm.cliente;
ANALYZE crm.proyecto;
ANALYZE crm.notificacion;
ANALYZE crm.lote;
ANALYZE crm.usuario_perfil;

COMMENT ON INDEX crm.idx_cliente_created_by IS 'Optimiza queries que filtran por creador del cliente';
COMMENT ON INDEX crm.idx_cliente_vendedor_username IS 'Optimiza queries que filtran por vendedor asignado';

