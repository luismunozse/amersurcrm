-- Migración para corregir TODOS los valores NULL en DNI
-- Fecha: 2025-01-20
-- Descripción: Actualiza todos los registros con DNI NULL antes de hacer el campo obligatorio

-- Verificar que la tabla existe antes de modificarla
DO $$
DECLARE
    v_count INTEGER;
    v_total INTEGER;
BEGIN
    -- Verificar si la tabla existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'crm' AND table_name = 'usuario_perfil') THEN
        
        -- Contar total de registros
        SELECT COUNT(*) INTO v_total FROM crm.usuario_perfil;
        RAISE NOTICE 'Total de registros en usuario_perfil: %', v_total;
        
        -- Contar registros con DNI NULL
        SELECT COUNT(*) INTO v_count 
        FROM crm.usuario_perfil 
        WHERE dni IS NULL;
        
        RAISE NOTICE 'Registros con DNI NULL: %', v_count;
        
        -- Mostrar todos los registros con DNI NULL
        RAISE NOTICE 'Registros con DNI NULL:';
        FOR rec IN 
            SELECT id, email, nombre_completo, dni, created_at 
            FROM crm.usuario_perfil 
            WHERE dni IS NULL
        LOOP
            RAISE NOTICE 'ID: %, Email: %, Nombre: %, DNI: %, Created: %', 
                rec.id, rec.email, rec.nombre_completo, rec.dni, rec.created_at;
        END LOOP;
        
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
        
        -- Verificar nuevamente que no hay valores NULL
        SELECT COUNT(*) INTO v_count 
        FROM crm.usuario_perfil 
        WHERE dni IS NULL;
        
        IF v_count = 0 THEN
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
            
            -- Hacer el campo email opcional si no lo es
            ALTER TABLE crm.usuario_perfil ALTER COLUMN email DROP NOT NULL;
            RAISE NOTICE 'Campo email hecho opcional (nullable)';
            
            -- Agregar comentarios
            COMMENT ON COLUMN crm.usuario_perfil.dni IS 'DNI del usuario (obligatorio para autenticación)';
            COMMENT ON COLUMN crm.usuario_perfil.email IS 'Email del usuario (opcional para vendedores con DNI)';
            RAISE NOTICE 'Comentarios agregados a los campos';
            
        ELSE
            RAISE NOTICE 'ERROR: Aún hay % registros con DNI NULL. No se puede hacer el campo obligatorio.', v_count;
        END IF;
        
    ELSE
        RAISE NOTICE 'Tabla crm.usuario_perfil no existe. Ejecute primero las migraciones base.';
    END IF;
END $$;
