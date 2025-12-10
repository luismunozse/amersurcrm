import { NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";

// GET - Obtener información del usuario autenticado (para extensión de Chrome)
export async function GET() {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener perfil del usuario desde la tabla usuario_perfil
    const { data: perfil, error } = await supabase
      .from('usuario_perfil')
      .select(`
        id,
        email,
        nombre_completo,
        username,
        dni,
        telefono,
        activo,
        rol_id,
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

    // Formato compatible con la extensión de Chrome
    return NextResponse.json({
      id: perfil.id,
      email: perfil.email,
      username: perfil.username || perfil.email?.split('@')[0] || 'Usuario',
      nombre_completo: perfil.nombre_completo,
      dni: perfil.dni,
      telefono: perfil.telefono,
      activo: perfil.activo,
      rol: perfil.rol
    });

  } catch (error) {
    console.error('Error en GET /api/auth/me:', error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
