-- Plantillas multimedia + snippets reutilizables para Marketing WhatsApp.
--
-- 1. marketing_template.media_url + media_tipo
--    URL opcional de imagen/PDF/video que WhatsApp Web pre-renderiza
--    cuando se prepone al body con doble salto de línea.
--
-- 2. marketing_snippet
--    Fragmentos reutilizables (firma vendedor, disclaimer legal, dirección)
--    invocados con sintaxis {{>slug}} en body_texto.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Multimedia en plantillas
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE crm.marketing_template
  ADD COLUMN IF NOT EXISTS media_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS media_tipo TEXT NULL;

-- Tipos permitidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'marketing_template_media_tipo_check'
  ) THEN
    ALTER TABLE crm.marketing_template
      ADD CONSTRAINT marketing_template_media_tipo_check
      CHECK (media_tipo IS NULL OR media_tipo IN ('imagen', 'pdf', 'video', 'audio'));
  END IF;
END$$;

COMMENT ON COLUMN crm.marketing_template.media_url IS
  'URL pública del adjunto (imagen/PDF/video). WhatsApp Web genera preview al prepender al mensaje.';
COMMENT ON COLUMN crm.marketing_template.media_tipo IS
  'Categoría del adjunto: imagen|pdf|video|audio. NULL = solo texto.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Snippets reutilizables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm.marketing_snippet (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  nombre        TEXT NOT NULL,
  contenido     TEXT NOT NULL,
  descripcion   TEXT NULL,
  created_by    UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by    UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  eliminado_at  TIMESTAMPTZ NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT marketing_snippet_slug_format CHECK (slug ~ '^[a-z][a-z0-9_-]{1,40}$')
);

CREATE INDEX IF NOT EXISTS idx_marketing_snippet_activos
  ON crm.marketing_snippet (slug)
  WHERE eliminado_at IS NULL;

COMMENT ON TABLE crm.marketing_snippet IS
  'Fragmentos reutilizables invocados con sintaxis {{>slug}} desde body_texto de plantillas.';

-- Trigger updated_at + updated_by
CREATE OR REPLACE FUNCTION crm.set_marketing_snippet_updated_meta()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS marketing_snippet_set_updated_meta ON crm.marketing_snippet;
CREATE TRIGGER marketing_snippet_set_updated_meta
  BEFORE UPDATE ON crm.marketing_snippet
  FOR EACH ROW
  EXECUTE FUNCTION crm.set_marketing_snippet_updated_meta();

-- RLS
ALTER TABLE crm.marketing_snippet ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketing_snippet_select ON crm.marketing_snippet;
CREATE POLICY marketing_snippet_select ON crm.marketing_snippet
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM crm.usuario_perfil up
      JOIN crm.rol r ON r.id = up.rol_id
      WHERE up.id = auth.uid()
        AND r.nombre IN ('ROL_ADMIN', 'ROL_GERENTE', 'ROL_COORDINADOR', 'ROL_VENDEDOR')
    )
  );

DROP POLICY IF EXISTS marketing_snippet_admin_write ON crm.marketing_snippet;
CREATE POLICY marketing_snippet_admin_write ON crm.marketing_snippet
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM crm.usuario_perfil up
      JOIN crm.rol r ON r.id = up.rol_id
      WHERE up.id = auth.uid()
        AND r.nombre IN ('ROL_ADMIN', 'ROL_GERENTE')
    )
  );

GRANT SELECT ON crm.marketing_snippet TO authenticated;
GRANT INSERT, UPDATE, DELETE ON crm.marketing_snippet TO authenticated;

-- Seed: snippets útiles iniciales
INSERT INTO crm.marketing_snippet (slug, nombre, contenido, descripcion)
VALUES
  ('firma_asesor',
   'Firma asesor',
   E'Saludos cordiales,\n{{vendedor}}\nAsesor inmobiliario',
   'Cierre estándar de mensaje con firma del asesor.'),
  ('disclaimer_legal',
   'Disclaimer legal',
   'Mensaje informativo. Las condiciones pueden cambiar sin previo aviso. Para detalles, consulte con su asesor.',
   'Texto legal estándar para promociones.'),
  ('horario_atencion',
   'Horario de atención',
   'Atención: Lun-Vie 9:00-19:00 · Sáb 9:00-13:00',
   'Horario de oficina para incluir en respuestas.')
ON CONFLICT (slug) DO NOTHING;

COMMIT;
