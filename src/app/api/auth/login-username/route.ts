import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase.server";

interface RolRelacion {
  nombre: string | null;
}

type RolData = RolRelacion | RolRelacion[] | null;

interface UsuarioConRol {
  email: string | null;
  activo: boolean | null;
  username: string | null;
  rol: RolData;
}

/**
 * API endpoint para login de administradores usando username
 * Convierte el username a email para que Supabase Auth pueda autenticar
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username y contraseña son requeridos" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();


    // Buscar el email asociado al username (o email directamente para compatibilidad)
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuario_perfil')
      .select('email, activo, username, rol:rol!usuario_perfil_rol_fk(nombre)')
      .or(`username.eq.${username.trim()},email.eq.${username.trim()}`)
      .single<UsuarioConRol>();


    if (usuarioError || !usuario) {
      console.error('Error buscando usuario:', usuarioError);
      return NextResponse.json(
        { error: "Usuario no encontrado", debug: usuarioError?.message },
        { status: 404 }
      );
    }

    // Verificar que el usuario esté activo
    if (!usuario.activo) {
      return NextResponse.json(
        { error: "Usuario inactivo. Contacta al administrador." },
        { status: 403 }
      );
    }

    const rol = usuario.rol;
    const rolNombre = Array.isArray(rol) ? rol[0]?.nombre : rol?.nombre;

    // Retornar el email para que el cliente pueda hacer signInWithPassword
    return NextResponse.json({
      success: true,
      email: usuario.email,
      rol: rolNombre
    });

  } catch (error) {
    console.error("Error en login-username:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
