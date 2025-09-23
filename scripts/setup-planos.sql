-- Script completo para configurar planos de proyectos
-- Ejecutar en Supabase SQL Editor

-- 1. Crear la tabla proyecto_planos
CREATE TABLE IF NOT EXISTS crm.proyecto_planos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES crm.proyecto(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  archivo_url TEXT NOT NULL,
  coordenadas JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear índices
CREATE INDEX IF NOT EXISTS idx_proyecto_planos_proyecto_id ON crm.proyecto_planos(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_proyecto_planos_created_by ON crm.proyecto_planos(created_by);

-- 3. Comentarios
COMMENT ON TABLE crm.proyecto_planos IS 'Planos de proyectos inmobiliarios';
COMMENT ON COLUMN crm.proyecto_planos.proyecto_id IS 'ID del proyecto al que pertenece el plano';
COMMENT ON COLUMN crm.proyecto_planos.nombre IS 'Nombre del archivo del plano';
COMMENT ON COLUMN crm.proyecto_planos.archivo_url IS 'URL del archivo del plano en storage';
COMMENT ON COLUMN crm.proyecto_planos.coordenadas IS 'Coordenadas que definen el área del plano en el mapa';
COMMENT ON COLUMN crm.proyecto_planos.created_by IS 'Usuario que creó el plano';

-- 4. Habilitar RLS
ALTER TABLE crm.proyecto_planos ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS
CREATE POLICY "Users can view project plans" ON crm.proyecto_planos
  FOR SELECT USING (true);

CREATE POLICY "Users can insert project plans" ON crm.proyecto_planos
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own project plans" ON crm.proyecto_planos
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own project plans" ON crm.proyecto_planos
  FOR DELETE USING (auth.uid() = created_by);

-- 6. Crear bucket de storage para planos
INSERT INTO storage.buckets (id, name, public)
VALUES ('planos', 'planos', true)
ON CONFLICT (id) DO NOTHING;

-- 7. Políticas para el bucket de planos
CREATE POLICY "Planos are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'planos');

CREATE POLICY "Authenticated users can upload planos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'planos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update own planos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'planos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own planos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'planos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Mensaje de confirmación
SELECT 'Configuración de planos completada exitosamente' as resultado;
