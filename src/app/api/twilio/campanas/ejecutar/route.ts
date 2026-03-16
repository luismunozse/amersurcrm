/**
 * API Route: Ejecutar Campaña con Twilio
 *
 * POST /api/twilio/campanas/ejecutar
 *
 * Ejecuta una campaña de marketing usando Twilio (WhatsApp o SMS)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { enviarWhatsApp, enviarSMS } from "@/lib/services/twilio";
import type { EstadoMensaje } from "@/types/whatsapp-marketing";
export const dynamic = 'force-dynamic';

/**
 * Normaliza un número de teléfono al formato internacional
 * - Remueve espacios, guiones, paréntesis
 * - Asegura que empiece con +
 */
function normalizarTelefono(telefono: string): string {
  // Remover todo excepto números y el + del inicio
  let normalizado = telefono.replace(/[^\d+]/g, '');

  // Asegurarse que empiece con +
  if (!normalizado.startsWith('+')) {
    // Si es un número peruano, agregar +51
    if (normalizado.length === 9) {
      normalizado = '+51' + normalizado;
    } else {
      normalizado = '+' + normalizado;
    }
  }

  return normalizado;
}

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

/**
 * Ejecutar campaña con Twilio
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const {
      campana_id,
      destinatarios_config,
      canal = 'whatsapp' // 'whatsapp' o 'sms'
    } = body;

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
      .select('nombre, body_texto, variables')
      .eq('id', campana.template_id)
      .single();

    if (templateError || !template) {
      console.error('Error obteniendo plantilla:', templateError);
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
    }

    // Obtener destinatarios según configuración
    let telefonos: string[] = [];

    if (destinatarios_config.tipo === 'todos') {
      // Todos los clientes activos
      const { data: clientes } = await supabase
        .schema('crm')
        .from('cliente')
        .select('telefono, telefono_whatsapp')
        .eq('activo', true);

      // Usar telefono_whatsapp si está disponible, sino telefono
      telefonos = clientes?.map(c => c.telefono_whatsapp || c.telefono).filter(Boolean) || [];

    } else if (destinatarios_config.tipo === 'proyecto' && destinatarios_config.proyecto_id) {
      // Clientes de un proyecto específico
      const { data: clientes } = await supabase
        .schema('crm')
        .from('cliente')
        .select('telefono, telefono_whatsapp')
        .eq('proyecto_id', destinatarios_config.proyecto_id)
        .eq('activo', true);

      telefonos = clientes?.map(c => c.telefono_whatsapp || c.telefono).filter(Boolean) || [];

    } else if (destinatarios_config.tipo === 'audiencia' && destinatarios_config.audiencia_id) {
      // Audiencia específica
      const { data: audiencia } = await supabase
        .schema('crm')
        .from('marketing_audiencia')
        .select('filtros')
        .eq('id', destinatarios_config.audiencia_id)
        .single();

      if (audiencia?.filtros) {
        // Aplicar filtros (esto depende de tu estructura de filtros)
        // Por ahora simplemente obtenemos todos los clientes activos
        const { data: clientes } = await supabase
          .schema('crm')
          .from('cliente')
          .select('telefono, telefono_whatsapp')
          .eq('activo', true);

        telefonos = clientes?.map(c => c.telefono_whatsapp || c.telefono).filter(Boolean) || [];
      }

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

    // Normalizar todos los teléfonos
    telefonos = telefonos.map(normalizarTelefono);

    // Reemplazar variables en el contenido del mensaje
    const variables = campana.variables_valores as Record<string, string>;
    let mensaje = template.body_texto || template.nombre;

    if (variables && Object.keys(variables).length > 0) {
      // Reemplazar {{variable}} con su valor
      Object.entries(variables).forEach(([key, value]) => {
        mensaje = mensaje.replace(new RegExp(`{{${key}}}`, 'g'), value);
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
    const errores: { telefono: string; error: string }[] = [];

    for (const telefono of telefonos) {
      try {
        let respuesta;

        // Enviar según el canal
        if (canal === 'sms') {
          respuesta = await enviarSMS(telefono, mensaje);
        } else {
          // WhatsApp por defecto
          respuesta = await enviarWhatsApp(telefono, mensaje);
        }

        // Guardar mensaje en la base de datos
        await supabase
          .schema('crm')
          .from('marketing_mensaje')
          .insert({
            conversacion_id: null,
            campana_id: campana_id,
            direccion: 'OUT',
            tipo: canal === 'sms' ? 'SMS' : 'SESSION',
            contenido_tipo: 'TEXT',
            contenido_texto: mensaje,
            template_id: campana.template_id,
            template_variables: variables,
            tw_message_sid: respuesta.sid,
            estado: mapTwilioStatus(respuesta.status),
            sent_at: respuesta.dateCreated.toISOString()
          });

        enviados++;

        // Actualizar contador en la campaña cada 10 mensajes
        if (enviados % 10 === 0) {
          await supabase
            .schema('crm')
            .from('marketing_campana')
            .update({ total_enviados: enviados })
            .eq('id', campana_id);
        }

        console.log(`✅ [CAMPAÑA ${campana_id}] Mensaje enviado a ${telefono} (${respuesta.sid})`);

      } catch (error) {
        console.error(`❌ [CAMPAÑA ${campana_id}] Error enviando a ${telefono}:`, error);
        fallidos++;
        errores.push({
          telefono,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }

      // Rate limiting: esperar antes del siguiente envío
      if (delayMs > 0 && telefonos.indexOf(telefono) < telefonos.length - 1) {
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
        total_enviados: enviados,
        total_fallidos: fallidos
      })
      .eq('id', campana_id);

    // Log del evento
    await supabase
      .schema('crm')
      .from('marketing_event_log')
      .insert({
        evento_tipo: 'twilio.campana.completed',
        campana_id: campana_id,
        payload: {
          canal,
          total: telefonos.length,
          enviados,
          fallidos,
          errores: errores.slice(0, 10) // Solo los primeros 10 errores
        },
        resultado: fallidos === 0 ? 'SUCCESS' : 'PARTIAL'
      });

    console.log(`🎉 [CAMPAÑA ${campana_id}] Completada: ${enviados}/${telefonos.length} enviados`);

    return NextResponse.json({
      success: true,
      enviados,
      fallidos,
      total: telefonos.length,
      errores: errores.length > 0 ? errores.slice(0, 10) : undefined // Devolver máximo 10 errores
    });

  } catch (error) {
    console.error('❌ Error ejecutando campaña con Twilio:', error);

    // Intentar actualizar la campaña como fallida
    try {
      const body = await request.json();
      const { campana_id } = body;
      if (campana_id) {
        const supabase = await createServerOnlyClient();
        await supabase
          .schema('crm')
          .from('marketing_campana')
          .update({
            estado: 'FAILED',
            completado_at: new Date().toISOString()
          })
          .eq('id', campana_id);
      }
    } catch (e) {
      console.error('Error actualizando estado de campaña fallida:', e);
    }

    return NextResponse.json({
      error: "Error ejecutando campaña",
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
