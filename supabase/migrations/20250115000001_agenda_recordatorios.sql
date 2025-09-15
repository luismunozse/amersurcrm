-- =====================================================
-- SISTEMA DE AGENDA Y RECORDATORIOS
-- =====================================================

-- Tabla de eventos/actividades
CREATE TABLE IF NOT EXISTS crm.evento (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('cita', 'llamada', 'email', 'visita', 'seguimiento', 'recordatorio', 'tarea')),
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'completado', 'cancelado', 'reprogramado')),
    prioridad VARCHAR(10) NOT NULL DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente')),
    
    -- Fechas y horarios
    fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_fin TIMESTAMP WITH TIME ZONE,
    duracion_minutos INTEGER DEFAULT 60,
    todo_el_dia BOOLEAN DEFAULT false,
    
    -- Relaciones
    vendedor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES crm.cliente(id) ON DELETE SET NULL,
    propiedad_id UUID REFERENCES crm.propiedad(id) ON DELETE SET NULL,
    
    -- Ubicación
    ubicacion VARCHAR(255),
    direccion TEXT,HINT:  No operator matches the given name and argument types. You might need to add explicit type casts.
￼-- =====================================================
-- SISTEMA DE AGENDA Y RECORDATORIOS
-- =====================================================

-- Tabla de eventos/actividades
CREATE TABLE IF NOT EXISTS crm.evento (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('cita', 'llamada', 'email', 'visita', 'seguimiento', 'recordatorio', 'tarea')),
…END;
$$ LANGUAGE plpgsql;
HINT:  No operator matches the given name and argument types. You might need to add explicit type casts.
￼￼
￼

    coordenadas POINT,
    
    -- NotificacionesHINT:  No operator matches the given name and argument types. You might need to add explicit type casts.
￼￼
￼

    recordar_antes_minutos INTEGER DEFAULT 15,
    notificar_email BOOLEAN DEFAULT true,
    notificar_push BOOLEAN DEFAULT false,
    
    -- Repetición
    es_recurrente BOOLEAN DEFAULT false,
    patron_recurrencia JSONB, -- {tipo: 'diario'|'semanal'|'mensual', intervalo: 1, dias_semana: [1,2,3], fin_fecha: '2024-12-31'}
    
    -- Metadatos
    notas TEXT,
    etiquetas TEXT[], -- ['importante', 'seguimiento', 'venta']
    color VARCHAR(7) DEFAULT '#3B82F6', -- Color hexadecimal
    
    -- Auditoría
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de recordatorios
CREATE TABLE IF NOT EXISTS crm.recordatorio (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('seguimiento_cliente', 'llamada_prospecto', 'envio_documentos', 'visita_propiedad', 'reunion_equipo', 'personalizado')),
    prioridad VARCHAR(10) NOT NULL DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente')),
    
    -- Fechas
    fecha_recordatorio TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_completado TIMESTAMP WITH TIME ZONE,
    
    -- Relaciones
    vendedor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES crm.cliente(id) ON DELETE SET NULL,
    propiedad_id UUID REFERENCES crm.propiedad(id) ON DELETE SET NULL,
    evento_id UUID REFERENCES crm.evento(id) ON DELETE CASCADE,
    
    -- Estado
    completado BOOLEAN DEFAULT false,
    leido BOOLEAN DEFAULT false,
    
    -- Notificaciones
    notificar_email BOOLEAN DEFAULT true,
    notificar_push BOOLEAN DEFAULT false,
    enviado BOOLEAN DEFAULT false,
    
    -- Metadatos
    notas TEXT,
    etiquetas TEXT[],
    
    -- Auditoría
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de plantillas de recordatorios
CREATE TABLE IF NOT EXISTS crm.plantilla_recordatorio (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(50) NOT NULL,
    titulo_template TEXT NOT NULL,
    descripcion_template TEXT,
    dias_antes INTEGER NOT NULL DEFAULT 1, -- Días antes del evento para recordar
    activo BOOLEAN DEFAULT true,
    
    -- Auditoría
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_evento_vendedor_fecha ON crm.evento(vendedor_id, fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_evento_cliente ON crm.evento(cliente_id);
CREATE INDEX IF NOT EXISTS idx_evento_propiedad ON crm.evento(propiedad_id);
CREATE INDEX IF NOT EXISTS idx_evento_estado ON crm.evento(estado);
CREATE INDEX IF NOT EXISTS idx_evento_tipo ON crm.evento(tipo);

CREATE INDEX IF NOT EXISTS idx_recordatorio_vendedor_fecha ON crm.recordatorio(vendedor_id, fecha_recordatorio);
CREATE INDEX IF NOT EXISTS idx_recordatorio_cliente ON crm.recordatorio(cliente_id);
CREATE INDEX IF NOT EXISTS idx_recordatorio_completado ON crm.recordatorio(completado);
CREATE INDEX IF NOT EXISTS idx_recordatorio_leido ON crm.recordatorio(leido);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION crm.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_evento_updated_at BEFORE UPDATE ON crm.evento
    FOR EACH ROW EXECUTE FUNCTION crm.update_updated_at_column();

CREATE TRIGGER update_recordatorio_updated_at BEFORE UPDATE ON crm.recordatorio
    FOR EACH ROW EXECUTE FUNCTION crm.update_updated_at_column();

CREATE TRIGGER update_plantilla_recordatorio_updated_at BEFORE UPDATE ON crm.plantilla_recordatorio
    FOR EACH ROW EXECUTE FUNCTION crm.update_updated_at_column();

-- RLS (Row Level Security)
ALTER TABLE crm.evento ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.recordatorio ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.plantilla_recordatorio ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para eventos
CREATE POLICY "Vendedores ven sus eventos" ON crm.evento
    FOR ALL USING (vendedor_id::text = auth.uid()::text);

CREATE POLICY "Admins ven todos los eventos" ON crm.evento
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM crm.usuario_perfil up
            JOIN crm.rol r ON up.rol_id = r.id
            WHERE up.id::text = auth.uid()::text
            AND r.nombre = 'ROL_ADMIN'
        )
    );

