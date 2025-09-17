-- =========================================
-- Agregar campo planos a proyecto
-- =========================================

-- Agregar columna planos_url a la tabla proyecto
ALTER TABLE crm.proyecto 
ADD COLUMN IF NOT EXISTS planos_url TEXT;

-- Agregar comentario descriptivo
COMMENT ON COLUMN crm.proyecto.planos_url IS 'URL del plano general del proyecto inmobiliario';

-- Crear índice para búsquedas por planos (opcional)
CREATE INDEX IF NOT EXISTS idx_proyecto_planos 
ON crm.proyecto (planos_url) 
WHERE planos_url IS NOT NULL;
