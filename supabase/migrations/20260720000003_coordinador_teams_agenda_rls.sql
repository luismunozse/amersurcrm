-- supabase/migrations/20260720000003_coordinador_teams_agenda_rls.sql
-- Coordinador Teams follow-up: crm.evento/crm.recordatorio RLS policies
-- "Privilegiados ven todos los eventos"/"...recordatorios" (introduced in
-- 20260512000003_rls_agenda_admin.sql) inlined the role check
-- `r.nombre IN ('ROL_ADMIN','ROL_GERENTE','ROL_COORDINADOR_VENTAS')` instead
-- of routing through a shared helper, so it was missed by the branch's RLS
-- audit and still grants ROL_COORDINADOR_VENTAS org-wide read+write on
-- agenda — disagreeing with the app layer, which is already team-scoped
-- (see src/app/dashboard/actions/sidebar-badges.ts, fixed in
-- 20260720000001/2). This migration narrows the coordinador branch to their
-- team (self + direct reports via usuario_perfil.coordinador_id), keyed on
-- vendedor_id (UUID) since evento/recordatorio — unlike cliente — do not
-- have a username column to key off crm.equipo_usernames(). Admin/gerente
-- keep unrestricted global access, unchanged. The separate
-- "Vendedores ven sus eventos"/"...sus recordatorios" own-row policies
-- (20250115000001_agenda_recordatorios.sql, vendedor_id = auth.uid()) are
-- untouched — Postgres OR's multiple permissive FOR ALL policies together,
-- so a plain vendedor's own-row access does not depend on this policy at
-- all.

BEGIN;

-- ============================================================
-- crm.evento: admin/gerente stay global; coordinador narrowed to their team
-- (self + usuario_perfil rows where coordinador_id = auth.uid()).
-- ============================================================

DROP POLICY IF EXISTS "Privilegiados ven todos los eventos" ON crm.evento;
CREATE POLICY "Privilegiados ven todos los eventos" ON crm.evento
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM crm.usuario_perfil up
      JOIN crm.rol r ON up.rol_id = r.id
      WHERE up.id::text = auth.uid()::text
        AND r.nombre IN ('ROL_ADMIN','ROL_GERENTE')
    )
    OR (
      EXISTS (
        SELECT 1
        FROM crm.usuario_perfil up
        JOIN crm.rol r ON up.rol_id = r.id
        WHERE up.id::text = auth.uid()::text
          AND r.nombre = 'ROL_COORDINADOR_VENTAS'
      )
      AND vendedor_id IN (
        SELECT up.id FROM crm.usuario_perfil up WHERE up.coordinador_id = auth.uid()
        UNION
        SELECT auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM crm.usuario_perfil up
      JOIN crm.rol r ON up.rol_id = r.id
      WHERE up.id::text = auth.uid()::text
        AND r.nombre IN ('ROL_ADMIN','ROL_GERENTE')
    )
    OR (
      EXISTS (
        SELECT 1
        FROM crm.usuario_perfil up
        JOIN crm.rol r ON up.rol_id = r.id
        WHERE up.id::text = auth.uid()::text
          AND r.nombre = 'ROL_COORDINADOR_VENTAS'
      )
      AND vendedor_id IN (
        SELECT up.id FROM crm.usuario_perfil up WHERE up.coordinador_id = auth.uid()
        UNION
        SELECT auth.uid()
      )
    )
  );

-- ============================================================
-- crm.recordatorio: identical treatment.
-- ============================================================

DROP POLICY IF EXISTS "Privilegiados ven todos los recordatorios" ON crm.recordatorio;
CREATE POLICY "Privilegiados ven todos los recordatorios" ON crm.recordatorio
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM crm.usuario_perfil up
      JOIN crm.rol r ON up.rol_id = r.id
      WHERE up.id::text = auth.uid()::text
        AND r.nombre IN ('ROL_ADMIN','ROL_GERENTE')
    )
    OR (
      EXISTS (
        SELECT 1
        FROM crm.usuario_perfil up
        JOIN crm.rol r ON up.rol_id = r.id
        WHERE up.id::text = auth.uid()::text
          AND r.nombre = 'ROL_COORDINADOR_VENTAS'
      )
      AND vendedor_id IN (
        SELECT up.id FROM crm.usuario_perfil up WHERE up.coordinador_id = auth.uid()
        UNION
        SELECT auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM crm.usuario_perfil up
      JOIN crm.rol r ON up.rol_id = r.id
      WHERE up.id::text = auth.uid()::text
        AND r.nombre IN ('ROL_ADMIN','ROL_GERENTE')
    )
    OR (
      EXISTS (
        SELECT 1
        FROM crm.usuario_perfil up
        JOIN crm.rol r ON up.rol_id = r.id
        WHERE up.id::text = auth.uid()::text
          AND r.nombre = 'ROL_COORDINADOR_VENTAS'
      )
      AND vendedor_id IN (
        SELECT up.id FROM crm.usuario_perfil up WHERE up.coordinador_id = auth.uid()
        UNION
        SELECT auth.uid()
      )
    )
  );

COMMENT ON POLICY "Privilegiados ven todos los eventos" ON crm.evento IS
  'ROL_ADMIN/ROL_GERENTE: unrestricted (unchanged). ROL_COORDINADOR_VENTAS: narrowed from org-wide to their team (self + usuario_perfil.coordinador_id = auth.uid()), keyed on vendedor_id (UUID) since evento has no username column. Other roles fall through to "Vendedores ven sus eventos" (own vendedor_id = auth.uid()), untouched.';

COMMENT ON POLICY "Privilegiados ven todos los recordatorios" ON crm.recordatorio IS
  'ROL_ADMIN/ROL_GERENTE: unrestricted (unchanged). ROL_COORDINADOR_VENTAS: narrowed from org-wide to their team (self + usuario_perfil.coordinador_id = auth.uid()), keyed on vendedor_id (UUID) since recordatorio has no username column. Other roles fall through to "Vendedores ven sus recordatorios" (own vendedor_id = auth.uid()), untouched.';

COMMIT;
