-- =====================================================
-- CONFIGURAR CREDENCIALES DE WHATSAPP BUSINESS API
-- =====================================================
--
-- INSTRUCCIONES:
-- 1. Reemplaza los valores entre <ANGLE_BRACKETS> con tus credenciales reales
-- 2. Ejecuta este script en Supabase SQL Editor
-- 3. Verifica que se haya creado correctamente
--
-- =====================================================

-- Insertar credenciales de WhatsApp Business
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

  -- REEMPLAZA AQUÍ CON TU APP ID (desde Meta Developers)
  '<TU_APP_ID>',

  -- REEMPLAZA AQUÍ CON TU PHONE NUMBER ID
  '<TU_PHONE_NUMBER_ID>',

  -- REEMPLAZA AQUÍ CON TU ACCESS TOKEN (el largo)
  '<TU_ACCESS_TOKEN>',

  -- REEMPLAZA AQUÍ CON UN WEBHOOK VERIFY TOKEN (crea uno aleatorio)
  -- Ejemplo: 'amersur_webhook_secret_2025_xyz123'
  '<TU_WEBHOOK_VERIFY_TOKEN>',

  true,                    -- activo
  true,                    -- es_sandbox (true = modo desarrollo/prueba)
  15,                      -- max 15 mensajes por segundo
  1000                     -- max 1,000 mensajes por día (tier 1)
)
RETURNING id, nombre, canal_tipo, activo;

-- =====================================================
-- VERIFICAR CREDENCIALES GUARDADAS
-- =====================================================

SELECT
  id,
  canal_tipo,
  nombre,
  descripcion,
  phone_number_id,
  LEFT(access_token, 20) || '...' as access_token_preview,
  activo,
  es_sandbox,
  max_messages_per_second,
  max_messages_per_day,
  created_at
FROM crm.marketing_channel_credential
WHERE canal_tipo = 'whatsapp'
ORDER BY created_at DESC
LIMIT 1;

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
--
-- 1. ACCESS TOKEN:
--    - Si usas token temporal (24h): Tendrás que renovarlo diariamente
--    - Si usas token permanente: Rótalo cada 60-90 días por seguridad
--
-- 2. ES_SANDBOX = true:
--    - Solo puedes enviar a 5 números de prueba
--    - Debes agregar esos números en Meta Developers
--    - Cambia a false cuando pases a producción
--
-- 3. WEBHOOK_VERIFY_TOKEN:
--    - Lo usarás después para configurar el webhook en Meta
--    - Guárdalo de forma segura
--    - Ejemplo: openssl rand -base64 32
--
-- 4. MAX_MESSAGES_PER_DAY:
--    - Tier 1: 1,000 mensajes/día
--    - Tier 2: 10,000 mensajes/día
--    - Tier 3: 100,000 mensajes/día
--    - Ajusta según tu tier actual
--
-- =====================================================
