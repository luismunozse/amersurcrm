-- ============================================================
-- ENTREGA DE UNIDAD
-- Gestión de inspección, checklist y acta de entrega
-- ============================================================

CREATE TABLE IF NOT EXISTS crm.entrega (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_entrega VARCHAR(20) UNIQUE,

  -- Relaciones
  venta_id UUID NOT NULL REFERENCES crm.venta(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES crm.cliente(id) ON DELETE CASCADE,
  lote_id UUID REFERENCES crm.lote(id) ON DELETE SET NULL,

  -- Estado
  estado VARCHAR(30) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'programada', 'en_inspeccion', 'observada', 'entregada')),

  -- Fechas
  fecha_programada DATE,
  fecha_inspeccion DATE,
  fecha_entrega DATE,

  -- Responsable
  responsable_username VARCHAR(50),

  -- Documentos
  acta_url TEXT,

  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-generar código ENT-YYYY-NNNN
CREATE OR REPLACE FUNCTION crm.generar_codigo_entrega()
RETURNS TRIGGER AS $$
DECLARE
  anio TEXT;
  siguiente INT;
BEGIN
  anio := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(codigo_entrega FROM 10) AS INT)
  ), 0) + 1
  INTO siguiente
  FROM crm.entrega
  WHERE codigo_entrega LIKE 'ENT-' || anio || '-%';

  NEW.codigo_entrega := 'ENT-' || anio || '-' || LPAD(siguiente::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generar_codigo_entrega
  BEFORE INSERT ON crm.entrega
  FOR EACH ROW
  WHEN (NEW.codigo_entrega IS NULL)
  EXECUTE FUNCTION crm.generar_codigo_entrega();

CREATE TRIGGER trg_entrega_updated_at
  BEFORE UPDATE ON crm.entrega
  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

-- Observaciones de inspección
CREATE TABLE IF NOT EXISTS crm.entrega_observacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id UUID NOT NULL REFERENCES crm.entrega(id) ON DELETE CASCADE,

  descripcion TEXT NOT NULL,
  foto_url TEXT,
  responsable_username VARCHAR(50),
  fecha_limite DATE,

  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'en_proceso', 'resuelta')),
  fecha_resolucion DATE,
  notas_resolucion TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_entrega_obs_updated_at
  BEFORE UPDATE ON crm.entrega_observacion
  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

-- Checklist de entrega
CREATE TABLE IF NOT EXISTS crm.entrega_checklist_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id UUID NOT NULL REFERENCES crm.entrega(id) ON DELETE CASCADE,

  item TEXT NOT NULL,
  aprobado BOOLEAN NOT NULL DEFAULT FALSE,
  observacion TEXT,
  verificado_por VARCHAR(50),
  fecha_verificacion TIMESTAMPTZ,
  orden INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_entrega_venta ON crm.entrega(venta_id);
CREATE INDEX idx_entrega_cliente ON crm.entrega(cliente_id);
CREATE INDEX idx_entrega_estado ON crm.entrega(estado);
CREATE INDEX idx_entrega_lote ON crm.entrega(lote_id);
CREATE INDEX idx_entrega_obs_entrega ON crm.entrega_observacion(entrega_id);
CREATE INDEX idx_entrega_checklist_entrega ON crm.entrega_checklist_item(entrega_id);

-- RLS
ALTER TABLE crm.entrega ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.entrega_observacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.entrega_checklist_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados pueden ver entregas"
  ON crm.entrega FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role gestiona entregas"
  ON crm.entrega FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Autenticados pueden ver observaciones entrega"
  ON crm.entrega_observacion FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role gestiona observaciones entrega"
  ON crm.entrega_observacion FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Autenticados pueden ver checklist entrega"
  ON crm.entrega_checklist_item FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role gestiona checklist entrega"
  ON crm.entrega_checklist_item FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE crm.entrega IS 'Gestión de entregas de unidades inmobiliarias';
COMMENT ON TABLE crm.entrega_observacion IS 'Observaciones encontradas durante la inspección de entrega';
COMMENT ON TABLE crm.entrega_checklist_item IS 'Items del checklist de inspección para la entrega';
