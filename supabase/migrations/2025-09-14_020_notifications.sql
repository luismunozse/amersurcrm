-- Tabla de notificaciones
CREATE TABLE IF NOT EXISTS crm.notificacion (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL, -- 'cliente', 'proyecto', 'lote', 'sistema'
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN DEFAULT FALSE,
  data JSONB, -- Datos adicionales como IDs de entidades relacionadas
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_notificacion_usuario_id ON crm.notificacion(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificacion_leida ON crm.notificacion(leida);
CREATE INDEX IF NOT EXISTS idx_notificacion_created_at ON crm.notificacion(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notificacion_tipo ON crm.notificacion(tipo);

-- RLS (Row Level Security)
ALTER TABLE crm.notificacion ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver sus propias notificaciones
CREATE POLICY "Users can view own notifications" ON crm.notificacion
  FOR SELECT USING (auth.uid() = usuario_id);

-- Política: Los usuarios pueden marcar sus notificaciones como leídas
CREATE POLICY "Users can update own notifications" ON crm.notificacion
  FOR UPDATE USING (auth.uid() = usuario_id);

-- Función para crear notificaciones automáticamente
CREATE OR REPLACE FUNCTION crm.crear_notificacion(
  p_usuario_id UUID,
  p_tipo VARCHAR(50),
  p_titulo VARCHAR(255),
  p_mensaje TEXT,
  p_data JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  notificacion_id UUID;
BEGIN
  INSERT INTO crm.notificacion (usuario_id, tipo, titulo, mensaje, data)
  VALUES (p_usuario_id, p_tipo, p_titulo, p_mensaje, p_data)
  RETURNING id INTO notificacion_id;
  
  RETURN notificacion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener notificaciones no leídas
CREATE OR REPLACE FUNCTION crm.obtener_notificaciones_no_leidas(p_usuario_id UUID)
RETURNS TABLE (
  id UUID,
  tipo VARCHAR(50),
  titulo VARCHAR(255),
  mensaje TEXT,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT n.id, n.tipo, n.titulo, n.mensaje, n.data, n.created_at
  FROM crm.notificacion n
  WHERE n.usuario_id = p_usuario_id
    AND n.leida = FALSE
  ORDER BY n.created_at DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para marcar notificación como leída
CREATE OR REPLACE FUNCTION crm.marcar_notificacion_leida(p_notificacion_id UUID, p_usuario_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE crm.notificacion 
  SET leida = TRUE, updated_at = NOW()
  WHERE id = p_notificacion_id AND usuario_id = p_usuario_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para marcar todas las notificaciones como leídas
CREATE OR REPLACE FUNCTION crm.marcar_todas_leidas(p_usuario_id UUID)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE crm.notificacion 
  SET leida = TRUE, updated_at = NOW()
  WHERE usuario_id = p_usuario_id AND leida = FALSE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
