/**
 * API Route: Webhook de Twilio
 *
 * POST /api/twilio/webhook
 *
 * Recibe actualizaciones de estado de mensajes y mensajes entrantes de Twilio
 *
 * Twilio enviará webhooks para:
 * - Actualizaciones de estado (sent, delivered, failed, etc.)
 * - Mensajes entrantes de WhatsApp
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase.server";
import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

type ServiceSupabaseClient = SupabaseClient<any, any, any>;

// Tipos de eventos que puede enviar Twilio
type TwilioWebhookEvent = {
  MessageSid: string;
  SmsSid?: string;
  AccountSid: string;
  MessagingServiceSid?: string;
  From: string;
  To: string;
  Body?: string;
  NumMedia?: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
  MessageStatus?: 'queued' | 'sent' | 'delivered' | 'undelivered' | 'failed' | 'read';
  SmsStatus?: 'queued' | 'sent' | 'delivered' | 'undelivered' | 'failed';
  ErrorCode?: string;
  ErrorMessage?: string;
  ApiVersion?: string;
};

/**
 * POST - Recibir webhooks de Twilio
 */
export async function POST(request: NextRequest) {
  try {
    // Twilio envía los datos como application/x-www-form-urlencoded
    const formData = await request.formData();
    const event: TwilioWebhookEvent = Object.fromEntries(formData) as any;

    console.log('📩 Webhook de Twilio recibido:', event);

    // Validar firma de Twilio — en producción es obligatorio
    const twilioSignature = request.headers.get('x-twilio-signature');
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const isProd = process.env.NODE_ENV === 'production';

    if (isProd && (!twilioSignature || !authToken)) {
      console.error('❌ Webhook rechazado: firma o TWILIO_AUTH_TOKEN ausentes en producción');
      return NextResponse.json({ error: 'Signature required' }, { status: 403 });
    }

    if (twilioSignature && authToken) {
      const url = request.url;
      const isValid = validarFirmaTwilio(url, event, twilioSignature, authToken);
      if (!isValid) {
        console.warn('⚠️ Firma de Twilio inválida');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    }

    const supabase = createServiceRoleClient();

    // Determinar si es un mensaje entrante o actualización de estado
    const esWhatsApp = event.From?.startsWith('whatsapp:');
    const tieneContenido = event.Body && event.Body.length > 0;
    const tieneEstado = event.MessageStatus || event.SmsStatus;

    if (tieneContenido) {
      // Es un mensaje entrante
      await procesarMensajeEntrante(supabase, event, esWhatsApp);
    }

    if (tieneEstado) {
      // Es una actualización de estado
      await procesarActualizacionEstado(supabase, event, esWhatsApp);
    }

    // Log del evento
    await supabase
      .schema('crm')
      .from('marketing_event_log')
      .insert({
        evento_tipo: 'twilio.webhook.received',
        payload: event,
        resultado: 'SUCCESS'
      });

    // Twilio espera un código 200 para confirmar recepción
    return new NextResponse('OK', { status: 200 });

  } catch (error) {
    console.error('❌ Error procesando webhook de Twilio:', error);

    const supabase = createServiceRoleClient();
    await supabase
      .schema('crm')
      .from('marketing_event_log')
      .insert({
        evento_tipo: 'twilio.webhook.error',
        payload: { error: error instanceof Error ? error.message : 'Error desconocido' },
        resultado: 'ERROR',
        error_mensaje: error instanceof Error ? error.message : 'Error desconocido'
      });

    // Aun así devolvemos 200 para que Twilio no reintente
    return new NextResponse('Error procesado', { status: 200 });
  }
}

/**
 * Procesar mensaje entrante de WhatsApp o SMS
 */
async function procesarMensajeEntrante(
  supabase: ServiceSupabaseClient,
  event: TwilioWebhookEvent,
  esWhatsApp: boolean
) {
  try {
    // Limpiar el número de teléfono (quitar "whatsapp:" si existe)
    const telefono = event.From.replace('whatsapp:', '');
    const texto = event.Body || '';
    const messageSid = event.MessageSid || event.SmsSid || '';

    console.log(`📨 Mensaje entrante de ${esWhatsApp ? 'WhatsApp' : 'SMS'}: ${telefono}`);

    // Buscar o crear conversación
    const { data: conversacionInicial } = await supabase
      .schema('crm')
      .from('marketing_conversacion')
      .select('id, cliente_id')
      .eq('telefono', telefono)
      .eq('estado', 'ABIERTA')
      .single();

    let conversacion = conversacionInicial;

    if (!conversacion) {
      // Buscar cliente por teléfono
      const { data: cliente } = await supabase
        .schema('crm')
        .from('cliente')
        .select('id')
        .or(`telefono.eq.${telefono},telefono_whatsapp.eq.${telefono}`)
        .single();

      // Crear nueva conversación
      const { data: nuevaConv } = await supabase
        .schema('crm')
        .from('marketing_conversacion')
        .insert({
          cliente_id: cliente?.id,
          telefono: telefono,
          estado: 'ABIERTA',
          is_session_open: true,
          session_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          last_inbound_at: new Date().toISOString(),
          first_message_at: new Date().toISOString()
        })
        .select()
        .single();

      conversacion = nuevaConv;
    } else {
      // Actualizar conversación existente
      await supabase
        .schema('crm')
        .from('marketing_conversacion')
        .update({
          last_inbound_at: new Date().toISOString(),
          is_session_open: true,
          session_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', conversacion.id);
    }

    if (!conversacion) {
      console.error('❌ No se pudo crear/encontrar conversación');
      return;
    }

    // Guardar mensaje entrante
    await supabase
      .schema('crm')
      .from('marketing_mensaje')
      .insert({
        conversacion_id: conversacion.id,
        direccion: 'IN',
        tipo: esWhatsApp ? 'SESSION' : 'SMS',
        contenido_tipo: 'TEXT',
        contenido_texto: texto,
        tw_message_sid: messageSid,
        estado: 'DELIVERED',
        delivered_at: new Date().toISOString()
      });

    console.log(`✅ Mensaje entrante guardado: conversacion_id=${conversacion.id}`);

  } catch (error) {
    console.error('❌ Error procesando mensaje entrante:', error);
  }
}

/**
 * Procesar actualización de estado de mensaje
 */
async function procesarActualizacionEstado(
  supabase: ServiceSupabaseClient,
  event: TwilioWebhookEvent,
  _esWhatsApp: boolean
) {
  try {
    const messageSid = event.MessageSid || event.SmsSid || '';
    const estado = (event.MessageStatus || event.SmsStatus || '').toUpperCase();

    console.log(`📊 Actualización de estado: ${messageSid} → ${estado}`);

    // Mapear estados de Twilio a nuestros estados
    const estadoMapeado: Record<string, string> = {
      'QUEUED': 'QUEUED',
      'SENT': 'SENT',
      'DELIVERED': 'DELIVERED',
      'UNDELIVERED': 'FAILED',
      'FAILED': 'FAILED',
      'READ': 'READ'
    };

    const nuevoEstado = estadoMapeado[estado] || estado;

    // Actualizar estado del mensaje
    const updateData: {
      estado: string;
      updated_at: string;
      delivered_at?: string;
      read_at?: string;
      failed_at?: string;
      error_code?: string;
      error_message?: string;
    } = {
      estado: nuevoEstado,
      updated_at: new Date().toISOString()
    };

    if (nuevoEstado === 'DELIVERED') {
      updateData.delivered_at = new Date().toISOString();
    } else if (nuevoEstado === 'READ') {
      updateData.read_at = new Date().toISOString();
    } else if (nuevoEstado === 'FAILED') {
      updateData.failed_at = new Date().toISOString();
      if (event.ErrorCode) {
        updateData.error_code = event.ErrorCode;
        updateData.error_message = event.ErrorMessage || 'Error desconocido';
      }
    }

    const { error: updateError } = await supabase
      .schema('crm')
      .from('marketing_mensaje')
      .update(updateData)
      .eq('tw_message_sid', messageSid);

    if (updateError) {
      console.error('❌ Error actualizando mensaje:', updateError);
    } else {
      console.log(`✅ Mensaje actualizado: ${messageSid} → ${nuevoEstado}`);
    }

    // Si es de una campaña, actualizar métricas
    const { data: mensaje } = await supabase
      .schema('crm')
      .from('marketing_mensaje')
      .select('campana_id')
      .eq('tw_message_sid', messageSid)
      .single();

    if (mensaje?.campana_id) {
      // Incrementar contador de métricas de la campaña
      // (Esto depende de si tienes una función RPC o lo haces manualmente)
      console.log(`📈 Actualizando métricas de campaña: ${mensaje.campana_id}`);
    }

  } catch (error) {
    console.error('❌ Error procesando actualización de estado:', error);
  }
}

/**
 * Validar firma de Twilio para seguridad
 *
 * Twilio firma los webhooks con HMAC-SHA1
 * https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
function validarFirmaTwilio(
  url: string,
  params: TwilioWebhookEvent,
  signature: string,
  authToken: string
): boolean {
  try {
    // Ordenar parámetros alfabéticamente y concatenar
    const data = url + Object.keys(params)
      .sort()
      .map(key => `${key}${params[key as keyof TwilioWebhookEvent]}`)
      .join('');

    // Calcular HMAC-SHA1
    const expectedSignature = crypto
      .createHmac('sha1', authToken)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64');

    return expectedSignature === signature;
  } catch (error) {
    console.error('Error validando firma de Twilio:', error);
    return false;
  }
}
