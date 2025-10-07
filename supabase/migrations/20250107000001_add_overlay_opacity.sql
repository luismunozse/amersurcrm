-- Agregar columna overlay_opacity a la tabla proyecto
ALTER TABLE crm.proyecto
ADD COLUMN IF NOT EXISTS overlay_opacity NUMERIC(3,2) DEFAULT 0.7;

COMMENT ON COLUMN crm.proyecto.overlay_opacity IS 'Opacidad del plano superpuesto (0.0 a 1.0)';
