-- Agregar columna firma_vendedor_base64 a crm.reserva
-- Almacena firma digital del vendedor que registra la separacion (data URL PNG base64).

BEGIN;

ALTER TABLE crm.reserva
  ADD COLUMN IF NOT EXISTS firma_vendedor_base64 TEXT;

COMMENT ON COLUMN crm.reserva.firma_vendedor_base64 IS
  'Firma digital del vendedor que registra la separacion (data URL PNG base64).';

COMMIT;
