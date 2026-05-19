-- Agrega vendedor_asignado a lote (username del vendedor responsable)
-- Permite asignación masiva y aparece en reportes por vendedor

ALTER TABLE crm.lote
  ADD COLUMN IF NOT EXISTS vendedor_asignado TEXT;

CREATE INDEX IF NOT EXISTS idx_lote_vendedor_asignado
  ON crm.lote (vendedor_asignado)
  WHERE vendedor_asignado IS NOT NULL;

COMMENT ON COLUMN crm.lote.vendedor_asignado IS 'Username del vendedor responsable del lote';
