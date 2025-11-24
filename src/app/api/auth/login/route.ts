import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient, createServiceRoleClient } from "@/lib/supabase.server";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/login
 *
 * Endpoint de autenticación para AmersurChat Chrome Extension
 * También usado por otras aplicaciones que necesiten autenticarse con el CRM
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, username, password } = body;

    // Aceptar tanto email como username
    const loginIdentifier = email || username;

    if (!loginIdentifier || !password) {
      return NextResponse.json(
        { error: "Usuario/Email y contraseña son requeridos" },
        { status: 400 }
      );
    }

    const supabase = await createServerOnlyClient();
    const supabaseAdmin = createServiceRoleClient();

    let emailToUse = loginIdentifier;

    // Si no es un email válido, buscar el email por username
    if (!loginIdentifier.includes('@')) {
      const { data: perfilData } = await supabaseAdmin
        .schema("crm")
        .from("usuario_perfil")
        .select("id")
        .eq("username", loginIdentifier)
        .maybeSingle();

      if (perfilData?.id) {
        // Obtener el email del usuario desde auth.users usando admin client
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(perfilData.id);
        if (userError) {
          console.error("[Login] Error obteniendo usuario:", userError);
        }
        if (userData?.user?.email) {
          emailToUse = userData.user.email;
        } else {
          console.error("[Login] No se encontró email para username:", loginIdentifier);
          return NextResponse.json(
            { error: "Usuario no encontrado" },
            { status: 404 }
          );
        }
      } else {
        console.error("[Login] No se encontró perfil para username:", loginIdentifier);
        return NextResponse.json(
          { error: "Usuario no encontrado" },
          { status: 404 }
        );
      }
    }

    console.log("[Login] Intentando autenticar con email:", emailToUse);

    // Autenticar con Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password,
    });

    if (authError) {
      console.error("[Login] Error de autenticación:", authError.message);
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    // Obtener información adicional del usuario desde usuario_perfil
    const { data: perfil, error: perfilError } = await supabase
      .schema("crm")
      .from("usuario_perfil")
      .select("username, rol")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (perfilError) {
      console.error("[Login] Error obteniendo perfil:", perfilError);
    }

    console.log(`[Login] Usuario autenticado: ${emailToUse} (${authData.user.id})`);

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email || emailToUse,
        username: perfil?.username || (authData.user.email || emailToUse).split("@")[0],
        rol: perfil?.rol || "vendedor",
      },
      token: authData.session.access_token,
    });
  } catch (error) {
    console.error("[Login] Error:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
