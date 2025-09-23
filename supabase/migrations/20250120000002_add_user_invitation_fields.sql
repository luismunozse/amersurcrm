    -- Agregar campos para sistema de invitaciones de usuarios
    ALTER TABLE crm.usuario_perfil 
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS password_temp TEXT,
    ADD COLUMN IF NOT EXISTS estado_registro TEXT DEFAULT 'activo' CHECK (estado_registro IN ('pendiente', 'activo', 'expirado'));

    -- Crear índice para búsquedas por email
    CREATE INDEX IF NOT EXISTS idx_usuario_perfil_email ON crm.usuario_perfil(email);

    -- Comentarios para documentación
    COMMENT ON COLUMN crm.usuario_perfil.email IS 'Email del usuario para invitaciones';
    COMMENT ON COLUMN crm.usuario_perfil.password_temp IS 'Contraseña temporal para el registro inicial';
    COMMENT ON COLUMN crm.usuario_perfil.estado_registro IS 'Estado del registro: pendiente, activo, expirado';
