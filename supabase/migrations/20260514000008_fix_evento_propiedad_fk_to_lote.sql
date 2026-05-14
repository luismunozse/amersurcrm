-- Fix: evento.propiedad_id y recordatorio.propiedad_id apuntan a crm.propiedad,
-- pero la UI (LoteSearch en _EventoModal) guarda lote.id. Resultado: FK violation
-- "evento_propiedad_id_fkey" al insertar evento con lote seleccionado (común en
-- eventos tipo 'visita'). Repuntar FK a crm.lote(id).

BEGIN;

ALTER TABLE crm.evento
  DROP CONSTRAINT IF EXISTS evento_propiedad_id_fkey;

ALTER TABLE crm.evento
  ADD CONSTRAINT evento_propiedad_id_fkey
  FOREIGN KEY (propiedad_id) REFERENCES crm.lote(id) ON DELETE SET NULL;

ALTER TABLE crm.recordatorio
  DROP CONSTRAINT IF EXISTS recordatorio_propiedad_id_fkey;

ALTER TABLE crm.recordatorio
  ADD CONSTRAINT recordatorio_propiedad_id_fkey
  FOREIGN KEY (propiedad_id) REFERENCES crm.lote(id) ON DELETE SET NULL;

COMMIT;
