-- ============================================================
-- INDEPENDIZACIÓN
-- Trámite de independización registral ante SUNARP
-- ============================================================

CREATE TABLE IF NOT EXISTS crm.independizacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_independizacion VARCHAR(20) UNIQUE,

  -- Relaciones
  venta_id UUID NOT NULL REFERENCES crm.venta(id) ON DELETE CASCADE,
  lote_id UUID NOT NULL REFERENCES crm.lote(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES crm.cliente(id) ON DELETE CASCADE,
  contrato_id UUID REFERENCES crm.contrato(id) ON DELETE SET NULL,

  -- Estado
  estado VARCHAR(30) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'en_tramite', 'observada', 'completada')),

  -- Datos registrales
  notaria VARCHAR(200),
  partida_registral_matriz VARCHAR(100),
  partida_registral_independizada VARCHAR(100),
  numero_titulo VARCHAR(100),
  zona_registral VARCHAR(100),

  -- Fechas
  fecha_inicio_tramite DATE,
  fecha_presentacion_sunarp DATE,
  fecha_inscripcion DATE,

  -- Observaciones SUNARP
  observacion_sunarp TEXT,
  fecha_subsanacion DATE,

  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-generar código IND-YYYY-NNNN
CREATE OR REPLACE FUNCTION crm.generar_codigo_independizacion()
RETURNS TRIGGER AS $$
DECLARE
  anio TEXT;
  siguiente INT;
BEGIN
  anio := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(codigo_independizacion FROM 10) AS INT)
  ), 0) + 1
  INTO siguiente
  FROM crm.independizacion
  WHERE codigo_independizacion LIKE 'IND-' || anio || '-%';

  NEW.codigo_independizacion := 'IND-' || anio || '-' || LPAD(siguiente::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generar_codigo_independizacion
  BEFORE INSERT ON crm.independizacion
  FOR EACH ROW
  WHEN (NEW.codigo_independizacion IS NULL)
  EXECUTE FUNCTION crm.generar_codigo_independizacion();

CREATE TRIGGER trg_independizacion_updated_at
  BEFORE UPDATE ON crm.independizacion
  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

-- Documentos de independización
CREATE TABLE IF NOT EXISTS crm.independizacion_documento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  independizacion_id UUID NOT NULL REFERENCES crm.independizacion(id) ON DELETE CASCADE,

  tipo_documento VARCHAR(50) NOT NULL
    CHECK (tipo_documento IN (
      'escritura_publica', 'plano_independizacion', 'memoria_descriptiva',
      'certificado_catastral', 'copia_literal', 'titulo_archivado',
      'constancia_inscripcion', 'pago_derechos_registrales', 'otro'
    )),
  nombre TEXT NOT NULL,
  url TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'cargado', 'presentado', 'observado', 'aprobado')),
  notas TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_independizacion_venta ON crm.independizacion(venta_id);
CREATE INDEX idx_independizacion_lote ON crm.independizacion(lote_id);
CREATE INDEX idx_independizacion_cliente ON crm.independizacion(cliente_id);
CREATE INDEX idx_independizacion_estado ON crm.independizacion(estado);
CREATE INDEX idx_independizacion_contrato ON crm.independizacion(contrato_id);
CREATE INDEX idx_independizacion_doc ON crm.independizacion_documento(independizacion_id);

-- RLS
ALTER TABLE crm.independizacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.independizacion_documento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados pueden ver independizaciones"
  ON crm.independizacion FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role gestiona independizaciones"
  ON crm.independizacion FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Autenticados pueden ver docs independización"
  ON crm.independizacion_documento FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role gestiona docs independización"
  ON crm.independizacion_documento FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE crm.independizacion IS 'Trámite de independización registral ante SUNARP';
COMMENT ON TABLE crm.independizacion_documento IS 'Documentos requeridos para el trámite de independización';
