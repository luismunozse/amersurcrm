"use server";

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase.server";

const WHATSAPP_BOT_API_KEY = process.env.WHATSAPP_BOT_API_KEY;
const CRM_AUTOMATION_USER_ID = process.env.CRM_AUTOMATION_USER_ID ?? null;

interface WhatsAppLeadPayload {
  telefono: string;
  nombre?: string;
  mensaje_inicial?: string;
  origen_lead?: string;
  canal?: string;
  chat_id?: string;
  fecha_contacto?: string;
}

/**
 * POST /api/whatsapp/lead/create
 *
 * Crea un lead automáticamente cuando alguien escribe por WhatsApp
 * Llamado por el bot de WhatsApp Web
 */
export async function POST(request: NextRequest) {
  try {
    // Validar autenticación
    const apiKey = request.headers.get("x-api-key") || request.headers.get("authorization")?.replace("Bearer ", "");

    if (!WHATSAPP_BOT_API_KEY) {
      console.error("[WhatsAppLead] WHATSAPP_BOT_API_KEY no configurada");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    if (apiKey !== WHATSAPP_BOT_API_KEY) {
      console.warn("[WhatsAppLead] API Key inválida");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parsear body
    const body: WhatsAppLeadPayload = await request.json().catch(() => ({}));

    if (!body.telefono) {
      return NextResponse.json({ error: "Falta campo requerido: telefono" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Verificar si ya existe un cliente con este teléfono
    const { data: clienteExistente } = await supabase
      .schema("crm")
      .from("cliente")
      .select("id, nombre, estado_cliente, vendedor_asignado")
      .or(`telefono.eq.${body.telefono},telefono_whatsapp.eq.${body.telefono}`)
      .limit(1)
      .maybeSingle();

    if (clienteExistente) {
      console.log(`[WhatsAppLead] Cliente ya existe: ${clienteExistente.id}`);
      return NextResponse.json({
        success: false,
        message: "Cliente ya existe",
        clienteId: clienteExistente.id,
        existente: true,
      });
    }

    // Usuario que crea el lead (sistema de automatización)
    const createdBy = CRM_AUTOMATION_USER_ID;

    if (!createdBy) {
      throw new Error("No hay un usuario disponible para created_by (define CRM_AUTOMATION_USER_ID).");
    }

    // Preparar datos del lead
    const nombre = body.nombre || `Lead WhatsApp ${body.telefono.slice(-4)}`;
    const origenLead = body.origen_lead || "whatsapp_web";

    const notas = buildNotas(body);

    const direccion = {
      calle: "",
      numero: "",
      barrio: "",
      ciudad: "",
      provincia: "",
      pais: "Perú",
    };

    // Insertar lead usando función RPC (bypasea RLS con SECURITY DEFINER)
    // El vendedor se asigna automáticamente usando la lista de vendedores activos
    const { data, error } = await supabase
      .rpc("create_whatsapp_lead", {
        p_nombre: nombre,
        p_telefono: body.telefono,
        p_telefono_whatsapp: body.telefono,
        p_origen_lead: origenLead,
        p_vendedor_asignado: null, // NULL = asignación automática
        p_created_by: createdBy,
        p_notas: notas,
        p_direccion: direccion,
      })
      .single();

    if (error) {
      const message = String(error.message ?? "");
      if (message.includes("duplicate key value")) {
        console.info(`[WhatsAppLead] Lead duplicado ignorado (${body.telefono})`);
        return NextResponse.json({
          success: false,
          message: "Lead duplicado",
          existente: true,
        });
      }
      throw error;
    }

    if (!data) {
      throw new Error("No se pudo crear el lead");
    }

    const leadData = data as { id: string };

    // Obtener datos del lead creado para logging
    const { data: leadCompleto } = await supabase
      .schema("crm")
      .from("cliente")
      .select("id, nombre, vendedor_asignado")
      .eq("id", leadData.id)
      .single();

    const vendedorAsignado = leadCompleto?.vendedor_asignado ?? "Sin asignar";

    console.log(`✅ [WhatsAppLead] Lead creado: ${leadData.id} | Vendedor: ${vendedorAsignado}`);

    return NextResponse.json({
      success: true,
      message: "Lead creado exitosamente",
      clienteId: leadData.id,
      vendedor: vendedorAsignado,
      existente: false,
    });
  } catch (error) {
    console.error("[WhatsAppLead] Error completo:", error);
    console.error("[WhatsAppLead] Error tipo:", typeof error);
    console.error("[WhatsAppLead] Error stack:", error instanceof Error ? error.stack : "N/A");

    const errorMessage = error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : JSON.stringify(error);

    return NextResponse.json(
      {
        error: "Error interno del servidor",
        message: errorMessage,
        details: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * Construye las notas del lead con información del WhatsApp
 */
function buildNotas(data: WhatsAppLeadPayload): string | null {
  const parts = [
    `Lead capturado desde WhatsApp Web`,
    data.mensaje_inicial ? `Mensaje: "${data.mensaje_inicial.substring(0, 200)}"` : null,
    data.chat_id ? `Chat ID: ${data.chat_id}` : null,
  ].filter(Boolean);

  return parts.join(" · ") || null;
}
