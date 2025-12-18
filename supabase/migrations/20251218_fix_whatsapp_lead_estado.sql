-- Fix: Cambiar estado inicial de leads WhatsApp de 'contactado' a 'por_contactar'
-- El cliente solicitó que todos los leads nuevos inicien como 'por_contactar'

CREATE OR REPLACE FUNCTION crm.create_whatsapp_lead(
  p_nombre TEXT,
  p_telefono TEXT,
  p_telefono_whatsapp TEXT,
  p_origen_lead TEXT,
  p_vendedor_asignado TEXT,
  p_created_by UUID,
  p_notas TEXT,
  p_direccion JSONB
)
RETURNS TABLE (
  id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, public
AS $$
DECLARE
  vendedor_username TEXT;
  vendedor_info RECORD;
BEGIN
  -- Si no viene vendedor asignado, obtener uno automáticamente del sistema round-robin
  IF p_vendedor_asignado IS NULL THEN
    SELECT * INTO vendedor_info
    FROM crm.obtener_siguiente_vendedor()
    LIMIT 1;

    IF vendedor_info.username IS NOT NULL THEN
      vendedor_username := vendedor_info.username;
    ELSE
      vendedor_username := NULL;
    END IF;
  ELSE
    vendedor_username := p_vendedor_asignado;
  END IF;

  -- Insertar el lead con estado 'por_contactar'
  RETURN QUERY
  INSERT INTO crm.cliente (
    nombre,
    tipo_cliente,
    telefono,
    telefono_whatsapp,
    origen_lead,
    estado_cliente,
    vendedor_asignado,
    created_by,
    proxima_accion,
    notas,
    direccion
  )
  VALUES (
    p_nombre,
    'persona',
    p_telefono,
    p_telefono_whatsapp,
    p_origen_lead,
    'por_contactar',  -- Siempre inicia como 'por_contactar'
    vendedor_username,
    p_created_by,
    'Contactar lead capturado desde WhatsApp',
    p_notas,
    p_direccion
  )
  RETURNING cliente.id;
END;
$$;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION crm.create_whatsapp_lead TO service_role;
GRANT EXECUTE ON FUNCTION crm.create_whatsapp_lead TO authenticated;
