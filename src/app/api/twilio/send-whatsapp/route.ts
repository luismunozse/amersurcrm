/**
 * API Route: Enviar WhatsApp con Twilio
 *
 * POST /api/twilio/send-whatsapp
 *
 * Envía mensajes de WhatsApp usando la API de Twilio
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { enviarWhatsApp, enviarWhatsAppMasivo } from "@/lib/services/twilio";

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
      media_url,
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
      const { exitosos, fallidos } = await enviarWhatsAppMasivo(
        telefonos,
        contenido_texto,
        media_url
      );

      // Guardar mensajes exitosos en la base de datos
      const mensajesParaGuardar = exitosos.map(respuesta => ({
        conversacion_id: conversacion_id || null,
        campana_id: campana_id || null,
        template_id: template_id || null,
        direccion: 'OUT',
        tipo: 'SESSION',
        contenido_tipo: media_url ? 'IMAGE' : 'TEXT',
        contenido_texto: contenido_texto,
        tw_message_sid: respuesta.sid,
        estado: respuesta.status.toUpperCase(),
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
          evento_tipo: 'twilio.whatsapp.masivo',
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
    const respuesta = await enviarWhatsApp(telefono, contenido_texto, media_url);

    // Guardar mensaje en la base de datos
    const { data: mensaje, error: mensajeError } = await supabase
      .schema('crm')
      .from('marketing_mensaje')
      .insert({
        conversacion_id: conversacion_id || null,
        campana_id: campana_id || null,
        template_id: template_id || null,
        direccion: 'OUT',
        tipo: 'SESSION',
        contenido_tipo: media_url ? 'IMAGE' : 'TEXT',
        contenido_texto: contenido_texto,
        tw_message_sid: respuesta.sid,
        estado: respuesta.status.toUpperCase(),
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
          last_outbound_at: new Date().toISOString(),
          is_session_open: true,
          session_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', conversacion_id);
    }

    // Log del evento
    await supabase
      .schema('crm')
      .from('marketing_event_log')
      .insert({
        evento_tipo: 'twilio.whatsapp.sent',
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
    console.error('Error enviando WhatsApp con Twilio:', error);
    return NextResponse.json({
      error: "Error enviando WhatsApp",
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
