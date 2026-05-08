-- =====================================================
-- MARKETING REDISEÑO: tabla marketing_envio_log
-- Registra cada apertura de wa.me y permite trackear estado manual
-- (enviado, respondido, descartado).
-- =====================================================

CREATE TABLE IF NOT EXISTS crm.marketing_envio_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  template_id UUID REFERENCES crm.marketing_template(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES crm.cliente(id) ON DELETE CASCADE,
  campana_id UUID REFERENCES crm.marketing_campana(id) ON DELETE SET NULL,
  recordatorio_id UUID REFERENCES crm.recordatorio(id) ON DELETE SET NULL,

  vendedor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendedor_username VARCHAR(80),

  telefono VARCHAR(20) NOT NULL,
  variables_valores JSONB NOT NULL DEFAULT '{}'::jsonb,
  mensaje_renderizado TEXT NOT NULL,

  estado VARCHAR(20) NOT NULL DEFAULT 'abierto'
    CHECK (estado IN ('abierto', 'enviado', 'respondido', 'descartado')),

  abierto_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  marcado_enviado_at TIMESTAMPTZ,
  marcado_respondido_at TIMESTAMPTZ,
  marcado_descartado_at TIMESTAMPTZ,
  notas TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_envio_log_cliente ON crm.marketing_envio_log(cliente_id);
CREATE INDEX IF NOT EXISTS idx_envio_log_vendedor ON crm.marketing_envio_log(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_envio_log_template ON crm.marketing_envio_log(template_id);
CREATE INDEX IF NOT EXISTS idx_envio_log_campana ON crm.marketing_envio_log(campana_id);
CREATE INDEX IF NOT EXISTS idx_envio_log_recordatorio ON crm.marketing_envio_log(recordatorio_id);
CREATE INDEX IF NOT EXISTS idx_envio_log_estado ON crm.marketing_envio_log(estado);
CREATE INDEX IF NOT EXISTS idx_envio_log_created ON crm.marketing_envio_log(created_at DESC);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION crm.set_envio_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_envio_log_updated_at ON crm.marketing_envio_log;
CREATE TRIGGER trigger_envio_log_updated_at
  BEFORE UPDATE ON crm.marketing_envio_log
  FOR EACH ROW
  EXECUTE FUNCTION crm.set_envio_log_updated_at();

-- RLS
ALTER TABLE crm.marketing_envio_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS envio_log_select ON crm.marketing_envio_log;
CREATE POLICY envio_log_select ON crm.marketing_envio_log
  FOR SELECT USING (
    vendedor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM crm.usuario_perfil up
      JOIN crm.rol r ON r.id = up.rol_id
      WHERE up.id = auth.uid()
        AND r.nombre IN ('ROL_ADMIN', 'ROL_GERENTE')
    )
  );

DROP POLICY IF EXISTS envio_log_insert ON crm.marketing_envio_log;
CREATE POLICY envio_log_insert ON crm.marketing_envio_log
  FOR INSERT WITH CHECK (vendedor_id = auth.uid());

DROP POLICY IF EXISTS envio_log_update ON crm.marketing_envio_log;
CREATE POLICY envio_log_update ON crm.marketing_envio_log
  FOR UPDATE USING (
    vendedor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM crm.usuario_perfil up
      JOIN crm.rol r ON r.id = up.rol_id
      WHERE up.id = auth.uid()
        AND r.nombre IN ('ROL_ADMIN', 'ROL_GERENTE')
    )
  );

DROP POLICY IF EXISTS envio_log_delete ON crm.marketing_envio_log;
CREATE POLICY envio_log_delete ON crm.marketing_envio_log
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM crm.usuario_perfil up
      JOIN crm.rol r ON r.id = up.rol_id
      WHERE up.id = auth.uid() AND r.nombre = 'ROL_ADMIN'
    )
  );

GRANT SELECT, INSERT, UPDATE ON crm.marketing_envio_log TO authenticated;
GRANT ALL ON crm.marketing_envio_log TO service_role;

COMMENT ON TABLE crm.marketing_envio_log IS
  'Registro de envíos de plantillas WhatsApp vía wa.me click-to-chat. Estado manual marcado por el vendedor.';

-- =====================================================
-- TRIGGER: mantener contadores de marketing_campana actualizados
-- =====================================================

CREATE OR REPLACE FUNCTION crm.fn_envio_log_actualizar_campana()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.campana_id IS NOT NULL THEN
      UPDATE crm.marketing_campana
        SET total_abiertos = COALESCE(total_abiertos, 0) + 1
      WHERE id = NEW.campana_id;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.campana_id IS NOT NULL THEN
    -- Transición a 'enviado'
    IF NEW.estado = 'enviado' AND COALESCE(OLD.estado, '') <> 'enviado' THEN
      UPDATE crm.marketing_campana
        SET total_marcados_enviados = COALESCE(total_marcados_enviados, 0) + 1
      WHERE id = NEW.campana_id;
    END IF;
    -- Transición a 'respondido'
    IF NEW.estado = 'respondido' AND COALESCE(OLD.estado, '') <> 'respondido' THEN
      UPDATE crm.marketing_campana
        SET total_respondidos = COALESCE(total_respondidos, 0) + 1
      WHERE id = NEW.campana_id;
    END IF;
    -- Transición a 'descartado'
    IF NEW.estado = 'descartado' AND COALESCE(OLD.estado, '') <> 'descartado' THEN
      UPDATE crm.marketing_campana
        SET total_descartados = COALESCE(total_descartados, 0) + 1
      WHERE id = NEW.campana_id;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_envio_log_actualizar_campana ON crm.marketing_envio_log;
CREATE TRIGGER trigger_envio_log_actualizar_campana
  AFTER INSERT OR UPDATE ON crm.marketing_envio_log
  FOR EACH ROW
  EXECUTE FUNCTION crm.fn_envio_log_actualizar_campana();
