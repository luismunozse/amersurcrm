-- Fix: prevenir lost-update en crm.obtener_siguiente_vendedor().
-- Problema: dos llamadas concurrentes leían el mismo ultimo_indice y asignaban
-- el mismo vendedor al cambiar, quedando ambos leads con el mismo owner.
-- Solución: tomar lock a nivel de fila sobre asignacion_config con FOR UPDATE
-- al inicio. Postgres serializa las transacciones concurrentes en esa fila
-- hasta que la función commita, garantizando índices consecutivos.

BEGIN;

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
  -- Lock-and-read: serializa llamadas concurrentes sobre esta fila.
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
    up.nombre_completo
  INTO vendedor_resultado
  FROM crm.vendedor_activo va
  JOIN crm.usuario_perfil up ON va.vendedor_id = up.id
  WHERE va.activo = true
  ORDER BY va.orden ASC
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

COMMENT ON FUNCTION crm.obtener_siguiente_vendedor IS
  'Round-robin de vendedores con lock FOR UPDATE sobre asignacion_config para evitar lost-update en concurrencia.';

COMMIT;
