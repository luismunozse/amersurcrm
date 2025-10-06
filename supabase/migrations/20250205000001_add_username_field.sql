-- Migración: Agregar campo username a usuario_perfil
-- Fecha: 2025-02-05
-- Descripción: Agrega username como identificador único para usuarios en el sistema

DO $$
BEGIN
    -- Verificar que la tabla existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'crm' AND table_name = 'usuario_perfil') THEN

        -- Agregar campo username si no existe
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'crm' AND table_name = 'usuario_perfil' AND column_name = 'username') THEN
            ALTER TABLE crm.usuario_perfil ADD COLUMN username VARCHAR(50) UNIQUE;
            RAISE NOTICE 'Campo username agregado a crm.usuario_perfil';
        ELSE
            RAISE NOTICE 'Campo username ya existe en crm.usuario_perfil';
        END IF;

        -- Crear índice para búsquedas rápidas por username
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'crm' AND tablename = 'usuario_perfil' AND indexname = 'idx_usuario_perfil_username') THEN
            CREATE INDEX idx_usuario_perfil_username ON crm.usuario_perfil(username);
            RAISE NOTICE 'Índice idx_usuario_perfil_username creado';
        ELSE
            RAISE NOTICE 'Índice idx_usuario_perfil_username ya existe';
        END IF;

        -- Agregar comentario
        COMMENT ON COLUMN crm.usuario_perfil.username IS 'Nombre de usuario único para identificación en el sistema (ej: jperez, mlopez)';

        RAISE NOTICE 'Migración de username completada exitosamente';

    ELSE
        RAISE EXCEPTION 'Tabla crm.usuario_perfil no existe. Ejecute primero las migraciones base.';
    END IF;
END $$;

-- Nota: Los usernames para usuarios existentes deben generarse manualmente o con script
-- Formato sugerido: primera letra del nombre + apellido (ej: Juan Pérez -> jperez)
