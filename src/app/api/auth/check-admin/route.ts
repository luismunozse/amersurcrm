import { NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";

export async function GET() {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ isAdmin: false });
    }

    // Obtener perfil del usuario
    const { data: perfil, error: perfilError } = await supabase
      .from('usuario_perfil')
      .select('rol_id')
      .eq('id', user.id)
      .single();

    if (perfilError) {
      console.error('Error obteniendo perfil:', perfilError);
      return NextResponse.json({ isAdmin: false });
    }

    // Obtener rol
    if (!perfil.rol_id) {
      return NextResponse.json({ isAdmin: false });
    }

    const { data: rol, error: rolError } = await supabase
      .from('rol')
      .select('nombre')
      .eq('id', perfil.rol_id)
      .single();

    if (rolError) {
      console.error('Error obteniendo rol:', rolError);
      return NextResponse.json({ isAdmin: false });
    }

    const isAdmin = rol.nombre === 'ROL_ADMIN';

    return NextResponse.json({ isAdmin });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json({ isAdmin: false });
  }
}
