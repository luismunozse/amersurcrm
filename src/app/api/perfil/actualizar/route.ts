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
    const { nombre_completo, dni, telefono, email } = body;

    // Validaciones
    if (nombre_completo !== undefined) {
      if (!nombre_completo || nombre_completo.trim().length < 3) {
        return NextResponse.json(
          { success: false, error: "El nombre completo debe tener al menos 3 caracteres" },
          { status: 400 }
        );
      }
      if (nombre_completo.length > 100) {
        return NextResponse.json(
          { success: false, error: "El nombre completo no puede tener más de 100 caracteres" },
          { status: 400 }
        );
      }
    }

    if (dni !== undefined && dni !== null) {
      if (!/^\d{8}$/.test(dni)) {
        return NextResponse.json(
          { success: false, error: "El DNI debe tener exactamente 8 dígitos" },
          { status: 400 }
        );
      }
    }

    if (telefono !== undefined && telefono !== null) {
      if (telefono.length > 20) {
        return NextResponse.json(
          { success: false, error: "El teléfono no puede tener más de 20 caracteres" },
          { status: 400 }
        );
      }
    }

    if (email !== undefined) {
      // Validar formato de email
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { success: false, error: "Formato de email inválido. Debe ser un email válido (ej: usuario@ejemplo.com)" },
          { status: 400 }
        );
      }

      // Actualizar email via Supabase Auth (envía correo de confirmación automáticamente)
      const { error: emailError } = await supabase.auth.updateUser({
        email: email
      });

      if (emailError) {
        console.error("Error al actualizar email:", emailError);
        console.error("Error code:", (emailError as any).code);
        console.error("Error message:", emailError.message);

        // Mensajes de error más específicos basados en el código de error
        let errorMessage = "Error al actualizar el email.";

        const errorCode = (emailError as any).code;
        const errorMsg = emailError.message?.toLowerCase() || "";

        if (errorCode === "email_address_invalid" || errorMsg.includes("invalid")) {
          errorMessage = "El formato del email es inválido. Usa un dominio válido como @gmail.com, @outlook.com, @hotmail.com";
        } else if (errorCode === "email_exists" || errorMsg.includes("already") || errorMsg.includes("exists")) {
          errorMessage = "Este email ya está registrado en el sistema.";
        } else if (errorCode === "same_email") {
          errorMessage = "El nuevo email es igual al email actual.";
        } else {
          // Mostrar el error original de Supabase para debugging
          errorMessage = `Error al actualizar email: ${emailError.message}`;
        }

        return NextResponse.json(
          { success: false, error: errorMessage },
          { status: 400 }
        );
      }
    }

    // Construir objeto de actualización dinámicamente
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (nombre_completo !== undefined) {
      updateData.nombre_completo = nombre_completo.trim();
    }

    if (dni !== undefined) {
      updateData.dni = dni || null;
    }

    if (telefono !== undefined) {
      updateData.telefono = telefono || null;
    }

    // Actualizar el perfil del usuario
    const { error: updateError } = await supabase
      .from("usuario_perfil")
      .update(updateData)
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
