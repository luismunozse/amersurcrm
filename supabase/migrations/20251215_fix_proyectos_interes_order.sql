-- ============================================================================
-- MIGRACIÓN: Corregir ORDER BY en get_cliente_proyectos_interes
-- Fecha: 2024-12-15
-- Descripción: Mueve el ORDER BY dentro del json_agg para evitar error de GROUP BY
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
    ) ORDER BY cpi.fecha_agregado DESC  -- ORDER BY dentro del json_agg
  ) INTO result
  FROM crm.cliente_propiedad_interes cpi
  LEFT JOIN crm.lote l ON cpi.lote_id = l.id
  LEFT JOIN crm.proyecto p ON l.proyecto_id = p.id
  WHERE cpi.cliente_id = p_cliente_id;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION crm.get_cliente_proyectos_interes(uuid) TO authenticated;

COMMENT ON FUNCTION crm.get_cliente_proyectos_interes(uuid) IS
  'Obtiene proyectos/lotes de interés de un cliente con datos del lote y proyecto. ORDER BY corregido.';
