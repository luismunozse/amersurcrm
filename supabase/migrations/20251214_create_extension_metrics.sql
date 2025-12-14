-- ============================================================================
-- MIGRACIÓN: Crear tablas de logs y métricas de extensión Chrome
-- Fecha: 2024-12-14
-- Descripción: Crea las tablas necesarias para almacenar logs y métricas
--              de la extensión Chrome AmersurChat. Corrige políticas RLS.
-- ============================================================================

-- ============================================================================
-- 1. TABLA: extension_logs - Logs de la extensión
-- ============================================================================
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
CREATE INDEX IF NOT EXISTS idx_extension_logs_level_timestamp ON crm.extension_logs(level, timestamp DESC);

-- ============================================================================
-- 2. TABLA: extension_metrics - Métricas de performance
-- ============================================================================
CREATE TABLE IF NOT EXISTS crm.extension_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    metric_type VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    value NUMERIC NOT NULL,
    unit VARCHAR(20) DEFAULT 'ms',
    metadata JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para métricas
CREATE INDEX IF NOT EXISTS idx_extension_metrics_usuario ON crm.extension_metrics(usuario_id);
CREATE INDEX IF NOT EXISTS idx_extension_metrics_type ON crm.extension_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_extension_metrics_name ON crm.extension_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_extension_metrics_timestamp ON crm.extension_metrics(timestamp DESC);

-- ============================================================================
-- 3. HABILITAR RLS
-- ============================================================================
ALTER TABLE crm.extension_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.extension_metrics ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. LIMPIAR POLÍTICAS ANTERIORES (por si existen)
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own extension logs" ON crm.extension_logs;
DROP POLICY IF EXISTS "Users can insert their own extension logs" ON crm.extension_logs;
DROP POLICY IF EXISTS "Admins can view all extension logs" ON crm.extension_logs;
DROP POLICY IF EXISTS "Users can view their own extension metrics" ON crm.extension_metrics;
DROP POLICY IF EXISTS "Users can insert their own extension metrics" ON crm.extension_metrics;
DROP POLICY IF EXISTS "Admins can view all extension metrics" ON crm.extension_metrics;

-- ============================================================================
-- 5. POLÍTICAS RLS PARA extension_logs
-- ============================================================================

-- Usuarios pueden ver sus propios logs
CREATE POLICY "Users can view their own extension logs"
    ON crm.extension_logs
    FOR SELECT
    USING (usuario_id = auth.uid());

-- Usuarios pueden insertar sus propios logs
CREATE POLICY "Users can insert their own extension logs"
    ON crm.extension_logs
    FOR INSERT
    WITH CHECK (usuario_id = auth.uid() OR usuario_id IS NULL);

-- Administradores pueden ver todos los logs (usando rol_id y tabla rol)
CREATE POLICY "Admins can view all extension logs"
    ON crm.extension_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM crm.usuario_perfil up
            JOIN crm.rol r ON up.rol_id = r.id
            WHERE up.id = auth.uid()
            AND (r.nombre = 'admin' OR r.nombre = 'ROL_ADMIN')
        )
    );

-- ============================================================================
-- 6. POLÍTICAS RLS PARA extension_metrics
-- ============================================================================

-- Usuarios pueden ver sus propias métricas
CREATE POLICY "Users can view their own extension metrics"
    ON crm.extension_metrics
    FOR SELECT
    USING (usuario_id = auth.uid());

-- Usuarios pueden insertar sus propias métricas
CREATE POLICY "Users can insert their own extension metrics"
    ON crm.extension_metrics
    FOR INSERT
    WITH CHECK (usuario_id = auth.uid() OR usuario_id IS NULL);

-- Administradores pueden ver todas las métricas
CREATE POLICY "Admins can view all extension metrics"
    ON crm.extension_metrics
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM crm.usuario_perfil up
            JOIN crm.rol r ON up.rol_id = r.id
            WHERE up.id = auth.uid()
            AND (r.nombre = 'admin' OR r.nombre = 'ROL_ADMIN')
        )
    );

-- ============================================================================
-- 7. COMENTARIOS
-- ============================================================================
COMMENT ON TABLE crm.extension_logs IS 'Logs de errores y eventos de la extensión Chrome AmersurChat';
COMMENT ON TABLE crm.extension_metrics IS 'Métricas de performance de la extensión Chrome AmersurChat';

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
