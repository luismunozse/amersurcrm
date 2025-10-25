import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase.server";

const DNI_REGEX = /^\d{6,12}$/;

interface PerfilConRol {
  id: string;
  email: string | null;
  rol: {
    nombre: string | null;
  } | null;
}

export async function POST(request: NextRequest) {
  try {
    const { dni, password } = await request.json();

    if (!dni || !password) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 400 }
      );
    }

    const dniSanitized = String(dni).trim();
    if (!DNI_REGEX.test(dniSanitized)) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    const { data: perfil, error: perfilError } = await supabase
      .from("usuario_perfil")
      .select(
        `id, email, rol:rol!usuario_perfil_rol_id_fkey(nombre)`
      )
      .eq("dni", dniSanitized)
      .eq("activo", true)
      .single<PerfilConRol>();

    if (perfilError || !perfil || perfil.rol?.nombre !== "ROL_VENDEDOR") {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    if (!perfil.email) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      email: perfil.email,
    });
  } catch (error) {
    console.error("Error en login con DNI:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
