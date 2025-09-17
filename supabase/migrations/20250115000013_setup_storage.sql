-- =========================================
-- Configuración de Storage para Imágenes
-- =========================================

-- Crear bucket para imágenes de proyectos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'imagenes',
  'imagenes',
  true,
  5242880, -- 5MB en bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir lectura pública de imágenes
DROP POLICY IF EXISTS "Imágenes públicas son visibles para todos" ON storage.objects;
CREATE POLICY "Imágenes públicas son visibles para todos"
ON storage.objects FOR SELECT
USING (bucket_id = 'imagenes');

-- Política para permitir subida de imágenes solo a usuarios autenticados
DROP POLICY IF EXISTS "Usuarios autenticados pueden subir imágenes" ON storage.objects;
CREATE POLICY "Usuarios autenticados pueden subir imágenes"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'imagenes' 
  AND auth.role() = 'authenticated'
);

-- Política para permitir actualización de imágenes solo al propietario
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propias imágenes" ON storage.objects;
CREATE POLICY "Usuarios pueden actualizar sus propias imágenes"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'imagenes' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para permitir eliminación de imágenes solo al propietario
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propias imágenes" ON storage.objects;
CREATE POLICY "Usuarios pueden eliminar sus propias imágenes"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'imagenes' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
