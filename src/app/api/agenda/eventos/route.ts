import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const inicio = searchParams.get('inicio');
    const fin = searchParams.get('fin');
    const clienteId = searchParams.get('cliente_id');
    const limit = searchParams.get('limit');

    let query = supabase
      .from('evento')
      .select(`
        id,
        titulo,
        tipo,
        estado,
        fecha_inicio,
        fecha_fin,
        prioridad,
        cliente:cliente_id(id, nombre),
        propiedad:propiedad_id(id, identificacion_interna)
      `)
      .eq('vendedor_id', user.id);

    // Filtrar por cliente si se especifica (para timeline)
    if (clienteId) {
      query = query.eq('cliente_id', clienteId);
    }

    // Filtrar por rango de fechas si se especifica
    if (inicio && fin) {
      query = query.gte('fecha_inicio', inicio).lte('fecha_inicio', fin);
    }

    // Ordenar por fecha descendente (más recientes primero)
    query = query.order('fecha_inicio', { ascending: false });

    // Limitar resultados si se especifica
    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data: eventos, error } = await query;

    if (error) {
      console.error('Error obteniendo eventos:', error);
      return NextResponse.json({ error: "Error obteniendo eventos" }, { status: 500 });
    }

    return NextResponse.json({ eventos: eventos || [] });

  } catch (error) {
    console.error('Error en API eventos:', error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
