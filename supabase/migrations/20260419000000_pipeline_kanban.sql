-- Pipeline Kanban: soporte para registrar cambios de estado y mover clientes con auditoría.
-- Fecha: 2026-04-19

BEGIN;

-- 1. Ampliar el CHECK de cliente_interaccion.tipo para aceptar 'cambio_estado'.
ALTER TABLE crm.cliente_interaccion
  DROP CONSTRAINT IF EXISTS cliente_interaccion_tipo_check;

ALTER TABLE crm.cliente_interaccion
  ADD CONSTRAINT cliente_interaccion_tipo_check
  CHECK (tipo IN (
    'llamada',
    'email',
    'whatsapp',
    'visita',
    'reunion',
    'mensaje',
    'cambio_estado'
  ));

-- 2. Columnas de auditoría para cambios de estado.
ALTER TABLE crm.cliente_interaccion
  ADD COLUMN IF NOT EXISTS estado_anterior VARCHAR(50),
  ADD COLUMN IF NOT EXISTS estado_nuevo    VARCHAR(50);

-- 3. RPC atómica que mueve un cliente entre columnas del pipeline.
--    Reglas:
--      a) Vendedores solo pueden mover clientes propios (creados o asignados).
--      b) Si el estado actual es 'transferido' solo admin/gerente/coordinador puede sacarlo.
--      c) Si el estado destino es 'desestimado' el motivo es obligatorio.
--      d) Inserta una interacción tipo 'cambio_estado' con estado_anterior/nuevo + nota.
CREATE OR REPLACE FUNCTION crm.mover_cliente_pipeline(
  p_cliente_id  UUID,
  p_estado_nuevo VARCHAR,
  p_motivo      TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, public
AS $$
DECLARE
  v_user_id        UUID := auth.uid();
  v_username       TEXT;
  v_rol_nombre     TEXT;
  v_es_privilegiado BOOLEAN;
  v_estado_actual  VARCHAR;
  v_owner_userid   UUID;
  v_owner_username TEXT;
  v_es_owner       BOOLEAN;
  v_interaccion_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado' USING ERRCODE = '42501';
  END IF;

  IF p_estado_nuevo NOT IN (
    'por_contactar','contactado','intermedio','potencial','desestimado','transferido'
  ) THEN
    RAISE EXCEPTION 'Estado inválido: %', p_estado_nuevo USING ERRCODE = '22023';
  END IF;

  SELECT up.username, r.nombre
    INTO v_username, v_rol_nombre
  FROM crm.usuario_perfil up
  LEFT JOIN crm.rol r ON r.id = up.rol_id
  WHERE up.id = v_user_id;

  v_es_privilegiado := v_rol_nombre IN ('ROL_ADMIN','ROL_GERENTE','ROL_COORDINADOR_VENTAS');

  SELECT estado_cliente, created_by, vendedor_username
    INTO v_estado_actual, v_owner_userid, v_owner_username
  FROM crm.cliente
  WHERE id = p_cliente_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente no encontrado' USING ERRCODE = 'P0002';
  END IF;

  v_es_owner := (v_owner_userid = v_user_id) OR (v_owner_username = v_username);

  IF NOT (v_es_privilegiado OR v_es_owner) THEN
    RAISE EXCEPTION 'No tiene permisos sobre este cliente' USING ERRCODE = '42501';
  END IF;

  -- Regla: salir de 'transferido' requiere rol privilegiado.
  IF v_estado_actual = 'transferido'
     AND p_estado_nuevo <> 'transferido'
     AND NOT v_es_privilegiado THEN
    RAISE EXCEPTION 'Solo administradores pueden revertir un cliente transferido'
      USING ERRCODE = '42501';
  END IF;

  -- Regla: pasar a 'desestimado' exige motivo.
  IF p_estado_nuevo = 'desestimado'
     AND (p_motivo IS NULL OR length(btrim(p_motivo)) = 0) THEN
    RAISE EXCEPTION 'Debe indicar un motivo para desestimar el cliente'
      USING ERRCODE = '22023';
  END IF;

  -- Si no cambia el estado, no hacer nada.
  IF v_estado_actual = p_estado_nuevo THEN
    RETURN jsonb_build_object(
      'ok', true,
      'cambiado', false,
      'estado_actual', v_estado_actual
    );
  END IF;

  UPDATE crm.cliente
     SET estado_cliente = p_estado_nuevo,
         updated_at     = now()
   WHERE id = p_cliente_id;

  INSERT INTO crm.cliente_interaccion (
    cliente_id, usuario_id, tipo, notas,
    estado_anterior, estado_nuevo, created_at
  ) VALUES (
    p_cliente_id, v_user_id, 'cambio_estado', p_motivo,
    v_estado_actual, p_estado_nuevo, now()
  )
  RETURNING id INTO v_interaccion_id;

  RETURN jsonb_build_object(
    'ok', true,
    'cambiado', true,
    'estado_anterior', v_estado_actual,
    'estado_nuevo', p_estado_nuevo,
    'interaccion_id', v_interaccion_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION crm.mover_cliente_pipeline(UUID, VARCHAR, TEXT) TO authenticated;

COMMENT ON FUNCTION crm.mover_cliente_pipeline(UUID, VARCHAR, TEXT) IS
  'Mueve un cliente entre estados del pipeline kanban con auditoría en cliente_interaccion. Aplica reglas: motivo obligatorio para desestimado, solo admin puede revertir transferido.';

COMMIT;
