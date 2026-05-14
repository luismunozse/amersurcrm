-- Mejoras a crm.marketing_template:
--   1. RLS: agregar policy SELECT para vendedor/coordinador (hoy solo admin lee).
--   2. Soft-delete: columna eliminado_at + index parcial. Conserva FK histórica
--      desde marketing_envio_log.template_id (hoy DELETE pierde referencia).
--   3. Auditoría: columna updated_by + trigger automático que la mantiene.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. RLS: SELECT para vendedores y coordinadores
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS marketing_template_vendedor_select ON crm.marketing_template;
CREATE POLICY marketing_template_vendedor_select ON crm.marketing_template
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM crm.usuario_perfil up
      JOIN crm.rol r ON r.id = up.rol_id
      WHERE up.id = auth.uid()
        AND r.nombre IN ('ROL_ADMIN', 'ROL_GERENTE', 'ROL_COORDINADOR', 'ROL_VENDEDOR')
    )
  );

GRANT SELECT ON crm.marketing_template TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Soft-delete: columna eliminado_at
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE crm.marketing_template
  ADD COLUMN IF NOT EXISTS eliminado_at TIMESTAMPTZ NULL;

-- Index parcial: solo filas activas (la mayoría de queries filtran por NULL).
CREATE INDEX IF NOT EXISTS idx_marketing_template_activas
  ON crm.marketing_template (created_at DESC)
  WHERE eliminado_at IS NULL;

COMMENT ON COLUMN crm.marketing_template.eliminado_at IS
  'Soft-delete. NULL = activa. Conserva FK histórica desde marketing_envio_log.template_id.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Auditoría: columna updated_by
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE crm.marketing_template
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN crm.marketing_template.updated_by IS
  'Último usuario que editó. Mantenido por trigger marketing_template_set_updated_by.';

-- Trigger para auto-poblar updated_by con auth.uid() en cada UPDATE.
CREATE OR REPLACE FUNCTION crm.set_marketing_template_updated_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_by := auth.uid();
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS marketing_template_set_updated_by ON crm.marketing_template;
CREATE TRIGGER marketing_template_set_updated_by
  BEFORE UPDATE ON crm.marketing_template
  FOR EACH ROW
  EXECUTE FUNCTION crm.set_marketing_template_updated_by();

COMMIT;
