import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient, createServiceRoleClient } from "@/lib/supabase.server";

export const dynamic = "force-dynamic";

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
          { status: 401 }
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
          { status: 401 }
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
        { status: 400 }
      );
    }

    const supabaseAdmin = createServiceRoleClient();

    // Verificar si ya existe un cliente con este teléfono
    const telefonoLimpio = telefono.replace(/[^\d+]/g, '');

    const { data: clienteExistente } = await supabaseAdmin
      .schema("crm")
      .from("cliente")
      .select("id, nombre, estado_cliente")
      .or(`telefono.eq.${telefonoLimpio},telefono_whatsapp.eq.${telefonoLimpio}`)
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
      });
    }

    // Obtener username del usuario actual
    const { data: perfil } = await supabaseAdmin
      .schema("crm")
      .from("usuario_perfil")
      .select("username")
      .eq("id", user.id)
      .single();

    const vendedorAsignado = perfil?.username || null;

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

    // Crear el lead
    const { data: nuevoCliente, error: insertError } = await supabaseAdmin
      .rpc("create_whatsapp_lead", {
        p_nombre: nombreLead,
        p_telefono: telefonoLimpio,
        p_telefono_whatsapp: telefonoLimpio,
        p_origen_lead: "whatsapp_web",
        p_vendedor_asignado: vendedorAsignado,
        p_created_by: user.id,
        p_notas: notas,
        p_direccion: direccion,
      })
      .single();

    if (insertError) {
      console.error("[CreateLead] Error creando lead:", insertError);

      const message = String(insertError.message ?? "");
      if (message.includes("duplicate key value")) {
        return NextResponse.json({
          success: false,
          message: "El cliente ya existe (duplicado)",
          existente: true,
        });
      }

      throw insertError;
    }

    if (!nuevoCliente) {
      throw new Error("No se pudo crear el lead");
    }

    const clienteData = nuevoCliente as { id: string; nombre: string; telefono: string };

    console.log(`✅ [CreateLead] Lead creado exitosamente: ${clienteData.id} por usuario ${user.id}`);

    return NextResponse.json({
      success: true,
      message: "Lead creado exitosamente",
      clienteId: clienteData.id,
      cliente: clienteData,
      existente: false,
    });

  } catch (error) {
    console.error("[CreateLead] Error:", error);

    return NextResponse.json(
      {
        error: "Error interno del servidor",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
