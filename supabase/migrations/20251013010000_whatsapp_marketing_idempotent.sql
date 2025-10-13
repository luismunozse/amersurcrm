-- =====================================================
-- WHATSAPP MARKETING SYSTEM - MIGRACIÓN IDEMPOTENTE
-- Sistema completo de WhatsApp Cloud API integrado con CRM
-- Esta migración puede ejecutarse múltiples veces sin errores
-- =====================================================

-- =====================================================
-- PASO 1: ELIMINAR TODO LO EXISTENTE (si existe)
-- =====================================================

-- Deshabilitar RLS temporalmente
ALTER TABLE IF EXISTS crm.marketing_channel_credential DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS crm.marketing_template DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS crm.marketing_audiencia DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS crm.marketing_campana DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS crm.marketing_conversacion DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS crm.marketing_mensaje DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS crm.marketing_automatizacion DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS crm.marketing_automatizacion_ejecucion DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS crm.marketing_event_log DISABLE ROW LEVEL SECURITY;

-- Eliminar políticas RLS existentes
DROP POLICY IF EXISTS marketing_admin_all ON crm.marketing_channel_credential;
DROP POLICY IF EXISTS marketing_template_admin_all ON crm.marketing_template;
DROP POLICY IF EXISTS marketing_audiencia_admin_all ON crm.marketing_audiencia;
DROP POLICY IF EXISTS marketing_campana_admin_all ON crm.marketing_campana;
DROP POLICY IF EXISTS marketing_automatizacion_admin_all ON crm.marketing_automatizacion;
DROP POLICY IF EXISTS marketing_conversacion_vendedor_select ON crm.marketing_conversacion;
DROP POLICY IF EXISTS marketing_conversacion_vendedor_update ON crm.marketing_conversacion;
DROP POLICY IF EXISTS marketing_mensaje_vendedor_select ON crm.marketing_mensaje;
DROP POLICY IF EXISTS marketing_event_log_admin_select ON crm.marketing_event_log;

-- Eliminar triggers
DROP TRIGGER IF EXISTS trigger_actualizar_sesion_whatsapp ON crm.marketing_mensaje;

-- Eliminar funciones
DROP FUNCTION IF EXISTS crm.actualizar_sesion_whatsapp() CASCADE;
DROP FUNCTION IF EXISTS crm.cerrar_sesiones_expiradas() CASCADE;
DROP FUNCTION IF EXISTS crm.normalizar_telefono_e164(TEXT, TEXT) CASCADE;

-- Eliminar tablas en orden inverso de dependencias
DROP TABLE IF EXISTS crm.marketing_event_log CASCADE;
DROP TABLE IF EXISTS crm.marketing_automatizacion_ejecucion CASCADE;
DROP TABLE IF EXISTS crm.marketing_automatizacion CASCADE;
DROP TABLE IF EXISTS crm.marketing_mensaje CASCADE;
DROP TABLE IF EXISTS crm.marketing_conversacion CASCADE;
DROP TABLE IF EXISTS crm.marketing_campana CASCADE;
DROP TABLE IF EXISTS crm.marketing_audiencia CASCADE;
DROP TABLE IF EXISTS crm.marketing_template CASCADE;
DROP TABLE IF EXISTS crm.marketing_channel_credential CASCADE;

-- =====================================================
-- PASO 2: CREAR TABLAS NUEVAS
-- =====================================================

