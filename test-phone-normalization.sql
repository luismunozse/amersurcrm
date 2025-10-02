-- Script para probar la normalización de números de teléfono
-- Ejecutar este script en el SQL Editor de Supabase DESPUÉS de aplicar apply-phone-normalization.sql

-- Ver estadísticas actuales
SELECT 'ESTADÍSTICAS ANTES DE LA NORMALIZACIÓN:' as info;
SELECT * FROM crm.get_phone_normalization_stats();

-- Ver algunos clientes que necesitan normalización
SELECT 'CLIENTES QUE NECESITAN NORMALIZACIÓN:' as info;
SELECT 
    id,
    nombre,
    telefono,
    telefono_whatsapp,
    CASE 
        WHEN telefono IS NOT NULL AND NOT telefono LIKE '+%' THEN 'SÍ'
        ELSE 'NO'
    END as telefono_necesita_normalizacion,
    CASE 
        WHEN telefono_whatsapp IS NOT NULL AND NOT telefono_whatsapp LIKE '+%' THEN 'SÍ'
        ELSE 'NO'
    END as whatsapp_necesita_normalizacion
FROM crm.cliente 
WHERE (telefono IS NOT NULL AND NOT telefono LIKE '+%') OR 
      (telefono_whatsapp IS NOT NULL AND NOT telefono_whatsapp LIKE '+%')
LIMIT 10;

-- Ejecutar la normalización
SELECT 'EJECUTANDO NORMALIZACIÓN...' as info;
SELECT * FROM crm.normalize_phone_numbers();

-- Ver estadísticas después de la normalización
SELECT 'ESTADÍSTICAS DESPUÉS DE LA NORMALIZACIÓN:' as info;
SELECT * FROM crm.get_phone_normalization_stats();

-- Verificar algunos clientes normalizados
SELECT 'CLIENTES NORMALIZADOS (muestra):' as info;
    SELECT 
        id,
        nombre,
        telefono,
        telefono_whatsapp
    FROM crm.cliente 
    WHERE telefono LIKE '+%' OR telefono_whatsapp LIKE '+%'
    LIMIT 10;
