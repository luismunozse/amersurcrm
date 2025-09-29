-- Migración para hacer email opcional y DNI obligatorio en usuario_perfil
-- Fecha: 2025-01-20
-- Descripción: Modifica la tabla usuario_perfil para el nuevo sistema de autenticación

-- Verificar que la tabla existe antes de modificarla
DO $$
BEGIN
    -- Verificar si la tabla existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'crm' AND table_name = 'usuario_perfil') THEN
        
        -- Agregar campo email si no existe
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'crm' AND table_name = 'usuario_perfil' AND column_name = 'email') THEN
            ALTER TABLE crm.usuario_perfil ADD COLUMN email VARCHAR(255);
            RAISE NOTICE 'Campo email agregado a crm.usuario_perfil';
        ELSE
            RAISE NOTICE 'Campo email ya existe en crm.usuario_perfil';
        END IF;
        
        -- Hacer el campo email opcional (nullable)
        ALTER TABLE crm.usuario_perfil ALTER COLUMN email DROP NOT NULL;
        RAISE NOTICE 'Campo email hecho opcional (nullable)';
        
        -- Hacer el campo DNI obligatorio (NOT NULL)
        ALTER TABLE crm.usuario_perfil ALTER COLUMN dni SET NOT NULL;
        RAISE NOTICE 'Campo dni hecho obligatorio (NOT NULL)';
        
        -- Agregar comentarios
        COMMENT ON COLUMN crm.usuario_perfil.email IS 'Email del usuario (opcional para vendedores con DNI)';
        COMMENT ON COLUMN crm.usuario_perfil.dni IS 'DNI del usuario (obligatorio para autenticación)';
        RAISE NOTICE 'Comentarios agregados a los campos';
        
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
