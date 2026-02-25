import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase.server";
import { dispararAutomatizaciones } from "@/lib/services/marketing-automatizaciones";

export const dynamic = "force-dynamic";

const WEBSITE_API_KEY = process.env.WEBSITE_API_KEY;
const CRM_AUTOMATION_USER_ID = process.env.CRM_AUTOMATION_USER_ID ?? null;
const ALLOWED_ORIGIN = process.env.WEBSITE_ORIGIN || "*";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-website-key",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

interface ContactoPayload {
  nombre: string;
  email?: string;
  telefono?: string;
  mensaje?: string;
  proyecto_interes?: string; // UUID del proyecto
  interes_principal?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/public/contacto
 *
 * Crea un lead desde un formulario de contacto en la web pública.
 * Requiere header: x-website-key
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-website-key");

    if (!WEBSITE_API_KEY || apiKey !== WEBSITE_API_KEY) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401, headers: corsHeaders }
      );
    }

    const body: ContactoPayload = await request.json().catch(() => ({} as ContactoPayload));

    // Validaciones
    if (!body.nombre || typeof body.nombre !== "string" || body.nombre.trim().length === 0) {
      return NextResponse.json(
        { error: "El campo 'nombre' es requerido" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (body.nombre.trim().length > 100) {
      return NextResponse.json(
        { error: "El nombre no puede exceder 100 caracteres" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (body.email && !EMAIL_REGEX.test(body.email)) {
      return NextResponse.json(
        { error: "Formato de email inválido" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (body.mensaje && body.mensaje.length > 500) {
      return NextResponse.json(
        { error: "El mensaje no puede exceder 500 caracteres" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!CRM_AUTOMATION_USER_ID) {
      console.error("[PublicAPI] CRM_AUTOMATION_USER_ID no configurado");
      return NextResponse.json(
        { error: "Error de configuración del servidor" },
        { status: 500, headers: corsHeaders }
      );
    }

    const supabase = createServiceRoleClient();

    const nombre = body.nombre.trim();
    const telefono = body.telefono?.replace(/[^\d]/g, "") || null;

    // Verificar duplicados por teléfono (si se proporcionó)
    if (telefono && telefono.length >= 6) {
      const telefonoConPlus = `+${telefono}`;
      const { data: existente } = await supabase
        .schema("crm")
        .from("cliente")
        .select("id, nombre")
        .or(
          `telefono.eq.${telefono},telefono.eq.${telefonoConPlus},telefono_whatsapp.eq.${telefono},telefono_whatsapp.eq.${telefonoConPlus}`
        )
        .limit(1)
        .maybeSingle();

      if (existente) {
        return NextResponse.json(
          {
            success: true,
            message: "Gracias por tu interés. Nos pondremos en contacto contigo pronto.",
            duplicado: true,
          },
          { headers: corsHeaders }
        );
      }
    }

    // Verificar duplicados por email (si se proporcionó)
    if (body.email) {
      const { data: existentePorEmail } = await supabase
        .schema("crm")
        .from("cliente")
        .select("id, nombre")
        .eq("email", body.email.toLowerCase().trim())
        .limit(1)
        .maybeSingle();

      if (existentePorEmail) {
        return NextResponse.json(
          {
            success: true,
            message: "Gracias por tu interés. Nos pondremos en contacto contigo pronto.",
            duplicado: true,
          },
          { headers: corsHeaders }
        );
      }
    }

    // Construir notas
    const notasParts = ["Lead capturado desde el sitio web"];
    if (body.mensaje) {
      notasParts.push(`Mensaje: "${body.mensaje.substring(0, 500)}"`);
    }
    if (body.proyecto_interes) {
      // Buscar nombre del proyecto para la nota
      const { data: proyecto } = await supabase
        .schema("crm")
        .from("proyecto")
        .select("nombre")
        .eq("id", body.proyecto_interes)
        .maybeSingle();

      if (proyecto) {
        notasParts.push(`Proyecto de interés: ${proyecto.nombre}`);
      }
    }
    if (body.email) {
      notasParts.push(`Email: ${body.email}`);
    }

    const notas = notasParts.join(" · ");

    const direccion = {
      calle: "",
      numero: "",
      barrio: "",
      ciudad: "",
      provincia: "",
      pais: "Perú",
    };

    // Crear lead usando RPC con asignación automática round-robin
    const { data, error } = await supabase
      .rpc("create_whatsapp_lead", {
        p_nombre: nombre,
        p_telefono: telefono || "",
        p_telefono_whatsapp: telefono || "",
        p_origen_lead: "web",
        p_vendedor_asignado: null, // NULL = asignación automática round-robin
        p_created_by: CRM_AUTOMATION_USER_ID,
        p_notas: notas,
        p_direccion: direccion,
      })
      .single();

    if (error) {
      const message = String(error.message ?? "");
      if (message.includes("duplicate key value") || message.includes("duplicate")) {
        return NextResponse.json(
          {
            success: true,
            message: "Gracias por tu interés. Nos pondremos en contacto contigo pronto.",
            duplicado: true,
          },
          { headers: corsHeaders }
        );
      }

      console.error("[PublicAPI] Error creando lead:", error);
      throw error;
    }

    const leadData = data as { id: string } | null;

    if (!leadData) {
      throw new Error("No se pudo crear el lead");
    }

    // Actualizar email si se proporcionó (el RPC no lo acepta)
    if (body.email) {
      await supabase
        .schema("crm")
        .from("cliente")
        .update({ email: body.email.toLowerCase().trim() })
        .eq("id", leadData.id);
    }

    // Actualizar interes_principal si se proporcionó
    if (body.interes_principal) {
      await supabase
        .schema("crm")
        .from("cliente")
        .update({ interes_principal: body.interes_principal })
        .eq("id", leadData.id);
    }

    // Obtener vendedor asignado para logging
    const { data: leadCompleto } = await supabase
      .schema("crm")
      .from("cliente")
      .select("id, nombre, vendedor_asignado")
      .eq("id", leadData.id)
      .single();

    const vendedor = leadCompleto?.vendedor_asignado ?? "Sin asignar";

    console.log(
      `[PublicAPI] Lead web creado: ${leadData.id} | Vendedor: ${vendedor}`
    );

    // Disparar automatizaciones de marketing (fire & forget)
    dispararAutomatizaciones("lead.created", {
      clienteId: leadData.id,
      nombre,
      telefono: telefono || undefined,
      vendedorUsername: vendedor !== "Sin asignar" ? vendedor : undefined,
    }).catch((err) =>
      console.warn("[PublicAPI] Error automatizaciones lead.created:", err)
    );

    return NextResponse.json(
      {
        success: true,
        message: "Gracias por tu interés. Nos pondremos en contacto contigo pronto.",
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[PublicAPI] Error en /api/public/contacto:", error);
    return NextResponse.json(
      {
        error: "Error procesando tu solicitud. Intenta nuevamente.",
        details:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : undefined,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
