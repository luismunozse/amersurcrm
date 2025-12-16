import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase.server";

// CORS headers para extensión de Chrome
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Handler OPTIONS para preflight CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/proyectos/list
 *
 * Obtiene lista de proyectos activos
 */
export async function GET(request: NextRequest) {
  try {
    // Intentar obtener el token del header Authorization (para extensión)
    const authHeader = request.headers.get("authorization");
    let supabase;

    if (authHeader?.startsWith("Bearer ")) {
      // Token desde header (extensión de Chrome)
      const token = authHeader.substring(7);
      const supabaseAuth = createServiceRoleClient();

      const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser(token);

      console.log('[API /proyectos/list] User (token):', authUser?.id, 'Error:', authError);

      if (authError || !authUser) {
        return NextResponse.json(
          { error: "No autorizado" },
          { status: 401, headers: corsHeaders }
        );
      }

      // Crear un nuevo cliente service role limpio para queries (sin contexto de usuario)
      supabase = createServiceRoleClient();
    } else {
      // Token desde cookies (sesión web normal)
      supabase = await createClient();
      const { data: { user: sessionUser }, error: authError } = await supabase.auth.getUser();

      console.log('[API /proyectos/list] User (session):', sessionUser?.id, 'Error:', authError);

      if (authError || !sessionUser) {
        return NextResponse.json(
          { error: "No autorizado" },
          { status: 401, headers: corsHeaders }
        );
      }
    }

    // Obtener proyectos activos usando RPC (bypasea RLS)
    const { data: proyectos, error } = await supabase
      .schema("crm")
      .rpc("get_proyectos_activos");

    if (error) {
      console.error("[API] Error obteniendo proyectos:", error);
      return NextResponse.json(
        { error: "Error obteniendo proyectos" },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      proyectos: proyectos || [],
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("[API] Error en /api/proyectos/list:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500, headers: corsHeaders }
    );
  }
}
