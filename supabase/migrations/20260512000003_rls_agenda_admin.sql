-- Ampliar RLS de evento/recordatorio para incluir ROL_GERENTE y ROL_COORDINADOR_VENTAS.
-- Antes solo ROL_ADMIN veia todo. Ahora coordinador y gerente también.

BEGIN;

DROP POLICY IF EXISTS "Admins ven todos los eventos" ON crm.evento;
CREATE POLICY "Privilegiados ven todos los eventos" ON crm.evento
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM crm.usuario_perfil up
      JOIN crm.rol r ON up.rol_id = r.id
      WHERE up.id::text = auth.uid()::text
        AND r.nombre IN ('ROL_ADMIN','ROL_GERENTE','ROL_COORDINADOR_VENTAS')
    )
  );

DROP POLICY IF EXISTS "Admins ven todos los recordatorios" ON crm.recordatorio;
CREATE POLICY "Privilegiados ven todos los recordatorios" ON crm.recordatorio
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM crm.usuario_perfil up
      JOIN crm.rol r ON up.rol_id = r.id
      WHERE up.id::text = auth.uid()::text
        AND r.nombre IN ('ROL_ADMIN','ROL_GERENTE','ROL_COORDINADOR_VENTAS')
    )
  );

COMMIT;
