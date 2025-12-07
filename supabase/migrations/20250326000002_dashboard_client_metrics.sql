-- Crea función para métricas de clientes del dashboard con filtros por rol
-- SECURITY DEFINER permite que la función lea todos los clientes cuando es admin
CREATE OR REPLACE FUNCTION crm.obtener_metricas_dashboard_clientes(
  p_usuario_id uuid,
  p_es_admin boolean DEFAULT false,
  p_es_gerente boolean DEFAULT false,
  p_username text DEFAULT NULL
)
RETURNS TABLE (
  total integer,
  sin_seguimiento integer,
  con_accion integer,
  fuera_de_rango integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, crm
AS $$
DECLARE
  v_tiene_permiso_ver_todos boolean;
BEGIN
  -- Verificar si el usuario tiene permiso para ver todos los clientes
  -- Esto incluye admins, gerentes y coordinadores
  v_tiene_permiso_ver_todos := p_es_admin 
    OR p_es_gerente 
    OR crm.tiene_permiso(p_usuario_id, 'clientes.ver_todos');

  RETURN QUERY
  WITH clientes_filtrados AS (
    SELECT
      c.ultimo_contacto,
      c.proxima_accion
    FROM crm.cliente c
    WHERE
      v_tiene_permiso_ver_todos
      OR (
        (p_usuario_id IS NOT NULL AND c.created_by = p_usuario_id)
        OR (p_username IS NOT NULL AND c.vendedor_username = p_username)
      )
  )
  SELECT
    COUNT(*)::integer AS total,
    COUNT(*) FILTER (WHERE ultimo_contacto IS NULL)::integer AS sin_seguimiento,
    COUNT(*) FILTER (WHERE proxima_accion IS NOT NULL)::integer AS con_accion,
    COUNT(*) FILTER (
      WHERE ultimo_contacto IS NULL
         OR ultimo_contacto <= (NOW() AT TIME ZONE 'UTC') - INTERVAL '7 days'
    )::integer AS fuera_de_rango
  FROM clientes_filtrados;
END;
$$;

COMMENT ON FUNCTION crm.obtener_metricas_dashboard_clientes IS 'Retorna métricas agregadas para el dashboard considerando el rol del usuario.';
