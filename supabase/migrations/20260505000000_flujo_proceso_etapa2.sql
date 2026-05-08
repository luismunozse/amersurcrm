-- Etapa 2 del flujo Sperant: panel de detalle por etapa.
-- Agrega estados de revision (auditoria admin/coord), observaciones,
-- datos especificos por etapa (JSONB para extension futura), y metadata
-- de documentos subidos al checklist + bucket de storage privado.

BEGIN;

CREATE SCHEMA IF NOT EXISTS crm;

-- ============================================================
-- 1. proceso_etapa: campos de revision y datos especificos
-- ============================================================
ALTER TABLE crm.proceso_etapa
  ADD COLUMN IF NOT EXISTS estado_revision VARCHAR(20) NOT NULL DEFAULT 'pendiente';

ALTER TABLE crm.proceso_etapa
  DROP CONSTRAINT IF EXISTS proceso_etapa_estado_revision_check;

ALTER TABLE crm.proceso_etapa
  ADD CONSTRAINT proceso_etapa_estado_revision_check
  CHECK (estado_revision IN ('pendiente', 'en_revision', 'aprobado', 'observado'));

ALTER TABLE crm.proceso_etapa
  ADD COLUMN IF NOT EXISTS observaciones TEXT;

ALTER TABLE crm.proceso_etapa
  ADD COLUMN IF NOT EXISTS fecha_revision TIMESTAMPTZ;

ALTER TABLE crm.proceso_etapa
  ADD COLUMN IF NOT EXISTS revisado_por VARCHAR(50);

ALTER TABLE crm.proceso_etapa
  ADD COLUMN IF NOT EXISTS datos_especificos JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN crm.proceso_etapa.estado_revision IS
  'Estado de auditoria por admin/coord: pendiente -> en_revision -> aprobado/observado. Informativo, no bloquea avanzarEtapa en este sprint.';
COMMENT ON COLUMN crm.proceso_etapa.observaciones IS
  'Observaciones libres del revisor (admin/coord) o del vendedor sobre la etapa.';
COMMENT ON COLUMN crm.proceso_etapa.datos_especificos IS
  'Campos custom por etapa (banco, monto cuota inicial, fecha firma, etc.). Schema definido por la plantilla.';

-- ============================================================
-- 2. proceso_checklist_item: metadata de documento
-- ============================================================
ALTER TABLE crm.proceso_checklist_item
  ADD COLUMN IF NOT EXISTS documento_nombre VARCHAR(255);

ALTER TABLE crm.proceso_checklist_item
  ADD COLUMN IF NOT EXISTS documento_size INTEGER;

ALTER TABLE crm.proceso_checklist_item
  ADD COLUMN IF NOT EXISTS documento_subido_por VARCHAR(50);

ALTER TABLE crm.proceso_checklist_item
  ADD COLUMN IF NOT EXISTS documento_subido_at TIMESTAMPTZ;

COMMENT ON COLUMN crm.proceso_checklist_item.documento_nombre IS 'Nombre original del archivo subido.';
COMMENT ON COLUMN crm.proceso_checklist_item.documento_size IS 'Tamano del archivo en bytes.';

-- ============================================================
-- 3. Bucket de storage privado para documentos del proceso.
--    No publico: acceso solo via signed URL desde server actions.
--    Limite 10MB; mimes permitidos: pdf, jpg, png, webp.
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'proceso-documentos',
  'proceso-documentos',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated puede leer documentos de proceso" ON storage.objects;
CREATE POLICY "Authenticated puede leer documentos de proceso"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'proceso-documentos');

DROP POLICY IF EXISTS "Authenticated puede subir documentos de proceso" ON storage.objects;
CREATE POLICY "Authenticated puede subir documentos de proceso"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'proceso-documentos');

DROP POLICY IF EXISTS "Authenticated puede eliminar documentos de proceso" ON storage.objects;
CREATE POLICY "Authenticated puede eliminar documentos de proceso"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'proceso-documentos');

-- ============================================================
-- 4. Indice para queries por estado_revision
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_proceso_etapa_revision
  ON crm.proceso_etapa(estado_revision)
  WHERE estado_revision IN ('en_revision', 'observado');

COMMIT;