-- 1. CREDENCIALES DE CANAL (WhatsApp Cloud API)
-- =====================================================
CREATE TABLE crm.marketing_channel_credential (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canal_tipo VARCHAR(50) NOT NULL DEFAULT 'whatsapp',
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,

  -- Credenciales WhatsApp Cloud API
  app_id VARCHAR(255),
  phone_number_id VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  webhook_verify_token VARCHAR(255) NOT NULL,

  -- Configuración
  activo BOOLEAN DEFAULT true,
  es_sandbox BOOLEAN DEFAULT false,

  -- Rate limits
  max_messages_per_second INTEGER DEFAULT 15,
  max_messages_per_day INTEGER DEFAULT 10000,

  -- Auditoría
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_marketing_channel_credential_activo ON crm.marketing_channel_credential(activo);

-- 2. PLANTILLAS DE MENSAJES (Message Templates)
-- =====================================================
CREATE TABLE crm.marketing_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL UNIQUE,
  categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('MARKETING', 'UTILITY', 'AUTHENTICATION')),
  idioma VARCHAR(10) NOT NULL DEFAULT 'es_AR',

  -- Contenido
  header_tipo VARCHAR(20) CHECK (header_tipo IN ('TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'NONE')),
  header_contenido TEXT,
  body_texto TEXT NOT NULL,
  footer_texto TEXT,

  -- Variables (JSON array de nombres de variables)
  variables JSONB DEFAULT '[]'::jsonb,

  -- Botones (JSON array de botones)
  botones JSONB DEFAULT '[]'::jsonb,

  -- Estado en WhatsApp
  whatsapp_template_id VARCHAR(255),
  estado_aprobacion VARCHAR(50) DEFAULT 'DRAFT' CHECK (estado_aprobacion IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PAUSED')),
  motivo_rechazo TEXT,
  fecha_aprobacion TIMESTAMPTZ,

  -- Metadatos
  objetivo VARCHAR(100),
  tags TEXT[],
  activo BOOLEAN DEFAULT true,

  -- Auditoría
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_marketing_template_categoria ON crm.marketing_template(categoria);
CREATE INDEX idx_marketing_template_estado ON crm.marketing_template(estado_aprobacion);
CREATE INDEX idx_marketing_template_activo ON crm.marketing_template(activo);

-- 3. AUDIENCIAS (Segmentos dinámicos)
-- =====================================================
CREATE TABLE crm.marketing_audiencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,

  -- Tipo de audiencia
  tipo VARCHAR(50) DEFAULT 'DINAMICO' CHECK (tipo IN ('DINAMICO', 'ESTATICO')),

  -- Filtros (JSON con reglas de segmentación)
  filtros JSONB DEFAULT '{}'::jsonb,

  -- Si es estática, lista de contactos
  contactos_ids UUID[],

  -- Cache de tamaño (actualizado periódicamente)
  contactos_count INTEGER DEFAULT 0,
  ultima_actualizacion TIMESTAMPTZ,

  -- Metadatos
  activo BOOLEAN DEFAULT true,

  -- Auditoría
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_marketing_audiencia_activo ON crm.marketing_audiencia(activo);

-- 4. CAMPAÑAS
-- =====================================================
CREATE TABLE crm.marketing_campana (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,

  -- Configuración
  template_id UUID REFERENCES crm.marketing_template(id) ON DELETE RESTRICT,
  audiencia_id UUID REFERENCES crm.marketing_audiencia(id) ON DELETE RESTRICT,
  credential_id UUID REFERENCES crm.marketing_channel_credential(id) ON DELETE RESTRICT,

  -- Variables globales para la plantilla
  variables_valores JSONB DEFAULT '{}'::jsonb,

  -- Objetivo y tracking
  objetivo VARCHAR(100),
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),

  -- Scheduling
  fecha_inicio TIMESTAMPTZ,
  fecha_fin TIMESTAMPTZ,
  enviar_inmediatamente BOOLEAN DEFAULT false,

  -- Rate limiting
  max_envios_por_segundo INTEGER DEFAULT 10,

  -- A/B Testing
  es_ab_test BOOLEAN DEFAULT false,
  ab_porcentaje_muestra INTEGER,
  ab_variante_ganadora UUID,

  -- Estado
  estado VARCHAR(50) DEFAULT 'DRAFT' CHECK (estado IN ('DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED')),

  -- Métricas
  total_enviados INTEGER DEFAULT 0,
  total_entregados INTEGER DEFAULT 0,
  total_leidos INTEGER DEFAULT 0,
  total_respondidos INTEGER DEFAULT 0,
  total_conversiones INTEGER DEFAULT 0,
  total_fallidos INTEGER DEFAULT 0,

  -- Auditoría
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completado_at TIMESTAMPTZ
);

CREATE INDEX idx_marketing_campana_estado ON crm.marketing_campana(estado);
CREATE INDEX idx_marketing_campana_fecha_inicio ON crm.marketing_campana(fecha_inicio);

-- 5. CONVERSACIONES
-- =====================================================
CREATE TABLE crm.marketing_conversacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contacto
  cliente_id UUID REFERENCES crm.cliente(id) ON DELETE CASCADE,
  telefono VARCHAR(20) NOT NULL,

  -- Canal
  credential_id UUID REFERENCES crm.marketing_channel_credential(id),

  -- Estado
  estado VARCHAR(50) DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA', 'CERRADA', 'ARCHIVADA')),

  -- Asignación (username del vendedor - sin FK para evitar problemas de tipo)
  vendedor_asignado VARCHAR(50),
  fecha_asignacion TIMESTAMPTZ,

  -- Sesión de 24h
  is_session_open BOOLEAN DEFAULT false,
  session_expires_at TIMESTAMPTZ,

  -- Timestamps
  last_inbound_at TIMESTAMPTZ,
  last_outbound_at TIMESTAMPTZ,
  first_message_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,

  -- Métricas
  total_mensajes_in INTEGER DEFAULT 0,
  total_mensajes_out INTEGER DEFAULT 0,
  tiempo_primera_respuesta_segundos INTEGER,

  -- Notas internas
  notas_internas TEXT,
  tags TEXT[],

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_marketing_conversacion_cliente ON crm.marketing_conversacion(cliente_id);
CREATE INDEX idx_marketing_conversacion_vendedor ON crm.marketing_conversacion(vendedor_asignado) WHERE vendedor_asignado IS NOT NULL;
CREATE INDEX idx_marketing_conversacion_estado ON crm.marketing_conversacion(estado);
CREATE INDEX idx_marketing_conversacion_session ON crm.marketing_conversacion(is_session_open) WHERE is_session_open = true;

-- 6. MENSAJES
-- =====================================================
CREATE TABLE crm.marketing_mensaje (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversacion_id UUID REFERENCES crm.marketing_conversacion(id) ON DELETE CASCADE,

  -- Dirección
  direccion VARCHAR(10) NOT NULL CHECK (direccion IN ('IN', 'OUT')),

  -- Tipo de mensaje
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('SESSION', 'TEMPLATE', 'INTERACTIVE')),

  -- Contenido
  contenido_tipo VARCHAR(20) DEFAULT 'TEXT' CHECK (contenido_tipo IN ('TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO', 'LOCATION', 'CONTACT')),
  contenido_texto TEXT,
  contenido_media_url TEXT,
  contenido_media_caption TEXT,

  -- Si es template
  template_id UUID REFERENCES crm.marketing_template(id),
  template_variables JSONB,

  -- Si es de campaña
  campana_id UUID REFERENCES crm.marketing_campana(id),

  -- WhatsApp IDs
  wa_message_id VARCHAR(255) UNIQUE,
  wa_conversation_id VARCHAR(255),

  -- Estado (solo para mensajes salientes)
  estado VARCHAR(50) DEFAULT 'PENDING' CHECK (estado IN ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED')),
  error_code VARCHAR(50),
  error_message TEXT,

  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_marketing_mensaje_conversacion ON crm.marketing_mensaje(conversacion_id);
CREATE INDEX idx_marketing_mensaje_campana ON crm.marketing_mensaje(campana_id);
CREATE INDEX idx_marketing_mensaje_wa_id ON crm.marketing_mensaje(wa_message_id);
CREATE INDEX idx_marketing_mensaje_estado ON crm.marketing_mensaje(estado);
CREATE INDEX idx_marketing_mensaje_direccion ON crm.marketing_mensaje(direccion);
CREATE INDEX idx_marketing_mensaje_created ON crm.marketing_mensaje(created_at DESC);

-- 7. AUTOMATIZACIONES (Journeys)
-- =====================================================
CREATE TABLE crm.marketing_automatizacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,

  -- Trigger
  trigger_evento VARCHAR(100) NOT NULL,

  -- Condiciones (JSON)
  condiciones JSONB DEFAULT '{}'::jsonb,

  -- Acciones (JSON array de pasos)
  acciones JSONB DEFAULT '[]'::jsonb,

  -- Estado
  activo BOOLEAN DEFAULT true,

  -- Métricas
  total_ejecutadas INTEGER DEFAULT 0,
  total_completadas INTEGER DEFAULT 0,

  -- Auditoría
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_marketing_automatizacion_activo ON crm.marketing_automatizacion(activo);
CREATE INDEX idx_marketing_automatizacion_trigger ON crm.marketing_automatizacion(trigger_evento);

-- 8. EJECUCIONES DE AUTOMATIZACIÓN
-- =====================================================
CREATE TABLE crm.marketing_automatizacion_ejecucion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automatizacion_id UUID REFERENCES crm.marketing_automatizacion(id) ON DELETE CASCADE,

  -- Contexto
  cliente_id UUID REFERENCES crm.cliente(id) ON DELETE CASCADE,
  conversacion_id UUID REFERENCES crm.marketing_conversacion(id),

  -- Estado
  estado VARCHAR(50) DEFAULT 'RUNNING' CHECK (estado IN ('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  paso_actual INTEGER DEFAULT 0,

  -- Resultados
  pasos_ejecutados JSONB DEFAULT '[]'::jsonb,
  error_mensaje TEXT,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  next_action_at TIMESTAMPTZ
);

CREATE INDEX idx_marketing_auto_ejecucion_estado ON crm.marketing_automatizacion_ejecucion(estado);
CREATE INDEX idx_marketing_auto_ejecucion_next_action ON crm.marketing_automatizacion_ejecucion(next_action_at) WHERE estado = 'RUNNING';

-- 9. EVENT LOG (Auditoría y debugging)
-- =====================================================
CREATE TABLE crm.marketing_event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_tipo VARCHAR(100) NOT NULL,

  -- Referencias
  conversacion_id UUID REFERENCES crm.marketing_conversacion(id),
  mensaje_id UUID REFERENCES crm.marketing_mensaje(id),
  campana_id UUID REFERENCES crm.marketing_campana(id),

  -- Payload
  payload JSONB,

  -- Resultado
  resultado VARCHAR(20) CHECK (resultado IN ('SUCCESS', 'ERROR', 'WARNING')),
  error_mensaje TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_marketing_event_log_tipo ON crm.marketing_event_log(evento_tipo);
CREATE INDEX idx_marketing_event_log_created ON crm.marketing_event_log(created_at DESC);

-- =====================================================
-- PASO 3: COLUMNAS DE WHATSAPP EN TABLA CLIENTE
-- =====================================================

-- Agregar columnas a tabla cliente (solo si no existen)
DO $$
BEGIN
  -- whatsapp_consentimiento
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'crm' AND table_name = 'cliente' AND column_name = 'whatsapp_consentimiento'
  ) THEN
    ALTER TABLE crm.cliente ADD COLUMN whatsapp_consentimiento BOOLEAN DEFAULT false;
  END IF;

  -- whatsapp_consentimiento_fecha
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'crm' AND table_name = 'cliente' AND column_name = 'whatsapp_consentimiento_fecha'
  ) THEN
    ALTER TABLE crm.cliente ADD COLUMN whatsapp_consentimiento_fecha TIMESTAMPTZ;
  END IF;

  -- whatsapp_opt_out
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'crm' AND table_name = 'cliente' AND column_name = 'whatsapp_opt_out'
  ) THEN
    ALTER TABLE crm.cliente ADD COLUMN whatsapp_opt_out BOOLEAN DEFAULT false;
  END IF;

  -- whatsapp_opt_out_fecha
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'crm' AND table_name = 'cliente' AND column_name = 'whatsapp_opt_out_fecha'
  ) THEN
    ALTER TABLE crm.cliente ADD COLUMN whatsapp_opt_out_fecha TIMESTAMPTZ;
  END IF;

  -- whatsapp_opt_out_motivo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'crm' AND table_name = 'cliente' AND column_name = 'whatsapp_opt_out_motivo'
  ) THEN
    ALTER TABLE crm.cliente ADD COLUMN whatsapp_opt_out_motivo TEXT;
  END IF;

  -- telefono_e164
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'crm' AND table_name = 'cliente' AND column_name = 'telefono_e164'
  ) THEN
    ALTER TABLE crm.cliente ADD COLUMN telefono_e164 VARCHAR(20);
  END IF;
