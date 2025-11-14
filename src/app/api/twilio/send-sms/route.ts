/**
 * API Route: Enviar SMS con Twilio
 *
 * POST /api/twilio/send-sms
 *
 * Envía mensajes SMS usando la API de Twilio
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { enviarSMS, enviarSMSMasivo } from "@/lib/services/twilio";
import type { EstadoMensaje } from "@/types/whatsapp-marketing";

const mapTwilioStatus = (status?: string): EstadoMensaje => {
  const normalized = (status || "").toLowerCase();
  switch (normalized) {
    case "sent":
    case "sending":
      return "SENT";
    case "delivered":
      return "DELIVERED";
    case "read":
      return "READ";
    case "undelivered":
    case "failed":
      return "FAILED";
    default:
      return "PENDING";
  }
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const {
      conversacion_id,
      telefono,
      telefonos, // Para envío masivo
      contenido_texto,
      campana_id,
      template_id,
      masivo = false
    } = body;

    // Validación básica
    if (!masivo && !telefono) {
      return NextResponse.json({ error: "Falta el número de teléfono" }, { status: 400 });
    }

    if (masivo && (!telefonos || !Array.isArray(telefonos) || telefonos.length === 0)) {
      return NextResponse.json({ error: "Falta el array de teléfonos" }, { status: 400 });
    }

    if (!contenido_texto) {
      return NextResponse.json({ error: "Falta el contenido del mensaje" }, { status: 400 });
    }

    // ENVÍO MASIVO
    if (masivo) {
      const { exitosos, fallidos } = await enviarSMSMasivo(
        telefonos,
        contenido_texto
      );

      // Guardar mensajes exitosos en la base de datos
      const mensajesParaGuardar = exitosos.map(respuesta => ({
        conversacion_id: conversacion_id || null,
        campana_id: campana_id || null,
        template_id: template_id || null,
        direccion: 'OUT',
        tipo: 'SMS',
        contenido_tipo: 'TEXT',
        contenido_texto: contenido_texto,
        tw_message_sid: respuesta.sid,
        estado: mapTwilioStatus(respuesta.status),
        sent_at: respuesta.dateCreated.toISOString()
      }));

      if (mensajesParaGuardar.length > 0) {
        await supabase
          .schema('crm')
          .from('marketing_mensaje')
          .insert(mensajesParaGuardar);
      }

      // Log del evento
      await supabase
        .schema('crm')
        .from('marketing_event_log')
        .insert({
          evento_tipo: 'twilio.sms.masivo',
          campana_id: campana_id || null,
          payload: {
            total: telefonos.length,
            exitosos: exitosos.length,
            fallidos: fallidos.length
          },
          resultado: fallidos.length === 0 ? 'SUCCESS' : 'PARTIAL'
        });

      return NextResponse.json({
        success: true,
        total: telefonos.length,
        exitosos: exitosos.length,
        fallidos: fallidos.length,
        detalles_fallidos: fallidos
      });
    }

    // ENVÍO INDIVIDUAL
    const respuesta = await enviarSMS(telefono, contenido_texto);

    // Guardar mensaje en la base de datos
    const { data: mensaje, error: mensajeError } = await supabase
      .schema('crm')
      .from('marketing_mensaje')
      .insert({
        conversacion_id: conversacion_id || null,
        campana_id: campana_id || null,
        template_id: template_id || null,
        direccion: 'OUT',
        tipo: 'SMS',
        contenido_tipo: 'TEXT',
        contenido_texto: contenido_texto,
        tw_message_sid: respuesta.sid,
            estado: mapTwilioStatus(respuesta.status),
        sent_at: respuesta.dateCreated.toISOString()
      })
      .select()
      .single();

    if (mensajeError) {
      console.error('Error guardando mensaje:', mensajeError);
      // No retornamos error porque el mensaje sí se envió
    }

    // Si hay conversación, actualizarla
    if (conversacion_id) {
      await supabase
        .schema('crm')
        .from('marketing_conversacion')
        .update({
          last_outbound_at: new Date().toISOString()
        })
        .eq('id', conversacion_id);
    }

    // Log del evento
    await supabase
      .schema('crm')
      .from('marketing_event_log')
      .insert({
        evento_tipo: 'twilio.sms.sent',
        conversacion_id: conversacion_id || null,
        campana_id: campana_id || null,
        payload: {
          telefono,
          tw_message_sid: respuesta.sid
        },
        resultado: 'SUCCESS'
      });

    return NextResponse.json({
      success: true,
      tw_message_sid: respuesta.sid,
      mensaje_id: mensaje?.id,
      estado: respuesta.status
    });

  } catch (error) {
    console.error('Error enviando SMS con Twilio:', error);
    return NextResponse.json({
      error: "Error enviando SMS",
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
