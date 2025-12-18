import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient, createServiceRoleClient } from "@/lib/supabase.server";

export const dynamic = "force-dynamic";

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

// GET - Obtener información del usuario autenticado (para extensión de Chrome)
export async function GET(request: NextRequest) {
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
        return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: corsHeaders });
      }

      user = authUser;
      supabase = supabaseAdmin;
    } else {
      // Token desde cookies (sesión web normal)
      supabase = await createServerOnlyClient();
      const { data: { user: sessionUser } } = await supabase.auth.getUser();
      user = sessionUser;
    }

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: corsHeaders });
    }

    // Obtener perfil del usuario desde la tabla usuario_perfil
    const { data: perfil, error } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .select(`
        id,
        email,
        nombre_completo,
        username,
        dni,
        telefono,
        activo,
        rol_id,
        rol:rol!usuario_perfil_rol_id_fkey (
          nombre,
          descripcion
        )
      `)
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error obteniendo perfil:', error);
      return NextResponse.json({ error: "Error obteniendo perfil" }, { status: 500, headers: corsHeaders });
    }

    // Formato compatible con la extensión de Chrome
    return NextResponse.json({
      id: perfil.id,
      email: perfil.email,
      username: perfil.username || perfil.email?.split('@')[0] || 'Usuario',
      nombre_completo: perfil.nombre_completo,
      dni: perfil.dni,
      telefono: perfil.telefono,
      activo: perfil.activo,
      rol: perfil.rol
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error en GET /api/auth/me:', error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500, headers: corsHeaders });
  }
}
