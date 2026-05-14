-- Backfill: generar recordatorios para eventos existentes que no tienen uno.
-- Aplica a eventos activos, futuros, con recordar_antes_minutos > 0 y al menos
-- una vía de notificación habilitada. Calcula fecha_recordatorio igual que el
-- trigger crm.crear_recordatorio_automatico.

BEGIN;

INSERT INTO crm.recordatorio (
  titulo,
  descripcion,
  tipo,
  prioridad,
  fecha_recordatorio,
  vendedor_id,
  cliente_id,
  propiedad_id,
  evento_id,
  notificar_email,
  notificar_push,
  etiquetas,
  created_by
)
SELECT
  'Recordatorio: ' || e.titulo,
  COALESCE(e.descripcion, 'Recordatorio automático para el evento: ' || e.titulo),
  'personalizado',
  e.prioridad,
  e.fecha_inicio - INTERVAL '1 minute' * e.recordar_antes_minutos,
  e.vendedor_id,
  e.cliente_id,
  e.propiedad_id,
  e.id,
  e.notificar_email,
  e.notificar_push,
  ARRAY['recordatorio_automatico', 'evento'],
  e.created_by
FROM crm.evento e
WHERE e.estado IN ('pendiente', 'en_progreso', 'reprogramado')
  AND e.recordar_antes_minutos > 0
  AND e.fecha_inicio > now()
  AND (e.notificar_email = TRUE OR e.notificar_push = TRUE)
  AND (e.fecha_inicio - INTERVAL '1 minute' * e.recordar_antes_minutos) > now()
  AND NOT EXISTS (
    SELECT 1
    FROM crm.recordatorio r
    WHERE r.evento_id = e.id
      AND r.etiquetas @> ARRAY['recordatorio_automatico']
  );

COMMIT;
