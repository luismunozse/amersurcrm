-- ============================================================
-- CONFIGURACIÓN FINANCIERA POR PROYECTO
-- Base para separación, cronograma, mora y cobranza
-- ============================================================

CREATE TABLE IF NOT EXISTS crm.configuracion_proyecto_financiera (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES crm.proyecto(id) ON DELETE CASCADE,

  -- Separación
  porcentaje_minimo_separacion NUMERIC(5,2) NOT NULL DEFAULT 5.00,

  -- Cuota inicial
  porcentaje_cuota_inicial NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  max_cuotas_iniciales INTEGER NOT NULL DEFAULT 3,

  -- Saldo / Financiamiento
  max_cuotas_saldo INTEGER NOT NULL DEFAULT 120,
  tasa_efectiva_mensual NUMERIC(8,6) NOT NULL DEFAULT 0.000000,

  -- Mora
  tasa_mora_mensual NUMERIC(8,6) NOT NULL DEFAULT 0.015000,
  dias_gracia_mora INTEGER NOT NULL DEFAULT 3,
  penalidad_clientes_al_dia NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  penalidad_clientes_morosos NUMERIC(5,2) NOT NULL DEFAULT 2.00,
  descuento_maximo_letra NUMERIC(5,2) NOT NULL DEFAULT 0.00,

  -- Seguros
  seguro_desgravamen_porcentaje NUMERIC(8,6) NOT NULL DEFAULT 0.000000,
  seguro_multiriesgo_porcentaje NUMERIC(8,6) NOT NULL DEFAULT 0.000000,

  -- General
  moneda_predeterminada VARCHAR(3) NOT NULL DEFAULT 'PEN',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_config_financiera_proyecto UNIQUE (proyecto_id)
);

-- Trigger updated_at
CREATE TRIGGER trg_config_financiera_updated_at
  BEFORE UPDATE ON crm.configuracion_proyecto_financiera
  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

-- Índices
CREATE INDEX idx_config_financiera_proyecto ON crm.configuracion_proyecto_financiera(proyecto_id);

-- RLS
ALTER TABLE crm.configuracion_proyecto_financiera ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados pueden ver configuración financiera"
  ON crm.configuracion_proyecto_financiera FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role puede gestionar configuración financiera"
  ON crm.configuracion_proyecto_financiera FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE crm.configuracion_proyecto_financiera IS 'Configuración financiera por proyecto: tasas, porcentajes mínimos, mora, seguros';
