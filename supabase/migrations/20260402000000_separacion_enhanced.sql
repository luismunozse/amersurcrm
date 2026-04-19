-- ============================================================
-- EVOLUCIONAR RESERVA → SEPARACIÓN
-- Agrega campos para diferenciar tipos de separación (arras)
-- Compatible con datos existentes (todas las columnas nullable)
-- ============================================================

-- Tipo de separación según legislación peruana
ALTER TABLE crm.reserva
  ADD COLUMN IF NOT EXISTS tipo_separacion VARCHAR(30)
    DEFAULT 'separacion_simple'
    CHECK (tipo_separacion IN ('separacion_simple', 'arras_confirmatorias', 'arras_retractacion'));

-- Porcentaje del precio total que representa esta separación
ALTER TABLE crm.reserva
  ADD COLUMN IF NOT EXISTS porcentaje_aplicado NUMERIC(5,2);

-- Precio de referencia del lote al momento de la separación
ALTER TABLE crm.reserva
  ADD COLUMN IF NOT EXISTS precio_referencia NUMERIC(14,2);

COMMENT ON COLUMN crm.reserva.tipo_separacion IS 'Tipo de separación: simple (reembolsable), arras confirmatorias (Art.1477 CC Perú), arras retractación (Art.1480 CC Perú)';
COMMENT ON COLUMN crm.reserva.porcentaje_aplicado IS 'Porcentaje del precio total que representa el monto de separación';
COMMENT ON COLUMN crm.reserva.precio_referencia IS 'Precio del lote al momento de crear la separación';
