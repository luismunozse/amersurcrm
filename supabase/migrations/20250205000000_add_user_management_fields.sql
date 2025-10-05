-- Migración: Agregar campos para gestión de usuarios
-- Fecha: 2025-02-05
-- Descripción: Agrega campos para rastrear motivo de cambios de estado y contraseñas temporales

DO $$
BEGIN
    -- Verificar que la tabla existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'crm' AND table_name = 'usuario_perfil') THEN

        -- Agregar campo motivo_estado si no existe
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'crm' AND table_name = 'usuario_perfil' AND column_name = 'motivo_estado') THEN
            ALTER TABLE crm.usuario_perfil ADD COLUMN motivo_estado TEXT;
            RAISE NOTICE 'Campo motivo_estado agregado a crm.usuario_perfil';
        ELSE
            RAISE NOTICE 'Campo motivo_estado ya existe en crm.usuario_perfil';
        END IF;

        -- Agregar campo requiere_cambio_password si no existe
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'crm' AND table_name = 'usuario_perfil' AND column_name = 'requiere_cambio_password') THEN
            ALTER TABLE crm.usuario_perfil ADD COLUMN requiere_cambio_password BOOLEAN DEFAULT false;
            RAISE NOTICE 'Campo requiere_cambio_password agregado a crm.usuario_perfil';
        ELSE
            RAISE NOTICE 'Campo requiere_cambio_password ya existe en crm.usuario_perfil';
        END IF;

        -- Agregar campo fecha_cambio_estado si no existe (útil para auditoría)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'crm' AND table_name = 'usuario_perfil' AND column_name = 'fecha_cambio_estado') THEN
            ALTER TABLE crm.usuario_perfil ADD COLUMN fecha_cambio_estado TIMESTAMP WITH TIME ZONE;
            RAISE NOTICE 'Campo fecha_cambio_estado agregado a crm.usuario_perfil';
        ELSE
            RAISE NOTICE 'Campo fecha_cambio_estado ya existe en crm.usuario_perfil';
        END IF;

        -- Crear índice para búsquedas por requiere_cambio_password
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'crm' AND tablename = 'usuario_perfil' AND indexname = 'idx_usuario_perfil_requiere_cambio_password') THEN
            CREATE INDEX idx_usuario_perfil_requiere_cambio_password ON crm.usuario_perfil(requiere_cambio_password);
            RAISE NOTICE 'Índice idx_usuario_perfil_requiere_cambio_password creado';
        ELSE
            RAISE NOTICE 'Índice idx_usuario_perfil_requiere_cambio_password ya existe';
        END IF;

        -- Agregar comentarios para documentación
        COMMENT ON COLUMN crm.usuario_perfil.motivo_estado IS 'Motivo del último cambio de estado del usuario (activación/desactivación)';
        COMMENT ON COLUMN crm.usuario_perfil.requiere_cambio_password IS 'Indica si el usuario debe cambiar su contraseña en el próximo inicio de sesión';
        COMMENT ON COLUMN crm.usuario_perfil.fecha_cambio_estado IS 'Fecha y hora del último cambio de estado del usuario';

        RAISE NOTICE 'Migración completada exitosamente';

    ELSE
        RAISE EXCEPTION 'Tabla crm.usuario_perfil no existe. Ejecute primero las migraciones base.';
    END IF;
END $$;
