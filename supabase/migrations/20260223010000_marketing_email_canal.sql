-- ─────────────────────────────────────────────────────────────────────────────
-- Marketing: soporte canal email en templates + ROI en conversaciones
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Añadir canal_tipo a marketing_template para diferenciar WhatsApp vs Email
ALTER TABLE crm.marketing_template
  ADD COLUMN IF NOT EXISTS canal_tipo VARCHAR(20) NOT NULL DEFAULT 'whatsapp'
    CHECK (canal_tipo IN ('whatsapp', 'sms', 'email'));

-- 2. Subject para templates de email
ALTER TABLE crm.marketing_template
  ADD COLUMN IF NOT EXISTS subject TEXT;

-- 3. Body HTML para templates de email (body_texto se usará como texto plano/fallback)
ALTER TABLE crm.marketing_template
  ADD COLUMN IF NOT EXISTS body_html TEXT;

-- 4. Registrar conversiones en conversaciones (para ROI de campañas)
ALTER TABLE crm.marketing_conversacion
  ADD COLUMN IF NOT EXISTS conversion_registrada_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS conversion_monto DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS conversion_nota TEXT;

-- 5. Índice en canal_tipo para filtrar plantillas por canal rápidamente
CREATE INDEX IF NOT EXISTS idx_marketing_template_canal
  ON crm.marketing_template(canal_tipo);

-- 6. Índice en conversion_registrada_at para analytics de ROI
CREATE INDEX IF NOT EXISTS idx_marketing_conversacion_conversion
  ON crm.marketing_conversacion(conversion_registrada_at)
  WHERE conversion_registrada_at IS NOT NULL;

-- 7. Comentarios de documentación
COMMENT ON COLUMN crm.marketing_template.canal_tipo IS
  'Canal de envío: whatsapp (Twilio), email (Resend), sms (Twilio SMS)';
COMMENT ON COLUMN crm.marketing_template.subject IS
  'Asunto del email (solo para canal_tipo=email)';
COMMENT ON COLUMN crm.marketing_template.body_html IS
  'Cuerpo HTML del email. body_texto se usa como fallback texto plano.';
COMMENT ON COLUMN crm.marketing_conversacion.conversion_registrada_at IS
  'Fecha en que se registró una conversión atribuida a esta conversación';
