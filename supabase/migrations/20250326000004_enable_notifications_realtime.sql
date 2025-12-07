-- Habilita Realtime para la tabla de notificaciones
ALTER TABLE crm.notificacion REPLICA IDENTITY FULL;

-- Asegura que la tabla forme parte de la publicación manejada por Supabase Realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE crm.notificacion;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END;
$$;
