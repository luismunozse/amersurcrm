-- Agregar columna data a la tabla lote para almacenar información adicional del wizard
ALTER TABLE crm.lote 
ADD COLUMN IF NOT EXISTS data jsonb;

-- Crear índice para búsquedas en el campo data
CREATE INDEX IF NOT EXISTS idx_lote_data ON crm.lote USING gin (data);

-- Actualizar la moneda por defecto a PEN (Soles Peruanos)
ALTER TABLE crm.lote 
ALTER COLUMN moneda SET DEFAULT 'PEN';

-- Comentario para documentar la columna data
COMMENT ON COLUMN crm.lote.data IS 'Datos adicionales del lote: fotos, plano, renders, links3D, proyecto, ubicacion, etapa, identificador, manzana, numero, condiciones, descuento';
