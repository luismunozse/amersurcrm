-- Función RPC v2 para obtener lotes de un proyecto bypaseando RLS
-- Versión v2 para forzar invalidación de caché

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
    AND l.estado IN ('disponible', 'reservado', 'separado')
  ORDER BY l.codigo ASC;
END;
$$;

-- Dar permisos
GRANT EXECUTE ON FUNCTION crm.get_lotes_by_proyecto_v2(uuid) TO authenticated;

COMMENT ON FUNCTION crm.get_lotes_by_proyecto_v2 IS 'Obtiene lotes disponibles de un proyecto bypaseando RLS (v2)';
