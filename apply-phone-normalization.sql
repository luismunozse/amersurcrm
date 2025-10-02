-- Script para aplicar normalización de números de teléfono en Supabase
-- Ejecutar este script en el SQL Editor de Supabase

-- Función para normalizar números de teléfono
CREATE OR REPLACE FUNCTION crm.normalize_phone_numbers()
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
    -- Iterar sobre todos los clientes
    FOR cliente_record IN 
        SELECT c.id, c.nombre, c.telefono, c.telefono_whatsapp 
        FROM crm.cliente c
        WHERE c.telefono IS NOT NULL OR c.telefono_whatsapp IS NOT NULL
    LOOP
        -- Normalizar teléfono principal
        normalized_telefono := cliente_record.telefono;
        IF cliente_record.telefono IS NOT NULL AND NOT cliente_record.telefono LIKE '+%' THEN
            -- Limpiar el número (solo dígitos)
            normalized_telefono := regexp_replace(cliente_record.telefono, '[^0-9]', '', 'g');
            
            -- Si está vacío después de limpiar, mantener null
            IF normalized_telefono = '' THEN
                normalized_telefono := NULL;
            ELSE
                -- Si ya tiene código de país peruano (51), agregar el +
                IF normalized_telefono LIKE '51%' AND length(normalized_telefono) >= 9 THEN
                    normalized_telefono := '+' || normalized_telefono;
                -- Si es un número peruano (9 dígitos), agregar +51
                ELSIF length(normalized_telefono) = 9 AND normalized_telefono LIKE '9%' THEN
                    normalized_telefono := '+51' || normalized_telefono;
                -- Si es un número peruano (8 dígitos), agregar +51
                ELSIF length(normalized_telefono) = 8 THEN
                    normalized_telefono := '+51' || normalized_telefono;
                -- Para otros casos, agregar +51 por defecto
                ELSE
                    normalized_telefono := '+51' || normalized_telefono;
                END IF;
            END IF;
        END IF;

        -- Normalizar teléfono WhatsApp
        normalized_whatsapp := cliente_record.telefono_whatsapp;
        IF cliente_record.telefono_whatsapp IS NOT NULL AND NOT cliente_record.telefono_whatsapp LIKE '+%' THEN
            -- Limpiar el número (solo dígitos)
            normalized_whatsapp := regexp_replace(cliente_record.telefono_whatsapp, '[^0-9]', '', 'g');
            
            -- Si está vacío después de limpiar, mantener null
            IF normalized_whatsapp = '' THEN
                normalized_whatsapp := NULL;
            ELSE
                -- Si ya tiene código de país peruano (51), agregar el +
                IF normalized_whatsapp LIKE '51%' AND length(normalized_whatsapp) >= 9 THEN
                    normalized_whatsapp := '+' || normalized_whatsapp;
                -- Si es un número peruano (9 dígitos), agregar +51
                ELSIF length(normalized_whatsapp) = 9 AND normalized_whatsapp LIKE '9%' THEN
                    normalized_whatsapp := '+51' || normalized_whatsapp;
                -- Si es un número peruano (8 dígitos), agregar +51
                ELSIF length(normalized_whatsapp) = 8 THEN
                    normalized_whatsapp := '+51' || normalized_whatsapp;
                -- Para otros casos, agregar +51 por defecto
                ELSE
                    normalized_whatsapp := '+51' || normalized_whatsapp;
                END IF;
            END IF;
        END IF;

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
            cliente_record.id as id,
            cliente_record.nombre as nombre,
            cliente_record.telefono as telefono_original,
            normalized_telefono as telefono_normalized,
            cliente_record.telefono_whatsapp as telefono_whatsapp_original,
            normalized_whatsapp as telefono_whatsapp_normalized,
            has_changes as updated;
    END LOOP;
END;
$$;

-- Función para obtener estadísticas de normalización
CREATE OR REPLACE FUNCTION crm.get_phone_normalization_stats()
RETURNS TABLE(
    total_clientes INTEGER,
    clientes_sin_codigo_pais INTEGER,
    clientes_normalizados INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_clientes,
        COUNT(CASE 
            WHEN (telefono IS NOT NULL AND NOT telefono LIKE '+%') OR 
                 (telefono_whatsapp IS NOT NULL AND NOT telefono_whatsapp LIKE '+%')
            THEN 1 
        END)::INTEGER as clientes_sin_codigo_pais,
        COUNT(CASE 
            WHEN telefono LIKE '+%' OR telefono_whatsapp LIKE '+%'
            THEN 1 
        END)::INTEGER as clientes_normalizados
    FROM crm.cliente;
END;
$$;

-- Comentarios
COMMENT ON FUNCTION crm.normalize_phone_numbers() IS 'Normaliza números de teléfono agregando código de país +51 para números peruanos';
COMMENT ON FUNCTION crm.get_phone_normalization_stats() IS 'Obtiene estadísticas sobre el estado de normalización de números de teléfono';

-- Verificar que las funciones se crearon correctamente
SELECT 'Funciones creadas exitosamente' as status;
