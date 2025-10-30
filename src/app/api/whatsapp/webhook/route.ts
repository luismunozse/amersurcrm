import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase.server";
import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WhatsAppWebhookMessage } from "@/types/whatsapp-marketing";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServiceSupabaseClient = SupabaseClient<any, any, any>;

type WhatsAppIncomingMessage = {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: {
    body: string;
  };
  image?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
};

type WhatsAppIncomingStatus = {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: Array<{
    code: number;
    title: string;
  }>;
};

// GET - Verificación del webhook (requerido por WhatsApp)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Obtener el verify token de la base de datos
  const supabase = createServiceRoleClient();
  const { data: credential } = await supabase
    .schema('crm')
    .from('marketing_channel_credential')
    .select('webhook_verify_token')
    .eq('activo', true)
    .limit(1)
    .single();

  if (mode === 'subscribe' && token === credential?.webhook_verify_token) {
    return new NextResponse(challenge, { status: 200 });
  }

  console.error('❌ Verificación de webhook fallida');
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// POST - Recibir mensajes y actualizaciones de WhatsApp
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as WhatsAppWebhookMessage;
    
    // Verificar firma (opcional pero recomendado)
    const signature = request.headers.get('x-hub-signature-256');
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (signature && appSecret) {
      const isValid = verificarFirma(body, signature, appSecret);
      if (!isValid) {
        console.warn('Firma de webhook inválida');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    } else if (signature && !appSecret) {
      console.warn('Firma recibida pero falta WHATSAPP_APP_SECRET. Se omite validación.');
    }

    // Usar service role client para operaciones del webhook
    const supabase = createServiceRoleClient();

    // Procesar cada entrada del webhook
    for (const entry of body.entry) {
      for (const change of entry.changes) {
        const { value } = change;

        // Procesar mensajes entrantes
        if (value.messages) {
          for (const message of value.messages) {
            await procesarMensajeEntrante(supabase, message);
          }
        }

        // Procesar actualizaciones de estado
        if (value.statuses) {
          for (const status of value.statuses) {
            await procesarActualizacionEstado(supabase, status);
          }
        }
      }
    }

    // Log del evento
    await supabase
      .schema('crm')
      .from('marketing_event_log')
      .insert({
        evento_tipo: 'webhook.received',
        payload: body,
        resultado: 'SUCCESS'
      });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error procesando webhook de WhatsApp:', error);
    
    // Log del error
    const supabase = createServiceRoleClient();
    await supabase
      .schema('crm')
      .from('marketing_event_log')
      .insert({
        evento_tipo: 'webhook.error',
        payload: { error: error instanceof Error ? error.message : 'Error desconocido' },
        resultado: 'ERROR',
        error_mensaje: error instanceof Error ? error.message : 'Error desconocido'
      });

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Función para procesar mensaje entrante
async function procesarMensajeEntrante(supabase: ServiceSupabaseClient, message: WhatsAppIncomingMessage) {
  try {
    const telefono = message.from;
    const texto = message.text?.body || '';
    const waMessageId = message.id;

    // Buscar o crear conversación
    const { data: conversacionInicial, error: convError } = await supabase
      .schema('crm')
      .from('marketing_conversacion')
      .select('id, cliente_id')
      .eq('telefono', telefono)
      .eq('estado', 'ABIERTA')
      .single();

    if (convError) {
      console.error('Error obteniendo conversación existente:', convError);
    }

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
    }

    if (!conversacion) {
      console.error('No se pudo crear/encontrar conversación');
      return;
    }

    // Guardar mensaje entrante
    await supabase
      .schema('crm')
      .from('marketing_mensaje')
      .insert({
        conversacion_id: conversacion.id,
        direccion: 'IN',
        tipo: 'SESSION',
        contenido_tipo: 'TEXT',
        contenido_texto: texto,
        wa_message_id: waMessageId,
        estado: 'DELIVERED',
        delivered_at: new Date().toISOString()
      });

    // Log del evento
    await supabase
      .schema('crm')
      .from('marketing_event_log')
      .insert({
        evento_tipo: 'message.received',
        conversacion_id: conversacion.id,
        payload: { from: telefono, text: texto },
        resultado: 'SUCCESS'
      });

  } catch (error) {
    console.error('Error procesando mensaje entrante:', error);
  }
}

// Función para procesar actualización de estado
async function procesarActualizacionEstado(supabase: ServiceSupabaseClient, status: WhatsAppIncomingStatus) {
  try {
    const waMessageId = status.id;
    const nuevoEstado = status.status.toUpperCase();

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
      updateData.delivered_at = new Date(parseInt(status.timestamp) * 1000).toISOString();
    } else if (nuevoEstado === 'READ') {
      updateData.read_at = new Date(parseInt(status.timestamp) * 1000).toISOString();
    } else if (nuevoEstado === 'FAILED') {
      updateData.failed_at = new Date(parseInt(status.timestamp) * 1000).toISOString();
      if (status.errors && status.errors.length > 0) {
        updateData.error_code = status.errors[0].code.toString();
        updateData.error_message = status.errors[0].title;
      }
    }

    await supabase
      .schema('crm')
      .from('marketing_mensaje')
      .update(updateData)
      .eq('wa_message_id', waMessageId);

    // Si es de una campaña, actualizar métricas
    const { data: mensaje } = await supabase
      .schema('crm')
      .from('marketing_mensaje')
      .select('campana_id')
      .eq('wa_message_id', waMessageId)
      .single();

    if (mensaje?.campana_id) {
      const metricaField = `total_${nuevoEstado.toLowerCase()}s`;
      await supabase.rpc('incrementar_metrica_campana', {
        campana_id: mensaje.campana_id,
        metrica: metricaField
      });
    }

    // Log del evento
    await supabase
      .schema('crm')
      .from('marketing_event_log')
      .insert({
        evento_tipo: `message.${nuevoEstado.toLowerCase()}`,
        payload: { wa_message_id: waMessageId, status: nuevoEstado },
        resultado: 'SUCCESS'
      });

  } catch (error) {
    console.error('Error procesando actualización de estado:', error);
  }
}

// Función para verificar firma (seguridad)
function verificarFirma(payload: WhatsAppWebhookMessage, signature: string, appSecret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return `sha256=${expectedSignature}` === signature;
}
