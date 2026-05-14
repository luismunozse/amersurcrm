-- Drop módulos marketing_campana y marketing_audiencia (deprecados).
-- Razón: sin API WhatsApp Business no hay envío masivo real.
-- Vendedor envía 1-a-1 vía click-to-chat. Campañas/Audiencias quedaron
-- como UI sin uso (estados RUNNING/PAUSED no automatizaban nada).
--
-- IMPACTO:
--   - Tabla marketing_envio_log conserva FK histórica vía columna campana_id.
--     Se elimina la columna porque las filas legacy no quedan huérfanas:
--     el log sigue ligado a template_id, cliente_id, vendedor_id.
--   - Si necesitas auditar campañas legacy, exporta antes de aplicar.
--
-- REVIEW ANTES DE EJECUTAR:
--   1. Confirmar que no hay reportes externos que consuman marketing_campana.
--   2. Backup de marketing_campana, marketing_audiencia, marketing_envio_log.

BEGIN;

-- 1. Quitar columnas FK de envio_log
ALTER TABLE crm.marketing_envio_log
  DROP COLUMN IF EXISTS campana_id;

-- 2. Drop tablas (CASCADE elimina índices, triggers, FKs entrantes)
DROP TABLE IF EXISTS crm.marketing_campana CASCADE;
DROP TABLE IF EXISTS crm.marketing_audiencia CASCADE;

-- 3. Drop enum EstadoCampana si quedó huérfano
DROP TYPE IF EXISTS crm.estado_campana CASCADE;
DROP TYPE IF EXISTS crm.tipo_audiencia CASCADE;

COMMIT;
