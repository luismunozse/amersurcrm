-- Migración: Actualizar vendedor_asignado para usar username
-- Fecha: 2025-02-05
-- Descripción: Cambia vendedor_asignado de email/UUID a username

DO $$
BEGIN
    -- Verificar que la tabla cliente existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'crm' AND table_name = 'cliente') THEN

        -- Verificar el tipo actual de vendedor_asignado
        -- Si es UUID o TEXT (email), necesitamos preparar para migración

        RAISE NOTICE 'Preparando migración de vendedor_asignado a username...';

        -- IMPORTANTE: Esta migración requiere datos de usuario_perfil.username
        -- Los usernames deben existir antes de ejecutar esta migración

        -- Agregar columna temporal si no existe
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'crm' AND table_name = 'cliente' AND column_name = 'vendedor_username') THEN
            ALTER TABLE crm.cliente ADD COLUMN vendedor_username VARCHAR(50);
            RAISE NOTICE 'Columna temporal vendedor_username creada';
        END IF;

        -- Crear índice para la nueva columna
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'crm' AND tablename = 'cliente' AND indexname = 'idx_cliente_vendedor_username') THEN
            CREATE INDEX idx_cliente_vendedor_username ON crm.cliente(vendedor_username);
            RAISE NOTICE 'Índice idx_cliente_vendedor_username creado';
        END IF;

        -- Comentarios
        COMMENT ON COLUMN crm.cliente.vendedor_username IS 'Username del vendedor asignado (ej: jperez, mlopez)';

        RAISE NOTICE 'Migración preparada. IMPORTANTE: Ejecutar script de migración de datos manualmente.';
        RAISE NOTICE 'Después de migrar datos: renombrar vendedor_username -> vendedor_asignado y eliminar columna antigua';

    ELSE
        RAISE EXCEPTION 'Tabla crm.cliente no existe.';
    END IF;
END $$;

-- Notas para completar la migración:
-- 1. Generar usernames para todos los usuarios (ver script de migración)
-- 2. Ejecutar script para copiar datos: UPDATE cliente SET vendedor_username = (SELECT username FROM usuario_perfil WHERE email = vendedor_asignado)
-- 3. Renombrar columnas:
--    ALTER TABLE crm.cliente RENAME COLUMN vendedor_asignado TO vendedor_asignado_old;
--    ALTER TABLE crm.cliente RENAME COLUMN vendedor_username TO vendedor_asignado;
-- 4. Eliminar columna antigua cuando se confirme que todo funciona:
--    ALTER TABLE crm.cliente DROP COLUMN vendedor_asignado_old;
