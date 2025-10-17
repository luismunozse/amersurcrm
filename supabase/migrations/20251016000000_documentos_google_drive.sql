-- =====================================================
-- SISTEMA DE DOCUMENTOS CON GOOGLE DRIVE
-- =====================================================

-- Tabla: carpeta_documento
-- Organiza documentos en carpetas sincronizadas con Google Drive
CREATE TABLE IF NOT EXISTS crm.carpeta_documento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  carpeta_padre_id UUID REFERENCES crm.carpeta_documento(id) ON DELETE CASCADE,
  google_drive_folder_id VARCHAR(255), -- ID de la carpeta en Google Drive
  color VARCHAR(50) DEFAULT 'blue', -- Color para UI
  icono VARCHAR(50) DEFAULT 'folder', -- Icono para UI
  posicion INTEGER DEFAULT 0, -- Orden de visualización
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabla: documento
-- Almacena referencias a documentos (pueden estar en Supabase Storage o Google Drive)
CREATE TABLE IF NOT EXISTS crm.documento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(500) NOT NULL,
  descripcion TEXT,
  carpeta_id UUID REFERENCES crm.carpeta_documento(id) ON DELETE CASCADE,

  -- Tipo de almacenamiento
  storage_tipo VARCHAR(50) NOT NULL CHECK (storage_tipo IN ('supabase', 'google_drive', 'externo')),

  -- Para Supabase Storage
  supabase_path TEXT,
  supabase_bucket VARCHAR(255) DEFAULT 'documentos',

  -- Para Google Drive
  google_drive_file_id VARCHAR(255),
  google_drive_web_view_link TEXT,
  google_drive_download_link TEXT,

  -- Para enlaces externos
  url_externo TEXT,

  -- Metadatos del archivo
  tipo_mime VARCHAR(255),
  extension VARCHAR(50),
  tamano_bytes BIGINT,

  -- Categorización
  tipo_documento VARCHAR(100), -- 'contrato', 'escritura', 'plano', 'foto', 'legal', etc.
  tags TEXT[], -- Array de etiquetas

  -- Relaciones con entidades
  proyecto_id UUID REFERENCES crm.proyecto(id) ON DELETE SET NULL,
  lote_id UUID REFERENCES crm.lote(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES crm.cliente(id) ON DELETE SET NULL,

  -- Control de acceso
  es_publico BOOLEAN DEFAULT FALSE,
  compartido_con UUID[], -- Array de user IDs

  -- Versionamiento
  version INTEGER DEFAULT 1,
  documento_version_anterior_id UUID REFERENCES crm.documento(id) ON DELETE SET NULL,

  -- Sincronización
  sincronizado_google_drive BOOLEAN DEFAULT FALSE,
  ultima_sincronizacion_at TIMESTAMP WITH TIME ZONE,
  sync_error TEXT,

  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Tabla: documento_actividad
-- Log de actividades sobre documentos
CREATE TABLE IF NOT EXISTS crm.documento_actividad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID REFERENCES crm.documento(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES auth.users(id),
  accion VARCHAR(100) NOT NULL, -- 'subido', 'descargado', 'eliminado', 'compartido', 'editado'
  detalles JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: google_drive_sync_config
-- Configuración de sincronización con Google Drive
CREATE TABLE IF NOT EXISTS crm.google_drive_sync_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,

  -- Credenciales OAuth
  client_id VARCHAR(500),
  client_secret VARCHAR(500),
  refresh_token TEXT,
  access_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,

  -- Configuración de carpeta raíz
  root_folder_id VARCHAR(255),
  root_folder_name VARCHAR(255),

  -- Configuración de sincronización
  auto_sync BOOLEAN DEFAULT FALSE,
  sync_interval_minutes INTEGER DEFAULT 60,
  ultima_sincronizacion_at TIMESTAMP WITH TIME ZONE,

  -- Estado
  activo BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_carpeta_documento_padre ON crm.carpeta_documento(carpeta_padre_id);
CREATE INDEX IF NOT EXISTS idx_carpeta_documento_google_id ON crm.carpeta_documento(google_drive_folder_id);

CREATE INDEX IF NOT EXISTS idx_documento_carpeta ON crm.documento(carpeta_id);
CREATE INDEX IF NOT EXISTS idx_documento_proyecto ON crm.documento(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_documento_lote ON crm.documento(lote_id);
CREATE INDEX IF NOT EXISTS idx_documento_cliente ON crm.documento(cliente_id);
CREATE INDEX IF NOT EXISTS idx_documento_google_id ON crm.documento(google_drive_file_id);
CREATE INDEX IF NOT EXISTS idx_documento_tipo ON crm.documento(tipo_documento);
CREATE INDEX IF NOT EXISTS idx_documento_tags ON crm.documento USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_documento_created_at ON crm.documento(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_documento_actividad_documento ON crm.documento_actividad(documento_id);
CREATE INDEX IF NOT EXISTS idx_documento_actividad_usuario ON crm.documento_actividad(usuario_id);
CREATE INDEX IF NOT EXISTS idx_documento_actividad_created ON crm.documento_actividad(created_at DESC);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION crm.update_documento_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_carpeta_documento_updated_at
  BEFORE UPDATE ON crm.carpeta_documento
  FOR EACH ROW
  EXECUTE FUNCTION crm.update_documento_updated_at();

CREATE TRIGGER trigger_documento_updated_at
  BEFORE UPDATE ON crm.documento
  FOR EACH ROW
  EXECUTE FUNCTION crm.update_documento_updated_at();

-- RLS Policies
ALTER TABLE crm.carpeta_documento ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.documento ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.documento_actividad ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.google_drive_sync_config ENABLE ROW LEVEL SECURITY;

-- Policy: Todos pueden ver carpetas
CREATE POLICY "Usuarios autenticados pueden ver carpetas"
  ON crm.carpeta_documento FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Solo admins pueden crear/editar carpetas
CREATE POLICY "Solo admins pueden gestionar carpetas"
  ON crm.carpeta_documento FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm.usuario_perfil up
      JOIN crm.rol r ON up.rol_id = r.id
      WHERE up.id = auth.uid() AND r.nombre = 'ROL_ADMIN'
    )
  );

-- Policy: Ver documentos públicos o propios o compartidos
CREATE POLICY "Ver documentos permitidos"
  ON crm.documento FOR SELECT
  TO authenticated
  USING (
    es_publico = true
    OR created_by = auth.uid()
    OR auth.uid() = ANY(compartido_con)
    OR EXISTS (
      SELECT 1 FROM crm.usuario_perfil up
      JOIN crm.rol r ON up.rol_id = r.id
      WHERE up.id = auth.uid() AND r.nombre = 'ROL_ADMIN'
    )
  );

-- Policy: Crear documentos (autenticados)
CREATE POLICY "Usuarios pueden crear documentos"
  ON crm.documento FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Policy: Editar solo documentos propios o ser admin
CREATE POLICY "Editar documentos propios o admin"
  ON crm.documento FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM crm.usuario_perfil up
      JOIN crm.rol r ON up.rol_id = r.id
      WHERE up.id = auth.uid() AND r.nombre = 'ROL_ADMIN'
    )
  );

