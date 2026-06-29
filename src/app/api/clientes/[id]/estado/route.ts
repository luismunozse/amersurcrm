import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { validateBearerAndEnsureGlobalRole } from "@/lib/auth/extension-auth";

export const dynamic = "force-dynamic";

// CORS headers para extensión de Chrome
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Handler OPTIONS para preflight CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * PATCH /api/clientes/[id]/estado
 *
 * Actualiza el estado de un cliente
 * Usado por AmersurChat Chrome Extension
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Intentar obtener el token del header Authorization (para extensión)
    const authHeader = request.headers.get("authorization");
    let supabase;

    if (authHeader?.startsWith("Bearer ")) {
      // Token desde header (extensión de Chrome) — role-checked via shared helper
      const token = authHeader.slice(7);
      const auth = await validateBearerAndEnsureGlobalRole(token);
      if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status, headers: corsHeaders });
      }
      supabase = auth.supabase;
    } else {
      // Token desde cookies (sesión web normal)
      supabase = await createServerOnlyClient();
      const { data: { user: sessionUser } } = await supabase.auth.getUser();

      if (!sessionUser) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401, headers: corsHeaders });
      }
    }

    const body = await request.json();
    const { estado_cliente, nota } = body;

    if (!estado_cliente) {
      return NextResponse.json(
        { error: "estado_cliente es requerido" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validar estado (sincronizado con el CRM)
    const estadosValidos = [
      "por_contactar",
      "contactado",
      "intermedio",
      "potencial",
      "desestimado",
      "transferido",
    ];

    if (!estadosValidos.includes(estado_cliente)) {
      return NextResponse.json(
        { error: "Estado inválido" },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`[UpdateEstado] Actualizando cliente ${id} a estado: ${estado_cliente}`);

    // Actualizar estado
    const updateData: Record<string, unknown> = {
      estado_cliente,
    };

    // Si hay nota, agregarla o concatenarla
    if (nota) {
      const { data: clienteActual } = await supabase
        .schema("crm")
        .from("cliente")
        .select("notas")
        .eq("id", id)
        .single();

      const notaConFecha = `[${new Date().toLocaleDateString("es-PE")}] ${nota}`;

      if (clienteActual?.notas) {
        updateData.notas = `${clienteActual.notas}\n\n${notaConFecha}`;
      } else {
        updateData.notas = notaConFecha;
      }
    }

    const { data: cliente, error } = await supabase
      .schema("crm")
      .from("cliente")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[UpdateEstado] Error en query:", error);
      return NextResponse.json(
        { error: "Error actualizando cliente" },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`[UpdateEstado] Cliente ${id} actualizado exitosamente`);

    return NextResponse.json({
      success: true,
      cliente: {
        id: cliente.id,
        estado_cliente: cliente.estado_cliente,
        notas: cliente.notas,
      },
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("[UpdateEstado] Error:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
