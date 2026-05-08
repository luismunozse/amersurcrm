-- Etapa 6 (proformas): puente formal proforma -> separacion.
-- Una proforma aprobada puede convertirse en separacion heredando lote,
-- monto y forma de pago. Se enlaza via columna reserva_id y estado
-- 'convertida' agregado al ciclo de vida.

BEGIN;

CREATE SCHEMA IF NOT EXISTS crm;

-- ============================================================
-- 1. proforma.reserva_id: link a la reserva generada
-- ============================================================
ALTER TABLE crm.proforma
  ADD COLUMN IF NOT EXISTS reserva_id UUID REFERENCES crm.reserva(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_proforma_reserva ON crm.proforma(reserva_id);

COMMENT ON COLUMN crm.proforma.reserva_id IS
  'Reserva generada a partir de esta proforma cuando fue convertida en separacion.';

-- ============================================================
-- 2. proforma.estado: agregar 'convertida' al check
-- ============================================================
ALTER TABLE crm.proforma
  DROP CONSTRAINT IF EXISTS proforma_estado_check;

ALTER TABLE crm.proforma
  ADD CONSTRAINT proforma_estado_check
  CHECK (estado IN ('borrador', 'enviada', 'aprobada', 'rechazada', 'anulada', 'convertida'));

COMMIT;
