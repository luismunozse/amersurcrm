-- Migración para corregir valores NULL en DNI antes de hacer el campo obligatorio
-- Fecha: 2025-01-20
-- Descripción: Actualiza registros existentes con DNI NULL antes de hacer el campo obligatorio

-- Verificar que la tabla existe antes de modificarla
DO $$
DECLARE
    v_count INTEGER;
    v_dni_temp VARCHAR(8);
    v_counter INTEGER := 1;
BEGIN
    -- Verificar si la tabla existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'crm' AND table_name = 'usuario_perfil') THEN
        
        -- Contar registros con DNI NULL
        SELECT COUNT(*) INTO v_count 
        FROM crm.usuario_perfil 
        WHERE dni IS NULL;
        
        RAISE NOTICE 'Encontrados % registros con DNI NULL', v_count;
        
        -- Si hay registros con DNI NULL, actualizarlos
        IF v_count > 0 THEN
            -- Actualizar todos los registros con DNI NULL usando un patrón temporal
            UPDATE crm.usuario_perfil 
            SET dni = LPAD(EXTRACT(EPOCH FROM created_at)::INTEGER % 100000000, 8, '0')
            WHERE dni IS NULL;
            
            RAISE NOTICE 'Actualizados % registros con DNIs temporales', v_count;
            
            -- Verificar si hay duplicados y corregirlos
            WHILE EXISTS (
                SELECT 1 FROM crm.usuario_perfil 
                WHERE dni IN (
                    SELECT dni FROM crm.usuario_perfil 
                    GROUP BY dni 
                    HAVING COUNT(*) > 1
                )
            ) LOOP
                -- Actualizar duplicados con un sufijo
                UPDATE crm.usuario_perfil 
                SET dni = dni || '1'
                WHERE id IN (
                    SELECT id FROM crm.usuario_perfil 
                    WHERE dni IN (
                        SELECT dni FROM crm.usuario_perfil 
                        GROUP BY dni 
                        HAVING COUNT(*) > 1
                    )
                    ORDER BY created_at DESC
                    LIMIT 1
                );
            END LOOP;
            
            RAISE NOTICE 'Duplicados corregidos';
        ELSE
            RAISE NOTICE 'No hay registros con DNI NULL';
        END IF;
        
        -- Ahora hacer el campo DNI obligatorio
        ALTER TABLE crm.usuario_perfil ALTER COLUMN dni SET NOT NULL;
        RAISE NOTICE 'Campo dni hecho obligatorio (NOT NULL)';
        
        -- Crear índice único en DNI si no existe
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'crm' AND tablename = 'usuario_perfil' AND indexname = 'idx_usuario_perfil_dni_unique') THEN
            CREATE UNIQUE INDEX idx_usuario_perfil_dni_unique ON crm.usuario_perfil(dni);
            RAISE NOTICE 'Índice único en DNI creado';
        ELSE
            RAISE NOTICE 'Índice único en DNI ya existe';
        END IF;
        
    ELSE
        RAISE NOTICE 'Tabla crm.usuario_perfil no existe. Ejecute primero las migraciones base.';
    END IF;
END $$;