END $$;

-- Crear índice (eliminando primero si existe)
DROP INDEX IF EXISTS crm.idx_cliente_whatsapp_consentimiento;
CREATE INDEX idx_cliente_whatsapp_consentimiento ON crm.cliente(whatsapp_consentimiento) WHERE whatsapp_consentimiento = true;

-- =====================================================
-- PASO 4: FUNCIONES DE UTILIDAD
-- =====================================================

-- Función para actualizar sesión de WhatsApp (24h)
CREATE OR REPLACE FUNCTION crm.actualizar_sesion_whatsapp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.direccion = 'IN' THEN
    UPDATE crm.marketing_conversacion
    SET
      is_session_open = true,
      session_expires_at = now() + interval '24 hours',
      last_inbound_at = now(),
      total_mensajes_in = total_mensajes_in + 1,
      updated_at = now()
    WHERE id = NEW.conversacion_id;
  ELSE
    UPDATE crm.marketing_conversacion
    SET
      last_outbound_at = now(),
      total_mensajes_out = total_mensajes_out + 1,
      updated_at = now()
    WHERE id = NEW.conversacion_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_sesion_whatsapp
  AFTER INSERT ON crm.marketing_mensaje
  FOR EACH ROW
  EXECUTE FUNCTION crm.actualizar_sesion_whatsapp();

