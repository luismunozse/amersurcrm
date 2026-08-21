-- Fix: los leads capturados desde la extensión vuelven a nacer 'por_contactar'.
--
-- REGRESIÓN. Historia completa:
--
--   1. create_whatsapp_lead_function.sql (original) insertaba
--        CASE WHEN p_origen_lead = 'whatsapp_web' THEN 'contactado'
--             ELSE 'por_contactar' END
--      con el razonamiento de que si el cliente escribió por WhatsApp, ya
--      "contactó".
--   2. 20251218_fix_whatsapp_lead_estado.sql lo corrigió a 'por_contactar'
--      fijo: "El cliente solicitó que todos los leads nuevos inicien como
--      'por_contactar'". Lo que importa es si el VENDEDOR ya contactó al
--      lead, no al revés — un lead que nace 'contactado' se saltea la
--      primera etapa del pipeline y nadie lo llama.
--   3. 2026-08-12_whatsapp_username_lid.sql tuvo que recrear la función para
--      agregar p_whatsapp_username/p_whatsapp_chat_id, y copió el cuerpo de
--      la versión ORIGINAL en vez de la corregida — reintroduciendo el CASE
--      y deshaciendo (2) sin que nadie lo notara.
--
-- Efecto en producción desde el 2026-08-12: todo lead capturado por la
-- extensión (origen_lead = 'whatsapp_web', el default) se creó como
-- 'contactado'.
--
-- Se restaura también `proxima_accion`, que 20251218 había fijado en el
-- mismo movimiento y que la migración de agosto revirtió igual.
--
-- La firma es idéntica a la vigente, así que CREATE OR REPLACE alcanza: no
-- hace falta el DROP + CREATE que necesitó 2026-08-12 al agregar parámetros.

CREATE OR REPLACE FUNCTION crm.create_whatsapp_lead(
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
    -- SIEMPRE 'por_contactar', sin importar el origen: el estado refleja si
    -- el VENDEDOR ya contactó al lead. No volver a poner un CASE acá (ver
    -- la historia de la regresión en la cabecera de esta migración).
    'por_contactar',
    vendedor_username,
    p_created_by,
    'Contactar lead capturado desde WhatsApp',
    p_notas,
    p_direccion,
    p_whatsapp_username,
    p_whatsapp_chat_id
  )
  RETURNING cliente.id;
END;
$$;

-- Permisos: CREATE OR REPLACE los conserva, pero se re-otorgan para que la
-- migración sea autosuficiente si se aplica sobre una base recreada.
GRANT EXECUTE ON FUNCTION crm.create_whatsapp_lead TO service_role;
GRANT EXECUTE ON FUNCTION crm.create_whatsapp_lead TO authenticated;
