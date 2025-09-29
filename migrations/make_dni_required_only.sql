-- Migración simple para hacer DNI obligatorio
-- Fecha: 2025-01-20
-- Descripción: Hace el campo DNI obligatorio ya que no hay valores NULL

-- Verificar que la tabla existe antes de modificarla
DO $$
BEGIN
    -- Verificar si la tabla existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'crm' AND table_name = 'usuario_perfil') THEN
        
        -- Hacer el campo DNI obligatorio
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
        RAISE NOTICE 'Tabla crm.usuario_perfil no existe. Ejecute primero las migraciones base.';
    END IF;
END $$;
