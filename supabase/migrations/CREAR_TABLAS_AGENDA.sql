-- =====================================================
-- CREAR TABLAS PARA SISTEMA DE AGENDA Y RECORDATORIOS
-- =====================================================
-- Ejecutar este SQL en Supabase.com > SQL Editor

-- 1. Crear tabla evento
CREATE TABLE IF NOT EXISTS crm.evento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('cita', 'llamada', 'email', 'visita', 'seguimiento', 'recordatorio', 'tarea')),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'completado', 'cancelado', 'reprogramado')),
  prioridad TEXT NOT NULL DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente')),
  
  -- Fechas y horarios
  fecha_inicio TIMESTAMPTZ NOT NULL,
  fecha_fin TIMESTAMPTZ,
  duracion_minutos INTEGER NOT NULL DEFAULT 60 CHECK (duracion_minutos > 0 AND duracion_minutos <= 1440),
  todo_el_dia BOOLEAN DEFAULT FALSE,
  
  -- Relaciones
  vendedor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES crm.cliente(id) ON DELETE SET NULL,
  propiedad_id UUID REFERENCES crm.propiedad(id) ON DELETE SET NULL,
  
  -- Ubicación
  ubicacion TEXT,
  direccion TEXT,
  coordenadas JSONB,
  
  -- Notificaciones
  recordar_antes_minutos INTEGER DEFAULT 15 CHECK (recordar_antes_minutos >= 0 AND recordar_antes_minutos <= 10080),
  notificar_email BOOLEAN DEFAULT TRUE,
  notificar_push BOOLEAN DEFAULT FALSE,
  
  -- Repetición
  es_recurrente BOOLEAN DEFAULT FALSE,
  patron_recurrencia JSONB,
  
  -- Metadatos
  notas TEXT,
  etiquetas TEXT[] DEFAULT '{}',
  color TEXT DEFAULT '#3B82F6' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  
  -- Auditoría
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Crear tabla recordatorio
CREATE TABLE IF NOT EXISTS crm.recordatorio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('seguimiento_cliente', 'llamada_prospecto', 'envio_documentos', 'visita_propiedad', 'reunion_equipo', 'personalizado')),
  prioridad TEXT NOT NULL DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente')),
  
  -- Fechas
  fecha_recordatorio TIMESTAMPTZ NOT NULL,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  fecha_completado TIMESTAMPTZ,
  
  -- Relaciones
  vendedor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES crm.cliente(id) ON DELETE SET NULL,
  propiedad_id UUID REFERENCES crm.propiedad(id) ON DELETE SET NULL,
  evento_id UUID REFERENCES crm.evento(id) ON DELETE CASCADE,
  
  -- Estado
  completado BOOLEAN DEFAULT FALSE,
  leido BOOLEAN DEFAULT FALSE,
  
  -- Notificaciones
  notificar_email BOOLEAN DEFAULT TRUE,
  notificar_push BOOLEAN DEFAULT FALSE,
  enviado BOOLEAN DEFAULT FALSE,
  
  -- Metadatos
  notas TEXT,
  etiquetas TEXT[] DEFAULT '{}',
  
  -- Auditoría
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Crear tabla plantilla_recordatorio
CREATE TABLE IF NOT EXISTS crm.plantilla_recordatorio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT NOT NULL,
  titulo_template TEXT NOT NULL,
  descripcion_template TEXT,
  dias_antes INTEGER NOT NULL DEFAULT 1 CHECK (dias_antes > 0),
  activo BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CREAR ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para evento
