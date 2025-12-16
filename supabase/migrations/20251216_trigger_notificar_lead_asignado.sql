-- Trigger para notificar al vendedor cuando se le asigna un lead
-- Este trigger se dispara cuando:
-- 1. Se inserta un nuevo cliente con vendedor_asignado
-- 2. Se actualiza el vendedor_asignado de un cliente existente

CREATE OR REPLACE FUNCTION crm.notificar_lead_asignado()
RETURNS TRIGGER AS $$
DECLARE
  v_vendedor_id UUID;
  v_vendedor_nombre TEXT;
  v_cliente_nombre TEXT;
BEGIN
  -- Solo procesar si hay un vendedor asignado y es diferente al anterior (en caso de UPDATE)
  IF NEW.vendedor_asignado IS NULL THEN
    RETURN NEW;
  END IF;

  -- En UPDATE, solo notificar si el vendedor cambió
  IF TG_OP = 'UPDATE' AND OLD.vendedor_asignado = NEW.vendedor_asignado THEN
    RETURN NEW;
  END IF;

  -- Obtener el ID del vendedor desde usuario_perfil (vendedor_asignado es username)
  SELECT id, COALESCE(nombre_completo, username) INTO v_vendedor_id, v_vendedor_nombre
  FROM crm.usuario_perfil
  WHERE username = NEW.vendedor_asignado
  LIMIT 1;

  -- Si no encontramos el vendedor, salir silenciosamente
  IF v_vendedor_id IS NULL THEN
    RAISE WARNING '[notificar_lead_asignado] No se encontró vendedor con username: %', NEW.vendedor_asignado;
    RETURN NEW;
  END IF;

  -- Nombre del cliente para el mensaje
  v_cliente_nombre := COALESCE(NEW.nombre, 'Cliente sin nombre');

  -- Crear la notificación
  INSERT INTO crm.notificacion (
    usuario_id,
    tipo,
    titulo,
    mensaje,
    data
  ) VALUES (
    v_vendedor_id,
    'lead_asignado',
    'Nuevo lead asignado',
    'Se te ha asignado el lead: ' || v_cliente_nombre,
    jsonb_build_object(
      'cliente_id', NEW.id,
      'cliente_nombre', v_cliente_nombre,
      'cliente_telefono', NEW.telefono,
      'origen', NEW.origen_lead,
      'estado', NEW.estado_cliente
    )
  );

  RAISE NOTICE '[notificar_lead_asignado] Notificación creada para vendedor % (%) - Cliente: %',
    v_vendedor_nombre, v_vendedor_id, v_cliente_nombre;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear el trigger en la tabla cliente
DROP TRIGGER IF EXISTS trigger_notificar_lead_asignado ON crm.cliente;

CREATE TRIGGER trigger_notificar_lead_asignado
  AFTER INSERT OR UPDATE OF vendedor_asignado
  ON crm.cliente
  FOR EACH ROW
  EXECUTE FUNCTION crm.notificar_lead_asignado();

-- Comentario para documentación
COMMENT ON FUNCTION crm.notificar_lead_asignado() IS
  'Trigger function que crea una notificación cuando se asigna un lead a un vendedor';