-- Función para cerrar sesiones expiradas
CREATE OR REPLACE FUNCTION crm.cerrar_sesiones_expiradas()
RETURNS INTEGER AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  UPDATE crm.marketing_conversacion
  SET
    is_session_open = false,
    updated_at = now()
  WHERE
    is_session_open = true
    AND session_expires_at < now();

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected;
END;
$$ LANGUAGE plpgsql;

-- Función para normalizar teléfono a E.164
CREATE OR REPLACE FUNCTION crm.normalizar_telefono_e164(telefono TEXT, pais_codigo TEXT DEFAULT '+54')
RETURNS TEXT AS $$
BEGIN
  -- Remover espacios, guiones, paréntesis
  telefono := regexp_replace(telefono, '[^0-9+]', '', 'g');

  -- Si no empieza con +, agregar código de país
  IF NOT telefono LIKE '+%' THEN
    -- Si empieza con 0, removerlo (formato local argentino)
    IF telefono LIKE '0%' THEN
      telefono := substring(telefono from 2);
    END IF;

    telefono := pais_codigo || telefono;
  END IF;

  RETURN telefono;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- PASO 5: POLÍTICAS RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE crm.marketing_channel_credential ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.marketing_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.marketing_audiencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.marketing_campana ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.marketing_conversacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.marketing_mensaje ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.marketing_automatizacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.marketing_automatizacion_ejecucion ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.marketing_event_log ENABLE ROW LEVEL SECURITY;

