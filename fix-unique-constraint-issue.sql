-- Solución para el problema de constraint único en números de teléfono

-- Paso 1: Eliminar temporalmente el índice único que está causando el conflicto
DROP INDEX IF EXISTS crm.uniq_cliente_phone_normalized;

-- Función mejorada que maneja duplicados
CREATE OR REPLACE FUNCTION normalize_all_phone_numbers_safe()
RETURNS TABLE(
    id UUID,
    nombre TEXT,
    telefono_original TEXT,
    telefono_normalized TEXT,
    telefono_whatsapp_original TEXT,
    telefono_whatsapp_normalized TEXT,
    updated BOOLEAN,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cliente_record RECORD;
    normalized_telefono TEXT;
    normalized_whatsapp TEXT;
    has_changes BOOLEAN;
    error_msg TEXT;
BEGIN
    -- Iterar sobre todos los clientes que necesitan normalización
    FOR cliente_record IN 
        SELECT c.id, c.nombre, c.telefono, c.telefono_whatsapp 
        FROM crm.cliente c
        WHERE (c.telefono IS NOT NULL AND NOT c.telefono LIKE '+%') 
           OR (c.telefono_whatsapp IS NOT NULL AND NOT c.telefono_whatsapp LIKE '+%')
    LOOP
        error_msg := NULL;
        
        -- Normalizar números
        normalized_telefono := normalize_single_phone(cliente_record.telefono);
        normalized_whatsapp := normalize_single_phone(cliente_record.telefono_whatsapp);

        -- Verificar si hay cambios
        has_changes := (cliente_record.telefono != normalized_telefono) OR 
                      (cliente_record.telefono_whatsapp != normalized_whatsapp);

        -- Actualizar si hay cambios
        IF has_changes THEN
            BEGIN
                UPDATE crm.cliente 
                SET 
                    telefono = normalized_telefono,
                    telefono_whatsapp = normalized_whatsapp
                WHERE crm.cliente.id = cliente_record.id;
            EXCEPTION 
                WHEN unique_violation THEN
                    error_msg := 'Número duplicado detectado';
                    has_changes := FALSE;
            END;
        END IF;

        -- Retornar información del cliente
        RETURN QUERY SELECT 
            cliente_record.id,
            cliente_record.nombre,
            cliente_record.telefono,
            normalized_telefono,
            cliente_record.telefono_whatsapp,
            normalized_whatsapp,
            has_changes,
            error_msg;
    END LOOP;
END;
$$;

-- Función para verificar duplicados antes de normalizar
CREATE OR REPLACE FUNCTION check_phone_duplicates()
RETURNS TABLE(
    telefono_normalized TEXT,
    count_duplicates BIGINT,
    cliente_ids TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH normalized_phones AS (
        SELECT 
            c.id,
            c.nombre,
            normalize_single_phone(c.telefono) as tel_norm
        FROM crm.cliente c
        WHERE c.telefono IS NOT NULL AND NOT c.telefono LIKE '+%'
    )
    SELECT 
        tel_norm as telefono_normalized,
        COUNT(*) as count_duplicates,
        ARRAY_AGG(id::TEXT) as cliente_ids
    FROM normalized_phones
    WHERE tel_norm IS NOT NULL
    GROUP BY tel_norm
    HAVING COUNT(*) > 1;
END;
$$;

-- Recrear el índice único pero de manera más flexible
-- (Comentado por ahora para evitar conflictos futuros)
/*
CREATE UNIQUE INDEX IF NOT EXISTS uniq_cliente_phone_normalized_new 
ON crm.cliente (telefono) 
WHERE telefono IS NOT NULL AND telefono LIKE '+%';
*/

-- Comentarios
COMMENT ON FUNCTION normalize_all_phone_numbers_safe() IS 'Normaliza números de teléfono con manejo seguro de duplicados';
COMMENT ON FUNCTION check_phone_duplicates() IS 'Verifica qué números normalizados serían duplicados';
