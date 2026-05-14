-- Drop triggers DB de recordatorios automáticos.
-- Razón: duplicación con server action sincronizarRecordatorioEvento (TS) que ya
-- maneja crear/actualizar/eliminar recordatorios al INSERT/UPDATE/DELETE evento.
-- Mantener ambos genera 2 recordatorios por evento (trigger con etiqueta
-- 'recordatorio_automatico' + server action sin etiqueta vía evento_id).
-- Server action gana porque: tiene más control (recordar_antes_minutos<=0,
-- fechas pasadas, idempotencia explícita) y es testeable desde TS.

BEGIN;

DROP TRIGGER IF EXISTS trigger_crear_recordatorio_automatico ON crm.evento;
DROP TRIGGER IF EXISTS trigger_actualizar_recordatorio_automatico ON crm.evento;
DROP TRIGGER IF EXISTS trigger_eliminar_recordatorio_automatico ON crm.evento;

-- Las funciones se conservan (CREATE OR REPLACE no consume espacio) por si se
-- quieren reactivar. Si se prefiere limpieza total:
-- DROP FUNCTION IF EXISTS crm.crear_recordatorio_automatico() CASCADE;
-- DROP FUNCTION IF EXISTS crm.actualizar_recordatorio_automatico() CASCADE;
-- DROP FUNCTION IF EXISTS crm.eliminar_recordatorio_automatico() CASCADE;

COMMIT;
