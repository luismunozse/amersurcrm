-- Script de migración: Generar usernames y actualizar relaciones
-- Ejecutar DESPUÉS de agregar campo username a usuario_perfil

-- PASO 0: Habilitar extensión unaccent (opcional, mejora el resultado)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- PASO 1: Generar usernames para usuarios existentes
-- Este script genera usernames únicos basados en el nombre completo

DO $$
DECLARE
    usuario_record RECORD;
    base_username TEXT;
    final_username TEXT;
    contador INTEGER;
    existe BOOLEAN;
    primera_letra TEXT;
    ultimo_apellido TEXT;
    nombre_limpio TEXT;
BEGIN
    RAISE NOTICE 'Iniciando generación de usernames...';

    -- Iterar sobre usuarios sin username
    FOR usuario_record IN
        SELECT id, nombre_completo, email, dni
        FROM crm.usuario_perfil
        WHERE username IS NULL OR username = ''
        ORDER BY created_at
    LOOP
        -- Generar username base desde nombre_completo
        IF usuario_record.nombre_completo IS NOT NULL AND usuario_record.nombre_completo != '' THEN
            -- Remover tildes y caracteres especiales manualmente
            nombre_limpio := usuario_record.nombre_completo;
            nombre_limpio := TRANSLATE(nombre_limpio,
                'áéíóúÁÉÍÓÚäëïöüÄËÏÖÜàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛãõÃÕñÑçÇ',
                'aeiouAEIOUaeiouAEIOUaeiouAEIOUaeiouAEIOUaoAOnNcC'
            );

            -- Extraer primera letra del primer nombre
            primera_letra := SUBSTRING(nombre_limpio FROM '^\s*(\S)');

            -- Extraer último apellido (última palabra)
            ultimo_apellido := REGEXP_REPLACE(nombre_limpio, '.*\s+(\S+)\s*$', '\1');

            -- Si solo hay una palabra, usar esa
            IF POSITION(' ' IN TRIM(nombre_limpio)) = 0 THEN
                ultimo_apellido := TRIM(nombre_limpio);
                primera_letra := '';
            END IF;

            -- Combinar y limpiar
            base_username := LOWER(
                REGEXP_REPLACE(
                    primera_letra || ultimo_apellido,
                    '[^a-z0-9]',
                    '',
                    'g'
                )
            );
        ELSIF usuario_record.dni IS NOT NULL THEN
            -- Si no hay nombre, usar DNI
            base_username := 'user' || usuario_record.dni;
        ELSE
            -- Último recurso: usar parte del ID
            base_username := 'user' || SUBSTRING(usuario_record.id::TEXT FROM 1 FOR 8);
        END IF;

        -- Validar longitud mínima
        IF LENGTH(base_username) < 3 THEN
            base_username := base_username || '00';
        END IF;

        -- Asegurar que sea único
        final_username := base_username;
        contador := 1;

        LOOP
            -- Verificar si existe
            SELECT EXISTS(
                SELECT 1 FROM crm.usuario_perfil WHERE username = final_username
            ) INTO existe;

            EXIT WHEN NOT existe;

            -- Si existe, agregar número
            contador := contador + 1;
            final_username := base_username || contador::TEXT;

            -- Límite de seguridad
            IF contador > 999 THEN
                final_username := base_username || '_' || SUBSTRING(usuario_record.id::TEXT FROM 1 FOR 4);
                EXIT;
            END IF;
        END LOOP;

        -- Actualizar usuario con nuevo username
        UPDATE crm.usuario_perfil
        SET username = final_username
        WHERE id = usuario_record.id;

        RAISE NOTICE 'Usuario %: % -> @%',
            usuario_record.nombre_completo,
            usuario_record.email,
            final_username;
    END LOOP;

    RAISE NOTICE 'Generación de usernames completada.';
END $$;

-- PASO 2: Migrar vendedor_asignado de email a username en tabla cliente
-- Este paso actualiza las relaciones existentes

DO $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Migrando vendedor_asignado a username...';

    -- Actualizar clientes que tienen vendedor asignado
    UPDATE crm.cliente c
    SET vendedor_username = up.username
    FROM crm.usuario_perfil up
    WHERE c.vendedor_asignado IS NOT NULL
      AND c.vendedor_asignado != ''
      AND (
          up.email = c.vendedor_asignado  -- Si vendedor_asignado es email
          OR up.id::TEXT = c.vendedor_asignado  -- Si vendedor_asignado es UUID
      );

    GET DIAGNOSTICS updated_count = ROW_COUNT;

    RAISE NOTICE 'Clientes actualizados: %', updated_count;
    RAISE NOTICE 'Migración de relaciones completada.';
END $$;

-- PASO 3 (OPCIONAL): Verificar migración
SELECT
    'Usuarios con username' AS categoria,
    COUNT(*) AS total
FROM crm.usuario_perfil
WHERE username IS NOT NULL AND username != ''

UNION ALL

SELECT
    'Usuarios sin username' AS categoria,
    COUNT(*) AS total
FROM crm.usuario_perfil
WHERE username IS NULL OR username = ''

UNION ALL

SELECT
    'Clientes con vendedor (username)' AS categoria,
    COUNT(*) AS total
FROM crm.cliente
WHERE vendedor_username IS NOT NULL AND vendedor_username != ''

UNION ALL

SELECT
    'Clientes con vendedor (antiguo)' AS categoria,
    COUNT(*) AS total
FROM crm.cliente
WHERE vendedor_asignado IS NOT NULL AND vendedor_asignado != '';

-- PASO 4 (EJECUTAR MANUALMENTE DESPUÉS DE VERIFICAR):
-- Una vez verificado que todo funciona correctamente:

-- ALTER TABLE crm.cliente DROP COLUMN IF EXISTS vendedor_asignado;
-- ALTER TABLE crm.cliente RENAME COLUMN vendedor_username TO vendedor_asignado;
--
-- COMMENT ON COLUMN crm.cliente.vendedor_asignado IS 'Username del vendedor asignado (ej: jperez, mlopez)';
