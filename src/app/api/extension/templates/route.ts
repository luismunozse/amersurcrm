import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase.server";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/extension/templates
 *
 * Retorna plantillas activas para la extensión AmersurChat.
 * Requiere Bearer token válido.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.substring(7);
    const supabase = createServiceRoleClient();

    // Validar token
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Token inválido" },
        { status: 401, headers: corsHeaders }
      );
    }

    // Obtener plantillas activas ordenadas
    const { data: templates, error } = await supabase
      .from("extension_template")
      .select("id, titulo, mensaje, categoria, orden")
      .eq("activo", true)
      .order("orden", { ascending: true });

    if (error) {
      console.error("[API] Error obteniendo plantillas:", error.message);
      return NextResponse.json(
        { error: "Error obteniendo plantillas" },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { templates: templates || [] },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[API] Error en /api/extension/templates:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500, headers: corsHeaders }
    );
  }
}
