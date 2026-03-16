-- =====================================================
-- Agregar proyecto_id a cliente_propiedad_interes
-- Permite registrar interés a nivel proyecto (sin lote)
-- y consultas generales (sin proyecto específico)
-- =====================================================

-- 1. Agregar columna proyecto_id
ALTER TABLE crm.cliente_propiedad_interes
ADD COLUMN IF NOT EXISTS proyecto_id UUID REFERENCES crm.proyecto(id) ON DELETE CASCADE;

-- 2. Poblar proyecto_id desde lote existente para registros actuales
UPDATE crm.cliente_propiedad_interes cpi
SET proyecto_id = l.proyecto_id
FROM crm.lote l
WHERE cpi.lote_id = l.id
  AND cpi.proyecto_id IS NULL;

-- 3. Relajar CHECK constraint para permitir:
--    - Solo proyecto_id (interés en proyecto sin lote específico)
--    - Todo NULL (consulta general)
ALTER TABLE crm.cliente_propiedad_interes
DROP CONSTRAINT IF EXISTS cliente_propiedad_interes_check;

ALTER TABLE crm.cliente_propiedad_interes
ADD CONSTRAINT cliente_propiedad_interes_ref_check
CHECK (lote_id IS NOT NULL OR propiedad_id IS NOT NULL OR proyecto_id IS NOT NULL OR (lote_id IS NULL AND propiedad_id IS NULL AND proyecto_id IS NULL));

-- 4. Actualizar constraint UNIQUE para incluir proyecto_id
--    Primero eliminar el existente
ALTER TABLE crm.cliente_propiedad_interes
DROP CONSTRAINT IF EXISTS cliente_propiedad_interes_cliente_id_lote_id_propiedad_id_key;

-- Nuevo: permitir un registro por combinación cliente + proyecto + lote
ALTER TABLE crm.cliente_propiedad_interes
ADD CONSTRAINT cliente_propiedad_interes_unique
UNIQUE NULLS NOT DISTINCT (cliente_id, proyecto_id, lote_id, propiedad_id);

-- 5. Índice para proyecto_id
CREATE INDEX IF NOT EXISTS idx_cliente_propiedad_interes_proyecto
ON crm.cliente_propiedad_interes(proyecto_id);

-- 6. Comentario actualizado
COMMENT ON TABLE crm.cliente_propiedad_interes IS 'Propiedades/proyectos que interesan al cliente. proyecto_id sin lote = interés general en proyecto. Todo NULL = consulta general sin proyecto específico.';

-- =====================================================
-- 7. Actualizar RPC add_proyecto_interes para soportar proyecto_id
-- =====================================================
DROP FUNCTION IF EXISTS crm.add_proyecto_interes(uuid, uuid, uuid, integer, text, varchar);

CREATE OR REPLACE FUNCTION crm.add_proyecto_interes(
  p_cliente_id uuid,
  p_lote_id uuid,
  p_propiedad_id uuid,
  p_prioridad integer,
  p_notas text,
  p_agregado_por varchar,
  p_proyecto_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, public
AS $$
DECLARE
  result json;
  v_proyecto_id uuid;
BEGIN
  -- Resolver proyecto_id: usar el proporcionado, o extraerlo del lote
  v_proyecto_id := p_proyecto_id;
  IF v_proyecto_id IS NULL AND p_lote_id IS NOT NULL THEN
    SELECT proyecto_id INTO v_proyecto_id FROM crm.lote WHERE id = p_lote_id;
  END IF;

  INSERT INTO crm.cliente_propiedad_interes (
    cliente_id,
    lote_id,
    propiedad_id,
    proyecto_id,
    prioridad,
    notas,
    agregado_por
  )
  VALUES (
    p_cliente_id,
    p_lote_id,
    p_propiedad_id,
    v_proyecto_id,
    p_prioridad,
    p_notas,
    p_agregado_por
  )
  RETURNING json_build_object(
    'id', id,
    'cliente_id', cliente_id,
    'lote_id', lote_id,
    'propiedad_id', propiedad_id,
    'proyecto_id', proyecto_id,
    'prioridad', prioridad,
    'notas', notas,
    'agregado_por', agregado_por,
    'fecha_agregado', fecha_agregado
  ) INTO result;

  RETURN result;
EXCEPTION
  WHEN unique_violation THEN
    SELECT json_build_object(
      'id', id,
      'cliente_id', cliente_id,
      'lote_id', lote_id,
      'propiedad_id', propiedad_id,
      'proyecto_id', proyecto_id,
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
      AND (propiedad_id = p_propiedad_id OR (propiedad_id IS NULL AND p_propiedad_id IS NULL))
      AND (proyecto_id = v_proyecto_id OR (proyecto_id IS NULL AND v_proyecto_id IS NULL));

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION crm.add_proyecto_interes(uuid, uuid, uuid, integer, text, varchar, uuid) TO authenticated;
COMMENT ON FUNCTION crm.add_proyecto_interes IS 'Agrega un proyecto de interés. Resuelve proyecto_id automáticamente desde lote si no se proporciona.';

-- =====================================================
-- 8. Actualizar RPC get_cliente_proyectos_interes para incluir proyecto_id
--    y soportar intereses sin lote (a nivel proyecto o consulta general)
-- =====================================================
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
      'proyecto_id', cpi.proyecto_id,
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
            'id', COALESCE(p_lote.id, p_direct.id),
            'nombre', COALESCE(p_lote.nombre, p_direct.nombre)
          )
        )
        ELSE NULL
      END,
      'proyecto', CASE
        WHEN p_direct.id IS NOT NULL THEN json_build_object(
          'id', p_direct.id,
          'nombre', p_direct.nombre
        )
        WHEN p_lote.id IS NOT NULL THEN json_build_object(
          'id', p_lote.id,
          'nombre', p_lote.nombre
        )
        ELSE NULL
      END
    ) ORDER BY cpi.fecha_agregado DESC
  ) INTO result
  FROM crm.cliente_propiedad_interes cpi
  LEFT JOIN crm.lote l ON cpi.lote_id = l.id
  LEFT JOIN crm.proyecto p_lote ON l.proyecto_id = p_lote.id
  LEFT JOIN crm.proyecto p_direct ON cpi.proyecto_id = p_direct.id
  WHERE cpi.cliente_id = p_cliente_id;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION crm.get_cliente_proyectos_interes(uuid) TO authenticated;
COMMENT ON FUNCTION crm.get_cliente_proyectos_interes(uuid) IS
  'Obtiene proyectos/lotes de interés de un cliente. Soporta intereses a nivel proyecto y consultas generales.';
