import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient, createServiceRoleClient } from "@/lib/supabase.server";

export const dynamic = "force-dynamic";

// CORS headers para extensión de Chrome
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Handler OPTIONS para preflight CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST /api/clientes/create-lead
 *
 * Crea un nuevo lead desde la extensión de Chrome (AmersurChat)
 * Requiere autenticación con JWT token de usuario
 */
export async function POST(request: NextRequest) {
  try {
    // Intentar obtener el token del header Authorization (para extensión)
    const authHeader = request.headers.get("authorization");
    let supabase;
    let user;

    if (authHeader?.startsWith("Bearer ")) {
      // Token desde header (extensión de Chrome)
      const token = authHeader.substring(7);
      const supabaseAdmin = createServiceRoleClient();

      const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !authUser) {
        console.error("[CreateLead] Error de autenticación con token:", authError);
        return NextResponse.json(
          { error: "No autenticado" },
          { status: 401, headers: corsHeaders }
        );
      }

      user = authUser;
      supabase = supabaseAdmin;
    } else {
      // Token desde cookies (sesión web normal)
      supabase = await createServerOnlyClient();
      const { data: { user: sessionUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !sessionUser) {
        console.error("[CreateLead] Error de autenticación:", authError);
        return NextResponse.json(
          { error: "No autenticado" },
          { status: 401, headers: corsHeaders }
        );
      }

      user = sessionUser;
    }

    // Parsear body
    const body = await request.json();
    const { telefono, nombre, mensaje_inicial } = body;

    if (!telefono) {
      return NextResponse.json(
        { error: "El campo 'telefono' es requerido" },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabaseAdmin = createServiceRoleClient();

    // Verificar si ya existe un cliente con este teléfono
    // Limpiar número: solo dígitos (sin +, espacios, guiones, paréntesis, etc.)
    const telefonoLimpio = telefono.replace(/[^\d]/g, '');
    const telefonoConPlus = `+${telefonoLimpio}`;

    const { data: clienteExistente } = await supabaseAdmin
      .schema("crm")
      .from("cliente")
      .select("id, nombre, estado_cliente")
      .or(`telefono.eq.${telefonoLimpio},telefono.eq.${telefonoConPlus},telefono_whatsapp.eq.${telefonoLimpio},telefono_whatsapp.eq.${telefonoConPlus}`)
      .limit(1)
      .maybeSingle();

    if (clienteExistente) {
      console.log(`[CreateLead] Cliente ya existe: ${clienteExistente.id}`);
      return NextResponse.json({
        success: false,
        message: "El cliente ya existe en el CRM",
        clienteId: clienteExistente.id,
        existente: true,
        cliente: clienteExistente,
      }, { headers: corsHeaders });
    }

    // Preparar datos del lead
    const nombreLead = nombre || `Lead WhatsApp ${telefonoLimpio.slice(-4)}`;

    let notas = "Lead capturado automáticamente desde WhatsApp Web";
    if (mensaje_inicial) {
      notas += `\n\nMensaje inicial: "${mensaje_inicial.substring(0, 200)}"`;
    }

    const direccion = {
      calle: "",
      numero: "",
      barrio: "",
      ciudad: "",
      provincia: "",
      pais: "Perú",
    };

    // Crear el lead usando la función RPC con asignación automática round-robin
    // Si vendedor_asignado es NULL, la función asigna automáticamente al siguiente vendedor activo
    const rpcResult = await supabaseAdmin
      .schema("crm")
      .rpc("create_whatsapp_lead", {
        p_nombre: nombreLead,
        p_telefono: telefonoLimpio,
        p_telefono_whatsapp: telefonoLimpio,
        p_origen_lead: "whatsapp_web",
        p_vendedor_asignado: null, // NULL = asignación automática round-robin
        p_created_by: user.id,
        p_notas: notas,
        p_direccion: direccion,
      })
      .single();

    const nuevoCliente = rpcResult.data as { id: string } | null;
    const insertError = rpcResult.error;

    if (insertError) {
      console.error("[CreateLead] Error creando lead:", insertError);
      console.error("[CreateLead] Detalles del error:", JSON.stringify(insertError, null, 2));

      const message = String(insertError.message ?? "");
      if (message.includes("duplicate key value") || message.includes("duplicate")) {
        return NextResponse.json({
          success: false,
          message: "El cliente ya existe (duplicado)",
          existente: true,
        }, { headers: corsHeaders });
      }

      throw insertError;
    }

    if (!nuevoCliente) {
      throw new Error("No se pudo crear el lead");
    }

    const clienteData = {
      id: nuevoCliente.id,
      nombre: nombreLead,
      telefono: telefonoLimpio,
    };

    console.log(`✅ [CreateLead] Lead creado: ${clienteData.id}`);

    return NextResponse.json({
      success: true,
      message: "Lead creado exitosamente",
      clienteId: clienteData.id,
      cliente: clienteData,
      existente: false,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error("[CreateLead] Error completo:", error);
    
    // Log detallado del error
    if (error instanceof Error) {
      console.error("[CreateLead] Error message:", error.message);
      console.error("[CreateLead] Error stack:", error.stack);
    } else {
      console.error("[CreateLead] Error object:", JSON.stringify(error, null, 2));
    }

    return NextResponse.json(
      {
        error: "Error interno del servidor",
        message: error instanceof Error ? error.message : "Unknown error",
        details: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.stack : String(error))
          : undefined,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
