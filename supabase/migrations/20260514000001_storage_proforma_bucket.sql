-- Bucket privado para PDFs de proforma compartidos por WhatsApp.
-- Acceso vía signed URL (server action). No público.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'proforma',
  'proforma',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Lectura/escritura: solo authenticated (las URLs públicas se generan vía signed URL)
DROP POLICY IF EXISTS "Autenticados pueden leer proforma" ON storage.objects;
CREATE POLICY "Autenticados pueden leer proforma"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'proforma');

DROP POLICY IF EXISTS "Autenticados pueden subir proforma" ON storage.objects;
CREATE POLICY "Autenticados pueden subir proforma"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'proforma');

DROP POLICY IF EXISTS "Autenticados pueden actualizar proforma" ON storage.objects;
CREATE POLICY "Autenticados pueden actualizar proforma"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'proforma');

DROP POLICY IF EXISTS "Service role gestiona proforma" ON storage.objects;
CREATE POLICY "Service role gestiona proforma"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'proforma')
WITH CHECK (bucket_id = 'proforma');
