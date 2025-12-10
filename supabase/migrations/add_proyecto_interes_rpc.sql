-- Función RPC para agregar proyecto de interés bypaseando RLS
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

-- Dar permisos
GRANT EXECUTE ON FUNCTION crm.add_proyecto_interes(uuid, uuid, uuid, integer, text, varchar) TO authenticated;

COMMENT ON FUNCTION crm.add_proyecto_interes IS 'Agrega un proyecto de interés bypaseando RLS - maneja duplicados automáticamente';
