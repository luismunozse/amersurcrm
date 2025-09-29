-- Migración segura para producción: Agregar campo DNI a usuario_perfil
-- Fecha: 2025-01-20
-- Descripción: Agrega campo DNI para autenticación de vendedores

-- Verificar que la tabla existe antes de modificarla
DO $$
BEGIN
    -- Verificar si la tabla existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'crm' AND table_name = 'usuario_perfil') THEN
        
        -- Agregar campo DNI si no existe
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'crm' AND table_name = 'usuario_perfil' AND column_name = 'dni') THEN
            ALTER TABLE crm.usuario_perfil ADD COLUMN dni VARCHAR(8);
            RAISE NOTICE 'Campo dni agregado a crm.usuario_perfil';
        ELSE
            RAISE NOTICE 'Campo dni ya existe en crm.usuario_perfil';
        END IF;
        
        -- Crear índice si no existe
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'crm' AND tablename = 'usuario_perfil' AND indexname = 'idx_usuario_perfil_dni') THEN
            CREATE INDEX idx_usuario_perfil_dni ON crm.usuario_perfil(dni);
            RAISE NOTICE 'Índice idx_usuario_perfil_dni creado';
        ELSE
            RAISE NOTICE 'Índice idx_usuario_perfil_dni ya existe';
        END IF;
        
        -- Agregar comentario
        COMMENT ON COLUMN crm.usuario_perfil.dni IS 'DNI del usuario para autenticación de vendedores';
        RAISE NOTICE 'Comentario agregado al campo dni';
        
    ELSE
        RAISE NOTICE 'Tabla crm.usuario_perfil no existe. Ejecute primero las migraciones base.';
    END IF;
END $$;
