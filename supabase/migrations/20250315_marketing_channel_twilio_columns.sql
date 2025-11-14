-- =====================================================
-- Extender credenciales de marketing para soportar Twilio
-- =====================================================
ALTER TABLE crm.marketing_channel_credential
ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'meta';

ALTER TABLE crm.marketing_channel_credential
ADD COLUMN IF NOT EXISTS account_sid VARCHAR(255),
ADD COLUMN IF NOT EXISTS auth_token TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_from VARCHAR(32),
ADD COLUMN IF NOT EXISTS sms_from VARCHAR(32),
ADD COLUMN IF NOT EXISTS messaging_service_sid VARCHAR(255),
ADD COLUMN IF NOT EXISTS extras JSONB DEFAULT '{}'::jsonb;

-- Normalizar registros existentes
UPDATE crm.marketing_channel_credential
SET provider = COALESCE(provider, 'meta')
WHERE provider IS NULL;

COMMENT ON COLUMN crm.marketing_channel_credential.provider IS 'Proveedor del canal (meta | twilio | ...).';
COMMENT ON COLUMN crm.marketing_channel_credential.account_sid IS 'Account SID de Twilio.';
COMMENT ON COLUMN crm.marketing_channel_credential.auth_token IS 'Auth token o API key encriptada.';
COMMENT ON COLUMN crm.marketing_channel_credential.whatsapp_from IS 'Número remitente de WhatsApp (formato whatsapp:+1XXX).';
COMMENT ON COLUMN crm.marketing_channel_credential.sms_from IS 'Número remitente para SMS.';
COMMENT ON COLUMN crm.marketing_channel_credential.messaging_service_sid IS 'Messaging Service SID (opcional) para SMS.';
