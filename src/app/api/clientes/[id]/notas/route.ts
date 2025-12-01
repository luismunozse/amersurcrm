import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient, createServiceRoleClient } from "@/lib/supabase.server";

export const dynamic = "force-dynamic";

/**
 * POST /api/clientes/[id]/notas
 *
 * Agrega una nota rápida al cliente (append a notas existentes)
 * Usado por AmersurChat Chrome Extension
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clienteId } = await params;

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
        console.error("[AddNota] Error de autenticación con token:", authError);
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
      }

      user = authUser;
      supabase = supabaseAdmin;
    } else {
      // Token desde cookies (sesión web normal)
      supabase = await createServerOnlyClient();
      const { data: { user: sessionUser } } = await supabase.auth.getUser();

      if (!sessionUser) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
      }

      user = sessionUser;
    }

    // Parsear body
    const body = await request.json();
    const { nota } = body;

    if (!nota || typeof nota !== 'string') {
      return NextResponse.json(
        { error: "El campo 'nota' es requerido" },
        { status: 400 }
      );
    }

    // Obtener cliente actual
    const { data: cliente, error: fetchError } = await supabase
      .schema("crm")
      .from("cliente")
      .select("notas")
      .eq("id", clienteId)
      .single();

    if (fetchError) {
      console.error("[AddNota] Error obteniendo cliente:", fetchError);
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    // Agregar nueva nota al final de las notas existentes
    const notasActuales = cliente.notas || "";
    const nuevasNotas = notasActuales
      ? `${notasActuales}\n\n${nota}`
      : nota;

    // Actualizar cliente
    const { data: updatedCliente, error: updateError } = await supabase
      .schema("crm")
      .from("cliente")
      .update({ notas: nuevasNotas })
      .eq("id", clienteId)
      .select()
      .single();

    if (updateError) {
      console.error("[AddNota] Error actualizando cliente:", updateError);
      return NextResponse.json(
        { error: "Error actualizando notas", details: updateError.message },
        { status: 500 }
      );
    }

    console.log(`✅ [AddNota] Nota agregada al cliente ${clienteId}`);

    return NextResponse.json({
      success: true,
      cliente: updatedCliente,
    });
  } catch (error) {
    console.error("[AddNota] Error:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
