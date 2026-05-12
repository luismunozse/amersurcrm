-- Estado terminal del cliente: 'propietario'
-- Cliente queda en 'propietario' cuando se cierra venta (cerrar_proceso_y_crear_venta).
-- Solo rol privilegiado (admin/gerente/coordinador) puede revertir.

BEGIN;

-- ============================================================
-- 1. cliente.estado_cliente: agregar 'propietario'
-- ============================================================
ALTER TABLE crm.cliente
  DROP CONSTRAINT IF EXISTS cliente_estado_cliente_check;

ALTER TABLE crm.cliente
  ADD CONSTRAINT cliente_estado_cliente_check
  CHECK (estado_cliente IN (
    'por_contactar',
    'contactado',
    'intermedio',
    'potencial',
    'en_proceso',
    'propietario',
    'desestimado',
    'transferido'
  ));

-- ============================================================
-- 2. RPC mover_cliente_pipeline: aceptar 'propietario'
--    Salida de 'propietario' restringida a rol privilegiado.
-- ============================================================
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
    'por_contactar','contactado','intermedio','potencial','en_proceso','propietario','desestimado','transferido'
  ) THEN
    RAISE EXCEPTION 'Estado invalido: %', p_estado_nuevo USING ERRCODE = '22023';
  END IF;

  SELECT up.username, r.nombre
    INTO v_username, v_rol_nombre
  FROM crm.usuario_perfil up
  LEFT JOIN crm.rol r ON r.id = up.rol_id
  WHERE up.id = v_user_id;

  IF v_username IS NULL OR length(v_username) = 0 THEN
    RAISE EXCEPTION 'Usuario sin username configurado' USING ERRCODE = '42704';
  END IF;

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

  -- Regla: salir de estados terminales/protegidos requiere rol privilegiado.
  IF v_estado_actual IN ('transferido', 'en_proceso', 'propietario')
     AND p_estado_nuevo <> v_estado_actual
     AND NOT v_es_privilegiado THEN
    RAISE EXCEPTION 'Solo administradores pueden revertir un cliente en estado %', v_estado_actual
      USING ERRCODE = '42501';
  END IF;

  IF p_estado_nuevo = 'desestimado'
     AND (p_motivo IS NULL OR length(btrim(p_motivo)) = 0) THEN
    RAISE EXCEPTION 'Debe indicar un motivo para desestimar el cliente'
      USING ERRCODE = '22023';
  END IF;

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
    cliente_id, vendedor_username, tipo, notas,
    estado_anterior, estado_nuevo,
    fecha_interaccion, created_at
  ) VALUES (
    p_cliente_id, v_username, 'cambio_estado', p_motivo,
    v_estado_actual, p_estado_nuevo,
    now(), now()
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
  'Mueve cliente entre estados del pipeline con auditoria. Salida de transferido / en_proceso / propietario restringida a rol privilegiado.';

-- ============================================================
-- 3. RPC cerrar_proceso_y_crear_venta: al cerrar, mover cliente a 'propietario'
--    Reemplaza la version previa (definida en 20260505000001).
-- ============================================================
CREATE OR REPLACE FUNCTION crm.cerrar_proceso_y_crear_venta(
  p_proceso_id          UUID,
  p_precio_total        NUMERIC,
  p_monto_inicial       NUMERIC,
  p_numero_cuotas       INTEGER,
  p_fecha_primera_cuota DATE DEFAULT NULL,
  p_notas               TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, public
AS $$
DECLARE
  v_proceso       RECORD;
  v_reserva       RECORD;
  v_lote          RECORD;
  v_etapa_id      UUID;
  v_venta_id      UUID;
  v_codigo_venta  VARCHAR;
  v_forma_pago    VARCHAR;
  v_moneda        VARCHAR;
  v_anio          TEXT;
  v_siguiente     INT;
  v_total_cuotas  INTEGER;
  v_lote_vendido  BOOLEAN;
BEGIN
  IF p_proceso_id IS NULL THEN
    RAISE EXCEPTION 'ID de proceso requerido' USING ERRCODE = '22023';
  END IF;
  IF p_precio_total IS NULL OR p_precio_total <= 0 THEN
    RAISE EXCEPTION 'precio_total debe ser positivo' USING ERRCODE = '22023';
  END IF;
  IF p_monto_inicial IS NULL OR p_monto_inicial < 0 THEN
    RAISE EXCEPTION 'monto_inicial invalido' USING ERRCODE = '22023';
  END IF;
  IF p_monto_inicial > p_precio_total THEN
    RAISE EXCEPTION 'monto_inicial no puede superar precio_total' USING ERRCODE = '22023';
  END IF;
  IF p_numero_cuotas IS NULL OR p_numero_cuotas < 0 THEN
    RAISE EXCEPTION 'numero_cuotas invalido' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_proceso
  FROM crm.proceso_adquisicion
  WHERE id = p_proceso_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proceso no encontrado' USING ERRCODE = 'P0002';
  END IF;
  IF v_proceso.estado <> 'activo' THEN
    RAISE EXCEPTION 'El proceso no esta activo (estado: %)', v_proceso.estado USING ERRCODE = '42501';
  END IF;
  IF v_proceso.etapa_actual <> 'desembolso' THEN
    RAISE EXCEPTION 'El proceso no esta en la etapa de desembolso (etapa actual: %)', v_proceso.etapa_actual
      USING ERRCODE = '42501';
  END IF;
  IF v_proceso.venta_id IS NOT NULL THEN
    RAISE EXCEPTION 'El proceso ya tiene una venta asociada' USING ERRCODE = '23505';
  END IF;

  IF v_proceso.reserva_id IS NOT NULL THEN
    SELECT * INTO v_reserva FROM crm.reserva WHERE id = v_proceso.reserva_id FOR UPDATE;
  END IF;

  SELECT * INTO v_lote FROM crm.lote WHERE id = v_proceso.lote_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lote del proceso no encontrado' USING ERRCODE = 'P0002';
  END IF;
  IF v_lote.estado <> 'reservado' THEN
    RAISE EXCEPTION 'El lote no esta reservado (estado: %)', v_lote.estado USING ERRCODE = '42501';
  END IF;

  IF v_reserva IS NULL OR v_reserva.forma_pago IS NULL THEN
    v_forma_pago := 'contado';
  ELSIF v_reserva.forma_pago IN ('contado', 'transferencia', 'deposito') THEN
    v_forma_pago := 'contado';
  ELSIF v_reserva.forma_pago = 'credito_hipotecario' THEN
    v_forma_pago := 'credito_bancario';
  ELSIF v_reserva.forma_pago = 'credito_directo' THEN
    v_forma_pago := 'financiado';
  ELSE
    v_forma_pago := 'contado';
  END IF;

  v_moneda := COALESCE(v_reserva.moneda, v_lote.moneda, 'PEN');

  v_anio := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(codigo_venta FROM 10) AS INT)
  ), 0) + 1
  INTO v_siguiente
  FROM crm.venta
  WHERE codigo_venta LIKE 'VTA-' || v_anio || '-%';
  v_codigo_venta := 'VTA-' || v_anio || '-' || LPAD(v_siguiente::TEXT, 4, '0');

  INSERT INTO crm.venta (
    codigo_venta, reserva_id, cliente_id, lote_id, vendedor_username,
    precio_total, moneda,
    forma_pago, monto_inicial, saldo_pendiente, numero_cuotas,
    fecha_venta, estado, notas
  ) VALUES (
    v_codigo_venta,
    v_proceso.reserva_id,
    v_proceso.cliente_id,
    v_proceso.lote_id,
    v_proceso.vendedor_username,
    p_precio_total,
    v_moneda,
    v_forma_pago,
    p_monto_inicial,
    p_precio_total - p_monto_inicial,
    NULLIF(p_numero_cuotas, 0),
    now(),
    'finalizada',
    p_notas
  ) RETURNING id INTO v_venta_id;

  v_total_cuotas := crm.generar_cronograma_pagos(v_venta_id);

  IF p_fecha_primera_cuota IS NOT NULL THEN
    UPDATE crm.cuota AS c
       SET fecha_vencimiento = p_fecha_primera_cuota + ((c.numero_cuota - (
              SELECT MIN(numero_cuota) FROM crm.cuota
              WHERE venta_id = v_venta_id AND tipo = 'cuota_saldo'
            )) || ' months')::INTERVAL
     WHERE c.venta_id = v_venta_id
       AND c.tipo = 'cuota_saldo';
  END IF;

  v_lote_vendido := crm.vender_lote(v_proceso.lote_id);
  IF NOT v_lote_vendido THEN
    RAISE EXCEPTION 'No se pudo vender el lote (estado actual: %)', v_lote.estado
      USING ERRCODE = '42501';
  END IF;

  UPDATE crm.proceso_etapa
     SET estado = 'completada',
         fecha_completada = now()
   WHERE proceso_id = p_proceso_id
     AND etapa = 'desembolso'
   RETURNING id INTO v_etapa_id;

  UPDATE crm.proceso_adquisicion
     SET estado = 'completado',
         venta_id = v_venta_id,
         fecha_cierre = CURRENT_DATE,
         updated_at = now()
   WHERE id = p_proceso_id;

  IF v_reserva.id IS NOT NULL THEN
    UPDATE crm.reserva
       SET estado = 'convertida_venta'
     WHERE id = v_reserva.id
       AND estado = 'activa';
  END IF;

  -- Mover cliente a estado terminal 'propietario' + auditoria.
  -- NOTA: omitimos validaciones de mover_cliente_pipeline porque la RPC se invoca
  -- como SECURITY DEFINER y el cliente ya esta en flujo controlado de venta.
  DECLARE
    v_estado_prev VARCHAR;
  BEGIN
    SELECT estado_cliente INTO v_estado_prev
    FROM crm.cliente WHERE id = v_proceso.cliente_id FOR UPDATE;

    IF v_estado_prev <> 'propietario' THEN
      UPDATE crm.cliente
         SET estado_cliente = 'propietario',
             updated_at = now()
       WHERE id = v_proceso.cliente_id;

      INSERT INTO crm.cliente_interaccion (
        cliente_id, vendedor_username, tipo, notas,
        estado_anterior, estado_nuevo,
        fecha_interaccion, created_at
      ) VALUES (
        v_proceso.cliente_id,
        v_proceso.vendedor_username,
        'cambio_estado',
        'Venta cerrada: ' || v_codigo_venta,
        v_estado_prev,
        'propietario',
        now(),
        now()
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- No bloquear la venta si falla el cambio de estado del cliente.
    RAISE WARNING 'No se pudo mover cliente a propietario: %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'venta_id', v_venta_id,
    'codigo_venta', v_codigo_venta,
    'total_cuotas', v_total_cuotas,
    'forma_pago', v_forma_pago,
    'precio_total', p_precio_total,
    'saldo_pendiente', p_precio_total - p_monto_inicial
  );
END;
$$;

GRANT EXECUTE ON FUNCTION crm.cerrar_proceso_y_crear_venta(UUID, NUMERIC, NUMERIC, INTEGER, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION crm.cerrar_proceso_y_crear_venta(UUID, NUMERIC, NUMERIC, INTEGER, DATE, TEXT) TO service_role;

COMMENT ON FUNCTION crm.cerrar_proceso_y_crear_venta IS
  'Cierra proceso desembolso: crea venta, genera cronograma, vende lote, marca reserva convertida y cliente a propietario. Operacion atomica.';

COMMIT;
