-- =========================================
-- Agregar campo imagen a proyecto
-- =========================================

-- Agregar columna imagen_url a la tabla proyecto
ALTER TABLE crm.proyecto 
ADD COLUMN IF NOT EXISTS imagen_url TEXT;

-- Agregar comentario descriptivo
COMMENT ON COLUMN crm.proyecto.imagen_url IS 'URL de la imagen principal del proyecto inmobiliario';

-- Crear índice para búsquedas por imagen (opcional)
CREATE INDEX IF NOT EXISTS idx_proyecto_imagen 
ON crm.proyecto (imagen_url) 
WHERE imagen_url IS NOT NULL;
