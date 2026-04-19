-- ============================================================
-- COBRANZA: Vista, alertas y funciones de mora
-- ============================================================

-- Vista de cobranza: todas las cuotas pendientes con información contextual
CREATE OR REPLACE VIEW crm.v_cobranza AS
SELECT
  c.id AS cuota_id,
  c.venta_id,
  c.numero_cuota,
  c.tipo,
  c.monto_programado,
  c.monto_pagado,
  c.monto_mora,
  c.moneda,
  c.fecha_vencimiento,
  c.fecha_pago,
  c.estado AS estado_cuota,

  -- Días de atraso (negativo = faltan días, positivo = días vencidos)
  CASE
    WHEN c.estado IN ('pagada') THEN 0
    ELSE GREATEST(0, CURRENT_DATE - c.fecha_vencimiento)
  END AS dias_atraso,

  -- Estado de cobranza calculado
  CASE
    WHEN c.estado = 'pagada' THEN 'al_dia'
    WHEN c.estado = 'en_mora' THEN 'en_mora'
    WHEN CURRENT_DATE > c.fecha_vencimiento + INTERVAL '3 days' THEN 'en_mora'
    WHEN CURRENT_DATE > c.fecha_vencimiento THEN 'vencida'
    WHEN c.fecha_vencimiento - CURRENT_DATE <= 3 THEN 'por_vencer_3d'
    WHEN c.fecha_vencimiento - CURRENT_DATE <= 7 THEN 'por_vencer_7d'
    WHEN c.fecha_vencimiento - CURRENT_DATE <= 15 THEN 'por_vencer_15d'
    ELSE 'al_dia'
  END AS estado_cobranza,

  -- Datos de la venta
  v.codigo_venta,
  v.precio_total,
  v.saldo_pendiente AS saldo_venta,
  v.forma_pago,
  v.vendedor_username,

  -- Datos del cliente
  cl.id AS cliente_id,
  cl.nombre AS cliente_nombre,
  cl.telefono AS cliente_telefono,
  cl.email AS cliente_email,
  cl.telefono_whatsapp AS cliente_whatsapp,

  -- Datos del lote/proyecto
  l.id AS lote_id,
  l.codigo AS lote_codigo,
  p.id AS proyecto_id,
  p.nombre AS proyecto_nombre

FROM crm.cuota c
  JOIN crm.venta v ON c.venta_id = v.id
  JOIN crm.cliente cl ON v.cliente_id = cl.id
  LEFT JOIN crm.lote l ON v.lote_id = l.id
  LEFT JOIN crm.proyecto p ON l.proyecto_id = p.id
WHERE c.estado != 'pagada'
  AND v.estado NOT IN ('cancelada', 'suspendida')
ORDER BY c.fecha_vencimiento ASC;

-- Tabla de alertas de cobranza
CREATE TABLE IF NOT EXISTS crm.alerta_cobranza (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cuota_id UUID NOT NULL REFERENCES crm.cuota(id) ON DELETE CASCADE,
  tipo_alerta VARCHAR(30) NOT NULL
    CHECK (tipo_alerta IN ('por_vencer_3d', 'por_vencer_7d', 'por_vencer_15d', 'vencida', 'mora')),
  enviada BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_alerta TIMESTAMPTZ NOT NULL DEFAULT now(),
  canal VARCHAR(20) NOT NULL DEFAULT 'sistema'
    CHECK (canal IN ('email', 'whatsapp', 'sistema')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerta_cobranza_cuota ON crm.alerta_cobranza(cuota_id);
CREATE INDEX idx_alerta_cobranza_tipo ON crm.alerta_cobranza(tipo_alerta);
CREATE INDEX idx_alerta_cobranza_enviada ON crm.alerta_cobranza(enviada) WHERE NOT enviada;

-- RLS
ALTER TABLE crm.alerta_cobranza ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados pueden ver alertas cobranza"
  ON crm.alerta_cobranza FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role gestiona alertas cobranza"
  ON crm.alerta_cobranza FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- RPC: Calcular mora para una cuota específica
-- ============================================================
CREATE OR REPLACE FUNCTION crm.calcular_mora(p_cuota_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cuota RECORD;
  v_config RECORD;
  v_proyecto_id UUID;
  v_dias_atraso INTEGER;
  v_mora NUMERIC(14,2);
BEGIN
  SELECT * INTO v_cuota FROM crm.cuota WHERE id = p_cuota_id;
  IF NOT FOUND OR v_cuota.estado = 'pagada' THEN
    RETURN 0;
  END IF;

  v_dias_atraso := GREATEST(0, CURRENT_DATE - v_cuota.fecha_vencimiento);
  IF v_dias_atraso = 0 THEN
    RETURN 0;
  END IF;

  -- Obtener proyecto del lote de la venta
  SELECT l.proyecto_id INTO v_proyecto_id
  FROM crm.venta v
  JOIN crm.lote l ON v.lote_id = l.id
  WHERE v.id = v_cuota.venta_id;

  -- Config del proyecto
  SELECT * INTO v_config
  FROM crm.configuracion_proyecto_financiera
  WHERE proyecto_id = v_proyecto_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Aplicar días de gracia
  v_dias_atraso := GREATEST(0, v_dias_atraso - v_config.dias_gracia_mora);
  IF v_dias_atraso = 0 THEN
    RETURN 0;
  END IF;

  -- Calcular mora: tasa diaria sobre el saldo pendiente de la cuota
  v_mora := (v_cuota.monto_programado - v_cuota.monto_pagado)
            * (v_config.tasa_mora_mensual / 30.0)
            * v_dias_atraso;

  v_mora := ROUND(v_mora, 2);

  -- Actualizar la cuota
  UPDATE crm.cuota SET
    monto_mora = v_mora,
    estado = CASE WHEN v_dias_atraso > 0 THEN 'en_mora' ELSE estado END,
    updated_at = now()
  WHERE id = p_cuota_id;

  RETURN v_mora;
END;
$$;

-- ============================================================
-- RPC: Actualizar todas las cuotas vencidas (para cron/batch)
-- ============================================================
CREATE OR REPLACE FUNCTION crm.actualizar_cuotas_vencidas()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER := 0;
  v_cuota RECORD;
BEGIN
  -- Marcar cuotas vencidas
  UPDATE crm.cuota SET
    estado = 'vencida',
    updated_at = now()
  WHERE estado = 'pendiente'
    AND fecha_vencimiento < CURRENT_DATE;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Calcular mora para cuotas vencidas y en_mora
  FOR v_cuota IN
    SELECT id FROM crm.cuota
    WHERE estado IN ('vencida', 'en_mora', 'parcial')
      AND fecha_vencimiento < CURRENT_DATE
  LOOP
    PERFORM crm.calcular_mora(v_cuota.id);
  END LOOP;

  RETURN v_count;
END;
$$;

COMMENT ON VIEW crm.v_cobranza IS 'Vista de cobranza: cuotas pendientes con datos de cliente, venta y proyecto';
COMMENT ON FUNCTION crm.calcular_mora IS 'Calcula y actualiza la mora de una cuota específica';
COMMENT ON FUNCTION crm.actualizar_cuotas_vencidas IS 'Actualiza el estado de todas las cuotas vencidas y calcula moras (para ejecución periódica)';
