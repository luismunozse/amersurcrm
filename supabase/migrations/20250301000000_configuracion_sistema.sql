-- ===============================================================
-- Configuración del Sistema (Admin)
-- Crea tabla y políticas para administrar parámetros globales
-- ===============================================================

CREATE TABLE IF NOT EXISTS crm.configuracion_sistema (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),

  -- Identidad de la organización
  empresa_nombre TEXT NOT NULL DEFAULT 'AMERSUR Inmobiliaria',
  moneda_principal VARCHAR(3) NOT NULL DEFAULT 'PEN',
  zona_horaria TEXT NOT NULL DEFAULT 'America/Lima',
  idioma VARCHAR(5) NOT NULL DEFAULT 'es',

  -- Comisiones de referencia
  comision_lote NUMERIC(5,2) NOT NULL DEFAULT 0,
  comision_casa NUMERIC(5,2) NOT NULL DEFAULT 0,
  comision_alquiler NUMERIC(5,2) NOT NULL DEFAULT 0,

  -- Preferencias de notificación
  notificaciones_email BOOLEAN NOT NULL DEFAULT true,
  notificaciones_push BOOLEAN NOT NULL DEFAULT true,
  notificaciones_recordatorios BOOLEAN NOT NULL DEFAULT true,

  -- Campos personalizados
  campos_cliente JSONB NOT NULL DEFAULT '[]'::jsonb,
  campos_propiedad JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Integraciones
  whatsapp_token TEXT,
  whatsapp_token_updated_at TIMESTAMPTZ,
  whatsapp_token_set_by UUID REFERENCES auth.users(id),

  smtp_host TEXT,
  smtp_host_updated_at TIMESTAMPTZ,
  smtp_host_set_by UUID REFERENCES auth.users(id),

  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE crm.configuracion_sistema IS 'Parámetros globales del CRM gestionados por administradores';
COMMENT ON COLUMN crm.configuracion_sistema.campos_cliente IS 'Lista de campos personalizados para fichas de clientes';
COMMENT ON COLUMN crm.configuracion_sistema.campos_propiedad IS 'Lista de campos personalizados para propiedades';
COMMENT ON COLUMN crm.configuracion_sistema.whatsapp_token IS 'Token de acceso a WhatsApp Cloud API (se almacena sin exponer en UI)';
COMMENT ON COLUMN crm.configuracion_sistema.smtp_host IS 'Host o conexión SMTP utilizada para notificaciones por correo';

-- Garantiza al menos una fila
INSERT INTO crm.configuracion_sistema (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Trigger para updated_at
CREATE TRIGGER configuracion_sistema_set_updated_at
  BEFORE UPDATE ON crm.configuracion_sistema
  FOR EACH ROW
  EXECUTE FUNCTION crm.set_updated_at();

-- ===============================================================
-- Políticas de seguridad
-- ===============================================================
ALTER TABLE crm.configuracion_sistema ENABLE ROW LEVEL SECURITY;

CREATE POLICY configuracion_admin_select
  ON crm.configuracion_sistema
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM crm.usuario_perfil up
      JOIN crm.rol r ON r.id = up.rol_id
      WHERE up.id = auth.uid()
        AND r.nombre = 'ROL_ADMIN'
    )
  );

CREATE POLICY configuracion_admin_insert
  ON crm.configuracion_sistema
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM crm.usuario_perfil up
      JOIN crm.rol r ON r.id = up.rol_id
      WHERE up.id = auth.uid()
        AND r.nombre = 'ROL_ADMIN'
    )
  );

CREATE POLICY configuracion_admin_update
  ON crm.configuracion_sistema
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM crm.usuario_perfil up
      JOIN crm.rol r ON r.id = up.rol_id
      WHERE up.id = auth.uid()
        AND r.nombre = 'ROL_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM crm.usuario_perfil up
      JOIN crm.rol r ON r.id = up.rol_id
      WHERE up.id = auth.uid()
        AND r.nombre = 'ROL_ADMIN'
    )
  );

