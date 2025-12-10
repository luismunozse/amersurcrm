-- Fix: Corregir funciones RPC para bypasear RLS
-- Corrige los errores en las definiciones de las funciones

-- Primero eliminar las funciones existentes
DROP FUNCTION IF EXISTS crm.get_cliente_interacciones(uuid);
DROP FUNCTION IF EXISTS crm.get_cliente_proyectos_interes(uuid);
DROP FUNCTION IF EXISTS crm.get_proyectos_activos();

-- 1. Función para obtener interacciones de un cliente (CORREGIDA)
CREATE OR REPLACE FUNCTION crm.get_cliente_interacciones(p_cliente_id uuid)
RETURNS TABLE (
  id uuid,
  cliente_id uuid,
  tipo varchar,
  fecha_interaccion timestamptz,
  notas text,
  vendedor_username varchar,
  resultado varchar,
  duracion_minutos integer,
  proxima_accion varchar,
  fecha_proxima_accion timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ci.id,
    ci.cliente_id,
    ci.tipo,
    ci.fecha_interaccion,
    ci.notas,
    ci.vendedor_username,
    ci.resultado,
    ci.duracion_minutos,
    ci.proxima_accion,
    ci.fecha_proxima_accion,
    ci.created_at,
    ci.updated_at
  FROM crm.cliente_interaccion ci
  WHERE ci.cliente_id = p_cliente_id
  ORDER BY ci.fecha_interaccion DESC
  LIMIT 50;
END;
$$;

-- 2. Función para obtener proyectos de interés de un cliente (CORREGIDA)
CREATE OR REPLACE FUNCTION crm.get_cliente_proyectos_interes(p_cliente_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', cpi.id,
      'lote_id', cpi.lote_id,
      'propiedad_id', cpi.propiedad_id,
      'prioridad', cpi.prioridad,
      'notas', cpi.notas,
      'fecha_agregado', cpi.fecha_agregado,
      'lote', CASE
        WHEN l.id IS NOT NULL THEN json_build_object(
          'id', l.id,
          'codigo', l.codigo,
          'estado', l.estado::text,
          'moneda', l.moneda,
          'precio', l.precio,
          'sup_m2', l.sup_m2,
          'proyecto', json_build_object(
            'id', p.id,
            'nombre', p.nombre
          )
        )
        ELSE NULL
      END
    )
  ) INTO result
  FROM crm.cliente_propiedad_interes cpi
  LEFT JOIN crm.lote l ON cpi.lote_id = l.id
  LEFT JOIN crm.proyecto p ON l.proyecto_id = p.id
  WHERE cpi.cliente_id = p_cliente_id;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- 3. Función para obtener lista de proyectos activos (CORREGIDA)
CREATE OR REPLACE FUNCTION crm.get_proyectos_activos()
RETURNS TABLE (
  id uuid,
  nombre text,
  ubicacion text,
  estado text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.nombre,
    p.ubicacion,
    p.estado::text  -- Cast enum to text
  FROM crm.proyecto p
  WHERE p.estado IN ('activo', 'pausado')
  ORDER BY p.nombre ASC;
END;
$$;

-- Dar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION crm.get_cliente_interacciones(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION crm.get_cliente_proyectos_interes(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION crm.get_proyectos_activos() TO authenticated;

-- Comentarios
COMMENT ON FUNCTION crm.get_cliente_interacciones(uuid) IS 'Obtiene interacciones de un cliente bypaseando RLS - CORREGIDO: sin vendedor_id, sin medio';
COMMENT ON FUNCTION crm.get_cliente_proyectos_interes(uuid) IS 'Obtiene proyectos de interés de un cliente bypaseando RLS - CORREGIDO: sin GROUP BY';
COMMENT ON FUNCTION crm.get_proyectos_activos() IS 'Obtiene lista de proyectos activos bypaseando RLS - CORREGIDO: cast enum a text';
