-- Migración para optimizar la generación de código de cliente
-- Fecha: 2025-12-19
-- Descripción: Reemplazar FULL TABLE SCAN con SEQUENCE para generación O(1)
-- Problema: La función generar_codigo_cliente() hacía MAX(SUBSTRING(...)) en cada INSERT
--          causando FULL TABLE SCAN que empeora con el tamaño de la tabla

-- 1. Crear secuencia para códigos de cliente
-- Inicializar con el valor máximo actual + 1
DO $$
DECLARE
    max_codigo INTEGER;
BEGIN
    -- Obtener el máximo código actual
    SELECT COALESCE(MAX(CAST(SUBSTRING(codigo_cliente FROM 'CLI-(\d+)') AS INTEGER)), 0)
    INTO max_codigo
    FROM crm.cliente
    WHERE codigo_cliente ~ '^CLI-\d+$';

    -- Eliminar secuencia si existe
    DROP SEQUENCE IF EXISTS crm.cliente_codigo_seq;

    -- Crear secuencia iniciando desde el siguiente número
    EXECUTE format('CREATE SEQUENCE crm.cliente_codigo_seq START WITH %s INCREMENT BY 1', max_codigo + 1);

    RAISE NOTICE 'Secuencia creada con valor inicial: %', max_codigo + 1;
END $$;

-- 2. Reemplazar función de generación de código (ahora O(1) en lugar de O(n))
CREATE OR REPLACE FUNCTION crm.generar_codigo_cliente()
RETURNS TEXT AS $$
BEGIN
    -- Usar secuencia en lugar de MAX() - O(1) constante
    RETURN 'CLI-' || LPAD(nextval('crm.cliente_codigo_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- 3. La función set_codigo_cliente() no necesita cambios, ya usa generar_codigo_cliente()

-- 4. Agregar índice si no existe para búsquedas por documento_identidad
CREATE INDEX IF NOT EXISTS idx_cliente_documento_identidad
ON crm.cliente(documento_identidad)
WHERE documento_identidad IS NOT NULL;

-- 5. Agregar índice para telefono_e164 si la columna existe
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'crm'
        AND table_name = 'cliente'
        AND column_name = 'telefono_e164'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_cliente_telefono_e164
        ON crm.cliente(telefono_e164)
        WHERE telefono_e164 IS NOT NULL;
        RAISE NOTICE 'Índice telefono_e164 creado';
    ELSE
        RAISE NOTICE 'Columna telefono_e164 no existe, saltando índice';
    END IF;
END $$;

-- 6. Agregar índice compuesto para búsqueda de teléfonos
CREATE INDEX IF NOT EXISTS idx_cliente_telefonos
ON crm.cliente(telefono, telefono_whatsapp);

-- 7. Comentario de documentación
COMMENT ON SEQUENCE crm.cliente_codigo_seq IS 'Secuencia para generar códigos de cliente CLI-XXXXXX de forma atómica y eficiente';
