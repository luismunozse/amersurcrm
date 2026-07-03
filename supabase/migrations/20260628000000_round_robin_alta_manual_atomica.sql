-- Round-robin: avance atómico del puntero en altas manuales.
--
-- Problema: el alta manual de clientes (crearCliente) avanzaba el puntero
-- crm.asignacion_config.ultimo_indice con un read-modify-write SIN lock
-- (leer ultimo_indice -> +1 -> upsert). Eso corría en paralelo con la
-- asignación automática (obtener_siguiente_vendedor, que sí toma FOR UPDATE)
-- y con otras altas manuales, produciendo lost-updates: el puntero no
-- avanzaba y el siguiente lead caía en el mismo asesor. Además usaba una
-- semántica distinta (+1 crudo) a la de la RPC automática ((idx % total)+1),
-- desincronizando lo que muestra el CRM de lo que asigna la extensión.
--
-- Solución: una RPC que, bajo FOR UPDATE sobre la misma fila id=1, alinea
-- ultimo_indice a la posición (rank 1-based en ORDER BY orden ASC) del
-- vendedor elegido manualmente. Así "consume el turno" de ese asesor y el
-- próximo automático sale del siguiente, con una única fuente de verdad
-- atómica compartida con obtener_siguiente_vendedor().

BEGIN;

CREATE OR REPLACE FUNCTION crm.registrar_asignacion_manual(p_vendedor_username TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, public, auth
AS $$
DECLARE
  rank_vendedor INTEGER;
BEGIN
  IF p_vendedor_username IS NULL OR p_vendedor_username = '' THEN
    RETURN NULL;
  END IF;

  -- Asegurar que exista la fila del puntero antes de tomar el lock.
  INSERT INTO crm.asignacion_config (id, ultimo_indice)
  VALUES (1, 0)
  ON CONFLICT (id) DO NOTHING;

  -- Lock de la fila del puntero: serializa contra obtener_siguiente_vendedor()
  -- y otras altas manuales concurrentes hasta el commit.
  PERFORM 1 FROM crm.asignacion_config WHERE id = 1 FOR UPDATE;

  -- Rank 1-based del vendedor elegido dentro del orden de rotación.
  -- Solo si está activo; si no, rank_vendedor queda NULL y no consume turno.
  -- El desempate por vendedor_id debe coincidir EXACTAMENTE con el ORDER BY de
  -- obtener_siguiente_vendedor(), para que el rank calculado aquí equivalga al
  -- OFFSET posicional de allá aun si dos vendedores comparten el mismo `orden`.
  SELECT pos INTO rank_vendedor
  FROM (
    SELECT up.username AS username,
           ROW_NUMBER() OVER (ORDER BY va.orden ASC, va.vendedor_id ASC) AS pos
    FROM crm.vendedor_activo va
    JOIN crm.usuario_perfil up ON va.vendedor_id = up.id
    WHERE va.activo = true
  ) ranked
  WHERE ranked.username = p_vendedor_username;

  IF rank_vendedor IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE crm.asignacion_config
  SET ultimo_indice = rank_vendedor,
      updated_at = NOW()
  WHERE id = 1;

  RETURN rank_vendedor;
END;
$$;

GRANT EXECUTE ON FUNCTION crm.registrar_asignacion_manual TO service_role;
GRANT EXECUTE ON FUNCTION crm.registrar_asignacion_manual TO authenticated;

COMMENT ON FUNCTION crm.registrar_asignacion_manual IS
  'Alta manual: alinea ultimo_indice a la posición del vendedor elegido bajo FOR UPDATE, evitando lost-update contra obtener_siguiente_vendedor().';

-- Reafirmar obtener_siguiente_vendedor con el MISMO desempate (vendedor_id) que
-- registrar_asignacion_manual. Sin un tiebreaker estable, dos vendedores con el
-- mismo `orden` harían que el rank (ROW_NUMBER) y el OFFSET no coincidan y la
-- rotación se desalinee. Cuerpo idéntico a 20260420000000 salvo el ORDER BY.
CREATE OR REPLACE FUNCTION crm.obtener_siguiente_vendedor()
RETURNS TABLE(
  vendedor_id UUID,
  username TEXT,
  nombre_completo TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, public, auth
AS $$
DECLARE
  total_vendedores INTEGER;
  indice_actual INTEGER;
  siguiente_indice INTEGER;
  vendedor_resultado RECORD;
BEGIN
  SELECT ultimo_indice INTO indice_actual
  FROM crm.asignacion_config
  WHERE id = 1
  FOR UPDATE;

  SELECT COUNT(*) INTO total_vendedores
  FROM crm.vendedor_activo
  WHERE activo = true;

  IF total_vendedores = 0 THEN
    RETURN;
  END IF;

  siguiente_indice := (indice_actual % total_vendedores) + 1;

  SELECT
    va.vendedor_id,
    up.username::TEXT,
    up.nombre_completo::TEXT
  INTO vendedor_resultado
  FROM crm.vendedor_activo va
  JOIN crm.usuario_perfil up ON va.vendedor_id = up.id
  WHERE va.activo = true
  ORDER BY va.orden ASC, va.vendedor_id ASC
  LIMIT 1 OFFSET (siguiente_indice - 1);

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
$$;

GRANT EXECUTE ON FUNCTION crm.obtener_siguiente_vendedor TO service_role;
GRANT EXECUTE ON FUNCTION crm.obtener_siguiente_vendedor TO authenticated;

COMMIT;
