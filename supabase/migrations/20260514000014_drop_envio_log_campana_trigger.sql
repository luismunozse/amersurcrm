-- Fix: trigger fn_envio_log_actualizar_campana referencia NEW.campana_id pero
-- mig 20260513000003 dropeo columna campana_id y tabla marketing_campana. Cada
-- INSERT/UPDATE en marketing_envio_log lanza:
--   "record \"new\" has no field \"campana_id\""
-- Drop trigger + función (ya no aplican sin marketing_campana).

BEGIN;

DROP TRIGGER IF EXISTS trigger_envio_log_actualizar_campana ON crm.marketing_envio_log;
DROP FUNCTION IF EXISTS crm.fn_envio_log_actualizar_campana();

COMMIT;
