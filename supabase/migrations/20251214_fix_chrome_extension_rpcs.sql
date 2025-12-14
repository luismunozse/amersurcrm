-- ============================================================================
-- MIGRACIÓN: Corrección de funciones RPC para Extensión Chrome AmersurChat
-- Fecha: 2024-12-14
-- Descripción: Consolida y corrige todas las funciones RPC usadas por la
--              extensión de Chrome, asegurando compatibilidad con el schema
--              real de las tablas.
-- ============================================================================

-- ============================================================================
-- 1. FUNCIÓN: get_cliente_interacciones
-- Obtiene el historial de interacciones de un cliente
-- ============================================================================
DROP FUNCTION IF EXISTS crm.get_cliente_interacciones(uuid);

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

-- ============================================================================
-- 2. FUNCIÓN: get_cliente_proyectos_interes
-- Obtiene los proyectos/lotes de interés de un cliente
-- ============================================================================
DROP FUNCTION IF EXISTS crm.get_cliente_proyectos_interes(uuid);

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
  WHERE cpi.cliente_id = p_cliente_id
  ORDER BY cpi.fecha_agregado DESC;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- ============================================================================
-- 3. FUNCIÓN: get_proyectos_activos
-- Obtiene la lista de proyectos activos/pausados
-- ============================================================================
DROP FUNCTION IF EXISTS crm.get_proyectos_activos();

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
    p.estado::text
  FROM crm.proyecto p
  WHERE p.estado IN ('activo', 'pausado')
  ORDER BY p.nombre ASC;
END;
$$;

-- ============================================================================
-- 4. FUNCIÓN: get_lotes_by_proyecto_v2
-- Obtiene los lotes disponibles de un proyecto específico
-- ============================================================================
DROP FUNCTION IF EXISTS crm.get_lotes_by_proyecto_v2(uuid);

CREATE OR REPLACE FUNCTION crm.get_lotes_by_proyecto_v2(p_proyecto_id uuid)
RETURNS TABLE (
  id uuid,
  codigo varchar,
  proyecto_id uuid,
  estado varchar,
  moneda varchar,
  precio numeric,
  sup_m2 numeric,
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
    l.id,
    l.codigo,
    l.proyecto_id,
    l.estado::varchar,
    l.moneda,
    l.precio,
    l.sup_m2,
    l.created_at,
    l.updated_at
  FROM crm.lote l
  WHERE l.proyecto_id = p_proyecto_id
    AND l.estado IN ('disponible', 'reservado')
  ORDER BY l.codigo ASC;
END;
$$;

-- ============================================================================
-- 5. FUNCIÓN: add_proyecto_interes
-- Agrega un lote/proyecto de interés a un cliente
-- ============================================================================
DROP FUNCTION IF EXISTS crm.add_proyecto_interes(uuid, uuid, uuid, integer, text, varchar);

CREATE OR REPLACE FUNCTION crm.add_proyecto_interes(
  p_cliente_id uuid,
  p_lote_id uuid,
  p_propiedad_id uuid,
  p_prioridad integer,
  p_notas text,
  p_agregado_por varchar
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, public
AS $$
DECLARE
  result json;
BEGIN
  INSERT INTO crm.cliente_propiedad_interes (
    cliente_id,
    lote_id,
    propiedad_id,
    prioridad,
    notas,
    agregado_por
  )
  VALUES (
    p_cliente_id,
    p_lote_id,
    p_propiedad_id,
    p_prioridad,
    p_notas,
    p_agregado_por
  )
  RETURNING json_build_object(
    'id', id,
    'cliente_id', cliente_id,
    'lote_id', lote_id,
    'propiedad_id', propiedad_id,
    'prioridad', prioridad,
    'notas', notas,
    'agregado_por', agregado_por,
    'fecha_agregado', fecha_agregado
  ) INTO result;

  RETURN result;
EXCEPTION
  WHEN unique_violation THEN
    -- Si ya existe, retornar el registro existente
    SELECT json_build_object(
      'id', id,
      'cliente_id', cliente_id,
      'lote_id', lote_id,
      'propiedad_id', propiedad_id,
      'prioridad', prioridad,
      'notas', notas,
      'agregado_por', agregado_por,
      'fecha_agregado', fecha_agregado,
      'already_exists', true
    )
    INTO result
    FROM crm.cliente_propiedad_interes
    WHERE cliente_id = p_cliente_id
      AND (lote_id = p_lote_id OR (lote_id IS NULL AND p_lote_id IS NULL))
      AND (propiedad_id = p_propiedad_id OR (propiedad_id IS NULL AND p_propiedad_id IS NULL));

    RETURN result;
END;
$$;

-- ============================================================================
-- 6. PERMISOS: Otorgar ejecución a usuarios autenticados
-- ============================================================================
GRANT EXECUTE ON FUNCTION crm.get_cliente_interacciones(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION crm.get_cliente_proyectos_interes(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION crm.get_proyectos_activos() TO authenticated;
GRANT EXECUTE ON FUNCTION crm.get_lotes_by_proyecto_v2(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION crm.add_proyecto_interes(uuid, uuid, uuid, integer, text, varchar) TO authenticated;

-- ============================================================================
-- 7. COMENTARIOS
-- ============================================================================
COMMENT ON FUNCTION crm.get_cliente_interacciones(uuid) IS
  'Obtiene interacciones de un cliente. Usado por extensión Chrome AmersurChat.';

COMMENT ON FUNCTION crm.get_cliente_proyectos_interes(uuid) IS
  'Obtiene proyectos/lotes de interés de un cliente con datos del lote y proyecto.';

COMMENT ON FUNCTION crm.get_proyectos_activos() IS
  'Lista proyectos en estado activo o pausado para selección.';

COMMENT ON FUNCTION crm.get_lotes_by_proyecto_v2(uuid) IS
  'Lista lotes disponibles/reservados/separados de un proyecto específico.';

COMMENT ON FUNCTION crm.add_proyecto_interes(uuid, uuid, uuid, integer, text, varchar) IS
  'Agrega un lote de interés a un cliente. Maneja duplicados automáticamente.';

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
