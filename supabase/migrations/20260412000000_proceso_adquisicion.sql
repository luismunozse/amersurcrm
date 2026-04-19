-- ============================================================
-- PROCESO DE ADQUISICIÓN CON ETAPAS Y CHECKLIST
-- Sistema de pipeline para seguimiento de ventas inmobiliarias
-- ============================================================

-- Plantillas de proceso (configurables por proyecto)
CREATE TABLE IF NOT EXISTS crm.plantilla_proceso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID REFERENCES crm.proyecto(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  etapas JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_plantilla_proyecto_nombre UNIQUE (proyecto_id, nombre)
);

-- Proceso de adquisición (1 por cada operación de venta)
CREATE TABLE IF NOT EXISTS crm.proceso_adquisicion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(20) UNIQUE,

  -- Relaciones
  cliente_id UUID NOT NULL REFERENCES crm.cliente(id) ON DELETE CASCADE,
  lote_id UUID REFERENCES crm.lote(id) ON DELETE SET NULL,
  reserva_id UUID REFERENCES crm.reserva(id) ON DELETE SET NULL,
  venta_id UUID REFERENCES crm.venta(id) ON DELETE SET NULL,
  plantilla_id UUID REFERENCES crm.plantilla_proceso(id) ON DELETE SET NULL,

  -- Estado del proceso
  etapa_actual VARCHAR(50) NOT NULL DEFAULT 'separacion',
  estado VARCHAR(20) NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('activo', 'completado', 'cancelado', 'pausado')),

  vendedor_username VARCHAR(50),
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_estimada_cierre DATE,
  fecha_cierre DATE,

  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-generar código ADQ-YYYY-NNNN
CREATE OR REPLACE FUNCTION crm.generar_codigo_proceso()
RETURNS TRIGGER AS $$
DECLARE
  anio TEXT;
  siguiente INT;
BEGIN
  anio := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(codigo FROM 10) AS INT)
  ), 0) + 1
  INTO siguiente
  FROM crm.proceso_adquisicion
  WHERE codigo LIKE 'ADQ-' || anio || '-%';

  NEW.codigo := 'ADQ-' || anio || '-' || LPAD(siguiente::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generar_codigo_proceso
  BEFORE INSERT ON crm.proceso_adquisicion
  FOR EACH ROW
  WHEN (NEW.codigo IS NULL)
  EXECUTE FUNCTION crm.generar_codigo_proceso();

CREATE TRIGGER trg_proceso_updated_at
  BEFORE UPDATE ON crm.proceso_adquisicion
  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

-- Etapas de cada proceso
CREATE TABLE IF NOT EXISTS crm.proceso_etapa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id UUID NOT NULL REFERENCES crm.proceso_adquisicion(id) ON DELETE CASCADE,

  etapa VARCHAR(50) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,

  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'en_progreso', 'completada', 'omitida')),

  responsable_username VARCHAR(50),
  responsable_rol VARCHAR(50),
  plazo_dias INTEGER,

  fecha_inicio TIMESTAMPTZ,
  fecha_limite DATE,
  fecha_completada TIMESTAMPTZ,

  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_proceso_etapa UNIQUE (proceso_id, etapa)
);

CREATE TRIGGER trg_proceso_etapa_updated_at
  BEFORE UPDATE ON crm.proceso_etapa
  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

-- Items de checklist por etapa
CREATE TABLE IF NOT EXISTS crm.proceso_checklist_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa_id UUID NOT NULL REFERENCES crm.proceso_etapa(id) ON DELETE CASCADE,

  descripcion TEXT NOT NULL,
  obligatorio BOOLEAN NOT NULL DEFAULT TRUE,
  orden INTEGER NOT NULL DEFAULT 0,

  completado BOOLEAN NOT NULL DEFAULT FALSE,
  completado_por VARCHAR(50),
  fecha_completado TIMESTAMPTZ,
  documento_url TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RPC: Crear proceso desde plantilla
