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

    if (!inicio || !fin) {
      return NextResponse.json({ error: "Fechas de inicio y fin requeridas" }, { status: 400 });
    }

    // Obtener eventos del usuario en el rango de fechas
    const { data: eventos, error } = await supabase
      .from('evento')
      .select(`
        *,
        cliente:cliente_id(id, nombre, telefono, email),
        propiedad:propiedad_id(id, identificacion_interna, tipo)
      `)
      .eq('vendedor_id', user.id)
      .gte('fecha_inicio', inicio)
      .lte('fecha_inicio', fin)
      .order('fecha_inicio', { ascending: true });

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
