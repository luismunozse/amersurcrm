import { NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";

export async function POST(request: Request) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "No autenticado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { telefono } = body;

    // Validar teléfono (opcional, puede estar vacío)
    if (telefono && telefono.length > 20) {
      return NextResponse.json(
        { success: false, error: "El teléfono no puede tener más de 20 caracteres" },
        { status: 400 }
      );
    }

    // Actualizar el perfil del usuario
    const { error: updateError } = await supabase
      .from("usuario_perfil")
      .update({
        telefono: telefono || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error al actualizar perfil:", updateError);
      return NextResponse.json(
        { success: false, error: "Error al actualizar el perfil" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Perfil actualizado exitosamente",
    });
  } catch (error) {
    console.error("Error en /api/perfil/actualizar:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
