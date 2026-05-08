-- =====================================================
-- MARKETING REDISEÑO: extender crm.recordatorio
-- Permite tipo 'envio_template_whatsapp' para reusar agenda + cron push.
-- =====================================================

ALTER TABLE crm.recordatorio
  DROP CONSTRAINT IF EXISTS recordatorio_tipo_check;

ALTER TABLE crm.recordatorio
  ADD CONSTRAINT recordatorio_tipo_check
  CHECK (tipo IN (
    'seguimiento_cliente',
    'llamada_prospecto',
    'envio_documentos',
    'visita_propiedad',
    'reunion_equipo',
    'personalizado',
    'envio_template_whatsapp'
  ));

COMMENT ON COLUMN crm.recordatorio.tipo IS
  'Tipo de recordatorio. envio_template_whatsapp usa data jsonb con: { template_id, variables_valores, telefono }';
