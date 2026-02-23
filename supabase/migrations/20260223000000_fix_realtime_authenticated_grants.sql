-- Corregir permisos para que el rol 'authenticated' pueda suscribirse a Realtime
-- en el schema crm. Sin estos grants el canal devuelve CHANNEL_ERROR.

-- 1. Dar acceso al schema crm al rol authenticated (necesario para Realtime)
GRANT USAGE ON SCHEMA crm TO authenticated;
GRANT USAGE ON SCHEMA crm TO anon;

-- 2. Dar SELECT sobre la tabla notificacion al rol authenticated
--    (Realtime necesita poder leer las filas para aplicar RLS)
GRANT SELECT ON crm.notificacion TO authenticated;

-- 3. Asegurar REPLICA IDENTITY FULL (necesario para recibir datos en DELETE/UPDATE)
ALTER TABLE crm.notificacion REPLICA IDENTITY FULL;

-- 4. Asegurar que la tabla esté en la publicación de Realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE crm.notificacion;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- ya estaba agregada, ignorar
END;
$$;
