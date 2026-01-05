-- Migración para agregar FK entre cliente.vendedor_asignado y usuario_perfil.username
-- Fecha: 2025-12-19
-- Descripción: Permite hacer JOINs eficientes para obtener datos del vendedor sin N+1 queries

-- 1. Agregar índice en usuario_perfil.username si no existe
CREATE INDEX IF NOT EXISTS idx_usuario_perfil_username
ON crm.usuario_perfil(username);

-- 2. Intentar recuperar vendedores asignados por UUID (migración de datos históricos)
-- Algunos clientes tienen el ID del usuario en vez del username
DO $$
DECLARE
    recovered_count INTEGER := 0;
    r RECORD;
BEGIN
    RAISE NOTICE '🔄 Intentando recuperar vendedores asignados por UUID...';

    -- Actualizar clientes que tienen UUID en vendedor_asignado
    -- Convertir UUID a username usando usuario_perfil
    FOR r IN
        SELECT c.id as cliente_id, c.vendedor_asignado as old_value, up.username as new_username
        FROM crm.cliente c
        JOIN crm.usuario_perfil up ON up.id::text = c.vendedor_asignado
        WHERE c.vendedor_asignado IS NOT NULL
        AND c.vendedor_asignado ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    LOOP
        UPDATE crm.cliente
        SET vendedor_asignado = r.new_username
        WHERE id = r.cliente_id;

        recovered_count := recovered_count + 1;
        RAISE NOTICE '  ✅ Cliente % recuperado: % → %', r.cliente_id, r.old_value, r.new_username;
    END LOOP;

    IF recovered_count > 0 THEN
        RAISE NOTICE '✅ Se recuperaron % clientes con UUID → username', recovered_count;
    ELSE
        RAISE NOTICE 'ℹ️  No se encontraron clientes con UUID para recuperar';
    END IF;
END $$;

-- 3. Verificar y reportar valores de vendedor_asignado que aún no existen en usuario_perfil
DO $$
DECLARE
    orphan_count INTEGER;
    r RECORD;
BEGIN
    -- Contar cuántos clientes tienen vendedor_asignado huérfano
    SELECT COUNT(*) INTO orphan_count
    FROM crm.cliente c
    WHERE c.vendedor_asignado IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM crm.usuario_perfil up
        WHERE up.username = c.vendedor_asignado
    );

    IF orphan_count > 0 THEN
        RAISE NOTICE '⚠️  Hay % clientes con vendedor_asignado que no existe en usuario_perfil', orphan_count;
        RAISE NOTICE 'Estos se pondrán a NULL para poder crear la FK';

        -- Mostrar los valores huérfanos para auditoría
        RAISE NOTICE 'Valores huérfanos:';
        FOR r IN
            SELECT DISTINCT c.vendedor_asignado as username, COUNT(*) as cantidad
            FROM crm.cliente c
            WHERE c.vendedor_asignado IS NOT NULL
            AND NOT EXISTS (
                SELECT 1 FROM crm.usuario_perfil up
                WHERE up.username = c.vendedor_asignado
            )
            GROUP BY c.vendedor_asignado
        LOOP
            RAISE NOTICE '  - %: % clientes', r.username, r.cantidad;
        END LOOP;

        -- Limpiar los valores huérfanos
        UPDATE crm.cliente c
        SET vendedor_asignado = NULL
        WHERE vendedor_asignado IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM crm.usuario_perfil up
            WHERE up.username = c.vendedor_asignado
        );

        RAISE NOTICE 'Limpieza completada: % registros actualizados', orphan_count;
    ELSE
        RAISE NOTICE '✅ Todos los vendedor_asignado existen en usuario_perfil';
    END IF;
END $$;

-- 4. Crear la FK (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'cliente_vendedor_asignado_fkey'
        AND table_schema = 'crm'
        AND table_name = 'cliente'
    ) THEN
        ALTER TABLE crm.cliente
        ADD CONSTRAINT cliente_vendedor_asignado_fkey
        FOREIGN KEY (vendedor_asignado)
        REFERENCES crm.usuario_perfil(username)
        ON UPDATE CASCADE
        ON DELETE SET NULL;

        RAISE NOTICE 'FK cliente_vendedor_asignado_fkey creada';
    ELSE
        RAISE NOTICE 'FK cliente_vendedor_asignado_fkey ya existe';
    END IF;
END $$;

-- 4. Comentario de documentación
COMMENT ON CONSTRAINT cliente_vendedor_asignado_fkey ON crm.cliente
IS 'FK para permitir JOINs eficientes con usuario_perfil y obtener datos del vendedor';
