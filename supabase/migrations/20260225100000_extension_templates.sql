-- Tabla de plantillas para la extensión AmersurChat
-- Separada de marketing_template (que es para WhatsApp Business API)

CREATE TABLE IF NOT EXISTS crm.extension_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo VARCHAR(100) NOT NULL,
  mensaje TEXT NOT NULL,
  categoria VARCHAR(50) NOT NULL DEFAULT 'general',
  orden INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_extension_template_activo ON crm.extension_template(activo);
CREATE INDEX IF NOT EXISTS idx_extension_template_categoria ON crm.extension_template(categoria);

-- RLS
ALTER TABLE crm.extension_template ENABLE ROW LEVEL SECURITY;

-- Política: cualquier usuario autenticado puede leer plantillas activas
CREATE POLICY extension_template_select ON crm.extension_template
  FOR SELECT TO authenticated
  USING (activo = true);

-- Política: solo admins pueden insertar/actualizar/eliminar
CREATE POLICY extension_template_admin_all ON crm.extension_template
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm.usuario_perfil up
      JOIN crm.rol r ON up.rol_id = r.id
      WHERE up.id = auth.uid()
      AND r.nombre = 'ROL_ADMIN'
    )
  );

-- Seed: las 8 plantillas originales de la extensión
INSERT INTO crm.extension_template (titulo, mensaje, categoria, orden) VALUES
  ('Saludo inicial',
   'Hola {cliente}! Gracias por contactarnos. Soy {vendedor} de Amersur Inmobiliaria. ¿En qué puedo ayudarte hoy?',
   'saludo', 1),
  ('Información de terreno',
   'Hola {cliente}! Tenemos excelentes terrenos disponibles. ¿Te interesa alguna zona en particular? Puedo enviarte información detallada sobre ubicación, precios y facilidades de pago.',
   'consulta', 2),
  ('Solicitar datos',
   'Para enviarte la información completa, ¿podrías compartirme tu nombre completo y email?',
   'consulta', 3),
  ('Agendar visita',
   'Perfecto {cliente}! ¿Te gustaría agendar una visita al terreno? Tengo disponibilidad esta semana. ¿Qué día te viene mejor?',
   'seguimiento', 4),
  ('Envío de información',
   'Hola {cliente}! Te acabo de enviar la información detallada del proyecto por WhatsApp. Cualquier duda que tengas, estoy a tu disposición. Soy {vendedor}.',
   'seguimiento', 5),
  ('Seguimiento post-visita',
   'Hola {cliente}! ¿Qué te pareció el terreno que visitamos? ¿Te gustaría que conversemos sobre las opciones de financiamiento?',
   'seguimiento', 6),
  ('Propuesta comercial',
   'Hola {cliente}! Tengo una excelente propuesta para ti. El terreno que te interesa tiene una promoción especial este mes con facilidades de pago. ¿Conversamos los detalles?',
   'cierre', 7),
  ('Despedida',
   'Gracias por tu tiempo {cliente}! Cualquier consulta adicional, no dudes en escribirme. Soy {vendedor}, estoy disponible de Lunes a Sábado de 9am a 6pm. ¡Saludos!',
   'cierre', 8)
ON CONFLICT DO NOTHING;
