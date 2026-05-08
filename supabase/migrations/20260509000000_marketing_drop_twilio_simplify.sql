-- =====================================================
-- MARKETING REDISEÑO: drop Twilio + simplificar
-- Removes Twilio/Meta API integration, conversaciones, automatizaciones.
-- Plantillas pasan a ser solo texto + variables, enviables vía wa.me.
-- =====================================================

-- ----------------------------------------------------------------------
-- PASO 1: Eliminar policies dependientes
-- ----------------------------------------------------------------------
DROP POLICY IF EXISTS marketing_admin_all ON crm.marketing_channel_credential;
DROP POLICY IF EXISTS marketing_conversacion_vendedor_select ON crm.marketing_conversacion;
DROP POLICY IF EXISTS marketing_conversacion_vendedor_update ON crm.marketing_conversacion;
DROP POLICY IF EXISTS marketing_mensaje_vendedor_select ON crm.marketing_mensaje;
DROP POLICY IF EXISTS marketing_automatizacion_admin_all ON crm.marketing_automatizacion;
DROP POLICY IF EXISTS marketing_event_log_admin_select ON crm.marketing_event_log;

-- Triggers/functions Twilio
DROP TRIGGER IF EXISTS trigger_actualizar_sesion_whatsapp ON crm.marketing_mensaje;
DROP FUNCTION IF EXISTS crm.actualizar_sesion_whatsapp() CASCADE;
DROP FUNCTION IF EXISTS crm.cerrar_sesiones_expiradas() CASCADE;
DROP FUNCTION IF EXISTS crm.normalizar_telefono_e164(TEXT, TEXT) CASCADE;

-- ----------------------------------------------------------------------
-- PASO 2: DROP tablas Twilio/Meta
-- ----------------------------------------------------------------------
DROP TABLE IF EXISTS crm.marketing_event_log CASCADE;
DROP TABLE IF EXISTS crm.marketing_automatizacion_ejecucion CASCADE;
DROP TABLE IF EXISTS crm.marketing_automatizacion CASCADE;
DROP TABLE IF EXISTS crm.marketing_mensaje CASCADE;
DROP TABLE IF EXISTS crm.marketing_conversacion CASCADE;
DROP TABLE IF EXISTS crm.marketing_channel_credential CASCADE;

-- ----------------------------------------------------------------------
-- PASO 3: Simplificar marketing_template
-- ----------------------------------------------------------------------
ALTER TABLE crm.marketing_template
  DROP COLUMN IF EXISTS canal_tipo,
  DROP COLUMN IF EXISTS header_tipo,
  DROP COLUMN IF EXISTS header_contenido,
  DROP COLUMN IF EXISTS footer_texto,
  DROP COLUMN IF EXISTS botones,
  DROP COLUMN IF EXISTS subject,
  DROP COLUMN IF EXISTS body_html,
  DROP COLUMN IF EXISTS whatsapp_template_id,
  DROP COLUMN IF EXISTS estado_aprobacion,
  DROP COLUMN IF EXISTS motivo_rechazo,
  DROP COLUMN IF EXISTS fecha_aprobacion,
  DROP COLUMN IF EXISTS idioma;

-- Categoria pasa a ser libre (no enum WhatsApp)
ALTER TABLE crm.marketing_template
  DROP CONSTRAINT IF EXISTS marketing_template_categoria_check;

ALTER TABLE crm.marketing_template
  ALTER COLUMN categoria SET DEFAULT 'general';

-- ----------------------------------------------------------------------
-- PASO 4: Simplificar marketing_campana
-- ----------------------------------------------------------------------
ALTER TABLE crm.marketing_campana
  DROP COLUMN IF EXISTS credential_id,
  DROP COLUMN IF EXISTS max_envios_por_segundo,
  DROP COLUMN IF EXISTS es_ab_test,
  DROP COLUMN IF EXISTS ab_porcentaje_muestra,
  DROP COLUMN IF EXISTS ab_variante_ganadora,
  DROP COLUMN IF EXISTS total_entregados,
  DROP COLUMN IF EXISTS total_leidos,
  DROP COLUMN IF EXISTS total_respondidos,
  DROP COLUMN IF EXISTS total_fallidos;

ALTER TABLE crm.marketing_campana
  ADD COLUMN IF NOT EXISTS total_abiertos INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_marcados_enviados INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_respondidos INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_descartados INT NOT NULL DEFAULT 0;
