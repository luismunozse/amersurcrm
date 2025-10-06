-- Agenda & Opportunities refactor

-- 1. Tabla de oportunidades (si no existe)
CREATE TABLE IF NOT EXISTS crm.oportunidad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES crm.cliente(id) ON DELETE CASCADE,
  proyecto_id UUID REFERENCES crm.proyecto(id) ON DELETE SET NULL,
  lote_id UUID REFERENCES crm.lote(id) ON DELETE SET NULL,
  vendedor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  etapa TEXT NOT NULL DEFAULT 'nuevo' CHECK (etapa IN ('nuevo','calificado','visita','propuesta','reserva','venta','perdida')),
  estado TEXT NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta','ganada','perdida','pausada')),
  valor_estimado NUMERIC(14,2),
  moneda TEXT DEFAULT 'PEN',
  probabilidad INTEGER CHECK (probabilidad BETWEEN 0 AND 100),
  fuente TEXT,
  notas TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oportunidad_cliente ON crm.oportunidad(cliente_id);
CREATE INDEX IF NOT EXISTS idx_oportunidad_vendedor ON crm.oportunidad(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_oportunidad_etapa ON crm.oportunidad(etapa);
CREATE INDEX IF NOT EXISTS idx_oportunidad_estado ON crm.oportunidad(estado);

CREATE OR REPLACE FUNCTION crm.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_oportunidad ON crm.oportunidad;
CREATE TRIGGER trg_touch_oportunidad
BEFORE UPDATE ON crm.oportunidad
FOR EACH ROW
EXECUTE FUNCTION crm.touch_updated_at();

ALTER TABLE crm.oportunidad ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pol_oportunidad_select ON crm.oportunidad;
CREATE POLICY pol_oportunidad_select ON crm.oportunidad
  FOR SELECT
  USING (
    vendedor_id = auth.uid()
    OR auth.uid() IN (SELECT id FROM crm.v_perfil_actual WHERE rol IN ('admin','lider'))
  );

DROP POLICY IF EXISTS pol_oportunidad_insert ON crm.oportunidad;
CREATE POLICY pol_oportunidad_insert ON crm.oportunidad
  FOR INSERT WITH CHECK (vendedor_id = auth.uid());

DROP POLICY IF EXISTS pol_oportunidad_update ON crm.oportunidad;
CREATE POLICY pol_oportunidad_update ON crm.oportunidad
  FOR UPDATE
  USING (
    vendedor_id = auth.uid()
    OR auth.uid() IN (SELECT id FROM crm.v_perfil_actual WHERE rol IN ('admin','lider'))
  )
  WITH CHECK (
    vendedor_id = auth.uid()
    OR auth.uid() IN (SELECT id FROM crm.v_perfil_actual WHERE rol IN ('admin','lider'))
  );

DROP POLICY IF EXISTS pol_oportunidad_delete ON crm.oportunidad;
CREATE POLICY pol_oportunidad_delete ON crm.oportunidad
  FOR DELETE
  USING (auth.uid() IN (SELECT id FROM crm.v_perfil_actual WHERE rol IN ('admin','lider')));

-- 2. Catálogos para resultados, objetivos, snooze
CREATE TABLE IF NOT EXISTS crm.evento_resultado_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL, -- referencia al tipo de evento
  nombre TEXT NOT NULL,
  descripcion TEXT,
  estado_cliente_destino TEXT,
  requiere_notas BOOLEAN DEFAULT FALSE,
  activo BOOLEAN DEFAULT TRUE,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_evento_resultado_tipo ON crm.evento_resultado_catalogo(tipo);

DROP TRIGGER IF EXISTS trg_touch_evento_resultado ON crm.evento_resultado_catalogo;
CREATE TRIGGER trg_touch_evento_resultado
BEFORE UPDATE ON crm.evento_resultado_catalogo
FOR EACH ROW
EXECUTE FUNCTION crm.touch_updated_at();

CREATE TABLE IF NOT EXISTS crm.evento_snooze_motivo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_touch_evento_snooze_motivo ON crm.evento_snooze_motivo;
CREATE TRIGGER trg_touch_evento_snooze_motivo
BEFORE UPDATE ON crm.evento_snooze_motivo
FOR EACH ROW
EXECUTE FUNCTION crm.touch_updated_at();

-- 3. Tabla de objetivos y plantillas por tipo de evento
CREATE TABLE IF NOT EXISTS crm.evento_tipo_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  etiqueta TEXT NOT NULL,
  objetivo TEXT NOT NULL,
  duracion_sugerida_minutos INTEGER,
  plantilla_mensaje TEXT,
  resultado_obligatorio BOOLEAN DEFAULT TRUE,
  recordatorio_anticipacion INTEGER DEFAULT 15,
  canal_recordatorio TEXT,
  activo BOOLEAN DEFAULT TRUE,
  UNIQUE(tipo, etiqueta)
);
CREATE INDEX IF NOT EXISTS idx_evento_tipo_config_tipo ON crm.evento_tipo_config(tipo);