-- Políticas para Admins (acceso total)
CREATE POLICY marketing_admin_all ON crm.marketing_channel_credential FOR ALL USING (
  EXISTS (
    SELECT 1 FROM crm.usuario_perfil up
    JOIN crm.rol r ON r.id = up.rol_id
    WHERE up.id = auth.uid() AND r.nombre = 'ROL_ADMIN'
  )
);

CREATE POLICY marketing_template_admin_all ON crm.marketing_template FOR ALL USING (
  EXISTS (
    SELECT 1 FROM crm.usuario_perfil up
    JOIN crm.rol r ON r.id = up.rol_id
    WHERE up.id = auth.uid() AND r.nombre = 'ROL_ADMIN'
  )
);

CREATE POLICY marketing_audiencia_admin_all ON crm.marketing_audiencia FOR ALL USING (
  EXISTS (
    SELECT 1 FROM crm.usuario_perfil up
    JOIN crm.rol r ON r.id = up.rol_id
    WHERE up.id = auth.uid() AND r.nombre = 'ROL_ADMIN'
  )
);

CREATE POLICY marketing_campana_admin_all ON crm.marketing_campana FOR ALL USING (
  EXISTS (
    SELECT 1 FROM crm.usuario_perfil up
    JOIN crm.rol r ON r.id = up.rol_id
    WHERE up.id = auth.uid() AND r.nombre = 'ROL_ADMIN'
  )
);

CREATE POLICY marketing_automatizacion_admin_all ON crm.marketing_automatizacion FOR ALL USING (
  EXISTS (
    SELECT 1 FROM crm.usuario_perfil up
    JOIN crm.rol r ON r.id = up.rol_id
    WHERE up.id = auth.uid() AND r.nombre = 'ROL_ADMIN'
  )
);