-- Políticas RLS para recordatorios
CREATE POLICY "Vendedores ven sus recordatorios" ON crm.recordatorio
    FOR ALL USING (vendedor_id::text = auth.uid()::text);

CREATE POLICY "Admins ven todos los recordatorios" ON crm.recordatorio
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM crm.usuario_perfil up
            JOIN crm.rol r ON up.rol_id = r.id
            WHERE up.id::text = auth.uid()::text
            AND r.nombre = 'ROL_ADMIN'
        )
    );

-- Políticas RLS para plantillas (públicas para todos los usuarios)
CREATE POLICY "Todos pueden ver plantillas activas" ON crm.plantilla_recordatorio
    FOR SELECT USING (activo = true);

CREATE POLICY "Admins pueden gestionar plantillas" ON crm.plantilla_recordatorio
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM crm.usuario_perfil up
            JOIN crm.rol r ON up.rol_id = r.id
            WHERE up.id = auth.uid()::text
            AND r.nombre = 'ROL_ADMIN'
        )
    );

-- Función para crear recordatorios automáticos
CREATE OR REPLACE FUNCTION crm.crear_recordatorio_automatico()
RETURNS TRIGGER AS $$
DECLARE
    plantilla RECORD;
    dias_antes INTEGER;
BEGIN
    -- Buscar plantilla para el tipo de evento
    SELECT * INTO plantilla
    FROM crm.plantilla_recordatorio
    WHERE tipo = NEW.tipo
    AND activo = true
    LIMIT 1;
    
    IF plantilla IS NOT NULL THEN
        -- Crear recordatorio
        INSERT INTO crm.recordatorio (
            titulo,
            descripcion,
            tipo,
            prioridad,
            fecha_recordatorio,
            vendedor_id,
            cliente_id,
            propiedad_id,
            evento_id,
            notificar_email,
            notificar_push,
            created_by
        ) VALUES (
            plantilla.titulo_template,
            plantilla.descripcion_template,
            plantilla.tipo,
            NEW.prioridad,
            NEW.fecha_inicio - INTERVAL '1 day' * plantilla.dias_antes,
            NEW.vendedor_id,
            NEW.cliente_id,
            NEW.propiedad_id,
            NEW.id,
            NEW.notificar_email,
            NEW.notificar_push,
            NEW.created_by
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para crear recordatorios automáticos
CREATE TRIGGER trigger_crear_recordatorio_automatico
    AFTER INSERT ON crm.evento
    FOR EACH ROW
    EXECUTE FUNCTION crm.crear_recordatorio_automatico();

-- Insertar plantillas por defecto
INSERT INTO crm.plantilla_recordatorio (nombre, descripcion, tipo, titulo_template, descripcion_template, dias_antes) VALUES
('Seguimiento Cliente', 'Recordatorio para seguimiento de cliente', 'seguimiento_cliente', 'Seguimiento: {{cliente_nombre}}', 'Recordatorio para contactar al cliente {{cliente_nombre}}', 1),
('Llamada Prospecto', 'Recordatorio para llamar a prospecto', 'llamada_prospecto', 'Llamar: {{cliente_nombre}}', 'Llamar al prospecto {{cliente_nombre}} para seguimiento', 0),
('Visita Propiedad', 'Recordatorio para visita a propiedad', 'visita_propiedad', 'Visita: {{propiedad_titulo}}', 'Visita programada a {{propiedad_titulo}} con {{cliente_nombre}}', 1),
('Envío Documentos', 'Recordatorio para envío de documentos', 'envio_documentos', 'Enviar documentos: {{cliente_nombre}}', 'Enviar documentos a {{cliente_nombre}}', 0),
('Reunión Equipo', 'Recordatorio para reunión de equipo', 'reunion_equipo', 'Reunión: {{titulo}}', 'Reunión de equipo: {{titulo}}', 1);

-- Función para obtener eventos del día
CREATE OR REPLACE FUNCTION crm.obtener_eventos_dia(
    p_vendedor_id TEXT,
    p_fecha DATE
)
RETURNS TABLE (
    id UUID,
    titulo VARCHAR,
    descripcion TEXT,
    tipo VARCHAR,
    estado VARCHAR,
    prioridad VARCHAR,
    fecha_inicio TIMESTAMP WITH TIME ZONE,
    fecha_fin TIMESTAMP WITH TIME ZONE,
    duracion_minutos INTEGER,
    todo_el_dia BOOLEAN,
    cliente_nombre VARCHAR,
    propiedad_titulo VARCHAR,
    ubicacion VARCHAR,
    color VARCHAR
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
        c.nombre as cliente_nombre,
        p.identificacion_interna as propiedad_titulo,
        e.ubicacion,
        e.color
    FROM crm.evento e
    LEFT JOIN crm.cliente c ON e.cliente_id = c.id
    LEFT JOIN crm.propiedad p ON e.propiedad_id = p.id
    WHERE e.vendedor_id::text = p_vendedor_id
    AND DATE(e.fecha_inicio) = p_fecha
    ORDER BY e.fecha_inicio;
END;
$$ LANGUAGE plpgsql;v

-- Función para obtener recordatorios pendientes
CREATE OR REPLACE FUNCTION crm.obtener_recordatorios_pendientes(
    p_vendedor_id TEXT,
    p_limite INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    titulo VARCHAR,
    descripcion TEXT,
    tipo VARCHAR,
    prioridad VARCHAR,
    fecha_recordatorio TIMESTAMP WITH TIME ZONE,
    cliente_nombre VARCHAR,
    propiedad_titulo VARCHAR,
    completado BOOLEAN,
    leido BOOLEAN
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
        c.nombre as cliente_nombre,
        p.identificacion_interna as propiedad_titulo,
        r.completado,
        r.leido
    FROM crm.recordatorio r
    LEFT JOIN crm.cliente c ON r.cliente_id = c.id
    LEFT JOIN crm.propiedad p ON r.propiedad_id = p.id
    WHERE r.vendedor_id::text = p_vendedor_id
    AND r.completado = false
    AND r.fecha_recordatorio <= NOW() + INTERVAL '7 days'
    ORDER BY r.fecha_recordatorio
    LIMIT p_limite;
END;
$$ LANGUAGE plpgsql;
