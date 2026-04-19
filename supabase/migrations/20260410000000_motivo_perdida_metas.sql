-- ============================================================
-- MOTIVO DE PÉRDIDA + METAS POR VENDEDOR
-- ============================================================

-- Limpiar intentos previos fallidos (si existen)
DROP TABLE IF EXISTS crm.meta_vendedor CASCADE;
DROP TABLE IF EXISTS crm.motivo_desestimacion CASCADE;

-- Catálogo de motivos de desestimación
CREATE TABLE crm.motivo_desestimacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) NOT NULL UNIQUE,
  descripcion TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Datos semilla
INSERT INTO crm.motivo_desestimacion (codigo, descripcion, orden) VALUES
  ('precio', 'Precio fuera de presupuesto', 1),
  ('competencia', 'Compró con la competencia', 2),
  ('financiamiento_rechazado', 'Financiamiento rechazado por el banco', 3),
  ('ubicacion', 'No le convence la ubicación', 4),
  ('no_interesado', 'No tiene interés real de compra', 5),
  ('cambio_planes', 'Cambió de planes personales', 6),
  ('demora_tramite', 'Demora en trámites o documentación', 7),
  ('mala_experiencia', 'Mala experiencia con el servicio', 8),
  ('otro', 'Otro motivo', 99);

-- Agregar campos a cliente (si no existen)
ALTER TABLE crm.cliente
  ADD COLUMN IF NOT EXISTS motivo_desestimacion_id UUID REFERENCES crm.motivo_desestimacion(id) ON DELETE SET NULL;

ALTER TABLE crm.cliente
  ADD COLUMN IF NOT EXISTS detalle_desestimacion TEXT;

CREATE INDEX IF NOT EXISTS idx_cliente_motivo_desestimacion ON crm.cliente(motivo_desestimacion_id) WHERE motivo_desestimacion_id IS NOT NULL;

-- RLS para motivos
ALTER TABLE crm.motivo_desestimacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados pueden ver motivos"
  ON crm.motivo_desestimacion FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role gestiona motivos"
  ON crm.motivo_desestimacion FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- METAS POR VENDEDOR
-- ============================================================

CREATE TABLE crm.meta_vendedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_username VARCHAR(50) NOT NULL,
  vendedor_id UUID REFERENCES crm.usuario_perfil(id) ON DELETE CASCADE,
  periodo_anio INTEGER NOT NULL,
  periodo_mes INTEGER NOT NULL CHECK (periodo_mes BETWEEN 1 AND 12),
  meta_ventas_monto NUMERIC(14,2) NOT NULL DEFAULT 0,
  meta_ventas_cantidad INTEGER NOT NULL DEFAULT 0,
  meta_separaciones INTEGER NOT NULL DEFAULT 0,
  meta_contactos INTEGER NOT NULL DEFAULT 0,
  meta_visitas INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_meta_vendedor_periodo UNIQUE (vendedor_username, periodo_anio, periodo_mes)
);

CREATE TRIGGER trg_meta_vendedor_updated_at
  BEFORE UPDATE ON crm.meta_vendedor
  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

-- Índices
CREATE INDEX idx_meta_vendedor_username ON crm.meta_vendedor(vendedor_username);
CREATE INDEX idx_meta_vendedor_periodo ON crm.meta_vendedor(periodo_anio, periodo_mes);

-- RLS
ALTER TABLE crm.meta_vendedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados pueden ver metas"
  ON crm.meta_vendedor FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role gestiona metas"
  ON crm.meta_vendedor FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE crm.motivo_desestimacion IS 'Catálogo de motivos de desestimación/pérdida de clientes';
COMMENT ON TABLE crm.meta_vendedor IS 'Metas mensuales por vendedor: ventas, separaciones, contactos, visitas';
