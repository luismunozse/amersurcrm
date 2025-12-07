-- Indexes to speed up cliente listings and vendor filters
CREATE INDEX IF NOT EXISTS idx_cliente_vendedor_username
  ON crm.cliente (vendedor_username);

CREATE INDEX IF NOT EXISTS idx_cliente_created_by
  ON crm.cliente (created_by);

CREATE INDEX IF NOT EXISTS idx_cliente_fecha_alta
  ON crm.cliente (fecha_alta DESC);

CREATE INDEX IF NOT EXISTS idx_cliente_estado
  ON crm.cliente (estado_cliente);