-- Policy: Eliminar solo documentos propios o ser admin
CREATE POLICY "Eliminar documentos propios o admin"
  ON crm.documento FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM crm.usuario_perfil up
      JOIN crm.rol r ON up.rol_id = r.id
      WHERE up.id = auth.uid() AND r.nombre = 'ROL_ADMIN'
    )
  );

-- Policy: Actividades visibles para involucrados
CREATE POLICY "Ver actividades de documentos permitidos"
  ON crm.documento_actividad FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm.documento d
      WHERE d.id = documento_id
      AND (
        d.es_publico = true
        OR d.created_by = auth.uid()
        OR auth.uid() = ANY(d.compartido_con)
      )
    )
  );

-- Policy: Solo admins gestionan configuración de sync
CREATE POLICY "Solo admins gestionan sync config"
  ON crm.google_drive_sync_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm.usuario_perfil up
      JOIN crm.rol r ON up.rol_id = r.id
      WHERE up.id = auth.uid() AND r.nombre = 'ROL_ADMIN'
    )
  );

-- Datos iniciales: Carpetas predefinidas
INSERT INTO crm.carpeta_documento (nombre, descripcion, color, icono, posicion) VALUES
  ('Contratos', 'Contratos de compra-venta y alquiler', 'green', 'file-text', 1),
  ('Escrituras', 'Escrituras públicas y documentos notariales', 'blue', 'file-signature', 2),
  ('Planos', 'Planos arquitectónicos y técnicos', 'purple', 'blueprint', 3),
  ('Fotos', 'Fotografías de propiedades', 'yellow', 'image', 4),
  ('Legal', 'Documentos legales y jurídicos', 'red', 'gavel', 5),
  ('Financiero', 'Documentos financieros y contables', 'orange', 'dollar-sign', 6),
  ('Marketing', 'Material de marketing y publicidad', 'pink', 'megaphone', 7),
  ('Clientes', 'Documentos de clientes', 'indigo', 'users', 8)
ON CONFLICT DO NOTHING;

-- Comentarios
COMMENT ON TABLE crm.carpeta_documento IS 'Carpetas para organizar documentos, sincronizables con Google Drive';
COMMENT ON TABLE crm.documento IS 'Documentos del CRM almacenados en Supabase Storage, Google Drive o enlaces externos';
COMMENT ON TABLE crm.documento_actividad IS 'Log de actividades sobre documentos (auditoría)';
COMMENT ON TABLE crm.google_drive_sync_config IS 'Configuración de OAuth y sincronización con Google Drive';

COMMENT ON COLUMN crm.documento.storage_tipo IS 'Tipo: supabase, google_drive, externo';
COMMENT ON COLUMN crm.documento.tipo_documento IS 'Categoría: contrato, escritura, plano, foto, legal, financiero, marketing';
COMMENT ON COLUMN crm.documento.version IS 'Número de versión del documento (para control de versiones)';
