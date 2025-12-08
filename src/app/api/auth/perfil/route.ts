import { NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";

// GET - Obtener perfil del usuario autenticado
export async function GET() {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener perfil del usuario
    const { data: perfil, error } = await supabase
      .from('usuario_perfil')
      .select(`
        id,
        email,
        nombre_completo,
        dni,
        telefono,
        requiere_cambio_password,
        activo,
        created_at,
        rol:rol!usuario_perfil_rol_id_fkey (
          nombre,
          descripcion
        )
      `)
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error obteniendo perfil:', error);
      return NextResponse.json({ error: "Error obteniendo perfil" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      perfil
    });

  } catch (error) {
    console.error('Error en GET /api/auth/perfil:', error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
