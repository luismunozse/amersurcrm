-- Agregar columna data a recordatorio para metadata adicional
ALTER TABLE crm.recordatorio ADD COLUMN IF NOT EXISTS data JSONB DEFAULT NULL;

COMMENT ON COLUMN crm.recordatorio.data IS 'Metadata adicional del recordatorio (cliente_id, propiedad_id, etc.)';
