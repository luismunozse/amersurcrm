-- Elimina la versión anterior para poder redefinir la firma/retorno
DROP FUNCTION IF EXISTS crm.verificar_condicion_permiso(uuid, text, numeric);

-- Crea nuevamente la función con los parámetros renombrados
CREATE FUNCTION crm.verificar_condicion_permiso(
  p_usuario_id uuid,
  p_permiso_codigo text,
  p_valor_actual numeric DEFAULT NULL
)
RETURNS TABLE (
  permitido boolean,
  razon text,
  limite numeric,
  valor_actual numeric,
  requiere_aprobacion boolean
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_condicion RECORD;
  v_permitido boolean := true;
  v_razon text := NULL;
  v_requiere_aprobacion boolean := false;
BEGIN
  -- Buscar la condición configurada para el rol del usuario
  SELECT pc.*
  INTO v_condicion
  FROM crm.permiso_condicion pc
  JOIN crm.usuario_perfil up ON up.rol_id = pc.rol_id
  WHERE up.id = p_usuario_id
    AND pc.permiso_codigo = p_permiso_codigo
    AND pc.activo = true
  LIMIT 1;

  -- Si no hay condición configurada, permitir por defecto
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT true, NULL::text, NULL::numeric, p_valor_actual, false;
    RETURN;
  END IF;

  -- Evaluar condiciones básicas (extensible a más tipos)
  IF v_condicion.tipo_condicion = 'limite_monto' THEN
    IF p_valor_actual IS NOT NULL AND v_condicion.valor_limite IS NOT NULL THEN
      IF p_valor_actual > v_condicion.valor_limite THEN
        v_permitido := false;
        v_razon := 'limite_excedido';
      END IF;
    END IF;
  ELSIF v_condicion.tipo_condicion = 'requiere_aprobacion' THEN
    v_permitido := false;
    v_razon := 'requiere_aprobacion';
  END IF;

  IF NOT v_permitido THEN
    v_requiere_aprobacion := COALESCE(v_condicion.requiere_aprobacion, false);
  END IF;

  RETURN QUERY
  SELECT
    v_permitido,
    v_razon,
    v_condicion.valor_limite,
    p_valor_actual,
    v_requiere_aprobacion;
END;
$$;

COMMENT ON FUNCTION crm.verificar_condicion_permiso(uuid, text, numeric)
  IS 'Evalúa condiciones específicas por permiso evitando conflictos de nombres entre parámetros y columnas.';
