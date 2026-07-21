-- supabase/migrations/20260720000000_coordinador_id_equipo_usernames.sql
-- Coordinador Teams: link vendedores to a coordinador and expose the
-- resulting team as a reusable SQL function for RLS policies.

-- ============================================================
-- 1. crm.usuario_perfil.coordinador_id
-- One vendedor -> one coordinador. NULL = orphan vendedor (visible only to
-- admin/gerente, never to any coordinador). ON DELETE SET NULL so deleting
-- a coordinador account does not cascade-delete their former team members.
-- ============================================================

ALTER TABLE crm.usuario_perfil
  ADD COLUMN IF NOT EXISTS coordinador_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_usuario_perfil_coordinador_id
  ON crm.usuario_perfil(coordinador_id);

COMMENT ON COLUMN crm.usuario_perfil.coordinador_id IS
  'FK to auth.users(id): the coordinador this vendedor reports to. NULL = orphan vendedor, visible only to admin/gerente.';

-- ============================================================
-- 2. crm.equipo_usernames(uid): usernames of uid's team + uid's own
-- username (if uid is a coordinador with no team rows, returns just their
-- own username; if uid is not a coordinador, still returns their own
-- username so the function is safe to call for any role).
-- SECURITY DEFINER because usuario_perfil RLS ("usuarios_ven_su_perfil")
-- would otherwise block a coordinador from reading a team member's row.
-- ============================================================

DROP FUNCTION IF EXISTS crm.equipo_usernames(UUID);
CREATE OR REPLACE FUNCTION crm.equipo_usernames(uid UUID)
RETURNS SETOF TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, crm
AS $$
  SELECT username FROM crm.usuario_perfil
  WHERE coordinador_id = uid AND username IS NOT NULL
  UNION
  SELECT username FROM crm.usuario_perfil
  WHERE id = uid AND username IS NOT NULL;
$$;

COMMENT ON FUNCTION crm.equipo_usernames(UUID) IS
  'Usernames of the vendedores reporting to uid, plus uid''s own username. Used by RLS policies to scope coordinador visibility to their team.';

GRANT EXECUTE ON FUNCTION crm.equipo_usernames(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION crm.equipo_usernames(UUID) TO service_role;
