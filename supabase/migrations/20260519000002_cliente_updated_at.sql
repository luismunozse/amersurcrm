-- Agrega updated_at a crm.cliente + trigger BEFORE UPDATE.
-- Permite ordenar lista por "última modificación" (cliente recién editado va arriba).

BEGIN;

ALTER TABLE crm.cliente
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill: igualar updated_at al created_at en filas existentes (idempotente)
UPDATE crm.cliente
SET updated_at = COALESCE(created_at, NOW())
WHERE updated_at = '1970-01-01'::timestamptz OR updated_at IS NULL;

-- Reusa función crm.set_updated_at() existente (base_schema)
DROP TRIGGER IF EXISTS t_upd_cliente ON crm.cliente;
CREATE TRIGGER t_upd_cliente
  BEFORE UPDATE ON crm.cliente
  FOR EACH ROW
  EXECUTE FUNCTION crm.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_cliente_updated_at
  ON crm.cliente (updated_at DESC);

COMMENT ON COLUMN crm.cliente.updated_at IS 'Timestamp de última modificación (set por trigger t_upd_cliente).';

COMMIT;
