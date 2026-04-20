-- Permite que usuarios autenticados actualicen checklist, etapas y procesos.
-- Fix: los checkboxes del checklist del proceso de adquisicion no se podian marcar
-- porque RLS solo permitia escribir a service_role. PostgREST devolvia 200
-- con 0 rows affected (silenciosamente bloqueado), y la UI no mostraba error.
--
-- Seguridad: el acceso a estos registros ya se filtra en el SELECT policy de
-- proceso_adquisicion (cliente_id pertenece al vendedor o rol privilegiado).
-- Permitimos UPDATE a cualquier authenticated porque los campos editables
-- (completado, fechas, notas) son de trabajo diario del vendedor.

BEGIN;

-- 1. proceso_checklist_item: permitir marcar/desmarcar items y subir documentos.
CREATE POLICY "Autenticados actualizan checklist"
  ON crm.proceso_checklist_item
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. proceso_etapa: permitir completar/omitir/avanzar etapas.
CREATE POLICY "Autenticados actualizan etapas"
  ON crm.proceso_etapa
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. proceso_adquisicion: permitir cambiar etapa_actual, estado, fecha_cierre.
CREATE POLICY "Autenticados actualizan procesos"
  ON crm.proceso_adquisicion
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

COMMIT;
