-- =========================================
-- Logo y galería de imágenes para proyectos
-- =========================================

ALTER TABLE crm.proyecto
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS galeria_imagenes JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN crm.proyecto.logo_url IS 'URL del logo principal del proyecto';
COMMENT ON COLUMN crm.proyecto.galeria_imagenes IS 'Listado JSON de imágenes adicionales [{url,path,nombre,created_at}]';

ALTER TABLE crm.proyecto
  ADD CONSTRAINT proyecto_galeria_formato_array
  CHECK (jsonb_typeof(galeria_imagenes) = 'array');

CREATE INDEX IF NOT EXISTS idx_proyecto_logo_url
  ON crm.proyecto (logo_url)
  WHERE logo_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_proyecto_galeria_imagenes
  ON crm.proyecto
  USING GIN (galeria_imagenes);
