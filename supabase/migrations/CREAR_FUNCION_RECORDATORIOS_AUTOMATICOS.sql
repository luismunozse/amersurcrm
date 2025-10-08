-- =====================================================
-- FUNCIÓN PARA CREAR RECORDATORIOS AUTOMÁTICOS
-- =====================================================
-- Ejecutar este SQL en Supabase.com > SQL Editor

-- Función para crear recordatorio automático cuando se crea un evento
CREATE OR REPLACE FUNCTION crm.crear_recordatorio_automatico()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo crear recordatorio si el evento tiene notificaciones habilitadas
  IF NEW.notificar_email = true OR NEW.notificar_push = true THEN
    -- Calcular la fecha del recordatorio
    DECLARE
      fecha_recordatorio TIMESTAMPTZ;
    BEGIN
      fecha_recordatorio := NEW.fecha_inicio - INTERVAL '1 minute' * NEW.recordar_antes_minutos;
      
      -- Crear el recordatorio automático
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
      ) VALUES (
        'Recordatorio: ' || NEW.titulo,
        COALESCE(NEW.descripcion, 'Recordatorio automático para el evento: ' || NEW.titulo),
        'personalizado',
        NEW.prioridad,
        fecha_recordatorio,
        NEW.vendedor_id,
        NEW.cliente_id,
        NEW.propiedad_id,
        NEW.id,
        NEW.notificar_email,
        NEW.notificar_push,
        ARRAY['recordatorio_automatico', 'evento'],
        NEW.created_by
      );
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger para ejecutar la función cuando se inserta un evento
DROP TRIGGER IF EXISTS trigger_crear_recordatorio_automatico ON crm.evento;
CREATE TRIGGER trigger_crear_recordatorio_automatico
  AFTER INSERT ON crm.evento
  FOR EACH ROW
  EXECUTE FUNCTION crm.crear_recordatorio_automatico();

-- Función para actualizar recordatorio cuando se actualiza un evento
CREATE OR REPLACE FUNCTION crm.actualizar_recordatorio_automatico()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo actualizar si el evento tiene notificaciones habilitadas
  IF NEW.notificar_email = true OR NEW.notificar_push = true THEN
    -- Calcular la nueva fecha del recordatorio
    DECLARE
      fecha_recordatorio TIMESTAMPTZ;
    BEGIN
      fecha_recordatorio := NEW.fecha_inicio - INTERVAL '1 minute' * NEW.recordar_antes_minutos;
      
      -- Actualizar o crear el recordatorio automático
      UPDATE crm.recordatorio 
      SET 
        titulo = 'Recordatorio: ' || NEW.titulo,
        descripcion = COALESCE(NEW.descripcion, 'Recordatorio automático para el evento: ' || NEW.titulo),
        prioridad = NEW.prioridad,
        fecha_recordatorio = fecha_recordatorio,
        cliente_id = NEW.cliente_id,
        propiedad_id = NEW.propiedad_id,
        notificar_email = NEW.notificar_email,
        notificar_push = NEW.notificar_push,
        updated_at = NOW()
      WHERE evento_id = NEW.id AND etiquetas @> ARRAY['recordatorio_automatico'];
      
      -- Si no existe el recordatorio, crearlo
      IF NOT FOUND THEN
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
        ) VALUES (
          'Recordatorio: ' || NEW.titulo,
          COALESCE(NEW.descripcion, 'Recordatorio automático para el evento: ' || NEW.titulo),
          'personalizado',
          NEW.prioridad,
          fecha_recordatorio,
          NEW.vendedor_id,
          NEW.cliente_id,
          NEW.propiedad_id,
          NEW.id,
          NEW.notificar_email,
          NEW.notificar_push,
          ARRAY['recordatorio_automatico', 'evento'],
          NEW.created_by
        );
      END IF;
    END;
  ELSE
    -- Si no tiene notificaciones, eliminar el recordatorio automático
    DELETE FROM crm.recordatorio 
    WHERE evento_id = NEW.id AND etiquetas @> ARRAY['recordatorio_automatico'];
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger para ejecutar la función cuando se actualiza un evento
DROP TRIGGER IF EXISTS trigger_actualizar_recordatorio_automatico ON crm.evento;
CREATE TRIGGER trigger_actualizar_recordatorio_automatico
  AFTER UPDATE ON crm.evento
  FOR EACH ROW
  EXECUTE FUNCTION crm.actualizar_recordatorio_automatico();

-- Función para eliminar recordatorio cuando se elimina un evento
CREATE OR REPLACE FUNCTION crm.eliminar_recordatorio_automatico()
RETURNS TRIGGER AS $$
BEGIN
  -- Eliminar recordatorios automáticos asociados al evento
  DELETE FROM crm.recordatorio 
  WHERE evento_id = OLD.id AND etiquetas @> ARRAY['recordatorio_automatico'];
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger para ejecutar la función cuando se elimina un evento
DROP TRIGGER IF EXISTS trigger_eliminar_recordatorio_automatico ON crm.evento;
CREATE TRIGGER trigger_eliminar_recordatorio_automatico
  AFTER DELETE ON crm.evento
  FOR EACH ROW
  EXECUTE FUNCTION crm.eliminar_recordatorio_automatico();

-- Verificar que los triggers se crearon correctamente
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'crm' 
  AND trigger_name LIKE '%recordatorio_automatico%'
ORDER BY trigger_name;
