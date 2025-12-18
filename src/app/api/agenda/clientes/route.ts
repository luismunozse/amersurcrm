import { NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";

export async function GET(request: Request) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener parámetros de búsqueda
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    // Obtener el rol del usuario para verificar permisos
    const { data: perfil } = await supabase
      .from('usuario_perfil')
      .select('username, rol:rol!usuario_perfil_rol_id_fkey(nombre)')
      .eq('id', user.id)
      .single();

    const rolData = perfil?.rol as { nombre: string } | { nombre: string }[] | null;
    const rolNombre = Array.isArray(rolData) ? rolData[0]?.nombre : rolData?.nombre;
    const esAdmin = rolNombre === 'ROL_ADMIN';
    const esGerente = rolNombre === 'ROL_GERENTE';

    // Consulta optimizada con límite bajo para evitar timeout
    let query = supabase
      .from('cliente')
      .select('id, nombre, telefono')
      .limit(100); // Límite bajo para carga rápida

    // Filtro por rol
    if (!esAdmin && !esGerente) {
      // Vendedor: solo clientes asignados
      query = query.eq('vendedor_asignado', user.id);
    }

    // Filtro por búsqueda (si se proporciona)
    if (search.trim()) {
      query = query.or(`nombre.ilike.%${search}%,telefono.ilike.%${search}%`);
    }

    const { data: clientes, error } = await query;

    if (error) {
      console.error('Error obteniendo clientes:', error);
      return NextResponse.json({ error: "Error obteniendo clientes" }, { status: 500 });
    }

    return NextResponse.json({ clientes: clientes || [] });

  } catch (error) {
    console.error('Error en API clientes:', error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