-- 4. Ajustes tabla crm.evento
ALTER TABLE crm.evento
  ADD COLUMN IF NOT EXISTS oportunidad_id UUID REFERENCES crm.oportunidad(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS objetivo TEXT,
  ADD COLUMN IF NOT EXISTS resultado_id UUID REFERENCES crm.evento_resultado_catalogo(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resultado_notas TEXT,
  ADD COLUMN IF NOT EXISTS proximo_paso_objetivo TEXT,
  ADD COLUMN IF NOT EXISTS proximo_paso_fecha TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_tipo TEXT,
  ADD COLUMN IF NOT EXISTS sla_vencimiento TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recordatorio_canal TEXT,
  ADD COLUMN IF NOT EXISTS snooze_motivo_id UUID REFERENCES crm.evento_snooze_motivo(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS snooze_hasta TIMESTAMPTZ;

ALTER TABLE crm.evento
  ADD COLUMN IF NOT EXISTS next_step_creado BOOLEAN DEFAULT FALSE;

ALTER TABLE crm.evento
  DROP CONSTRAINT IF EXISTS evento_estado_check;
ALTER TABLE crm.evento
  ADD CONSTRAINT evento_estado_check CHECK (
    estado IN ('pendiente','en_progreso','vencida','completado','cancelado','reprogramado')
  );

CREATE INDEX IF NOT EXISTS idx_evento_oportunidad ON crm.evento(oportunidad_id);
CREATE INDEX IF NOT EXISTS idx_evento_proximo_paso ON crm.evento(proximo_paso_fecha);
CREATE INDEX IF NOT EXISTS idx_evento_sla_vencimiento ON crm.evento(sla_vencimiento);

-- 5. Trigger para validar “next step”
CREATE OR REPLACE FUNCTION crm.validar_evento_proximo_paso()
RETURNS TRIGGER AS $$
DECLARE
  es_cerrado BOOLEAN;
BEGIN
  es_cerrado := NEW.estado IN ('completado','cancelado');

  IF es_cerrado THEN
    IF NEW.proximo_paso_fecha IS NULL OR NEW.proximo_paso_objetivo IS NULL THEN
      RAISE EXCEPTION 'No se puede cerrar la tarea sin definir el próximo paso con fecha y objetivo.';
    END IF;

    IF NEW.oportunidad_id IS NOT NULL THEN
      -- asegurar flag de next step
      NEW.next_step_creado := TRUE;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_evento_proximo_paso ON crm.evento;
CREATE TRIGGER trg_validar_evento_proximo_paso
BEFORE INSERT OR UPDATE ON crm.evento
FOR EACH ROW
EXECUTE FUNCTION crm.validar_evento_proximo_paso();

-- 6. Datos iniciales (se pueden ajustar en producción)
INSERT INTO crm.evento_snooze_motivo (id, nombre, descripcion) VALUES
  (gen_random_uuid(), 'Cliente de viaje', 'El cliente solicitó posponer la conversación'),
  (gen_random_uuid(), 'Esperando documentación', 'Pendiente de envío de documentos por parte del cliente'),
  (gen_random_uuid(), 'Sin respuesta', 'Se reagenda para insistir nuevamente');

INSERT INTO crm.evento_tipo_config (id, tipo, etiqueta, objetivo, duracion_sugerida_minutos, plantilla_mensaje, resultado_obligatorio, recordatorio_anticipacion, canal_recordatorio) VALUES
  (gen_random_uuid(), 'llamada', 'Primer contacto telefónico', 'Contactar al lead dentro de 2h y calificarlo', 15, 'Hola {{nombre}}, te llamo de {{proyecto}}...', TRUE, 5, 'push'),
  (gen_random_uuid(), 'visita', 'Visita al proyecto', 'Realizar recorrido del proyecto y registrar feedback', 60, 'Hola {{nombre}}, confirmamos tu visita a {{proyecto}} el {{fecha}}.', TRUE, 60, 'whatsapp'),
  (gen_random_uuid(), 'seguimiento', 'Seguimiento de propuesta', 'Verificar decisión sobre propuesta enviada', 20, 'Hola {{nombre}}, queríamos conocer tu opinión sobre la propuesta enviada...', TRUE, 30, 'email');