-- ============================================================
CREATE OR REPLACE FUNCTION crm.crear_proceso_desde_plantilla(
  p_cliente_id UUID,
  p_lote_id UUID,
  p_reserva_id UUID,
  p_vendedor_username VARCHAR,
  p_proyecto_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plantilla RECORD;
  v_proceso_id UUID;
  v_etapa RECORD;
  v_etapa_id UUID;
  v_item RECORD;
BEGIN
  -- Buscar plantilla del proyecto, si no existe usar la global
  SELECT * INTO v_plantilla
  FROM crm.plantilla_proceso
  WHERE (proyecto_id = p_proyecto_id OR proyecto_id IS NULL)
    AND activo = TRUE
  ORDER BY
    CASE WHEN proyecto_id = p_proyecto_id THEN 0 ELSE 1 END
  LIMIT 1;

  -- Si no hay plantilla, usar etapas por defecto
  IF NOT FOUND THEN
    v_plantilla.etapas := '[
      {"etapa": "separacion", "nombre": "Separación", "orden": 1, "plazo_dias": 7, "checklist": [
        {"descripcion": "DNI del comprador", "obligatorio": true},
        {"descripcion": "Comprobante de pago de separación", "obligatorio": true},
        {"descripcion": "Formulario de separación firmado", "obligatorio": true}
      ]},
      {"etapa": "calificacion_bancaria", "nombre": "Calificación Bancaria", "orden": 2, "plazo_dias": 30, "checklist": [
        {"descripcion": "Boletas de pago (3 últimos meses)", "obligatorio": true},
        {"descripcion": "Estado de cuenta bancario", "obligatorio": true},
        {"descripcion": "DDJJ Renta", "obligatorio": true},
        {"descripcion": "Certificado de trabajo", "obligatorio": false},
        {"descripcion": "Carta de aprobación del banco", "obligatorio": true}
      ]},
      {"etapa": "firma_contrato", "nombre": "Firma de Contrato", "orden": 3, "plazo_dias": 15, "checklist": [
        {"descripcion": "Minuta de compraventa", "obligatorio": true},
        {"descripcion": "Comprobante de cuota inicial", "obligatorio": true},
        {"descripcion": "Contrato firmado y escaneado", "obligatorio": true}
      ]},
      {"etapa": "desembolso", "nombre": "Desembolso", "orden": 4, "plazo_dias": 30, "checklist": [
        {"descripcion": "Carta de desembolso del banco", "obligatorio": true},
        {"descripcion": "Comprobante de transferencia", "obligatorio": true}
      ]}
    ]'::jsonb;
    v_plantilla.id := NULL;
  END IF;

  -- Crear proceso
  INSERT INTO crm.proceso_adquisicion (
    cliente_id, lote_id, reserva_id, plantilla_id,
    vendedor_username, etapa_actual, estado
  ) VALUES (
    p_cliente_id, p_lote_id, p_reserva_id, v_plantilla.id,
    p_vendedor_username, 'separacion', 'activo'
  ) RETURNING id INTO v_proceso_id;

  -- Crear etapas y checklist items
  FOR v_etapa IN SELECT * FROM jsonb_array_elements(v_plantilla.etapas) AS e
  LOOP
    INSERT INTO crm.proceso_etapa (
      proceso_id, etapa, nombre, orden, estado,
      plazo_dias, responsable_username
    ) VALUES (
      v_proceso_id,
      v_etapa.value->>'etapa',
      v_etapa.value->>'nombre',
      (v_etapa.value->>'orden')::INT,
      CASE WHEN (v_etapa.value->>'orden')::INT = 1 THEN 'en_progreso' ELSE 'pendiente' END,
      (v_etapa.value->>'plazo_dias')::INT,
      CASE WHEN (v_etapa.value->>'orden')::INT = 1 THEN p_vendedor_username ELSE NULL END
    ) RETURNING id INTO v_etapa_id;

    -- Si la primera etapa, marcar fecha_inicio y fecha_limite
    IF (v_etapa.value->>'orden')::INT = 1 THEN
      UPDATE crm.proceso_etapa SET
        fecha_inicio = now(),
        fecha_limite = CURRENT_DATE + ((v_etapa.value->>'plazo_dias')::INT || ' days')::INTERVAL
      WHERE id = v_etapa_id;
    END IF;

    -- Crear checklist items
    IF v_etapa.value->'checklist' IS NOT NULL THEN
      FOR v_item IN SELECT * FROM jsonb_array_elements(v_etapa.value->'checklist') AS c
      LOOP
        INSERT INTO crm.proceso_checklist_item (
          etapa_id, descripcion, obligatorio, orden
        ) VALUES (
          v_etapa_id,
          v_item.value->>'descripcion',
          COALESCE((v_item.value->>'obligatorio')::BOOLEAN, TRUE),
          COALESCE((v_item.value->>'orden')::INT, 0)
        );
      END LOOP;
    END IF;
  END LOOP;

  RETURN v_proceso_id;
END;
$$;

