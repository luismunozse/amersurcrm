-- Agregar columna ultimo_acceso a usuario_perfil
-- Registra la última vez que el usuario navegó en el dashboard (más preciso que last_sign_in_at de Auth)
-- Fecha: 2026-02-25

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'crm' AND table_name = 'usuario_perfil' AND column_name = 'ultimo_acceso'
  ) THEN
    ALTER TABLE crm.usuario_perfil ADD COLUMN ultimo_acceso TIMESTAMPTZ DEFAULT NULL;

    -- Índice para ordenamiento server-side por último acceso
    CREATE INDEX idx_usuario_perfil_ultimo_acceso ON crm.usuario_perfil(ultimo_acceso DESC NULLS LAST);
  END IF;
END $$;
