-- Migración: soporte para WhatsApp usernames y LIDs (Meta, jun 2026)
-- Contexto: los chats que un cliente inicia por username NO exponen su
-- teléfono real al negocio; WhatsApp identifica el chat con un LID
-- pseudónimo ("<dígitos>@lid"). Esta migración agrega las columnas
-- necesarias para guardar ese identificador y el username, y actualiza
-- create_whatsapp_lead para poder recibirlos.

ALTER TABLE crm.cliente ADD COLUMN IF NOT EXISTS whatsapp_username TEXT;
ALTER TABLE crm.cliente ADD COLUMN IF NOT EXISTS whatsapp_chat_id TEXT;

COMMENT ON COLUMN crm.cliente.whatsapp_username IS
  'Username de WhatsApp del contacto, guardado sin "@" y en minúsculas. Se muestra con "@" en la UI. Dedup aplicativo (sin constraint UNIQUE), igual que teléfono.';
COMMENT ON COLUMN crm.cliente.whatsapp_chat_id IS
  'Chat ID crudo enviado por la extensión: "<dígitos>@lid" para chats iniciados por username (el LID es un pseudónimo, NO el teléfono real del contacto), o los dígitos del teléfono para chats clásicos. Dedup aplicativo, sin constraint UNIQUE.';

CREATE INDEX IF NOT EXISTS idx_cliente_whatsapp_username
  ON crm.cliente (whatsapp_username)
  WHERE whatsapp_username IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cliente_whatsapp_chat_id
  ON crm.cliente (whatsapp_chat_id)
  WHERE whatsapp_chat_id IS NOT NULL;

-- Recrear create_whatsapp_lead agregando p_whatsapp_username/p_whatsapp_chat_id
-- al final, ambos con DEFAULT NULL para no romper a los callers existentes
-- (bot de WhatsApp, que sigue llamando con la firma vieja vía parámetros
-- nombrados).
--
-- DROP explícito con la firma vieja EXACTA antes de crear la nueva función:
-- un CREATE OR REPLACE que solo agrega parámetros al final NO reemplaza la
-- función existente, crea un overload nuevo, y PostgREST falla al resolver
-- el RPC por ambigüedad de firma (dos funciones con el mismo nombre).
DROP FUNCTION IF EXISTS crm.create_whatsapp_lead(TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, JSONB);
-- También la firma nueva, para que la migración sea re-corrible (42723 si no).
DROP FUNCTION IF EXISTS crm.create_whatsapp_lead(TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, JSONB, TEXT, TEXT);

CREATE FUNCTION crm.create_whatsapp_lead(
  p_nombre TEXT,
  p_telefono TEXT,
  p_telefono_whatsapp TEXT,
  p_origen_lead TEXT,
  p_vendedor_asignado TEXT,  -- OPCIONAL: si viene NULL, se asigna automáticamente
  p_created_by UUID,
  p_notas TEXT,
  p_direccion JSONB,
  p_whatsapp_username TEXT DEFAULT NULL,
  p_whatsapp_chat_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con permisos del dueño de la función
SET search_path = crm, public
AS $$
DECLARE
  vendedor_username TEXT;
  vendedor_info RECORD;
BEGIN
  -- Si no viene vendedor asignado, obtener uno automáticamente del sistema round-robin
  IF p_vendedor_asignado IS NULL THEN
    -- Obtener siguiente vendedor de la lista activa
    SELECT * INTO vendedor_info
    FROM crm.obtener_siguiente_vendedor()
    LIMIT 1;

    -- Si hay vendedor disponible, usar su username
    IF vendedor_info.username IS NOT NULL THEN
      vendedor_username := vendedor_info.username;
    ELSE
      -- Si no hay vendedores en la lista, dejar NULL
      vendedor_username := NULL;
    END IF;
  ELSE
    -- Si viene vendedor específico, usarlo
    vendedor_username := p_vendedor_asignado;
  END IF;

  -- Insertar el lead con el vendedor asignado
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
    direccion,
    whatsapp_username,
    whatsapp_chat_id
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
    vendedor_username,
    p_created_by,
    CASE
      WHEN p_origen_lead = 'whatsapp_web' THEN 'Responder mensaje del cliente'
      ELSE 'Contactar lead generado desde WhatsApp'
    END,
    p_notas,
    p_direccion,
    p_whatsapp_username,
    p_whatsapp_chat_id
  )
  RETURNING cliente.id;
END;
$$;

-- Otorgar permisos de ejecución (igual que la función original)
GRANT EXECUTE ON FUNCTION crm.create_whatsapp_lead TO service_role;
GRANT EXECUTE ON FUNCTION crm.create_whatsapp_lead TO authenticated;

-- La ruta /api/metrics/extension inserta métricas vía service role cuando la
-- extensión autentica por Bearer token; sin este GRANT el insert falla con
-- "permission denied for table extension_metrics" (el service role bypasea
-- RLS pero NO los grants de tabla).
GRANT SELECT, INSERT ON crm.extension_metrics TO service_role;
