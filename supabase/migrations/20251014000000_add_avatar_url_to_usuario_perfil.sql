-- Migración: Agregar campo avatar_url a usuario_perfil
-- Fecha: 2025-10-14
-- Descripción: Añade soporte para fotos de perfil usando Supabase Storage

-- Agregar columna avatar_url si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'crm'
    AND table_name = 'usuario_perfil'
    AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE crm.usuario_perfil
    ADD COLUMN avatar_url TEXT;

    COMMENT ON COLUMN crm.usuario_perfil.avatar_url IS 'URL de la foto de perfil del usuario (Supabase Storage)';
  END IF;
END $$;

-- Crear bucket de storage para avatares si no existe (ejecutar en Supabase Dashboard)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('avatars', 'avatars', true)
-- ON CONFLICT (id) DO NOTHING;

-- Políticas de RLS para el bucket avatars (ejecutar en Supabase Dashboard)
-- CREATE POLICY "Avatar images are publicly accessible"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'avatars');

-- CREATE POLICY "Users can upload their own avatar"
-- ON storage.objects FOR INSERT
-- WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can update their own avatar"
-- ON storage.objects FOR UPDATE
-- USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can delete their own avatar"
-- ON storage.objects FOR DELETE
-- USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
