-- Insertar notificaciones de ejemplo para el usuario admin@amersur.test
-- Primero necesitamos obtener el ID del usuario
DO $$
DECLARE
  user_id UUID;
BEGIN
  -- Obtener el ID del usuario admin@amersur.test
  SELECT id INTO user_id FROM auth.users WHERE email = 'admin@amersur.test' LIMIT 1;
  
  IF user_id IS NOT NULL THEN
    -- Insertar notificaciones de ejemplo
    INSERT INTO crm.notificacion (usuario_id, tipo, titulo, mensaje, data) VALUES
    (user_id, 'sistema', 'Bienvenido al CRM', 'Tu cuenta ha sido configurada correctamente. ¡Bienvenido al sistema CRM de Amersur!', '{"welcome": true}'),
    (user_id, 'cliente', 'Nuevo cliente registrado', 'Se ha registrado un nuevo cliente: Juan Pérez', '{"cliente_id": "ejemplo-123", "cliente_nombre": "Juan Pérez"}'),
    (user_id, 'proyecto', 'Proyecto actualizado', 'El proyecto "Residencial Los Pinos" ha cambiado de estado a "Activo"', '{"proyecto_id": "ejemplo-456", "proyecto_nombre": "Residencial Los Pinos", "estado_anterior": "Pausado", "estado_nuevo": "Activo"}'),
    (user_id, 'lote', 'Lote disponible', 'Se ha liberado un nuevo lote en el proyecto "Residencial Los Pinos"', '{"lote_id": "ejemplo-789", "lote_codigo": "LP-001", "proyecto_nombre": "Residencial Los Pinos"}'),
    (user_id, 'sistema', 'Recordatorio de tareas', 'Tienes 3 tareas pendientes que requieren tu atención', '{"tareas_pendientes": 3}');
    
    RAISE NOTICE 'Notificaciones de ejemplo insertadas para el usuario %', user_id;
  ELSE
    RAISE NOTICE 'Usuario admin@amersur.test no encontrado. Ejecuta primero el seed de usuarios.';
  END IF;
END $$;
