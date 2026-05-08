-- Etapa 3 del flujo Sperant: cierre del proceso de adquisicion -> venta.
-- Al completar el desembolso, se crea la venta, se genera el cronograma de
-- cuotas y se transiciona el lote a 'vendido' atomicamente via RPC.

BEGIN;

CREATE SCHEMA IF NOT EXISTS crm;

-- ============================================================
-- Asegurar enum venta.forma_pago acepta los valores que mapeamos
-- desde reserva.forma_pago. Mapeo aplicado por la RPC:
--   reserva.contado/transferencia/deposito -> venta.contado
--   reserva.credito_hipotecario             -> venta.credito_bancario
--   reserva.credito_directo                 -> venta.financiado
-- (no se agregan valores nuevos; el enum existente cubre el mapeo).
-- ============================================================

-- ============================================================
-- RPC cerrar_proceso_y_crear_venta
--   Operacion atomica:
--     1. Inserta crm.venta heredando datos de reserva + parametros
--     2. Genera cronograma (separacion + cuota_inicial + saldo)
--     3. Vende el lote (reservado -> vendido)
--     4. Marca proceso completado y enlaza venta_id
--     5. Marca etapa desembolso como completada
--     6. Marca reserva como convertida_venta
--   Permisos: SECURITY DEFINER, autorizacion en server action.
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
  -- ---- Validar entradas basicas ----
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

  -- ---- Cargar proceso ----
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

  -- ---- Cargar reserva (puede ser NULL si fue manual) ----
  IF v_proceso.reserva_id IS NOT NULL THEN
    SELECT * INTO v_reserva FROM crm.reserva WHERE id = v_proceso.reserva_id FOR UPDATE;
  END IF;

  -- ---- Cargar lote ----
  SELECT * INTO v_lote FROM crm.lote WHERE id = v_proceso.lote_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lote del proceso no encontrado' USING ERRCODE = 'P0002';
  END IF;
  IF v_lote.estado <> 'reservado' THEN
    RAISE EXCEPTION 'El lote no esta reservado (estado: %)', v_lote.estado USING ERRCODE = '42501';
  END IF;

  -- ---- Mapear forma_pago de reserva -> venta ----
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

  -- ---- Generar codigo VTA-YYYY-NNNN ----
  v_anio := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(codigo_venta FROM 10) AS INT)
  ), 0) + 1
  INTO v_siguiente
  FROM crm.venta
  WHERE codigo_venta LIKE 'VTA-' || v_anio || '-%';
  v_codigo_venta := 'VTA-' || v_anio || '-' || LPAD(v_siguiente::TEXT, 4, '0');

  -- ---- Insertar venta ----
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

  -- ---- Generar cronograma de cuotas ----
  -- Si fecha_primera_cuota fue indicada, ajustar despues. La RPC
  -- generar_cronograma_pagos usa CURRENT_DATE como inicio; corregimos
  -- en un UPDATE posterior si el usuario quiere otra fecha base.
  v_total_cuotas := crm.generar_cronograma_pagos(v_venta_id);

  IF p_fecha_primera_cuota IS NOT NULL THEN
    -- Reescribir fecha_vencimiento de las cuotas de saldo manteniendo
    -- el espaciado mensual a partir de p_fecha_primera_cuota.
    UPDATE crm.cuota AS c
       SET fecha_vencimiento = p_fecha_primera_cuota + ((c.numero_cuota - (
              SELECT MIN(numero_cuota) FROM crm.cuota
              WHERE venta_id = v_venta_id AND tipo = 'cuota_saldo'
            )) || ' months')::INTERVAL
     WHERE c.venta_id = v_venta_id
       AND c.tipo = 'cuota_saldo';
  END IF;

  -- ---- Vender el lote (reservado -> vendido) ----
  v_lote_vendido := crm.vender_lote(v_proceso.lote_id);
  IF NOT v_lote_vendido THEN
    RAISE EXCEPTION 'No se pudo vender el lote (estado actual: %)', v_lote.estado
      USING ERRCODE = '42501';
  END IF;

  -- ---- Completar etapa de desembolso ----
  UPDATE crm.proceso_etapa
     SET estado = 'completada',
         fecha_completada = now()
   WHERE proceso_id = p_proceso_id
     AND etapa = 'desembolso'
   RETURNING id INTO v_etapa_id;

  -- ---- Completar proceso y enlazar venta ----
  UPDATE crm.proceso_adquisicion
     SET estado = 'completado',
         venta_id = v_venta_id,
         fecha_cierre = CURRENT_DATE,
         updated_at = now()
   WHERE id = p_proceso_id;

  -- ---- Marcar reserva como convertida (si existe) ----
  IF v_reserva.id IS NOT NULL THEN
    UPDATE crm.reserva
       SET estado = 'convertida_venta'
     WHERE id = v_reserva.id
       AND estado = 'activa';
  END IF;

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
  'Cierra proceso en etapa desembolso: crea venta, genera cronograma, vende lote, marca reserva convertida. Operacion atomica.';

COMMIT;
