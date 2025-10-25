-- =====================================================
-- PROFORMAS COMERCIALES
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'crm' AND table_name = 'proforma'
  ) THEN
    CREATE TABLE crm.proforma (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      numero VARCHAR(30),
      cliente_id UUID NOT NULL REFERENCES crm.cliente(id) ON DELETE CASCADE,
      lote_id UUID REFERENCES crm.lote(id) ON DELETE SET NULL,
      asesor_id UUID NOT NULL REFERENCES crm.usuario_perfil(id) ON DELETE RESTRICT,
      asesor_username VARCHAR(50),
      tipo_operacion VARCHAR(20) NOT NULL DEFAULT 'reserva'
        CHECK (tipo_operacion IN ('reserva', 'venta', 'cotizacion')),
      estado VARCHAR(20) NOT NULL DEFAULT 'borrador'
        CHECK (estado IN ('borrador', 'enviada', 'aprobada', 'rechazada', 'anulada')),
      moneda VARCHAR(3) NOT NULL DEFAULT 'PEN' CHECK (moneda IN ('PEN', 'USD')),
      total NUMERIC(14,2),
      descuento NUMERIC(14,2),
      datos JSONB NOT NULL DEFAULT '{}'::jsonb,
      comentarios TEXT,
      pdf_url TEXT,
      enviado_a TEXT,
      enviado_por UUID REFERENCES crm.usuario_perfil(id) ON DELETE SET NULL,
      enviado_en TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    COMMENT ON TABLE crm.proforma IS 'Proformas comerciales generadas para clientes';
    COMMENT ON COLUMN crm.proforma.datos IS 'Payload editable con los campos de la proforma';
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_proforma_cliente ON crm.proforma(cliente_id);
CREATE INDEX IF NOT EXISTS idx_proforma_lote ON crm.proforma(lote_id);
CREATE INDEX IF NOT EXISTS idx_proforma_estado ON crm.proforma(estado);
CREATE INDEX IF NOT EXISTS idx_proforma_tipo ON crm.proforma(tipo_operacion);

-- Trigger de updated_at
DROP TRIGGER IF EXISTS proforma_set_updated_at ON crm.proforma;
CREATE TRIGGER proforma_set_updated_at
  BEFORE UPDATE ON crm.proforma
  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

-- RLS
ALTER TABLE crm.proforma ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS proforma_select_authenticated ON crm.proforma;
CREATE POLICY proforma_select_authenticated
  ON crm.proforma FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS proforma_insert_authenticated ON crm.proforma;
CREATE POLICY proforma_insert_authenticated
  ON crm.proforma FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS proforma_update_authenticated ON crm.proforma;
CREATE POLICY proforma_update_authenticated
  ON crm.proforma FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS proforma_delete_authenticated ON crm.proforma;
CREATE POLICY proforma_delete_authenticated
  ON crm.proforma FOR DELETE
  USING (auth.role() = 'authenticated' AND (asesor_id IS NULL OR auth.uid() = asesor_id));
