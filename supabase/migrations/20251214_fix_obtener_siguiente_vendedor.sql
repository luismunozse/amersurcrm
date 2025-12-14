-- Fix: Corregir tipos de retorno en obtener_siguiente_vendedor()
-- Error: "Returned type character varying(255) does not match expected type text in column 3"
-- El campo nombre_completo de usuario_perfil es varchar(255), pero la función declara TEXT

CREATE OR REPLACE FUNCTION crm.obtener_siguiente_vendedor()
RETURNS TABLE(vendedor_id uuid, username text, nombre_completo text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'crm', 'public', 'auth'
AS $function$
DECLARE
  total_vendedores INTEGER;
  indice_actual INTEGER;
  siguiente_indice INTEGER;
  vendedor_resultado RECORD;
BEGIN
  -- Contar vendedores activos en la lista
  SELECT COUNT(*) INTO total_vendedores
  FROM crm.vendedor_activo
  WHERE activo = true;

  -- Si no hay vendedores activos, retornar NULL
  IF total_vendedores = 0 THEN
    RETURN;
  END IF;

  -- Obtener índice actual
  SELECT ultimo_indice INTO indice_actual
  FROM crm.asignacion_config
  WHERE id = 1;

  -- Calcular siguiente índice (round-robin circular)
  siguiente_indice := (indice_actual % total_vendedores) + 1;

  -- Obtener vendedor según el orden (con offset para el siguiente)
  -- IMPORTANTE: Cast explícito a TEXT para todos los campos varchar
  SELECT
    va.vendedor_id,
    up.username::TEXT,
    up.nombre_completo::TEXT  -- FIX: Agregar cast a TEXT
  INTO vendedor_resultado
  FROM crm.vendedor_activo va
  JOIN crm.usuario_perfil up ON va.vendedor_id = up.id
  WHERE va.activo = true
  ORDER BY va.orden ASC
  LIMIT 1 OFFSET (siguiente_indice - 1);

  -- Si encontramos vendedor, actualizar índice y retornarlo
  IF vendedor_resultado.vendedor_id IS NOT NULL THEN
    UPDATE crm.asignacion_config
    SET ultimo_indice = siguiente_indice,
        updated_at = NOW()
    WHERE id = 1;

    RETURN QUERY SELECT
      vendedor_resultado.vendedor_id,
      vendedor_resultado.username,
      vendedor_resultado.nombre_completo;
  END IF;

  RETURN;
END;
$function$;
