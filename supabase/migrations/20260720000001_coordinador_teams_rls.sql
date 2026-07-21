-- supabase/migrations/20260720000001_coordinador_teams_rls.sql
-- Coordinador Teams: scope ROL_COORDINADOR_VENTAS visibility to their team
-- (crm.equipo_usernames) instead of global. Admin/gerente stay global.

-- ============================================================
-- 1. crm.es_visibilidad_global(): drop coordinador. Now only admin/gerente.
-- Cascading effect: every policy that ORs this in (meta_vendedor_select,
-- comision_select, proceso_update, proceso_etapa_update, venta_select
-- from 20260706000000) stops treating coordinador as global. SELECT
-- policies on cliente-cascading tables (solicitud_postventa, entrega*,
-- proceso_adquisicion/etapa SELECT, cuota, calificacion_*, contrato) do
-- NOT regress because they call crm.p1_puede_ver_cliente() (fixed below),
-- which gets its own coordinador-team branch. Tables that only OR this
-- flag directly WITHOUT also checking p1_puede_ver_cliente/cliente
-- ownership (meta_vendedor, comision, proceso_update, proceso_etapa_update)
-- lose coordinador-team visibility until a follow-up migration adds an
-- equivalent team branch to them — tracked as a known gap, see plan risks.
-- ============================================================

CREATE OR REPLACE FUNCTION crm.es_visibilidad_global()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, crm
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM crm.usuario_perfil up
    JOIN crm.rol r ON up.rol_id = r.id
    WHERE up.id = auth.uid()
      AND r.nombre IN ('ROL_ADMIN', 'ROL_GERENTE')
  );
END;
$$;

-- ============================================================
-- 2. crm.usuario_puede_ver_cliente(): coordinador branch checked BEFORE the
-- blanket 'clientes.ver_todos' permission (which is TRUE for coordinador in
-- crm.rol.permisos — see 20250326000008_permissions_matrix.sql). Without
-- this ordering, the ver_todos check would short-circuit to global for
-- coordinador regardless of team membership.
-- ============================================================

CREATE OR REPLACE FUNCTION crm.usuario_puede_ver_cliente(p_cliente_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, crm
AS $$
DECLARE
  v_usuario_id uuid := auth.uid();
  v_rol_nombre text;
BEGIN
  IF v_usuario_id IS NULL OR p_cliente_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT r.nombre INTO v_rol_nombre
  FROM crm.usuario_perfil up
  JOIN crm.rol r ON up.rol_id = r.id
  WHERE up.id = v_usuario_id;

  IF v_rol_nombre = 'ROL_COORDINADOR_VENTAS' THEN
    RETURN EXISTS (
      SELECT 1
      FROM crm.cliente c
      WHERE c.id = p_cliente_id
        AND (
          c.vendedor_username IN (SELECT crm.equipo_usernames(v_usuario_id))
          OR EXISTS (
            SELECT 1 FROM crm.usuario_perfil owner
            WHERE owner.id = c.created_by
              AND owner.username IN (SELECT crm.equipo_usernames(v_usuario_id))
          )
        )
    );
  END IF;

  IF crm.tiene_permiso(v_usuario_id, 'clientes.ver_todos') THEN
    RETURN TRUE;
  END IF;

  IF crm.tiene_permiso(v_usuario_id, 'clientes.ver_asignados') THEN
    RETURN crm.cliente_pertenece_a_usuario(p_cliente_id);
  END IF;

  RETURN FALSE;
END;
$$;

-- crm.usuario_puede_editar_cliente() intentionally UNCHANGED: it still
-- checks 'clientes.editar_todos' (true for coordinador), so a coordinador
-- can still edit any cliente they can SELECT (team-scoped) via the fixed
-- usuario_puede_ver_cliente() gate on the SELECT policy — editar_todos
-- alone can't leak visibility because RLS SELECT already hides
-- out-of-team rows before an UPDATE's USING clause is ever evaluated.

-- ============================================================
-- 3. crm.p1_puede_ver_cliente(): add the same coordinador-team branch,
-- self-contained (LANGUAGE sql, no crm.tiene_permiso dependency) to match
-- its original design intent (works even if the permissions-matrix
-- migration isn't deployed on a given database).
-- ============================================================

CREATE OR REPLACE FUNCTION crm.p1_puede_ver_cliente(p_cliente_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, crm
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND p_cliente_id IS NOT NULL
    AND (
      crm.es_visibilidad_global()
      OR EXISTS (
        SELECT 1
        FROM crm.cliente c
        WHERE c.id = p_cliente_id
          AND (
            c.vendedor_username = crm.get_current_username()
            OR c.vendedor_asignado = crm.get_current_username()
            OR c.created_by = auth.uid()
            OR (
              EXISTS (
                SELECT 1 FROM crm.usuario_perfil up
                JOIN crm.rol r ON r.id = up.rol_id
                WHERE up.id = auth.uid() AND r.nombre = 'ROL_COORDINADOR_VENTAS'
              )
              AND (
                c.vendedor_username IN (SELECT crm.equipo_usernames(auth.uid()))
                OR EXISTS (
                  SELECT 1 FROM crm.usuario_perfil owner
                  WHERE owner.id = c.created_by
                    AND owner.username IN (SELECT crm.equipo_usernames(auth.uid()))
                )
              )
            )
          )
      )
    );
$$;
