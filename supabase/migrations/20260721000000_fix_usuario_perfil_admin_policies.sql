-- Fix stale admin RLS policies on crm.usuario_perfil.
--
-- Root cause: crm.usuario_perfil carried two admin-facing RLS policies —
-- "admins_ven_todos_perfiles" (FOR ALL, 20250115000000_roles_usuarios.sql)
-- and "coordinadores_gestionan_vendedores" (FOR ALL,
-- 20250115000001_add_coordinator_role.sql) — both predating the permissions
-- matrix rewrite in 20250326000008_permissions_matrix.sql:
--   * "admins_ven_todos_perfiles" was gated on
--     crm.tiene_permiso(auth.uid(), 'gestionar_usuarios'), a permission name
--     that migration deleted from rol.permisos entirely. Current admin
--     permission names are usuarios.ver / usuarios.crear / usuarios.editar /
--     usuarios.eliminar / usuarios.activar_desactivar (see that migration's
--     admin_permisos array, lines ~72-78).
--   * "coordinadores_gestionan_vendedores" used `CREATE POLICY IF NOT EXISTS`,
--     which is not valid Postgres syntax — it was very likely never created
--     at all.
--
-- Net effect: crm.tiene_permiso(auth.uid(), 'gestionar_usuarios') always
-- evaluates to false, so an admin's RLS-bound `.update()` on another user's
-- usuario_perfil row matches 0 rows — with NO error surfaced by
-- PostgREST/supabase-js. Affected routes returned HTTP 200 while silently
-- persisting nothing (e.g. PATCH /api/admin/usuarios,
-- PATCH /api/admin/usuarios/bulk-coordinador). Those two routes have also
-- been switched to the service-role client for this specific write as
-- defense in depth (they are already esAdmin()-gated in app code); this
-- migration restores correct RLS behavior for SELECT/INSERT/UPDATE/DELETE
-- for any other RLS-bound caller.
--
-- OUT OF SCOPE: "usuarios_ven_su_perfil" (own-row FOR ALL) is intentionally
-- left untouched by this migration. It has a known self-service escalation
-- gap (a user can update their own rol_id, among other fields, through that
-- policy) — that is a separate, pre-existing issue tracked as a follow-up.
-- Changing it here risks breaking legitimate self-service flows (e.g.
-- ultimo_acceso, avatar_url, firma_url updates) that are out of scope for
-- this hotfix.
--
-- SELECT SCOPING (review fix): 'usuarios.ver' alone is NOT admin-exclusive —
-- coordinador_permisos includes 'usuarios.ver' (20250326000008_permissions_matrix.sql,
-- coordinador_permisos array) and ROL_GERENTE is assigned that exact same
-- permisos array (`UPDATE crm.rol SET permisos = coordinador_permisos ...
-- WHERE nombre = 'ROL_GERENTE'` in that migration). A SELECT policy gated on
-- 'usuarios.ver' alone would therefore let a coordinador read EVERY user's
-- full profile (DNI, comisión, meta_mensual_ventas, etc.), contradicting the
-- team-scoped visibility coordinadores get everywhere else post-coordinador-
-- teams (20260720000001_coordinador_teams_rls.sql and follow-ups). Add
-- `AND crm.es_visibilidad_global()` — that helper (20260629000000_secure_authz_p1.sql)
-- is true only for ROL_ADMIN/ROL_GERENTE/ROL_COORDINADOR_VENTAS as a role
-- check, but its CALLERS across the codebase gate coordinador-team-scoped
-- reads separately; here it is combined with 'usuarios.ver' specifically to
-- keep this policy at the admin/gerente global-visibility tier (a
-- coordinador who is not also flagged for global visibility does not get
-- blanket profile reads through this policy). UPDATE/INSERT/DELETE are left
-- gated on 'usuarios.editar'/'usuarios.crear'/'usuarios.eliminar' alone
-- (admin-only permissions in the matrix, not held by coordinador/gerente).

DROP POLICY IF EXISTS "admins_ven_todos_perfiles" ON crm.usuario_perfil;
DROP POLICY IF EXISTS "coordinadores_gestionan_vendedores" ON crm.usuario_perfil;

-- Idempotent: safe to re-run this migration.
DROP POLICY IF EXISTS usuario_perfil_admin_select ON crm.usuario_perfil;
DROP POLICY IF EXISTS usuario_perfil_admin_update ON crm.usuario_perfil;
DROP POLICY IF EXISTS usuario_perfil_admin_insert ON crm.usuario_perfil;
DROP POLICY IF EXISTS usuario_perfil_admin_delete ON crm.usuario_perfil;

CREATE POLICY usuario_perfil_admin_select
  ON crm.usuario_perfil
  FOR SELECT
  USING (
    crm.tiene_permiso(auth.uid(), 'usuarios.ver')
    AND crm.es_visibilidad_global()
  );

CREATE POLICY usuario_perfil_admin_update
  ON crm.usuario_perfil
  FOR UPDATE
  USING (crm.tiene_permiso(auth.uid(), 'usuarios.editar'))
  WITH CHECK (crm.tiene_permiso(auth.uid(), 'usuarios.editar'));

CREATE POLICY usuario_perfil_admin_insert
  ON crm.usuario_perfil
  FOR INSERT
  WITH CHECK (crm.tiene_permiso(auth.uid(), 'usuarios.crear'));

CREATE POLICY usuario_perfil_admin_delete
  ON crm.usuario_perfil
  FOR DELETE
  USING (crm.tiene_permiso(auth.uid(), 'usuarios.eliminar'));