-- ============================================================
-- Plantilla seed: Proceso Estándar (global)
-- ============================================================
INSERT INTO crm.plantilla_proceso (proyecto_id, nombre, descripcion, activo, etapas)
VALUES (NULL, 'Proceso Estándar', 'Proceso de adquisición estándar para venta con crédito bancario', TRUE, '[
  {"etapa": "separacion", "nombre": "Separación", "orden": 1, "plazo_dias": 7, "checklist": [
    {"descripcion": "DNI del comprador", "obligatorio": true, "orden": 1},
    {"descripcion": "Comprobante de pago de separación", "obligatorio": true, "orden": 2},
    {"descripcion": "Formulario de separación firmado", "obligatorio": true, "orden": 3}
  ]},
  {"etapa": "calificacion_bancaria", "nombre": "Calificación Bancaria", "orden": 2, "plazo_dias": 30, "checklist": [
    {"descripcion": "Boletas de pago (3 últimos meses)", "obligatorio": true, "orden": 1},
    {"descripcion": "Estado de cuenta bancario", "obligatorio": true, "orden": 2},
    {"descripcion": "Declaración Jurada de Renta", "obligatorio": true, "orden": 3},
    {"descripcion": "Certificado de trabajo", "obligatorio": false, "orden": 4},
    {"descripcion": "Carta de aprobación del banco", "obligatorio": true, "orden": 5}
  ]},
  {"etapa": "firma_contrato", "nombre": "Firma de Contrato", "orden": 3, "plazo_dias": 15, "checklist": [
    {"descripcion": "Minuta de compraventa redactada", "obligatorio": true, "orden": 1},
    {"descripcion": "Comprobante de cuota inicial", "obligatorio": true, "orden": 2},
    {"descripcion": "Contrato firmado y escaneado", "obligatorio": true, "orden": 3},
    {"descripcion": "Copia literal de la propiedad", "obligatorio": false, "orden": 4}
  ]},
  {"etapa": "desembolso", "nombre": "Desembolso", "orden": 4, "plazo_dias": 30, "checklist": [
    {"descripcion": "Carta de desembolso del banco", "obligatorio": true, "orden": 1},
    {"descripcion": "Comprobante de transferencia", "obligatorio": true, "orden": 2},
    {"descripcion": "Liquidación de haberes", "obligatorio": false, "orden": 3}
  ]}
]'::jsonb)
ON CONFLICT DO NOTHING;

-- Índices
CREATE INDEX idx_proceso_adq_cliente ON crm.proceso_adquisicion(cliente_id);
CREATE INDEX idx_proceso_adq_lote ON crm.proceso_adquisicion(lote_id);
CREATE INDEX idx_proceso_adq_reserva ON crm.proceso_adquisicion(reserva_id);
CREATE INDEX idx_proceso_adq_estado ON crm.proceso_adquisicion(estado);
CREATE INDEX idx_proceso_adq_etapa ON crm.proceso_adquisicion(etapa_actual);
CREATE INDEX idx_proceso_adq_vendedor ON crm.proceso_adquisicion(vendedor_username);
CREATE INDEX idx_proceso_etapa_proceso ON crm.proceso_etapa(proceso_id);
CREATE INDEX idx_proceso_etapa_estado ON crm.proceso_etapa(estado);
CREATE INDEX idx_proceso_checklist_etapa ON crm.proceso_checklist_item(etapa_id);
CREATE INDEX idx_plantilla_proyecto ON crm.plantilla_proceso(proyecto_id);

-- RLS
ALTER TABLE crm.proceso_adquisicion ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.proceso_etapa ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.proceso_checklist_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.plantilla_proceso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados ven procesos" ON crm.proceso_adquisicion FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role gestiona procesos" ON crm.proceso_adquisicion FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Autenticados ven etapas" ON crm.proceso_etapa FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role gestiona etapas" ON crm.proceso_etapa FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Autenticados ven checklist" ON crm.proceso_checklist_item FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role gestiona checklist" ON crm.proceso_checklist_item FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Autenticados ven plantillas" ON crm.plantilla_proceso FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role gestiona plantillas" ON crm.plantilla_proceso FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE crm.proceso_adquisicion IS 'Proceso de adquisición: pipeline con etapas y checklist por cada operación de venta';
COMMENT ON TABLE crm.proceso_etapa IS 'Etapas secuenciales dentro de un proceso de adquisición';
COMMENT ON TABLE crm.proceso_checklist_item IS 'Items de checklist documental por etapa del proceso';
COMMENT ON TABLE crm.plantilla_proceso IS 'Plantillas configurables de proceso de adquisición por proyecto';
COMMENT ON FUNCTION crm.crear_proceso_desde_plantilla IS 'Crea un proceso de adquisición completo con etapas y checklist desde la plantilla del proyecto';