CREATE INDEX IF NOT EXISTS idx_evento_vendedor ON crm.evento(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_evento_fecha_inicio ON crm.evento(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_evento_estado ON crm.evento(estado);
CREATE INDEX IF NOT EXISTS idx_evento_tipo ON crm.evento(tipo);
CREATE INDEX IF NOT EXISTS idx_evento_cliente ON crm.evento(cliente_id);
CREATE INDEX IF NOT EXISTS idx_evento_propiedad ON crm.evento(propiedad_id);

-- Índices para recordatorio
CREATE INDEX IF NOT EXISTS idx_recordatorio_vendedor ON crm.recordatorio(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_recordatorio_fecha ON crm.recordatorio(fecha_recordatorio);
CREATE INDEX IF NOT EXISTS idx_recordatorio_completado ON crm.recordatorio(completado);
CREATE INDEX IF NOT EXISTS idx_recordatorio_leido ON crm.recordatorio(leido);
CREATE INDEX IF NOT EXISTS idx_recordatorio_cliente ON crm.recordatorio(cliente_id);
CREATE INDEX IF NOT EXISTS idx_recordatorio_evento ON crm.recordatorio(evento_id);

-- =====================================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS
ALTER TABLE crm.evento ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.recordatorio ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.plantilla_recordatorio ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREAR POLÍTICAS RLS
-- =====================================================

-- Políticas para evento
DROP POLICY IF EXISTS "Vendedores ven sus eventos" ON crm.evento;
CREATE POLICY "Vendedores ven sus eventos" ON crm.evento
  FOR ALL USING (vendedor_id = auth.uid());

-- Políticas para recordatorio
DROP POLICY IF EXISTS "Vendedores ven sus recordatorios" ON crm.recordatorio;
CREATE POLICY "Vendedores ven sus recordatorios" ON crm.recordatorio
  FOR ALL USING (vendedor_id = auth.uid());

-- Políticas para plantilla_recordatorio
DROP POLICY IF EXISTS "Todos ven plantillas activas" ON crm.plantilla_recordatorio;
CREATE POLICY "Todos ven plantillas activas" ON crm.plantilla_recordatorio
  FOR SELECT USING (activo = true);

DROP POLICY IF EXISTS "Vendedores crean plantillas" ON crm.plantilla_recordatorio;
CREATE POLICY "Vendedores crean plantillas" ON crm.plantilla_recordatorio
  FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Vendedores editan sus plantillas" ON crm.plantilla_recordatorio;
CREATE POLICY "Vendedores editan sus plantillas" ON crm.plantilla_recordatorio
  FOR ALL USING (created_by = auth.uid());

-- =====================================================
-- CREAR FUNCIONES AUXILIARES
-- =====================================================

-- Función para obtener eventos del día
CREATE OR REPLACE FUNCTION crm.obtener_eventos_dia(fecha DATE, usuario_id UUID)
RETURNS TABLE (
  id UUID,
  titulo TEXT,
  descripcion TEXT,
  tipo TEXT,
  estado TEXT,
  prioridad TEXT,
  fecha_inicio TIMESTAMPTZ,
  fecha_fin TIMESTAMPTZ,
  duracion_minutos INTEGER,
  todo_el_dia BOOLEAN,
  ubicacion TEXT,
  direccion TEXT,
  color TEXT,
  cliente_nombre TEXT,
  propiedad_identificacion TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.titulo,
    e.descripcion,
    e.tipo,
    e.estado,
    e.prioridad,
    e.fecha_inicio,
    e.fecha_fin,
    e.duracion_minutos,
    e.todo_el_dia,
    e.ubicacion,
    e.direccion,
    e.color,
    c.nombre as cliente_nombre,
    p.identificacion_interna as propiedad_identificacion
  FROM crm.evento e
  LEFT JOIN crm.cliente c ON e.cliente_id = c.id
  LEFT JOIN crm.propiedad p ON e.propiedad_id = p.id
  WHERE e.vendedor_id = usuario_id
    AND DATE(e.fecha_inicio) = fecha
  ORDER BY e.fecha_inicio;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener recordatorios pendientes
CREATE OR REPLACE FUNCTION crm.obtener_recordatorios_pendientes(usuario_id UUID)
RETURNS TABLE (
  id UUID,
  titulo TEXT,
  descripcion TEXT,
  tipo TEXT,
  prioridad TEXT,
  fecha_recordatorio TIMESTAMPTZ,
  completado BOOLEAN,
  leido BOOLEAN,
  cliente_nombre TEXT,
  propiedad_identificacion TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.titulo,
    r.descripcion,
    r.tipo,
    r.prioridad,
    r.fecha_recordatorio,
    r.completado,
    r.leido,
    c.nombre as cliente_nombre,
    p.identificacion_interna as propiedad_identificacion
  FROM crm.recordatorio r
  LEFT JOIN crm.cliente c ON r.cliente_id = c.id
  LEFT JOIN crm.propiedad p ON r.propiedad_id = p.id
  WHERE r.vendedor_id = usuario_id
    AND r.completado = FALSE
    AND r.fecha_recordatorio <= NOW() + INTERVAL '7 days'
  ORDER BY r.fecha_recordatorio;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CREAR TRIGGERS PARA AUDITORÍA
-- =====================================================

-- Trigger para actualizar updated_at en evento
CREATE OR REPLACE FUNCTION crm.actualizar_updated_at_evento()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_updated_at_evento
  BEFORE UPDATE ON crm.evento
  FOR EACH ROW
  EXECUTE FUNCTION crm.actualizar_updated_at_evento();

-- Trigger para actualizar updated_at en recordatorio
CREATE OR REPLACE FUNCTION crm.actualizar_updated_at_recordatorio()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_updated_at_recordatorio
  BEFORE UPDATE ON crm.recordatorio
  FOR EACH ROW
  EXECUTE FUNCTION crm.actualizar_updated_at_recordatorio();

-- =====================================================
-- INSERTAR DATOS INICIALES
-- =====================================================

-- Insertar plantillas de recordatorio predefinidas
INSERT INTO crm.plantilla_recordatorio (nombre, descripcion, tipo, titulo_template, descripcion_template, dias_antes, activo) VALUES
('Seguimiento Cliente', 'Recordatorio para seguimiento de cliente', 'seguimiento_cliente', 'Seguimiento: {{cliente_nombre}}', 'Recordatorio para contactar al cliente {{cliente_nombre}}', 1, true),
('Llamada Prospecto', 'Recordatorio para llamar a prospecto', 'llamada_prospecto', 'Llamar a: {{cliente_nombre}}', 'Llamar al prospecto {{cliente_nombre}} al {{telefono}}', 1, true),
('Envío Documentos', 'Recordatorio para enviar documentos', 'envio_documentos', 'Enviar documentos: {{cliente_nombre}}', 'Enviar documentos a {{cliente_nombre}}', 1, true),
('Visita Propiedad', 'Recordatorio para visita a propiedad', 'visita_propiedad', 'Visita: {{propiedad_identificacion}}', 'Visita programada a {{propiedad_identificacion}} con {{cliente_nombre}}', 1, true),
('Reunión Equipo', 'Recordatorio para reunión de equipo', 'reunion_equipo', 'Reunión de Equipo', 'Reunión semanal del equipo de ventas', 1, true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- VERIFICAR CREACIÓN
-- =====================================================

-- Verificar que las tablas se crearon correctamente
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'crm' 
  AND table_name IN ('evento', 'recordatorio', 'plantilla_recordatorio')
ORDER BY table_name;
