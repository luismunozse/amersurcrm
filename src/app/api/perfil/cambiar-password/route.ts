import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";

export async function POST(request: NextRequest) {
  try {
    const { passwordActual, passwordNueva } = await request.json();

    if (!passwordActual || !passwordNueva) {
      return NextResponse.json(
        { success: false, error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    // Validar requisitos de contraseña
    if (passwordNueva.length < 8) {
      return NextResponse.json(
        { success: false, error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 }
      );
    }

    if (!/[A-Z]/.test(passwordNueva)) {
      return NextResponse.json(
        { success: false, error: "La contraseña debe contener al menos una letra mayúscula" },
        { status: 400 }
      );
    }

    if (!/[a-z]/.test(passwordNueva)) {
      return NextResponse.json(
        { success: false, error: "La contraseña debe contener al menos una letra minúscula" },
        { status: 400 }
      );
    }

    if (!/[0-9]/.test(passwordNueva)) {
      return NextResponse.json(
        { success: false, error: "La contraseña debe contener al menos un número" },
        { status: 400 }
      );
    }

    if (passwordActual === passwordNueva) {
      return NextResponse.json(
        { success: false, error: "La nueva contraseña debe ser diferente a la actual" },
        { status: 400 }
      );
    }

    const supabase = await createServerOnlyClient();

    // Obtener el usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user || !user.email) {
      return NextResponse.json(
        { success: false, error: "No autenticado" },
        { status: 401 }
      );
    }

    // Verificar la contraseña actual intentando hacer sign in con un cliente temporal
    // Esto NO afecta la sesión actual
    const { createClient } = await import('@supabase/supabase-js');
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error: verifyError } = await anonClient.auth.signInWithPassword({
      email: user.email,
      password: passwordActual,
    });

    if (verifyError) {
      return NextResponse.json(
        { success: false, error: "La contraseña actual es incorrecta" },
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
        { success: false, error: "Error al actualizar la contraseña" },
        { status: 500 }
      );
    }

    // Actualizar el flag requiere_cambio_password a false si existe
    const { error: flagError } = await supabase
      .from('usuario_perfil')
      .update({ 
        requiere_cambio_password: false,
        updated_at: new Date().toISOString()
      })
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
    console.error("Error en /api/perfil/cambiar-password:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

