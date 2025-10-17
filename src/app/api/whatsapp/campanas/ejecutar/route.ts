import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { WhatsAppClient } from "@/lib/whatsapp/client";

/**
 * API para ejecutar una campaña de WhatsApp
 * Procesa los destinatarios y envía mensajes según la configuración
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { campana_id, destinatarios_config } = body;

    if (!campana_id) {
      return NextResponse.json({ error: "Falta campana_id" }, { status: 400 });
    }

    // Obtener campaña
    const { data: campana, error: campanaError } = await supabase
      .schema('crm')
      .from('marketing_campana')
      .select(`
        id,
        nombre,
        template_id,
        credential_id,
        variables_valores,
        max_envios_por_segundo,
        estado
      `)
      .eq('id', campana_id)
      .single();

    if (campanaError || !campana) {
      return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
    }

    if (campana.estado === 'COMPLETED') {
      return NextResponse.json({ error: "La campaña ya fue ejecutada" }, { status: 400 });
    }

    // Obtener plantilla
    const { data: template, error: templateError } = await supabase
      .schema('crm')
      .from('marketing_template')
      .select('nombre, idioma, variables')
      .eq('id', campana.template_id)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
    }

    // Obtener credenciales
    const { data: credential, error: credError } = await supabase
      .schema('crm')
      .from('marketing_channel_credential')
      .select('phone_number_id, access_token')
      .eq('id', campana.credential_id)
      .eq('activo', true)
      .single();

    if (credError || !credential) {
      return NextResponse.json({ error: "Credenciales no encontradas" }, { status: 404 });
    }

    // Obtener destinatarios según configuración
    let telefonos: string[] = [];

    if (destinatarios_config.tipo === 'todos') {
      // Todos los clientes activos
      const { data: clientes } = await supabase
        .schema('crm')
        .from('cliente')
        .select('telefono')
        .eq('activo', true)
        .not('telefono', 'is', null);

      telefonos = clientes?.map(c => c.telefono).filter(Boolean) || [];

    } else if (destinatarios_config.tipo === 'proyecto' && destinatarios_config.proyecto_id) {
      // Clientes de un proyecto específico
      const { data: clientes } = await supabase
        .schema('crm')
        .from('cliente')
        .select('telefono')
        .eq('proyecto_id', destinatarios_config.proyecto_id)
        .eq('activo', true)
        .not('telefono', 'is', null);

      telefonos = clientes?.map(c => c.telefono).filter(Boolean) || [];

    } else if (destinatarios_config.tipo === 'manual' && destinatarios_config.numeros) {
      // Lista manual de números
      telefonos = destinatarios_config.numeros
        .split('\n')
        .map((n: string) => n.trim())
        .filter(Boolean);
    }

    if (telefonos.length === 0) {
      return NextResponse.json({ error: "No se encontraron destinatarios" }, { status: 400 });
    }

    // Crear cliente de WhatsApp
    const whatsappClient = new WhatsAppClient(
      credential.phone_number_id,
      credential.access_token
    );

    // Construir componentes de la plantilla con variables
    const components = [];
    const variables = campana.variables_valores as Record<string, string>;

    if (variables && Object.keys(variables).length > 0) {
      components.push({
        type: 'body',
        parameters: Object.values(variables).map(value => ({
          type: 'text',
          text: String(value)
        }))
      });
    }

    // Actualizar estado de la campaña a RUNNING
    await supabase
      .schema('crm')
      .from('marketing_campana')
      .update({
        estado: 'RUNNING',
        fecha_inicio: new Date().toISOString()
      })
      .eq('id', campana_id);

    // Enviar mensajes con rate limiting
    const delayMs = 1000 / (campana.max_envios_por_segundo || 10);
    let enviados = 0;
    let fallidos = 0;

    for (const telefono of telefonos) {
      try {
        // Enviar mensaje
        const waResponse = await whatsappClient.enviarMensajePlantilla(
          telefono,
          template.nombre,
          template.idioma,
          components.length > 0 ? components : undefined
        );

        // Guardar mensaje en la base de datos
        await supabase
          .schema('crm')
          .from('marketing_mensaje')
          .insert({
            conversacion_id: null,
            campana_id: campana_id,
            direccion: 'OUT',
            tipo: 'TEMPLATE',
            contenido_tipo: 'TEXT',
            template_id: campana.template_id,
            template_variables: variables,
            wa_message_id: waResponse.messages[0].id,
            estado: 'SENT',
            sent_at: new Date().toISOString()
          });

        enviados++;

        // Actualizar contador en la campaña
        await supabase
          .schema('crm')
          .from('marketing_campana')
          .update({ total_enviados: enviados })
          .eq('id', campana_id);

      } catch (error) {
        console.error(`Error enviando mensaje a ${telefono}:`, error);
        fallidos++;
      }

      // Rate limiting: esperar antes del siguiente envío
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // Actualizar estado final de la campaña
    await supabase
      .schema('crm')
      .from('marketing_campana')
      .update({
        estado: 'COMPLETED',
        completado_at: new Date().toISOString(),
        total_enviados: enviados
      })
      .eq('id', campana_id);

    return NextResponse.json({
      success: true,
      enviados,
      fallidos,
      total: telefonos.length
    });

  } catch (error) {
    console.error('Error ejecutando campaña:', error);
    return NextResponse.json({
      error: "Error ejecutando campaña",
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
