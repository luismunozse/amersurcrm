-- Permite que usuarios autenticados eliminen procesos de adquisicion.
-- La autorizacion de admin se enforce en el server action eliminarProceso(),
-- siguiendo el mismo patron que las policies UPDATE existentes.
--
-- Las tablas hijas (proceso_etapa, proceso_checklist_item) se eliminan
-- por cascada via FK ON DELETE CASCADE, lo que en PostgreSQL ignora RLS
-- al ejecutarse como operacion interna del constraint.

BEGIN;

CREATE POLICY "Autenticados eliminan procesos"
  ON crm.proceso_adquisicion
  FOR DELETE
  TO authenticated
  USING (true);

COMMIT;