-- Políticas para Vendedores (solo sus conversaciones)
CREATE POLICY marketing_conversacion_vendedor_select ON crm.marketing_conversacion FOR SELECT USING (
  -- Vendedor asignado puede ver sus conversaciones
  (
    vendedor_asignado IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM crm.usuario_perfil up
      WHERE up.id = auth.uid()
        AND up.username::text = vendedor_asignado::text
    )
  )
  OR
  -- Admins, coordinadores y gerentes pueden ver todas
  EXISTS (
    SELECT 1 FROM crm.usuario_perfil up
    JOIN crm.rol r ON r.id = up.rol_id
    WHERE up.id = auth.uid()
      AND r.nombre IN ('ROL_ADMIN', 'ROL_COORDINADOR_VENTAS', 'ROL_GERENTE')
  )
);

CREATE POLICY marketing_conversacion_vendedor_update ON crm.marketing_conversacion FOR UPDATE USING (
  -- Vendedor asignado puede actualizar sus conversaciones
  (
    vendedor_asignado IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM crm.usuario_perfil up
      WHERE up.id = auth.uid()
        AND up.username::text = vendedor_asignado::text
    )
  )
  OR
  -- Admins, coordinadores y gerentes pueden actualizar todas
  EXISTS (
    SELECT 1 FROM crm.usuario_perfil up
    JOIN crm.rol r ON r.id = up.rol_id
    WHERE up.id = auth.uid()
      AND r.nombre IN ('ROL_ADMIN', 'ROL_COORDINADOR_VENTAS', 'ROL_GERENTE')
  )
);

CREATE POLICY marketing_mensaje_vendedor_select ON crm.marketing_mensaje FOR SELECT USING (
  -- Vendedor asignado puede ver mensajes de sus conversaciones
  EXISTS (
    SELECT 1
    FROM crm.marketing_conversacion c
    JOIN crm.usuario_perfil up ON up.username::text = c.vendedor_asignado::text
    WHERE c.id = marketing_mensaje.conversacion_id
      AND up.id = auth.uid()
      AND c.vendedor_asignado IS NOT NULL
  )
  OR
  -- Admins, coordinadores y gerentes pueden ver todos los mensajes
  EXISTS (
    SELECT 1 FROM crm.usuario_perfil up
    JOIN crm.rol r ON r.id = up.rol_id
    WHERE up.id = auth.uid()
      AND r.nombre IN ('ROL_ADMIN', 'ROL_COORDINADOR_VENTAS', 'ROL_GERENTE')
  )
);

-- Políticas para Event Log (solo lectura para admins)
CREATE POLICY marketing_event_log_admin_select ON crm.marketing_event_log FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM crm.usuario_perfil up
    JOIN crm.rol r ON r.id = up.rol_id
    WHERE up.id = auth.uid() AND r.nombre = 'ROL_ADMIN'
  )
);

-- =====================================================
-- PASO 6: COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE crm.marketing_channel_credential IS 'Credenciales de WhatsApp Cloud API para envío de mensajes';
COMMENT ON TABLE crm.marketing_template IS 'Plantillas de mensajes aprobadas por WhatsApp (Message Templates)';
COMMENT ON TABLE crm.marketing_audiencia IS 'Segmentos de clientes para campañas y automatizaciones';
COMMENT ON TABLE crm.marketing_campana IS 'Campañas de marketing masivo por WhatsApp';
COMMENT ON TABLE crm.marketing_conversacion IS 'Conversaciones individuales con clientes por WhatsApp';
COMMENT ON TABLE crm.marketing_mensaje IS 'Mensajes enviados y recibidos por WhatsApp';
COMMENT ON TABLE crm.marketing_automatizacion IS 'Journeys automáticos basados en eventos';
COMMENT ON TABLE crm.marketing_event_log IS 'Log de eventos para auditoría y debugging';

COMMENT ON COLUMN crm.marketing_conversacion.vendedor_asignado IS 'Username del vendedor asignado (referencia a usuario_perfil.username)';
COMMENT ON COLUMN crm.marketing_conversacion.is_session_open IS 'Indica si la ventana de 24h está abierta para enviar mensajes de sesión';
COMMENT ON COLUMN crm.marketing_conversacion.session_expires_at IS 'Fecha y hora de expiración de la sesión de 24h';
