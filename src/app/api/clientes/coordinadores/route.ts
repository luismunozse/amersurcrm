import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient, createServiceRoleClient } from "@/lib/supabase.server";

export const dynamic = "force-dynamic";

// CORS headers para extensión de Chrome
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Only global-visibility roles may list coordinadores for lead assignment.
const ROLES_GLOBALES = ["ROL_ADMIN", "ROL_GERENTE"];

// Handler OPTIONS para preflight CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/clientes/coordinadores
 *
 * Lists active coordinadores (username + display name) so admin/gerente can
 * pin a lead to a coordinador from the Chrome extension (AmersurChat). The
 * coordinador becomes the lead owner and distributes it to their team later.
 *
 * Supports both Bearer-token auth (extension) and cookie session (web).
 * Gated to admin/gerente — any other caller gets 403 and never sees the list.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    let supabase;
    let user;

    if (authHeader?.startsWith("Bearer ")) {
      // Token desde header (extensión de Chrome)
      const token = authHeader.substring(7);
      const supabaseAdmin = createServiceRoleClient();
      const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !authUser) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401, headers: corsHeaders });
      }

      user = authUser;
      supabase = supabaseAdmin;
    } else {
      // Token desde cookies (sesión web normal)
      supabase = await createServerOnlyClient();
      const { data: { user: sessionUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !sessionUser) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401, headers: corsHeaders });
      }

      user = sessionUser;
    }

    // Role gate: only admin/gerente may list coordinadores.
    const { data: callerPerfil } = await supabase
      .schema("crm")
      .from("usuario_perfil")
      .select("rol:rol!usuario_perfil_rol_id_fkey(nombre)")
      .eq("id", user.id)
      .single();

    // PostgREST may return the joined rol as an array or a plain object.
    const callerRolData = (callerPerfil as any)?.rol;
    const callerRol = Array.isArray(callerRolData) ? callerRolData[0]?.nombre : callerRolData?.nombre;

    if (!callerRol || !ROLES_GLOBALES.includes(callerRol)) {
      return NextResponse.json({ error: "Permiso insuficiente" }, { status: 403, headers: corsHeaders });
    }

    // Fetch active coordinadores. Service-role is required because
    // usuario_perfil RLS would deny reading other users' rows.
    const supabaseAdmin = createServiceRoleClient();
    const { data, error } = await supabaseAdmin
      .schema("crm")
      .from("usuario_perfil")
      .select("username, nombre_completo, activo, rol:rol!usuario_perfil_rol_id_fkey(nombre)")
      .eq("activo", true);

    if (error) {
      console.error("[Coordinadores] Error obteniendo coordinadores:", error);
      return NextResponse.json({ error: "Error al obtener coordinadores" }, { status: 500, headers: corsHeaders });
    }

    const coordinadores = (data ?? [])
      .filter((row: any) => {
        const rolData = row?.rol;
        const rol = Array.isArray(rolData) ? rolData[0]?.nombre : rolData?.nombre;
        return rol === "ROL_COORDINADOR_VENTAS";
      })
      .map((row: any) => ({
        username: row.username,
        nombre_completo: row.nombre_completo ?? null,
      }))
      .filter((row) => Boolean(row.username));

    return NextResponse.json({ coordinadores }, { headers: corsHeaders });
  } catch (error) {
    console.error("[Coordinadores] Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500, headers: corsHeaders });
  }
}
