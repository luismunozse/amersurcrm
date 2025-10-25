import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { WhatsAppClient } from "@/lib/whatsapp/client";

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
      tipo, 
      contenido_texto, 
      template_id, 
      template_variables,
      credential_id 
    } = body;

    if (!telefono || !credential_id) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }

    // Obtener credenciales
    const { data: credential, error: credError } = await supabase
      .schema('crm')
      .from('marketing_channel_credential')
      .select('phone_number_id, access_token')
      .eq('id', credential_id)
      .eq('activo', true)
      .single();

    if (credError || !credential) {
      return NextResponse.json({ error: "Credenciales no encontradas" }, { status: 404 });
    }

    // Crear cliente de WhatsApp
    const whatsappClient = new WhatsAppClient(
      credential.phone_number_id,
      credential.access_token
    );

    let waResponse;

    // Enviar mensaje según el tipo
    if (tipo === 'TEMPLATE' && template_id) {
      // Obtener información de la plantilla
      const { data: template } = await supabase
        .schema('crm')
        .from('marketing_template')
        .select('nombre, idioma, variables')
        .eq('id', template_id)
        .single();

      if (!template) {
        return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
      }

      // Construir componentes de la plantilla
      const components: Array<{
        type: 'body' | 'header' | 'button';
        parameters?: Array<{
          type: 'text' | 'image' | 'video' | 'document';
          text?: string;
        }>;
      }> = [];

      if (template_variables && Object.keys(template_variables).length > 0) {
        components.push({
          type: 'body',
          parameters: Object.values(template_variables).map(value => ({
            type: 'text' as const,
            text: String(value)
          }))
        });
      }

      waResponse = await whatsappClient.enviarMensajePlantilla(
        telefono,
        template.nombre,
        template.idioma,
        components.length > 0 ? components : undefined
      );
    } else if (tipo === 'SESSION' && contenido_texto) {
      // Verificar que la sesión esté abierta
      if (conversacion_id) {
        const { data: conversacion } = await supabase
          .schema('crm')
          .from('marketing_conversacion')
          .select('is_session_open, session_expires_at')
          .eq('id', conversacion_id)
          .single();

        if (!conversacion?.is_session_open || 
            (conversacion.session_expires_at && new Date(conversacion.session_expires_at) < new Date())) {
          return NextResponse.json({ 
            error: "La sesión de 24h ha expirado. Debes usar una plantilla para reabrir la conversación." 
          }, { status: 400 });
        }
      }

      waResponse = await whatsappClient.enviarMensajeTexto(telefono, contenido_texto);
    } else {
      return NextResponse.json({ error: "Tipo de mensaje no válido" }, { status: 400 });
    }

    // Guardar mensaje en la base de datos
    const { data: mensaje, error: mensajeError } = await supabase
      .schema('crm')
      .from('marketing_mensaje')
      .insert({
        conversacion_id: conversacion_id,
        direccion: 'OUT',
        tipo: tipo,
        contenido_tipo: 'TEXT',
        contenido_texto: contenido_texto,
        template_id: template_id,
        template_variables: template_variables,
        wa_message_id: waResponse.messages[0].id,
        estado: 'SENT',
        sent_at: new Date().toISOString()
      })
      .select()
      .single();

    if (mensajeError) {
      console.error('Error guardando mensaje:', mensajeError);
      // No retornamos error porque el mensaje sí se envió
    }

    return NextResponse.json({
      success: true,
      wa_message_id: waResponse.messages[0].id,
      mensaje_id: mensaje?.id
    });

  } catch (error) {
    console.error('Error enviando mensaje de WhatsApp:', error);
    return NextResponse.json({ 
      error: "Error enviando mensaje",
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
