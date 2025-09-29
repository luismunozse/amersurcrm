import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase.server";

export async function POST(request: NextRequest) {
  try {
    const { dni, password } = await request.json();

    if (!dni || !password) {
      return NextResponse.json(
        { error: "DNI y contraseña son requeridos" },
        { status: 400 }
      );
    }

    // Usar cliente de servicio para bypass RLS
    const supabase = createServiceRoleClient();

    // Debug: Log de entrada
    console.log("🔍 Login DNI - Datos recibidos:", { dni, password: "***" });

    // Buscar el usuario por DNI en la tabla usuario_perfil del esquema crm
    const { data: perfil, error: perfilError } = await supabase
      .from('usuario_perfil')
      .select(`
        id,
        email,
        nombre_completo,
        dni,
        rol_id,
        rol:rol!usuario_perfil_rol_id_fkey (
          id,
          nombre,
          descripcion,
          permisos
        )
      `)
      .eq('dni', dni.trim())
      .eq('activo', true)
      .single();

    // Debug: Log de la consulta
    console.log("🔍 Login DNI - Resultado consulta:", { 
      perfil, 
      perfilError,
      dniTrimmed: dni.trim()
    });

    if (perfilError || !perfil) {
      console.log("❌ Login DNI - Usuario no encontrado:", { perfilError, perfil });
      return NextResponse.json(
        { error: "Usuario no encontrado o inactivo" },
        { status: 401 }
      );
    }

    // Verificar que sea un vendedor
    if (perfil.rol?.nombre !== 'ROL_VENDEDOR') {
      return NextResponse.json(
        { error: "Acceso denegado. Solo vendedores pueden usar DNI" },
        { status: 403 }
      );
    }

    // Devolver email para que el cliente haga el signIn y setee la sesión
    if (!perfil.email) {
      return NextResponse.json(
        { error: "El usuario no tiene un email asociado en auth" },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      email: perfil.email,
      user: {
        id: perfil.id,
        email: perfil.email,
        nombre: perfil.nombre_completo,
        dni: perfil.dni,
        rol: perfil.rol
      }
    });

  } catch (error) {
    console.error("Error en login con DNI:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
