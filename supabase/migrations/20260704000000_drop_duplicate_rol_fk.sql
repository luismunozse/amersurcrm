-- Production has two FK constraints on usuario_perfil(rol_id) -> rol(id):
-- usuario_perfil_rol_id_fkey (from 20250115000000_roles_usuarios.sql) and
-- usuario_perfil_rol_fk (added ad-hoc). Duplicate relationships make every
-- PostgREST embed of `rol` fail with PGRST201, even with the !rol_id hint.
-- Keep the original constraint and drop the ad-hoc duplicate.
ALTER TABLE crm.usuario_perfil DROP CONSTRAINT IF EXISTS usuario_perfil_rol_fk;

NOTIFY pgrst, 'reload schema';
