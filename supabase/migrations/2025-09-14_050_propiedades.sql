-- Migración para crear tabla de propiedades
-- Ejecutar en el SQL Editor de Supabase

-- Crear tabla de propiedades mejorada
CREATE TABLE IF NOT EXISTS crm.propiedad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('lote', 'casa', 'departamento', 'oficina', 'otro')),
  tipo_operacion TEXT NOT NULL CHECK (tipo_operacion IN ('venta', 'alquiler', 'ambos')),
  proyecto_id UUID REFERENCES crm.proyecto(id) ON DELETE SET NULL,
  identificacion_interna TEXT NOT NULL,
  ubicacion JSONB NOT NULL DEFAULT '{}',
  superficie JSONB NOT NULL DEFAULT '{}',
  antiguedad_anos INTEGER NOT NULL DEFAULT 0,
  estado_comercial TEXT NOT NULL DEFAULT 'disponible' CHECK (estado_comercial IN ('disponible', 'reservado', 'vendido', 'alquilado', 'bloqueado')),
  precio_venta NUMERIC,
  precio_alquiler NUMERIC,
  moneda TEXT NOT NULL DEFAULT 'PEN',
  disponibilidad_inmediata BOOLEAN NOT NULL DEFAULT true,
  disponibilidad_desde TIMESTAMPTZ,
  opciones_financiacion_venta JSONB DEFAULT '{}',
  opciones_financiacion_alquiler JSONB DEFAULT '{}',
  marketing JSONB DEFAULT '{}',
  atributos_especificos JSONB DEFAULT '{}',
  data JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Crear índices mejorados
CREATE INDEX IF NOT EXISTS idx_propiedad_proyecto_id ON crm.propiedad(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_propiedad_tipo ON crm.propiedad(tipo);
CREATE INDEX IF NOT EXISTS idx_propiedad_tipo_operacion ON crm.propiedad(tipo_operacion);
CREATE INDEX IF NOT EXISTS idx_propiedad_estado_comercial ON crm.propiedad(estado_comercial);
CREATE INDEX IF NOT EXISTS idx_propiedad_precio_venta ON crm.propiedad(precio_venta) WHERE precio_venta IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_propiedad_precio_alquiler ON crm.propiedad(precio_alquiler) WHERE precio_alquiler IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_propiedad_disponibilidad ON crm.propiedad(disponibilidad_inmediata, disponibilidad_desde);
CREATE INDEX IF NOT EXISTS idx_propiedad_antiguedad ON crm.propiedad(antiguedad_anos);
CREATE INDEX IF NOT EXISTS idx_propiedad_created_by ON crm.propiedad(created_by);
CREATE INDEX IF NOT EXISTS idx_propiedad_data ON crm.propiedad USING gin (data);
CREATE INDEX IF NOT EXISTS idx_propiedad_ubicacion ON crm.propiedad USING gin (ubicacion);
CREATE INDEX IF NOT EXISTS idx_propiedad_superficie ON crm.propiedad USING gin (superficie);
CREATE INDEX IF NOT EXISTS idx_propiedad_marketing ON crm.propiedad USING gin (marketing);
CREATE INDEX IF NOT EXISTS idx_propiedad_atributos ON crm.propiedad USING gin (atributos_especificos);

-- Crear trigger para updated_at
CREATE OR REPLACE FUNCTION crm.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_propiedad_updated_at 
  BEFORE UPDATE ON crm.propiedad 
  FOR EACH ROW 
  EXECUTE FUNCTION crm.update_updated_at_column();

-- Políticas RLS
ALTER TABLE crm.propiedad ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: usuarios autenticados pueden ver propiedades
CREATE POLICY "Usuarios autenticados pueden ver propiedades" ON crm.propiedad
FOR SELECT USING (auth.role() = 'authenticated');

-- Política para INSERT: usuarios autenticados pueden crear propiedades
CREATE POLICY "Usuarios autenticados pueden crear propiedades" ON crm.propiedad
FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());

-- Política para UPDATE: usuarios autenticados pueden actualizar sus propiedades
CREATE POLICY "Usuarios autenticados pueden actualizar propiedades" ON crm.propiedad
FOR UPDATE USING (auth.role() = 'authenticated' AND created_by = auth.uid());

-- Política para DELETE: usuarios autenticados pueden eliminar sus propiedades
CREATE POLICY "Usuarios autenticados pueden eliminar propiedades" ON crm.propiedad
FOR DELETE USING (auth.role() = 'authenticated' AND created_by = auth.uid());

-- Comentarios para documentar
COMMENT ON TABLE crm.propiedad IS 'Tabla de propiedades inmobiliarias (lotes, casas, departamentos, oficinas, etc.)';
COMMENT ON COLUMN crm.propiedad.codigo IS 'Código único de la propiedad';
COMMENT ON COLUMN crm.propiedad.tipo IS 'Tipo de propiedad: lote, casa, departamento, oficina, otro';
COMMENT ON COLUMN crm.propiedad.identificacion_interna IS 'Identificación interna de la propiedad';
COMMENT ON COLUMN crm.propiedad.ubicacion IS 'Datos de ubicación (dirección, geolocalización, etc.)';
COMMENT ON COLUMN crm.propiedad.superficie IS 'Datos de superficie (total, cubierta, semicubierta, etc.)';
COMMENT ON COLUMN crm.propiedad.estado_comercial IS 'Estado comercial: disponible, reservado, vendido, bloqueado';
COMMENT ON COLUMN crm.propiedad.precio IS 'Precio de la propiedad';
COMMENT ON COLUMN crm.propiedad.moneda IS 'Moneda del precio (PEN, USD, EUR)';
COMMENT ON COLUMN crm.propiedad.opciones_financiacion IS 'Opciones de financiación disponibles';
COMMENT ON COLUMN crm.propiedad.marketing IS 'Datos de marketing (fotos, renders, etiquetas, etc.)';
COMMENT ON COLUMN crm.propiedad.data IS 'Datos adicionales específicos del tipo de propiedad';
