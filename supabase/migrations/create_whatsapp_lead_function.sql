-- Función para crear leads desde WhatsApp Bot
-- Ejecuta con permisos elevados, bypasseando RLS

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
SECURITY DEFINER -- Ejecuta con permisos del dueño de la función
SET search_path = crm, public
AS $$
BEGIN
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
    -- Si el origen es whatsapp_web, el cliente YA contactó (envió mensajes), entonces estado = 'contactado'
    -- Si es de otro origen, estado = 'por_contactar'
    CASE
      WHEN p_origen_lead = 'whatsapp_web' THEN 'contactado'
      ELSE 'por_contactar'
    END,
    p_vendedor_asignado,
    p_created_by,
    CASE
      WHEN p_origen_lead = 'whatsapp_web' THEN 'Responder mensaje del cliente'
      ELSE 'Contactar lead generado desde WhatsApp'
    END,
    p_notas,
    p_direccion
  )
  RETURNING cliente.id;
END;
$$;

-- Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION crm.create_whatsapp_lead TO service_role;
GRANT EXECUTE ON FUNCTION crm.create_whatsapp_lead TO authenticated;
