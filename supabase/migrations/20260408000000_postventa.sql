-- ============================================================
-- POST-VENTA
-- Gestión de solicitudes, reclamos y garantías
-- ============================================================

CREATE TABLE IF NOT EXISTS crm.solicitud_postventa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_solicitud VARCHAR(20) UNIQUE,

  -- Relaciones
  venta_id UUID NOT NULL REFERENCES crm.venta(id) ON DELETE CASCADE,
  entrega_id UUID REFERENCES crm.entrega(id) ON DELETE SET NULL,
  cliente_id UUID NOT NULL REFERENCES crm.cliente(id) ON DELETE CASCADE,
  lote_id UUID REFERENCES crm.lote(id) ON DELETE SET NULL,

  -- Clasificación
  tipo VARCHAR(30) NOT NULL
    CHECK (tipo IN ('reclamo', 'queja', 'consulta', 'solicitud_mejora', 'garantia')),
  prioridad VARCHAR(10) NOT NULL DEFAULT 'media'
    CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente')),

  -- Estado
  estado VARCHAR(20) NOT NULL DEFAULT 'registrada'
    CHECK (estado IN ('registrada', 'asignada', 'en_proceso', 'resuelta', 'cerrada')),

  -- Contenido
  asunto TEXT NOT NULL,
  descripcion TEXT,

  -- Asignación
  asignado_a VARCHAR(50),
  fecha_asignacion TIMESTAMPTZ,

  -- Resolución
  fecha_resolucion TIMESTAMPTZ,
  fecha_cierre TIMESTAMPTZ,
  comentario_resolucion TEXT,
  comentario_cierre TEXT,

  -- SLA
  sla_respuesta_horas INTEGER NOT NULL DEFAULT 24,
  sla_resolucion_horas INTEGER NOT NULL DEFAULT 72,

  -- Satisfacción
  calificacion_cliente INTEGER CHECK (calificacion_cliente BETWEEN 1 AND 5),
  comentario_calificacion TEXT,

  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-generar código PV-YYYY-NNNN
CREATE OR REPLACE FUNCTION crm.generar_codigo_solicitud_pv()
RETURNS TRIGGER AS $$
DECLARE
  anio TEXT;
  siguiente INT;
BEGIN
  anio := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(codigo_solicitud FROM 9) AS INT)
  ), 0) + 1
  INTO siguiente
  FROM crm.solicitud_postventa
  WHERE codigo_solicitud LIKE 'PV-' || anio || '-%';

  NEW.codigo_solicitud := 'PV-' || anio || '-' || LPAD(siguiente::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generar_codigo_solicitud_pv
  BEFORE INSERT ON crm.solicitud_postventa
  FOR EACH ROW
  WHEN (NEW.codigo_solicitud IS NULL)
  EXECUTE FUNCTION crm.generar_codigo_solicitud_pv();

CREATE TRIGGER trg_solicitud_pv_updated_at
  BEFORE UPDATE ON crm.solicitud_postventa
  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

-- Índices
CREATE INDEX idx_solicitud_pv_venta ON crm.solicitud_postventa(venta_id);
CREATE INDEX idx_solicitud_pv_cliente ON crm.solicitud_postventa(cliente_id);
CREATE INDEX idx_solicitud_pv_estado ON crm.solicitud_postventa(estado);
CREATE INDEX idx_solicitud_pv_tipo ON crm.solicitud_postventa(tipo);
CREATE INDEX idx_solicitud_pv_prioridad ON crm.solicitud_postventa(prioridad);
CREATE INDEX idx_solicitud_pv_asignado ON crm.solicitud_postventa(asignado_a);
CREATE INDEX idx_solicitud_pv_entrega ON crm.solicitud_postventa(entrega_id);

-- RLS
ALTER TABLE crm.solicitud_postventa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados pueden ver solicitudes postventa"
  ON crm.solicitud_postventa FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role gestiona solicitudes postventa"
  ON crm.solicitud_postventa FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE crm.solicitud_postventa IS 'Solicitudes de post-venta: reclamos, quejas, consultas, garantías';
