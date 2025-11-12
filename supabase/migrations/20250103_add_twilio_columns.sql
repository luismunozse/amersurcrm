-- Agregar columna tw_message_sid para mensajes de Twilio
-- Esta columna guarda el Message SID que retorna Twilio cuando enviamos un mensaje

ALTER TABLE crm.marketing_mensaje
ADD COLUMN IF NOT EXISTS tw_message_sid VARCHAR(255);

-- Agregar índice para búsquedas rápidas por SID de Twilio
CREATE INDEX IF NOT EXISTS idx_marketing_mensaje_tw_message_sid
ON crm.marketing_mensaje(tw_message_sid);

-- Comentario explicativo
COMMENT ON COLUMN crm.marketing_mensaje.tw_message_sid IS
'Message SID de Twilio (ej: SMxxxxxxx). Se usa cuando los mensajes se envían vía Twilio en lugar de Meta directo.';

-- Verificación
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'crm'
  AND table_name = 'marketing_mensaje'
  AND column_name IN ('wa_message_id', 'tw_message_sid')
ORDER BY column_name;
