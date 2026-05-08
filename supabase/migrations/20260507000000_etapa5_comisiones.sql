-- Etapa 5 (comisiones): tabla comision + auto-generacion al cerrar venta.
-- Modelo simple (Opcion A): 1 comision por venta para el vendedor asignado,
-- porcentaje fijo configurable por proyecto. Estados: pendiente -> aprobada
-- -> pagada (admin) o anulada (admin).

BEGIN;

CREATE SCHEMA IF NOT EXISTS crm;

-- ============================================================
-- 1. Configuracion por proyecto: porcentaje_comision_vendedor
-- ============================================================
ALTER TABLE crm.configuracion_proyecto_financiera
  ADD COLUMN IF NOT EXISTS porcentaje_comision_vendedor NUMERIC(5,2) NOT NULL DEFAULT 3.00;

COMMENT ON COLUMN crm.configuracion_proyecto_financiera.porcentaje_comision_vendedor IS
  'Porcentaje de comision del vendedor sobre el precio_total de la venta. Default 3%.';

-- ============================================================
-- 2. Tabla crm.comision
-- ============================================================
CREATE TABLE IF NOT EXISTS crm.comision (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(20) UNIQUE,

  venta_id UUID NOT NULL REFERENCES crm.venta(id) ON DELETE CASCADE,

  -- Beneficiario
  beneficiario_username VARCHAR(50) NOT NULL,
  beneficiario_rol VARCHAR(50) NOT NULL DEFAULT 'ROL_VENDEDOR',

  -- Calculo
  base_calculo NUMERIC(14,2) NOT NULL,
  porcentaje NUMERIC(5,2) NOT NULL,
  monto NUMERIC(14,2) NOT NULL,
  moneda VARCHAR(3) NOT NULL DEFAULT 'PEN'
    CHECK (moneda IN ('PEN', 'USD', 'EUR')),

  -- Estado del ciclo de vida
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'aprobada', 'pagada', 'anulada')),

  -- Auditoria de transiciones
  fecha_generacion TIMESTAMPTZ NOT NULL DEFAULT now(),

  fecha_aprobacion TIMESTAMPTZ,
  aprobada_por VARCHAR(50),

  fecha_pago TIMESTAMPTZ,
  pagada_por VARCHAR(50),
  metodo_pago VARCHAR(50),
  comprobante_url TEXT,

  fecha_anulacion TIMESTAMPTZ,
  anulada_por VARCHAR(50),
  motivo_anulacion TEXT,

  notas TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comision_venta ON crm.comision(venta_id);
CREATE INDEX IF NOT EXISTS idx_comision_beneficiario ON crm.comision(beneficiario_username);
CREATE INDEX IF NOT EXISTS idx_comision_estado ON crm.comision(estado);
CREATE INDEX IF NOT EXISTS idx_comision_fecha_generacion ON crm.comision(fecha_generacion DESC);

CREATE TRIGGER trg_comision_updated_at
  BEFORE UPDATE ON crm.comision
  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

-- Auto-generar codigo COM-YYYY-NNNN
CREATE OR REPLACE FUNCTION crm.generar_codigo_comision()
RETURNS TRIGGER AS $$
DECLARE
  v_anio TEXT;
  v_siguiente INT;
