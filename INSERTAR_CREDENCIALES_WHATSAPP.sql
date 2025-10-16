-- =====================================================
-- INSERTAR CREDENCIALES DE WHATSAPP
-- =====================================================
-- INSTRUCCIONES:
-- 1. Reemplaza PHONE_NUMBER_ID y ACCESS_TOKEN con tus valores
-- 2. Copia todo y pégalo en Supabase SQL Editor
-- 3. Click en "Run"
-- =====================================================

INSERT INTO crm.marketing_channel_credential (
  canal_tipo,
  nombre,
  descripcion,
  app_id,
  phone_number_id,
  access_token,
  webhook_verify_token,
  activo,
  es_sandbox,
  max_messages_per_second,
  max_messages_per_day
) VALUES (
  'whatsapp',
  'WhatsApp Business Principal',
  'Cuenta principal de WhatsApp para AMERSUR CRM',

  '228932661150523',  -- App ID (ya lo tengo del screenshot)

  'REEMPLAZA_CON_TU_PHONE_NUMBER_ID',  -- ⬅️ CAMBIA ESTO

  'REEMPLAZA_CON_TU_ACCESS_TOKEN',     -- ⬅️ CAMBIA ESTO (empieza con EAA...)

  'amersur_webhook_2025',  -- Verify token (no lo necesitas por ahora)

  true,   -- activo
  true,   -- es_sandbox (modo desarrollo)
  15,     -- max mensajes por segundo
  1000    -- max mensajes por día
)
RETURNING id, nombre, activo;

-- =====================================================
-- VERIFICAR QUE SE GUARDÓ CORRECTAMENTE
-- =====================================================
SELECT
  id,
  canal_tipo,
  nombre,
  phone_number_id,
  LEFT(access_token, 20) || '...' as access_token_preview,
  activo,
  es_sandbox,
  created_at
FROM crm.marketing_channel_credential
WHERE canal_tipo = 'whatsapp'
ORDER BY created_at DESC
LIMIT 1;
