import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";

export async function POST(request: NextRequest) {
  try {
    const { passwordActual, passwordNueva } = await request.json();

    if (!passwordActual || !passwordNueva) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    const supabase = await createServerOnlyClient();

    // Obtener el usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    // Verificar que el usuario requiere cambio de password
    const { data: perfil, error: perfilError } = await supabase
      .from('usuario_perfil')
      .select('requiere_cambio_password')
      .eq('id', user.id)
      .single();

    if (perfilError) {
      console.error("Error obteniendo perfil:", perfilError);
      return NextResponse.json(
        { error: "Error al verificar perfil del usuario" },
        { status: 500 }
      );
    }

    if (!perfil) {
      return NextResponse.json(
        { error: "Perfil de usuario no encontrado" },
        { status: 404 }
      );
    }

    if (!perfil.requiere_cambio_password) {
      return NextResponse.json(
        { error: "La contraseña ya fue actualizada anteriormente" },
        { status: 400 }
      );
    }

    // Primero, verificar la contraseña actual intentando hacer sign in
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: passwordActual,
    });

    if (verifyError) {
      return NextResponse.json(
        { error: "La contraseña actual es incorrecta" },
        { status: 400 }
      );
    }

    // Cambiar la contraseña usando updateUser
    const { error: updateError } = await supabase.auth.updateUser({
      password: passwordNueva,
    });

    if (updateError) {
      console.error("Error actualizando contraseña:", updateError);
      return NextResponse.json(
        { error: "Error al actualizar la contraseña" },
        { status: 500 }
      );
    }

    // Actualizar el flag requiere_cambio_password a false
    const { error: flagError } = await supabase
      .from('usuario_perfil')
      .update({ requiere_cambio_password: false })
      .eq('id', user.id);

    if (flagError) {
      console.error("Error actualizando flag:", flagError);
      // No retornamos error porque la contraseña ya se cambió exitosamente
    }

    return NextResponse.json({
      success: true,
      message: "Contraseña actualizada exitosamente"
    });

  } catch (error) {
    console.error("Error en cambiar-password:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
