-- Migración: Sistema de Asignación Automática de Vendedores
-- Fecha: 2025-03-25
-- Descripción: Permite configurar lista de vendedores activos para asignación automática de leads

-- ============================================================
-- 1. TABLA: vendedor_activo
-- Lista de vendedores disponibles para recibir leads automáticamente
-- ============================================================

CREATE TABLE IF NOT EXISTS crm.vendedor_activo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL,
  activo BOOLEAN DEFAULT true,
  fecha_configuracion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(vendedor_id)
);

-- Índices para vendedor_activo
CREATE INDEX IF NOT EXISTS idx_vendedor_activo_orden ON crm.vendedor_activo(orden) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_vendedor_activo_vendedor ON crm.vendedor_activo(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_vendedor_activo_activo ON crm.vendedor_activo(activo);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION crm.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_vendedor_activo_updated_at ON crm.vendedor_activo;
CREATE TRIGGER update_vendedor_activo_updated_at
    BEFORE UPDATE ON crm.vendedor_activo
    FOR EACH ROW
    EXECUTE FUNCTION crm.set_updated_at();

COMMENT ON TABLE crm.vendedor_activo IS 'Lista de vendedores disponibles para asignación automática de leads';
COMMENT ON COLUMN crm.vendedor_activo.orden IS 'Orden de asignación round-robin (1, 2, 3...)';
COMMENT ON COLUMN crm.vendedor_activo.activo IS 'Si el vendedor está activo para recibir leads';

-- ============================================================
-- 2. TABLA: asignacion_config
-- Configuración global del sistema de asignación (solo una fila)
-- ============================================================

CREATE TABLE IF NOT EXISTS crm.asignacion_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  ultimo_indice INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (id = 1) -- Solo permitir una fila
);

-- Insertar fila inicial
INSERT INTO crm.asignacion_config (id, ultimo_indice)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE crm.asignacion_config IS 'Configuración del contador round-robin para asignación de vendedores';
COMMENT ON COLUMN crm.asignacion_config.ultimo_indice IS 'Último índice usado en la rotación round-robin';

-- ============================================================
-- 3. FUNCIÓN: obtener_siguiente_vendedor
-- Obtiene el siguiente vendedor disponible usando algoritmo round-robin
-- ============================================================

CREATE OR REPLACE FUNCTION crm.obtener_siguiente_vendedor()
RETURNS TABLE(
  vendedor_id UUID,
  username TEXT,
  nombre_completo TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, public, auth
AS $$
DECLARE
  total_vendedores INTEGER;
  indice_actual INTEGER;
  siguiente_indice INTEGER;
  vendedor_resultado RECORD;
BEGIN
  -- Contar vendedores activos en la lista
  SELECT COUNT(*) INTO total_vendedores
  FROM crm.vendedor_activo
  WHERE activo = true;

  -- Si no hay vendedores activos, retornar NULL
  IF total_vendedores = 0 THEN
    RETURN;
  END IF;

  -- Obtener índice actual
  SELECT ultimo_indice INTO indice_actual
  FROM crm.asignacion_config
  WHERE id = 1;

  -- Calcular siguiente índice (round-robin circular)
  siguiente_indice := (indice_actual % total_vendedores) + 1;

  -- Obtener vendedor según el orden (con offset para el siguiente)
  SELECT
    va.vendedor_id,
    up.username,
    up.nombre_completo
  INTO vendedor_resultado
  FROM crm.vendedor_activo va
  JOIN crm.usuario_perfil up ON va.vendedor_id = up.id
  WHERE va.activo = true
  ORDER BY va.orden ASC
  LIMIT 1 OFFSET (siguiente_indice - 1);

  -- Si encontramos vendedor, actualizar índice y retornarlo
  IF vendedor_resultado.vendedor_id IS NOT NULL THEN
    UPDATE crm.asignacion_config
    SET ultimo_indice = siguiente_indice,
        updated_at = NOW()
    WHERE id = 1;

    RETURN QUERY SELECT
      vendedor_resultado.vendedor_id,
      vendedor_resultado.username,
      vendedor_resultado.nombre_completo;
  END IF;

  RETURN;
END;
$$;

-- Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION crm.obtener_siguiente_vendedor TO service_role;
GRANT EXECUTE ON FUNCTION crm.obtener_siguiente_vendedor TO authenticated;

COMMENT ON FUNCTION crm.obtener_siguiente_vendedor IS 'Obtiene el siguiente vendedor disponible usando round-robin';

-- ============================================================
-- 4. PERMISOS RLS (Row Level Security)
-- ============================================================

-- Habilitar RLS
ALTER TABLE crm.vendedor_activo ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.asignacion_config ENABLE ROW LEVEL SECURITY;

-- Políticas: Solo admins pueden modificar, todos pueden leer
CREATE POLICY "admins_manage_vendedores_activos"
ON crm.vendedor_activo
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM crm.usuario_perfil up
    JOIN crm.rol r ON up.rol_id = r.id
    WHERE up.id = auth.uid()
    AND r.nombre = 'ROL_ADMIN'
    AND up.activo = true
  )
);

CREATE POLICY "all_read_vendedores_activos"
ON crm.vendedor_activo
FOR SELECT
USING (true);

CREATE POLICY "admins_manage_asignacion_config"
ON crm.asignacion_config
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM crm.usuario_perfil up
    JOIN crm.rol r ON up.rol_id = r.id
    WHERE up.id = auth.uid()
    AND r.nombre = 'ROL_ADMIN'
    AND up.activo = true
  )
);

CREATE POLICY "all_read_asignacion_config"
ON crm.asignacion_config
FOR SELECT
USING (true);

-- ============================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migración completada: Sistema de Asignación de Vendedores';
    RAISE NOTICE '   - Tabla vendedor_activo creada';
    RAISE NOTICE '   - Tabla asignacion_config creada';
    RAISE NOTICE '   - Función obtener_siguiente_vendedor creada';
    RAISE NOTICE '   - Políticas RLS configuradas';
END $$;
