-- Habilitar Realtime (postgres_changes) sobre crm.lote para que el masterplan
-- y la lista de lotes se actualicen solos cuando otro usuario reserva, vende
-- o libera un lote. Mismo patrón que 20260223000000 para crm.notificacion.
--
-- Realtime aplica RLS: cada suscriptor solo recibe filas que su policy de
-- SELECT le permite ver ("Todos pueden ver lotes" para authenticated).

-- 1. Acceso al schema y SELECT para que Realtime pueda evaluar RLS
GRANT USAGE ON SCHEMA crm TO authenticated;
GRANT SELECT ON crm.lote TO authenticated;

-- 2. REPLICA IDENTITY FULL: el evento DELETE trae la fila vieja completa
--    (incluido proyecto_id) en vez de solo la PK.
ALTER TABLE crm.lote REPLICA IDENTITY FULL;

-- 3. Agregar la tabla a la publicación de Realtime (idempotente)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE crm.lote;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- ya estaba agregada
END;
$$;
