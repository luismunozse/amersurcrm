-- ============================================================
-- CRONOGRAMA DE PAGOS (CUOTAS)
-- Generación automática y seguimiento de cuotas
-- ============================================================

-- Tabla de cuotas
CREATE TABLE IF NOT EXISTS crm.cuota (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id UUID NOT NULL REFERENCES crm.venta(id) ON DELETE CASCADE,

  numero_cuota INTEGER NOT NULL,
  tipo VARCHAR(20) NOT NULL DEFAULT 'cuota_saldo'
    CHECK (tipo IN ('separacion', 'cuota_inicial', 'cuota_saldo')),

  -- Montos
  monto_programado NUMERIC(14,2) NOT NULL,
  monto_pagado NUMERIC(14,2) NOT NULL DEFAULT 0,
  monto_mora NUMERIC(14,2) NOT NULL DEFAULT 0,
  moneda VARCHAR(3) NOT NULL DEFAULT 'PEN',

  -- Fechas
  fecha_vencimiento DATE NOT NULL,
  fecha_pago TIMESTAMPTZ,

  -- Estado
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'pagada', 'vencida', 'en_mora', 'parcial')),

  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_cuota_venta_numero UNIQUE (venta_id, numero_cuota)
);

-- Agregar cuota_id a la tabla pago (nullable para backward compat)
ALTER TABLE crm.pago
  ADD COLUMN IF NOT EXISTS cuota_id UUID REFERENCES crm.cuota(id) ON DELETE SET NULL;

-- Trigger updated_at
CREATE TRIGGER trg_cuota_updated_at
  BEFORE UPDATE ON crm.cuota
  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

-- ============================================================
-- RPC: Generar cronograma de pagos automáticamente
-- ============================================================
CREATE OR REPLACE FUNCTION crm.generar_cronograma_pagos(p_venta_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_venta RECORD;
  v_config RECORD;
  v_lote_proyecto_id UUID;
  v_saldo NUMERIC(14,2);
  v_cuota_monto NUMERIC(14,2);
  v_fecha_inicio DATE;
  v_num_cuota INTEGER := 0;
  v_total_cuotas INTEGER := 0;
  i INTEGER;
BEGIN
  -- Obtener datos de la venta
  SELECT * INTO v_venta FROM crm.venta WHERE id = p_venta_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venta no encontrada: %', p_venta_id;
  END IF;

  -- Obtener proyecto_id del lote
  SELECT proyecto_id INTO v_lote_proyecto_id
  FROM crm.lote WHERE id = v_venta.lote_id;

  -- Obtener configuración financiera del proyecto
  SELECT * INTO v_config
  FROM crm.configuracion_proyecto_financiera
  WHERE proyecto_id = v_lote_proyecto_id;

  -- Si no hay config, usar defaults
  IF NOT FOUND THEN
    v_config.max_cuotas_saldo := 120;
    v_config.tasa_efectiva_mensual := 0;
  END IF;

  -- Eliminar cuotas no pagadas existentes (para regeneración)
  DELETE FROM crm.cuota
  WHERE venta_id = p_venta_id
    AND estado IN ('pendiente', 'vencida', 'en_mora');

  v_fecha_inicio := CURRENT_DATE;

  -- Cuota 0: Separación (monto inicial / cuota inicial)
  IF v_venta.monto_inicial IS NOT NULL AND v_venta.monto_inicial > 0 THEN
    v_num_cuota := v_num_cuota + 1;
    INSERT INTO crm.cuota (venta_id, numero_cuota, tipo, monto_programado, monto_pagado, moneda, fecha_vencimiento, estado)
    VALUES (p_venta_id, v_num_cuota, 'cuota_inicial', v_venta.monto_inicial, v_venta.monto_inicial, v_venta.moneda, v_fecha_inicio, 'pagada');
    v_total_cuotas := v_total_cuotas + 1;
  END IF;

  -- Calcular saldo a financiar
  v_saldo := v_venta.precio_total - COALESCE(v_venta.monto_inicial, 0);

  IF v_saldo <= 0 OR v_venta.numero_cuotas IS NULL OR v_venta.numero_cuotas <= 0 THEN
    RETURN v_total_cuotas;
  END IF;

  -- Generar cuotas de saldo
  IF v_config.tasa_efectiva_mensual > 0 THEN
    -- Con interés: cuota fija (método francés)
    v_cuota_monto := v_saldo * (v_config.tasa_efectiva_mensual * POWER(1 + v_config.tasa_efectiva_mensual, v_venta.numero_cuotas))
                     / (POWER(1 + v_config.tasa_efectiva_mensual, v_venta.numero_cuotas) - 1);
  ELSE
    -- Sin interés: cuota flat
    v_cuota_monto := v_saldo / v_venta.numero_cuotas;
  END IF;

  v_cuota_monto := ROUND(v_cuota_monto, 2);

  FOR i IN 1..v_venta.numero_cuotas LOOP
    v_num_cuota := v_num_cuota + 1;
    INSERT INTO crm.cuota (
      venta_id, numero_cuota, tipo, monto_programado, moneda,
      fecha_vencimiento, estado
    ) VALUES (
      p_venta_id, v_num_cuota, 'cuota_saldo', v_cuota_monto, v_venta.moneda,
      v_fecha_inicio + (i || ' months')::INTERVAL, 'pendiente'
    );
    v_total_cuotas := v_total_cuotas + 1;
  END LOOP;

  RETURN v_total_cuotas;
END;
$$;

-- ============================================================
-- Trigger: Al registrar pago con cuota_id, actualizar cuota
-- ============================================================
CREATE OR REPLACE FUNCTION crm.actualizar_cuota_al_pagar()
RETURNS TRIGGER AS $$
DECLARE
  v_cuota RECORD;
  v_nuevo_pagado NUMERIC(14,2);
BEGIN
  IF NEW.cuota_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_cuota FROM crm.cuota WHERE id = NEW.cuota_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_nuevo_pagado := v_cuota.monto_pagado + NEW.monto;

  UPDATE crm.cuota SET
    monto_pagado = v_nuevo_pagado,
    fecha_pago = CASE WHEN v_nuevo_pagado >= monto_programado THEN now() ELSE fecha_pago END,
    estado = CASE
      WHEN v_nuevo_pagado >= monto_programado THEN 'pagada'
      WHEN v_nuevo_pagado > 0 THEN 'parcial'
      ELSE estado
    END,
    updated_at = now()
  WHERE id = NEW.cuota_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pago_actualizar_cuota
  AFTER INSERT ON crm.pago
  FOR EACH ROW
  EXECUTE FUNCTION crm.actualizar_cuota_al_pagar();

-- Índices
CREATE INDEX idx_cuota_venta ON crm.cuota(venta_id);
CREATE INDEX idx_cuota_estado ON crm.cuota(estado);
CREATE INDEX idx_cuota_vencimiento ON crm.cuota(fecha_vencimiento);
CREATE INDEX idx_cuota_tipo ON crm.cuota(tipo);
CREATE INDEX idx_pago_cuota ON crm.pago(cuota_id);

-- RLS
ALTER TABLE crm.cuota ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados pueden ver cuotas"
  ON crm.cuota FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role gestiona cuotas"
  ON crm.cuota FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE crm.cuota IS 'Cronograma de pagos: cuotas programadas para cada venta';
COMMENT ON FUNCTION crm.generar_cronograma_pagos IS 'Genera automáticamente el cronograma de cuotas para una venta';
