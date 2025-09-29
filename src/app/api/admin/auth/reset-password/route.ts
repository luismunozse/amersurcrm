import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase.server";

export async function POST(request: NextRequest) {
  try {
    const { dni, newPassword } = await request.json();

    if (!dni || !newPassword) {
      return NextResponse.json(
        { error: "dni y newPassword son requeridos" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // 1) Obtener el perfil por DNI (mismo schema crm)
    const { data: perfil, error: perfilError } = await supabase
      .from("usuario_perfil")
      .select("id, email, dni")
      .eq("dni", dni.trim())
      .single();

    if (perfilError || !perfil) {
      return NextResponse.json(
        { error: "Usuario no encontrado por DNI" },
        { status: 404 }
      );
    }

    // 2) Actualizar la contraseña en auth.users usando el ID del perfil (coincide con auth.user.id)
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      perfil.id,
      { password: newPassword }
    );

    if (updateError) {
      return NextResponse.json(
        { error: "No se pudo actualizar la contraseña", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, dni: perfil.dni, email: perfil.email });
  } catch (error) {
    console.error("Error en reset-password (admin):", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}



