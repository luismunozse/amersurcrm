-- =====================================================
-- HACER CARPETA_ID OPCIONAL EN TABLA DOCUMENTO
-- Convertir a skin puro de Google Drive
-- =====================================================

-- La estructura de carpetas viene directamente de Google Drive
-- El campo carpeta_id (carpetas locales del CRM) se vuelve opcional
ALTER TABLE crm.documento
  ALTER COLUMN carpeta_id DROP NOT NULL;

-- Agregar índice para navegación por carpetas de Google Drive
-- Esto ayudará a filtrar documentos por carpeta de Drive
CREATE INDEX IF NOT EXISTS idx_documento_google_folder
  ON crm.documento((google_drive_file_id IS NOT NULL));

-- Comentarios explicativos
COMMENT ON COLUMN crm.documento.carpeta_id IS
  'Carpeta local del CRM (opcional). Para documentos de Google Drive, usar la estructura nativa de Drive.';

COMMENT ON COLUMN crm.documento.google_drive_file_id IS
  'ID del archivo en Google Drive. Los archivos mantienen su estructura de carpetas nativa de Drive via el campo parents en la metadata.';
