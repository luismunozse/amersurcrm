-- Funciones para normalización de teléfonos con acceso RPC

-- Función para obtener clientes que necesitan normalización
CREATE OR REPLACE FUNCTION get_clients_for_normalization()
RETURNS TABLE(
    id UUID,
    nombre TEXT,
    telefono TEXT,
    telefono_whatsapp TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.nombre,
        c.telefono,
        c.telefono_whatsapp
    FROM crm.cliente c
    WHERE (c.telefono IS NOT NULL AND NOT c.telefono LIKE '+%') 
       OR (c.telefono_whatsapp IS NOT NULL AND NOT c.telefono_whatsapp LIKE '+%');
END;
$$;

-- Función para normalizar un número de teléfono
CREATE OR REPLACE FUNCTION normalize_single_phone(phone_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    clean_number TEXT;
    result TEXT;
BEGIN
    -- Si es null o vacío, devolver null
    IF phone_text IS NULL OR phone_text = '' THEN
        RETURN NULL;
    END IF;
    
    -- Si ya tiene código de país, devolverlo tal como está
    IF phone_text LIKE '+%' THEN
        RETURN phone_text;
    END IF;
    
    -- Limpiar el número (solo dígitos)
    clean_number := regexp_replace(phone_text, '[^0-9]', '', 'g');
    
    -- Si está vacío después de limpiar, devolver null
    IF clean_number = '' THEN
        RETURN NULL;
    END IF;
    
    -- Si ya tiene código de país peruano (51), agregar el +
    IF clean_number LIKE '51%' AND length(clean_number) >= 9 THEN
        result := '+' || clean_number;
    -- Si es un número peruano (9 dígitos), agregar +51
    ELSIF length(clean_number) = 9 AND clean_number LIKE '9%' THEN
        result := '+51' || clean_number;
    -- Si es un número peruano (8 dígitos), agregar +51
    ELSIF length(clean_number) = 8 THEN
        result := '+51' || clean_number;
    -- Para otros casos, agregar +51 por defecto
    ELSE
        result := '+51' || clean_number;
    END IF;
    
    RETURN result;
END;
$$;

-- Función para actualizar un cliente específico
CREATE OR REPLACE FUNCTION update_client_phones(
    client_id UUID,
    new_telefono TEXT,
    new_telefono_whatsapp TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE crm.cliente 
    SET 
        telefono = new_telefono,
        telefono_whatsapp = new_telefono_whatsapp
    WHERE id = client_id;
    
    RETURN FOUND;
END;
$$;

-- Función completa para normalizar todos los números
CREATE OR REPLACE FUNCTION normalize_all_phone_numbers()
RETURNS TABLE(
    id UUID,
    nombre TEXT,
    telefono_original TEXT,
    telefono_normalized TEXT,
    telefono_whatsapp_original TEXT,
    telefono_whatsapp_normalized TEXT,
    updated BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cliente_record RECORD;
    normalized_telefono TEXT;
    normalized_whatsapp TEXT;
    has_changes BOOLEAN;
BEGIN
    -- Iterar sobre todos los clientes que necesitan normalización
    FOR cliente_record IN 
        SELECT c.id, c.nombre, c.telefono, c.telefono_whatsapp 
        FROM crm.cliente c
        WHERE (c.telefono IS NOT NULL AND NOT c.telefono LIKE '+%') 
           OR (c.telefono_whatsapp IS NOT NULL AND NOT c.telefono_whatsapp LIKE '+%')
    LOOP
        -- Normalizar números
        normalized_telefono := normalize_single_phone(cliente_record.telefono);
        normalized_whatsapp := normalize_single_phone(cliente_record.telefono_whatsapp);

        -- Verificar si hay cambios
        has_changes := (cliente_record.telefono != normalized_telefono) OR 
                      (cliente_record.telefono_whatsapp != normalized_whatsapp);

        -- Actualizar si hay cambios
        IF has_changes THEN
            UPDATE crm.cliente 
            SET 
                telefono = normalized_telefono,
                telefono_whatsapp = normalized_whatsapp
            WHERE crm.cliente.id = cliente_record.id;
        END IF;

        -- Retornar información del cliente
        RETURN QUERY SELECT 
            cliente_record.id,
            cliente_record.nombre,
            cliente_record.telefono,
            normalized_telefono,
            cliente_record.telefono_whatsapp,
            normalized_whatsapp,
            has_changes;
    END LOOP;
END;
$$;

-- Comentarios
COMMENT ON FUNCTION get_clients_for_normalization() IS 'Obtiene clientes que necesitan normalización de números de teléfono';
COMMENT ON FUNCTION normalize_single_phone(TEXT) IS 'Normaliza un número de teléfono individual agregando código de país +51';
COMMENT ON FUNCTION update_client_phones(UUID, TEXT, TEXT) IS 'Actualiza los números de teléfono de un cliente específico';
COMMENT ON FUNCTION normalize_all_phone_numbers() IS 'Normaliza todos los números de teléfono y devuelve un reporte de cambios';
