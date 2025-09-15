-- Configuración de Supabase Storage para el CRM
-- Ejecutar en el SQL Editor de Supabase

-- Crear buckets para multimedia
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('lotes', 'lotes', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('renders', 'renders', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('planos', 'planos', true, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para el bucket 'lotes'
CREATE POLICY "Usuarios autenticados pueden subir fotos de lotes" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'lotes' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Usuarios autenticados pueden ver fotos de lotes" ON storage.objects
FOR SELECT USING (
  bucket_id = 'lotes' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Usuarios autenticados pueden eliminar fotos de lotes" ON storage.objects
FOR DELETE USING (
  bucket_id = 'lotes' AND 
  auth.role() = 'authenticated'
);

-- Políticas RLS para el bucket 'renders'
CREATE POLICY "Usuarios autenticados pueden subir renders" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'renders' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Usuarios autenticados pueden ver renders" ON storage.objects
FOR SELECT USING (
  bucket_id = 'renders' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Usuarios autenticados pueden eliminar renders" ON storage.objects
FOR DELETE USING (
  bucket_id = 'renders' AND 
  auth.role() = 'authenticated'
);

-- Políticas RLS para el bucket 'planos'
CREATE POLICY "Usuarios autenticados pueden subir planos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'planos' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Usuarios autenticados pueden ver planos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'planos' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Usuarios autenticados pueden eliminar planos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'planos' AND 
  auth.role() = 'authenticated'
);

-- Comentarios para documentar
COMMENT ON TABLE storage.buckets IS 'Buckets para almacenar multimedia del CRM';
COMMENT ON COLUMN storage.buckets.id IS 'Identificador único del bucket';
COMMENT ON COLUMN storage.buckets.name IS 'Nombre del bucket';
COMMENT ON COLUMN storage.buckets.public IS 'Si el bucket es público';
COMMENT ON COLUMN storage.buckets.file_size_limit IS 'Límite de tamaño de archivo en bytes';
COMMENT ON COLUMN storage.buckets.allowed_mime_types IS 'Tipos MIME permitidos';
