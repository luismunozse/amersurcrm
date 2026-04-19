-- ============================================================
-- CONTRATO / MINUTA
-- Gestión del contrato de compraventa y trámite notarial/SUNARP
-- ============================================================

CREATE TABLE IF NOT EXISTS crm.contrato (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_contrato VARCHAR(20) UNIQUE,

  -- Relaciones
  venta_id UUID NOT NULL REFERENCES crm.venta(id) ON DELETE CASCADE,
  calificacion_id UUID REFERENCES crm.calificacion_bancaria(id) ON DELETE SET NULL,
  cliente_id UUID NOT NULL REFERENCES crm.cliente(id) ON DELETE CASCADE,
  lote_id UUID REFERENCES crm.lote(id) ON DELETE SET NULL,

  -- Estado del contrato
  estado VARCHAR(30) NOT NULL DEFAULT 'borrador'
    CHECK (estado IN ('borrador', 'pendiente_firma', 'firmado', 'en_notaria', 'inscrito_sunarp')),

  -- Datos notariales
  notaria VARCHAR(200),
  notario VARCHAR(200),
  numero_escritura VARCHAR(100),

  -- SUNARP
  partida_registral VARCHAR(100),
  numero_titulo VARCHAR(100),
  zona_registral VARCHAR(100),

  -- Fechas
  fecha_firma DATE,
  fecha_escritura DATE,
  fecha_inscripcion_sunarp DATE,

  -- Documentos
  contrato_url TEXT,
  escritura_url TEXT,
  constancia_sunarp_url TEXT,

  -- Datos adicionales
  vendedor_username VARCHAR(50),
  notas TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-generar código CON-YYYY-NNNN
CREATE OR REPLACE FUNCTION crm.generar_codigo_contrato()
RETURNS TRIGGER AS $$
DECLARE
  anio TEXT;
  siguiente INT;
BEGIN
  anio := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(codigo_contrato FROM 10) AS INT)
  ), 0) + 1
  INTO siguiente
  FROM crm.contrato
  WHERE codigo_contrato LIKE 'CON-' || anio || '-%';

  NEW.codigo_contrato := 'CON-' || anio || '-' || LPAD(siguiente::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generar_codigo_contrato
  BEFORE INSERT ON crm.contrato
  FOR EACH ROW
  WHEN (NEW.codigo_contrato IS NULL)
  EXECUTE FUNCTION crm.generar_codigo_contrato();

CREATE TRIGGER trg_contrato_updated_at
  BEFORE UPDATE ON crm.contrato
  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

-- Índices
CREATE INDEX idx_contrato_venta ON crm.contrato(venta_id);
CREATE INDEX idx_contrato_cliente ON crm.contrato(cliente_id);
CREATE INDEX idx_contrato_calificacion ON crm.contrato(calificacion_id);
CREATE INDEX idx_contrato_estado ON crm.contrato(estado);
CREATE INDEX idx_contrato_lote ON crm.contrato(lote_id);

-- RLS
ALTER TABLE crm.contrato ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados pueden ver contratos"
  ON crm.contrato FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role gestiona contratos"
  ON crm.contrato FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE crm.contrato IS 'Contratos de compraventa con seguimiento notarial y registral (SUNARP)';
