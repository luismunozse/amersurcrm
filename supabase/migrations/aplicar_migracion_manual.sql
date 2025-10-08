-- =====================================================
-- MIGRACIÓN MANUAL DEL SCHEMA DE AGENDA
-- =====================================================
-- Ejecuta estos comandos directamente en Supabase SQL Editor
-- Versión corregida y simplificada

-- 1. Agregar campos básicos esenciales a la tabla evento
ALTER TABLE crm.evento ADD COLUMN IF NOT EXISTS objetivo TEXT;
ALTER TABLE crm.evento ADD COLUMN IF NOT EXISTS resultado_notas TEXT;
ALTER TABLE crm.evento ADD COLUMN IF NOT EXISTS proximo_paso_objetivo TEXT;
ALTER TABLE crm.evento ADD COLUMN IF NOT EXISTS proximo_paso_fecha TIMESTAMPTZ;
ALTER TABLE crm.evento ADD COLUMN IF NOT EXISTS sla_tipo TEXT;
ALTER TABLE crm.evento ADD COLUMN IF NOT EXISTS sla_vencimiento TIMESTAMPTZ;
ALTER TABLE crm.evento ADD COLUMN IF NOT EXISTS recordatorio_canal TEXT DEFAULT 'push';
ALTER TABLE crm.evento ADD COLUMN IF NOT EXISTS snooze_hasta TIMESTAMPTZ;

-- 2. Agregar campos con referencias (sin foreign keys por ahora)
ALTER TABLE crm.evento ADD COLUMN IF NOT EXISTS oportunidad_id UUID;
ALTER TABLE crm.evento ADD COLUMN IF NOT EXISTS resultado_id UUID;
ALTER TABLE crm.evento ADD COLUMN IF NOT EXISTS snooze_motivo_id UUID;

-- 3. Actualizar constraint de estados para incluir los nuevos estados
ALTER TABLE crm.evento DROP CONSTRAINT IF EXISTS evento_estado_check;
ALTER TABLE crm.evento ADD CONSTRAINT evento_estado_check CHECK (
    estado IN (
        'pendiente',
        'en_progreso',
        'vencida',
        'reprogramado',
        'completado',
        'cancelado'
    )
);

-- 4. Crear tabla de motivos de snooze
CREATE TABLE IF NOT EXISTS crm.evento_snooze_motivo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Insertar motivos de snooze comunes
INSERT INTO crm.evento_snooze_motivo (nombre, descripcion, orden) VALUES
  ('Cliente de viaje', 'El cliente está de viaje y no puede atender', 1),
  ('Cliente ocupado', 'El cliente está ocupado en este momento', 2),
  ('Reagendar por clima', 'Condiciones climáticas adversas', 3),
  ('Problema técnico', 'Problema técnico o de conectividad', 4),
  ('Emergencia personal', 'Emergencia personal del vendedor', 5),
  ('Cliente no disponible', 'Cliente no está disponible en el horario acordado', 6),
  ('Otro', 'Otro motivo no especificado', 99)
ON CONFLICT (nombre) DO NOTHING;

-- 6. Crear tabla de catálogo de resultados
CREATE TABLE IF NOT EXISTS crm.evento_resultado_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  tipo_evento TEXT,
  activo BOOLEAN DEFAULT TRUE,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Insertar resultados estándar básicos
INSERT INTO crm.evento_resultado_catalogo (nombre, descripcion, tipo_evento, orden) VALUES
  ('Contactado exitosamente', 'Se logró contactar al cliente', 'llamada', 1),
  ('No contactado', 'No se pudo contactar al cliente', 'llamada', 2),
  ('Visita agendada', 'Se agendó una visita', 'llamada', 3),
  ('Visita completada', 'La visita se realizó exitosamente', 'visita', 1),
  ('No asistió a la visita', 'El cliente no asistió a la visita programada', 'visita', 2),
  ('Propuesta enviada', 'Se envió la propuesta al cliente', 'email', 1),
  ('Propuesta rechazada', 'El cliente rechazó la propuesta', 'email', 2),
  ('Venta cerrada', 'Se cerró la venta', 'cita', 1),
  ('Seguimiento programado', 'Se programó un seguimiento', 'seguimiento', 1),
  ('Tarea completada', 'La tarea se completó exitosamente', 'tarea', 1)
ON CONFLICT (nombre) DO NOTHING;

-- 8. Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_evento_oportunidad ON crm.evento(oportunidad_id);
CREATE INDEX IF NOT EXISTS idx_evento_proximo_paso_fecha ON crm.evento(proximo_paso_fecha);
CREATE INDEX IF NOT EXISTS idx_evento_sla_vencimiento ON crm.evento(sla_vencimiento);

-- 9. Comentarios para documentación
COMMENT ON TABLE crm.evento IS 'Tabla principal de eventos/actividades del CRM. Motor de disciplina comercial.';
COMMENT ON COLUMN crm.evento.objetivo IS 'Objetivo específico de la tarea. Obligatorio para mantener disciplina comercial.';
COMMENT ON COLUMN crm.evento.proximo_paso_objetivo IS 'Próximo paso obligatorio para cerrar la tarea. Evita leads colgados.';
COMMENT ON COLUMN crm.evento.sla_tipo IS 'Tipo de SLA para control de tiempos (ej: primer_contacto, seguimiento_propuesta)';
COMMENT ON COLUMN crm.evento.snooze_motivo_id IS 'Motivo de posposición para mantener trazabilidad';

-- =====================================================
-- MIGRACIÓN COMPLETADA
-- =====================================================
-- Campos agregados correctamente:
-- ✅ objetivo, resultado_notas, proximo_paso_objetivo, proximo_paso_fecha
-- ✅ sla_tipo, sla_vencimiento, recordatorio_canal, snooze_hasta
-- ✅ oportunidad_id, resultado_id, snooze_motivo_id
-- ✅ Estados expandidos: pendiente, en_progreso, vencida, reprogramado, completado, cancelado
-- ✅ Tablas de soporte creadas con datos iniciales
-- ✅ Índices optimizados configurados
