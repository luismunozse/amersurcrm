-- Plantillas WhatsApp por estado de cliente (seed idempotente)

DO $$
BEGIN

  -- POR CONTACTAR
  IF NOT EXISTS (SELECT 1 FROM crm.marketing_template WHERE nombre = 'Primer contacto - Bienvenida') THEN
    INSERT INTO crm.marketing_template (nombre, categoria, body_texto, variables, objetivo, tags, activo)
    VALUES (
      'Primer contacto - Bienvenida',
      'bienvenida',
      'Hola {{cliente}}, le saluda {{vendedor}} de Amersur.

Recibimos su consulta sobre {{proyecto}} y me gustaría presentarle las opciones disponibles.

¿Tiene disponibilidad para una breve llamada o visita esta semana?',
      '["cliente","vendedor","proyecto"]'::jsonb,
      'Iniciar conversación con lead recién registrado',
      ARRAY['por_contactar','primer_contacto'],
      true
    );
  END IF;

  -- CONTACTADO - seguimiento
  IF NOT EXISTS (SELECT 1 FROM crm.marketing_template WHERE nombre = 'Seguimiento post-contacto') THEN
    INSERT INTO crm.marketing_template (nombre, categoria, body_texto, variables, objetivo, tags, activo)
    VALUES (
      'Seguimiento post-contacto',
      'seguimiento',
      'Hola {{cliente}}, es {{vendedor}} de Amersur.

Quería darle seguimiento a nuestra conversación sobre {{proyecto}}. ¿Pudo revisar la información que le compartí?

Estoy a su disposición para resolver cualquier consulta.',
      '["cliente","vendedor","proyecto"]'::jsonb,
      'Retomar conversación tras primer contacto',
      ARRAY['contactado','seguimiento'],
      true
    );
  END IF;

  -- CONTACTADO - visita
  IF NOT EXISTS (SELECT 1 FROM crm.marketing_template WHERE nombre = 'Confirmación de visita') THEN
    INSERT INTO crm.marketing_template (nombre, categoria, body_texto, variables, objetivo, tags, activo)
    VALUES (
      'Confirmación de visita',
      'recordatorio',
      'Hola {{cliente}}, le confirmo que lo esperamos en {{proyecto}} el {{fecha}}.

{{vendedor}} le recibirá personalmente para el recorrido. Ante cualquier cambio, no dude en avisarme.',
      '["cliente","vendedor","proyecto","fecha"]'::jsonb,
      'Confirmar visita agendada al proyecto',
      ARRAY['contactado','visita'],
      true
    );
  END IF;

  -- TRANSFERIDO
  IF NOT EXISTS (SELECT 1 FROM crm.marketing_template WHERE nombre = 'Presentación asesor asignado') THEN
    INSERT INTO crm.marketing_template (nombre, categoria, body_texto, variables, objetivo, tags, activo)
    VALUES (
      'Presentación asesor asignado',
      'bienvenida',
      'Estimado/a {{cliente}}, le saluda {{vendedor}}, su asesor inmobiliario en Amersur.

Ha sido asignado a mi cartera y con mucho gusto le acompañaré en el proceso de adquisición en {{proyecto}}.

¿Cuándo le viene bien coordinar una reunión o visita?',
      '["cliente","vendedor","proyecto"]'::jsonb,
      'Presentar asesor tras transferencia de lead',
      ARRAY['transferido','presentacion'],
      true
    );
  END IF;

  -- PROFORMA / CIERRE
  IF NOT EXISTS (SELECT 1 FROM crm.marketing_template WHERE nombre = 'Proforma lista para revisión') THEN
    INSERT INTO crm.marketing_template (nombre, categoria, body_texto, variables, objetivo, tags, activo)
    VALUES (
      'Proforma lista para revisión',
      'seguimiento',
      'Hola {{cliente}}, ya está lista su proforma para {{proyecto}}.

Incluye precios, condiciones de pago y disponibilidad del lote {{lote}}.

¿Podemos revisar juntos los detalles? Quedo atento.

Saludos, {{vendedor}} - Amersur',
      '["cliente","vendedor","proyecto","lote"]'::jsonb,
      'Enviar aviso de proforma generada',
      ARRAY['contactado','transferido','proforma'],
      true
    );
  END IF;

  -- COBRANZA
  IF NOT EXISTS (SELECT 1 FROM crm.marketing_template WHERE nombre = 'Recordatorio cuota pendiente') THEN
    INSERT INTO crm.marketing_template (nombre, categoria, body_texto, variables, objetivo, tags, activo)
    VALUES (
      'Recordatorio cuota pendiente',
      'cobranza',
      'Estimado/a {{cliente}}, le recordamos que tiene una cuota pendiente de {{monto}} correspondiente a su propiedad en {{proyecto}}.

Fecha de vencimiento: {{fecha}}.

Para realizar el pago o consultar alternativas, contáctenos. Saludos, {{vendedor}} - Amersur',
      '["cliente","vendedor","proyecto","monto","fecha"]'::jsonb,
      'Recordar pago de cuota próxima a vencer',
      ARRAY['cobranza','cuota'],
      true
    );
  END IF;

  -- POST VENTA
  IF NOT EXISTS (SELECT 1 FROM crm.marketing_template WHERE nombre = 'Saludo post-entrega') THEN
    INSERT INTO crm.marketing_template (nombre, categoria, body_texto, variables, objetivo, tags, activo)
    VALUES (
      'Saludo post-entrega',
      'post_venta',
      'Estimado/a {{cliente}}, esperamos que se encuentre muy bien en su nuevo hogar en {{proyecto}}.

Recuerde que el equipo de Amersur sigue a su disposición para cualquier consulta o gestión adicional.

Fue un placer acompañarle en este proceso. Saludos, {{vendedor}}',
      '["cliente","vendedor","proyecto"]'::jsonb,
      'Mantener relación tras entrega de propiedad',
      ARRAY['post_venta','entrega'],
      true
    );
  END IF;

END $$;
