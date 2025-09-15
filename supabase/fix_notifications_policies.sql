-- Script para arreglar las políticas de notificaciones
-- Ejecutar este script en el SQL Editor del dashboard de Supabase

-- Agregar política de INSERT para notificaciones
-- Los usuarios pueden crear notificaciones para sí mismos
CREATE POLICY "Users can insert own notifications" ON crm.notificacion
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- También permitir que el sistema cree notificaciones usando la función
-- (esto es necesario para que la función crear_notificacion funcione)
CREATE POLICY "System can insert notifications" ON crm.notificacion
  FOR INSERT WITH CHECK (true);

-- Verificar que las políticas se crearon correctamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'crm' AND tablename = 'notificacion';
