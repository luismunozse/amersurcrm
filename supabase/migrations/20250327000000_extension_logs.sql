-- Migración: Tabla de logs de extensión Chrome
-- Fecha: 2025-03-27
-- Descripción: Almacena logs de errores y eventos de la extensión Chrome para debugging en producción

-- Tabla para almacenar logs de la extensión
CREATE TABLE IF NOT EXISTS crm.extension_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    level VARCHAR(20) NOT NULL CHECK (level IN ('DEBUG', 'INFO', 'WARN', 'ERROR')),
    context VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    error_name VARCHAR(255),
    error_message TEXT,
    error_stack TEXT,
    user_agent TEXT,
    url TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_extension_logs_usuario ON crm.extension_logs(usuario_id);
CREATE INDEX IF NOT EXISTS idx_extension_logs_level ON crm.extension_logs(level);
CREATE INDEX IF NOT EXISTS idx_extension_logs_timestamp ON crm.extension_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_extension_logs_context ON crm.extension_logs(context);
CREATE INDEX IF NOT EXISTS idx_extension_logs_created_at ON crm.extension_logs(created_at DESC);

-- Índice compuesto para consultas comunes
CREATE INDEX IF NOT EXISTS idx_extension_logs_level_timestamp ON crm.extension_logs(level, timestamp DESC);

-- Tabla para métricas de performance de la extensión
CREATE TABLE IF NOT EXISTS crm.extension_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    metric_type VARCHAR(50) NOT NULL, -- 'api_request', 'page_load', 'action_time'
    metric_name VARCHAR(100) NOT NULL, -- 'searchCliente', 'createLead', etc.
    value NUMERIC NOT NULL, -- Tiempo en ms, tamaño en bytes, etc.
    unit VARCHAR(20) DEFAULT 'ms', -- 'ms', 'bytes', 'count'
    metadata JSONB, -- Información adicional
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para métricas
CREATE INDEX IF NOT EXISTS idx_extension_metrics_usuario ON crm.extension_metrics(usuario_id);
CREATE INDEX IF NOT EXISTS idx_extension_metrics_type ON crm.extension_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_extension_metrics_name ON crm.extension_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_extension_metrics_timestamp ON crm.extension_metrics(timestamp DESC);

-- Política RLS: Solo los administradores pueden ver todos los logs
-- Los usuarios solo pueden ver sus propios logs
ALTER TABLE crm.extension_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.extension_metrics ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios vean sus propios logs
CREATE POLICY "Users can view their own extension logs"
    ON crm.extension_logs
    FOR SELECT
    USING (usuario_id = auth.uid());

-- Política para que los usuarios inserten sus propios logs
CREATE POLICY "Users can insert their own extension logs"
    ON crm.extension_logs
    FOR INSERT
    WITH CHECK (usuario_id = auth.uid() OR usuario_id IS NULL);

-- Política para administradores: pueden ver todos los logs
CREATE POLICY "Admins can view all extension logs"
    ON crm.extension_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM crm.usuario_perfil
            WHERE id = auth.uid() AND rol = 'admin'
        )
    );

-- Políticas similares para métricas
CREATE POLICY "Users can view their own extension metrics"
    ON crm.extension_metrics
    FOR SELECT
    USING (usuario_id = auth.uid());

CREATE POLICY "Users can insert their own extension metrics"
    ON crm.extension_metrics
    FOR INSERT
    WITH CHECK (usuario_id = auth.uid() OR usuario_id IS NULL);

CREATE POLICY "Admins can view all extension metrics"
    ON crm.extension_metrics
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM crm.usuario_perfil
            WHERE id = auth.uid() AND rol = 'admin'
        )
    );

-- Comentarios
COMMENT ON TABLE crm.extension_logs IS 'Logs de errores y eventos de la extensión Chrome AmersurChat';
COMMENT ON TABLE crm.extension_metrics IS 'Métricas de performance de la extensión Chrome AmersurChat';

