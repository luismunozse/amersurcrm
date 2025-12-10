import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase.server";

export const dynamic = "force-dynamic";

/**
 * GET /api/proyectos/[id]/lotes
 *
 * Obtiene lista de lotes disponibles de un proyecto específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: proyectoId } = await params;

    console.log('[API /proyectos/[id]/lotes] GET - Proyecto ID:', proyectoId);

    // Intentar obtener el token del header Authorization (para extensión)
    const authHeader = request.headers.get("authorization");
    let supabase;
    let user;

    if (authHeader?.startsWith("Bearer ")) {
      // Token desde header (extensión de Chrome)
      const token = authHeader.substring(7);
      const supabaseAuth = createServiceRoleClient();

      const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser(token);

      console.log('[API /proyectos/[id]/lotes] User (token):', authUser?.id, 'Error:', authError);

      if (authError || !authUser) {
        return NextResponse.json(
          { error: "No autorizado" },
          { status: 401 }
        );
      }

      user = authUser;
      // Crear un nuevo cliente service role limpio para queries (sin contexto de usuario)
      supabase = createServiceRoleClient();
    } else {
      // Token desde cookies (sesión web normal)
      supabase = await createClient();
      const { data: { user: sessionUser }, error: authError } = await supabase.auth.getUser();

      console.log('[API /proyectos/[id]/lotes] User (session):', sessionUser?.id, 'Error:', authError);

      if (authError || !sessionUser) {
        return NextResponse.json(
          { error: "No autorizado" },
          { status: 401 }
        );
      }

      user = sessionUser;
    }

    // Obtener lotes del proyecto usando RPC (bypasea RLS)
    const { data: lotes, error } = await supabase
      .schema("crm")
      .rpc("get_lotes_by_proyecto_v2", { p_proyecto_id: proyectoId });

    if (error) {
      console.error("[API] Error obteniendo lotes:", error);
      return NextResponse.json(
        { error: "Error obteniendo lotes" },
        { status: 500 }
      );
    }

    console.log(`[API /proyectos/[id]/lotes] Found ${lotes?.length || 0} lotes for proyecto ${proyectoId}`);

    return NextResponse.json({
      success: true,
      lotes: lotes || [],
    });
  } catch (error) {
    console.error("[API] Error en /api/proyectos/[id]/lotes:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
