-- Masterplan interactivo: imagen base del proyecto sobre la que se trazan los
-- polígonos de los lotes. Estructura: { url, path, width, height }.
ALTER TABLE crm.proyecto
  ADD COLUMN IF NOT EXISTS masterplan JSONB;

COMMENT ON COLUMN crm.proyecto.masterplan IS
  'Imagen base del masterplan interactivo: { url, path, width, height }. Los polígonos por lote viven en crm.lote.data.masterplan_poly.';
