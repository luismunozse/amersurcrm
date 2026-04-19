-- ============================================================
-- CALIFICACIÓN BANCARIA
-- Etapa entre separación y contrato para créditos hipotecarios
-- ============================================================

-- Tabla principal
CREATE TABLE IF NOT EXISTS crm.calificacion_bancaria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_calificacion VARCHAR(20) UNIQUE,

  -- Relaciones
  reserva_id UUID REFERENCES crm.reserva(id) ON DELETE SET NULL,
  cliente_id UUID NOT NULL REFERENCES crm.cliente(id) ON DELETE CASCADE,
  lote_id UUID REFERENCES crm.lote(id) ON DELETE SET NULL,
  vendedor_username VARCHAR(50),

  -- Estado
  estado VARCHAR(30) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'en_evaluacion', 'aprobada', 'rechazada', 'observada')),

  -- Datos del banco
  banco VARCHAR(100),
  ejecutivo_bancario VARCHAR(200),
  telefono_ejecutivo VARCHAR(20),
  email_ejecutivo VARCHAR(200),

  -- Montos y condiciones
  monto_solicitado NUMERIC(14,2),
  monto_aprobado NUMERIC(14,2),
  tasa_interes NUMERIC(8,4),
  plazo_meses INTEGER,
  moneda VARCHAR(3) NOT NULL DEFAULT 'PEN',

  -- Fechas
  fecha_solicitud TIMESTAMPTZ,
  fecha_respuesta TIMESTAMPTZ,

  -- Detalles
  motivo_rechazo TEXT,
  observaciones TEXT,
  notas TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-generar código CAL-YYYY-NNNN
CREATE OR REPLACE FUNCTION crm.generar_codigo_calificacion()
RETURNS TRIGGER AS $$
DECLARE
  anio TEXT;
  siguiente INT;
BEGIN
  anio := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(codigo_calificacion FROM 10) AS INT)
  ), 0) + 1
  INTO siguiente
  FROM crm.calificacion_bancaria
  WHERE codigo_calificacion LIKE 'CAL-' || anio || '-%';

  NEW.codigo_calificacion := 'CAL-' || anio || '-' || LPAD(siguiente::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generar_codigo_calificacion
  BEFORE INSERT ON crm.calificacion_bancaria
  FOR EACH ROW
  WHEN (NEW.codigo_calificacion IS NULL)
  EXECUTE FUNCTION crm.generar_codigo_calificacion();

CREATE TRIGGER trg_calificacion_updated_at
  BEFORE UPDATE ON crm.calificacion_bancaria
  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

-- Documentos requeridos para calificación
CREATE TABLE IF NOT EXISTS crm.calificacion_documento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calificacion_id UUID NOT NULL REFERENCES crm.calificacion_bancaria(id) ON DELETE CASCADE,

  tipo_documento VARCHAR(50) NOT NULL
    CHECK (tipo_documento IN (
      'boleta_pago', 'ddjj_renta', 'estado_cuenta', 'certificado_trabajo',
      'contrato_trabajo', 'recibo_honorarios', 'dni', 'copia_literal',
      'autovaluo', 'declaracion_jurada', 'otro'
    )),
  nombre TEXT NOT NULL,
  url TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'cargado', 'aprobado', 'rechazado')),
  notas TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_calificacion_cliente ON crm.calificacion_bancaria(cliente_id);
CREATE INDEX idx_calificacion_reserva ON crm.calificacion_bancaria(reserva_id);
CREATE INDEX idx_calificacion_estado ON crm.calificacion_bancaria(estado);
CREATE INDEX idx_calificacion_lote ON crm.calificacion_bancaria(lote_id);
CREATE INDEX idx_calificacion_doc_calificacion ON crm.calificacion_documento(calificacion_id);

-- RLS
ALTER TABLE crm.calificacion_bancaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.calificacion_documento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados pueden ver calificaciones"
  ON crm.calificacion_bancaria FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role gestiona calificaciones"
  ON crm.calificacion_bancaria FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Autenticados pueden ver documentos calificación"
  ON crm.calificacion_documento FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role gestiona documentos calificación"
  ON crm.calificacion_documento FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE crm.calificacion_bancaria IS 'Seguimiento de calificación bancaria para créditos hipotecarios';
COMMENT ON TABLE crm.calificacion_documento IS 'Documentos requeridos para la calificación bancaria';
