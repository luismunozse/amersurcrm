-- Mejoras al módulo de usuarios: auditoría, soft delete, historial de cambios, firma digital
-- Fecha: 2026-02-24

-- ============================================================
-- 1. Tabla de auditoría de operaciones admin sobre usuarios
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'crm' AND table_name = 'auditoria_usuarios'
  ) THEN
    CREATE TABLE crm.auditoria_usuarios (
      id BIGSERIAL PRIMARY KEY,
      admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      admin_nombre TEXT NOT NULL,
      usuario_id UUID,
      usuario_nombre TEXT NOT NULL,
      accion TEXT NOT NULL,
      detalles JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX idx_auditoria_usuarios_admin_id ON crm.auditoria_usuarios(admin_id);
    CREATE INDEX idx_auditoria_usuarios_usuario_id ON crm.auditoria_usuarios(usuario_id);
    CREATE INDEX idx_auditoria_usuarios_created_at ON crm.auditoria_usuarios(created_at DESC);
  END IF;
END $$;

-- ============================================================
-- 2. Columnas de soft delete en usuario_perfil
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'crm' AND table_name = 'usuario_perfil' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE crm.usuario_perfil ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'crm' AND table_name = 'usuario_perfil' AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE crm.usuario_perfil ADD COLUMN deleted_by UUID DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'crm' AND table_name = 'usuario_perfil' AND column_name = 'deleted_motivo'
  ) THEN
    ALTER TABLE crm.usuario_perfil ADD COLUMN deleted_motivo TEXT DEFAULT NULL;
  END IF;
END $$;

-- Índice para filtrar soft-deleted
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'crm' AND indexname = 'idx_usuario_perfil_deleted_at'
  ) THEN
    CREATE INDEX idx_usuario_perfil_deleted_at ON crm.usuario_perfil(deleted_at)
      WHERE deleted_at IS NULL;
  END IF;
END $$;

-- ============================================================
-- 3. Tabla de historial de cambios de usuario
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'crm' AND table_name = 'historial_cambios_usuario'
  ) THEN
    CREATE TABLE crm.historial_cambios_usuario (
      id BIGSERIAL PRIMARY KEY,
      usuario_id UUID NOT NULL,
      campo TEXT NOT NULL,
      valor_anterior TEXT,
      valor_nuevo TEXT,
      modificado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX idx_historial_cambios_usuario_lookup
      ON crm.historial_cambios_usuario(usuario_id, created_at DESC);
  END IF;
END $$;

-- ============================================================
-- 4. Columna firma_url en usuario_perfil
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'crm' AND table_name = 'usuario_perfil' AND column_name = 'firma_url'
  ) THEN
    ALTER TABLE crm.usuario_perfil ADD COLUMN firma_url TEXT DEFAULT NULL;
  END IF;
END $$;

-- ============================================================
-- 5. Grants para el rol authenticated
-- ============================================================
GRANT SELECT, INSERT ON crm.auditoria_usuarios TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE crm.auditoria_usuarios_id_seq TO authenticated;

GRANT SELECT, INSERT ON crm.historial_cambios_usuario TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE crm.historial_cambios_usuario_id_seq TO authenticated;

-- ============================================================
-- 6. RLS Policies
-- ============================================================

-- Auditoría: solo admins pueden ver y crear
ALTER TABLE crm.auditoria_usuarios ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'crm' AND tablename = 'auditoria_usuarios' AND policyname = 'Admins pueden ver auditoria'
  ) THEN
    CREATE POLICY "Admins pueden ver auditoria" ON crm.auditoria_usuarios
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM crm.usuario_perfil up
          JOIN crm.rol r ON up.rol_id = r.id
          WHERE up.id = auth.uid() AND r.nombre = 'ROL_ADMIN'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'crm' AND tablename = 'auditoria_usuarios' AND policyname = 'Admins pueden crear auditoria'
  ) THEN
    CREATE POLICY "Admins pueden crear auditoria" ON crm.auditoria_usuarios
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM crm.usuario_perfil up
          JOIN crm.rol r ON up.rol_id = r.id
          WHERE up.id = auth.uid() AND r.nombre = 'ROL_ADMIN'
        )
      );
  END IF;
END $$;

-- Historial de cambios: solo admins pueden ver y crear
ALTER TABLE crm.historial_cambios_usuario ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'crm' AND tablename = 'historial_cambios_usuario' AND policyname = 'Admins pueden ver historial cambios'
  ) THEN
    CREATE POLICY "Admins pueden ver historial cambios" ON crm.historial_cambios_usuario
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM crm.usuario_perfil up
          JOIN crm.rol r ON up.rol_id = r.id
          WHERE up.id = auth.uid() AND r.nombre = 'ROL_ADMIN'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'crm' AND tablename = 'historial_cambios_usuario' AND policyname = 'Admins pueden crear historial cambios'
  ) THEN
    CREATE POLICY "Admins pueden crear historial cambios" ON crm.historial_cambios_usuario
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM crm.usuario_perfil up
          JOIN crm.rol r ON up.rol_id = r.id
          WHERE up.id = auth.uid() AND r.nombre = 'ROL_ADMIN'
        )
      );
  END IF;
END $$;

-- Grants para service_role (bypasea RLS pero necesita permisos de tabla)
GRANT ALL ON crm.auditoria_usuarios TO service_role;
GRANT ALL ON SEQUENCE crm.auditoria_usuarios_id_seq TO service_role;
GRANT ALL ON crm.historial_cambios_usuario TO service_role;
GRANT ALL ON SEQUENCE crm.historial_cambios_usuario_id_seq TO service_role;
