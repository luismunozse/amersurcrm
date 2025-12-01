"use server";

import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient, createServiceRoleClient } from "@/lib/supabase.server";

export const dynamic = "force-dynamic";

/**
 * GET /api/clientes/[id]/pendientes
 *
 * Obtiene tareas/seguimientos pendientes para un cliente
 * Usado por AmersurChat Chrome Extension para mostrar badge
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clienteId } = await params;

    // Intentar obtener el token del header Authorization (para extensión)
    const authHeader = request.headers.get("authorization");
    let supabase;

    if (authHeader?.startsWith("Bearer ")) {
      // Token desde header (extensión de Chrome)
      const token = authHeader.substring(7);
      const supabaseAdmin = createServiceRoleClient();

      const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !authUser) {
        console.error("[GetPendientes] Error de autenticación con token:", authError);
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
      }

      supabase = supabaseAdmin;
    } else {
      // Token desde cookies (sesión web normal)
      supabase = await createServerOnlyClient();
      const { data: { user: sessionUser } } = await supabase.auth.getUser();

      if (!sessionUser) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
      }
    }

    const hoy = new Date().toISOString();

    // Contar interacciones con próxima acción pendiente (fecha <= hoy)
    const { count: interaccionesPendientes, error: interaccionesError } = await supabase
      .schema("crm")
      .from("interaccion")
      .select("*", { count: 'exact', head: true })
      .eq("cliente_id", clienteId)
      .not("proxima_accion", "is", null)
      .not("fecha_proxima_accion", "is", null)
      .lte("fecha_proxima_accion", hoy);

    if (interaccionesError) {
      console.error("[GetPendientes] Error contando interacciones:", interaccionesError);
    }

    const totalPendientes = (interaccionesPendientes || 0);

    return NextResponse.json({
      success: true,
      pendientes: totalPendientes,
      tiene_pendientes: totalPendientes > 0,
    });
  } catch (error) {
    console.error("[GetPendientes] Error:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
