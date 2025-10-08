-- Función simple para normalizar un número de teléfono específico
CREATE OR REPLACE FUNCTION crm.normalize_single_phone(phone_text TEXT)
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
CREATE OR REPLACE FUNCTION crm.update_client_phones(
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

-- Comentarios
COMMENT ON FUNCTION crm.normalize_single_phone(TEXT) IS 'Normaliza un número de teléfono individual agregando código de país +51';
COMMENT ON FUNCTION crm.update_client_phones(UUID, TEXT, TEXT) IS 'Actualiza los números de teléfono de un cliente específico';