BEGIN
  v_anio := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(codigo FROM 10) AS INT)
  ), 0) + 1
  INTO v_siguiente
  FROM crm.comision
  WHERE codigo LIKE 'COM-' || v_anio || '-%';

  NEW.codigo := 'COM-' || v_anio || '-' || LPAD(v_siguiente::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generar_codigo_comision
  BEFORE INSERT ON crm.comision
  FOR EACH ROW
  WHEN (NEW.codigo IS NULL)
  EXECUTE FUNCTION crm.generar_codigo_comision();

-- RLS
ALTER TABLE crm.comision ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados ven comisiones" ON crm.comision
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role gestiona comisiones" ON crm.comision
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE crm.comision IS
  'Comisiones generadas por venta. Estado: pendiente -> aprobada -> pagada (admin), anulada (admin).';

-- ============================================================
-- 3. RPC generar_comision_venta(venta_id)
--    Crea comision pendiente al vendedor de la venta.
--    Idempotente: si ya existe comision activa para la venta, no crea otra.
-- ============================================================
CREATE OR REPLACE FUNCTION crm.generar_comision_venta(p_venta_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, public
AS $$
DECLARE
  v_venta       RECORD;
  v_proyecto_id UUID;
  v_config      RECORD;
  v_porcentaje  NUMERIC(5,2);
  v_monto       NUMERIC(14,2);
  v_existente   UUID;
  v_comision_id UUID;
BEGIN
  IF p_venta_id IS NULL THEN
    RAISE EXCEPTION 'venta_id requerido' USING ERRCODE = '22023';
  END IF;

  -- Idempotencia: una comision activa por venta + vendedor
  SELECT id INTO v_existente
  FROM crm.comision
  WHERE venta_id = p_venta_id
    AND estado <> 'anulada'
  LIMIT 1;

  IF v_existente IS NOT NULL THEN
    RETURN v_existente;
  END IF;

  SELECT * INTO v_venta FROM crm.venta WHERE id = p_venta_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venta no encontrada' USING ERRCODE = 'P0002';
  END IF;
  IF v_venta.vendedor_username IS NULL OR length(v_venta.vendedor_username) = 0 THEN
    RAISE EXCEPTION 'La venta no tiene vendedor asignado' USING ERRCODE = '22023';
  END IF;

  -- Obtener porcentaje del proyecto del lote
  SELECT l.proyecto_id INTO v_proyecto_id
  FROM crm.lote l WHERE l.id = v_venta.lote_id;

  v_porcentaje := 3.00;
  IF v_proyecto_id IS NOT NULL THEN
    SELECT porcentaje_comision_vendedor INTO v_porcentaje
    FROM crm.configuracion_proyecto_financiera
    WHERE proyecto_id = v_proyecto_id;
    IF v_porcentaje IS NULL THEN v_porcentaje := 3.00; END IF;
  END IF;

  v_monto := ROUND(v_venta.precio_total * v_porcentaje / 100.0, 2);

  INSERT INTO crm.comision (
    venta_id, beneficiario_username, beneficiario_rol,
    base_calculo, porcentaje, monto, moneda,
    estado, fecha_generacion
  ) VALUES (
    p_venta_id, v_venta.vendedor_username, 'ROL_VENDEDOR',
    v_venta.precio_total, v_porcentaje, v_monto, v_venta.moneda,
    'pendiente', now()
  ) RETURNING id INTO v_comision_id;

  RETURN v_comision_id;
END;
$$;

GRANT EXECUTE ON FUNCTION crm.generar_comision_venta(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION crm.generar_comision_venta(UUID) TO service_role;

-- ============================================================
-- 4. Hook en cerrar_proceso_y_crear_venta: invocar generar_comision_venta
--    al final del cierre. No-failing: si hay error, log y continuar.
-- ============================================================
-- Se reemplaza la RPC existente agregando el paso final.
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
  v_comision_id   UUID;
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

  -- Auto-generar comision pendiente para el vendedor.
  -- Si falla (sin vendedor, sin proyecto), log y continuar.
  BEGIN
    v_comision_id := crm.generar_comision_venta(v_venta_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'No se genero comision automatica: %', SQLERRM;
    v_comision_id := NULL;
  END;

  RETURN jsonb_build_object(
    'venta_id', v_venta_id,
    'codigo_venta', v_codigo_venta,
    'total_cuotas', v_total_cuotas,
    'forma_pago', v_forma_pago,
    'precio_total', p_precio_total,
    'saldo_pendiente', p_precio_total - p_monto_inicial,
    'comision_id', v_comision_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION crm.cerrar_proceso_y_crear_venta(UUID, NUMERIC, NUMERIC, INTEGER, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION crm.cerrar_proceso_y_crear_venta(UUID, NUMERIC, NUMERIC, INTEGER, DATE, TEXT) TO service_role;

-- ============================================================
-- 5. RPCs de transicion de estado (autorizacion via server action)
-- ============================================================
CREATE OR REPLACE FUNCTION crm.aprobar_comision(
  p_comision_id UUID,
  p_username    VARCHAR
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, public
AS $$
DECLARE
  v_estado VARCHAR;
BEGIN
  IF p_comision_id IS NULL THEN
    RAISE EXCEPTION 'comision_id requerido' USING ERRCODE = '22023';
  END IF;

  SELECT estado INTO v_estado FROM crm.comision WHERE id = p_comision_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comision no encontrada' USING ERRCODE = 'P0002';
  END IF;
  IF v_estado <> 'pendiente' THEN
    RAISE EXCEPTION 'Solo se pueden aprobar comisiones pendientes (estado actual: %)', v_estado
      USING ERRCODE = '42501';
  END IF;

  UPDATE crm.comision SET
    estado = 'aprobada',
    fecha_aprobacion = now(),
    aprobada_por = p_username,
    updated_at = now()
  WHERE id = p_comision_id;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION crm.pagar_comision(
  p_comision_id     UUID,
  p_username        VARCHAR,
  p_metodo_pago     VARCHAR,
  p_comprobante_url TEXT DEFAULT NULL,
  p_notas           TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, public
AS $$
DECLARE
  v_estado VARCHAR;
BEGIN
  IF p_comision_id IS NULL THEN
    RAISE EXCEPTION 'comision_id requerido' USING ERRCODE = '22023';
  END IF;
  IF p_metodo_pago IS NULL OR length(p_metodo_pago) = 0 THEN
    RAISE EXCEPTION 'metodo_pago requerido' USING ERRCODE = '22023';
  END IF;

  SELECT estado INTO v_estado FROM crm.comision WHERE id = p_comision_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comision no encontrada' USING ERRCODE = 'P0002';
  END IF;
  IF v_estado <> 'aprobada' THEN
    RAISE EXCEPTION 'Solo se pueden pagar comisiones aprobadas (estado actual: %)', v_estado
      USING ERRCODE = '42501';
  END IF;

  UPDATE crm.comision SET
    estado = 'pagada',
    fecha_pago = now(),
    pagada_por = p_username,
    metodo_pago = p_metodo_pago,
    comprobante_url = COALESCE(p_comprobante_url, comprobante_url),
    notas = COALESCE(p_notas, notas),
    updated_at = now()
  WHERE id = p_comision_id;

  -- Reflejar en venta.comision_pagada para retrocompatibilidad
  UPDATE crm.venta SET
    comision_pagada = TRUE
  WHERE id = (SELECT venta_id FROM crm.comision WHERE id = p_comision_id);

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION crm.anular_comision(
  p_comision_id UUID,
  p_username    VARCHAR,
  p_motivo      TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, public
AS $$
DECLARE
  v_estado VARCHAR;
BEGIN
  IF p_comision_id IS NULL THEN
    RAISE EXCEPTION 'comision_id requerido' USING ERRCODE = '22023';
  END IF;
  IF p_motivo IS NULL OR length(btrim(p_motivo)) = 0 THEN
    RAISE EXCEPTION 'motivo requerido' USING ERRCODE = '22023';
  END IF;

  SELECT estado INTO v_estado FROM crm.comision WHERE id = p_comision_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comision no encontrada' USING ERRCODE = 'P0002';
  END IF;
  IF v_estado = 'anulada' THEN
    RAISE EXCEPTION 'La comision ya fue anulada' USING ERRCODE = '42501';
  END IF;
  IF v_estado = 'pagada' THEN
    RAISE EXCEPTION 'No se puede anular una comision ya pagada' USING ERRCODE = '42501';
  END IF;

  UPDATE crm.comision SET
    estado = 'anulada',
    fecha_anulacion = now(),
    anulada_por = p_username,
    motivo_anulacion = p_motivo,
    updated_at = now()
  WHERE id = p_comision_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION crm.aprobar_comision(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION crm.pagar_comision(UUID, VARCHAR, VARCHAR, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION crm.anular_comision(UUID, VARCHAR, TEXT) TO authenticated;

GRANT EXECUTE ON FUNCTION crm.aprobar_comision(UUID, VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION crm.pagar_comision(UUID, VARCHAR, VARCHAR, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION crm.anular_comision(UUID, VARCHAR, TEXT) TO service_role;

COMMENT ON FUNCTION crm.aprobar_comision IS 'Transiciona comision pendiente -> aprobada. Solo admin (validar en server action).';
COMMENT ON FUNCTION crm.pagar_comision IS 'Transiciona comision aprobada -> pagada. Solo admin (validar en server action).';
COMMENT ON FUNCTION crm.anular_comision IS 'Transiciona comision pendiente/aprobada -> anulada. Solo admin (validar en server action).';

COMMIT;
