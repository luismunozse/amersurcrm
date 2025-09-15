import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener propiedades disponibles
    const { data: propiedades, error } = await supabase
      .from('propiedad')
      .select('id, identificacion_interna, tipo, estado_comercial')
      .eq('estado_comercial', 'disponible')
      .order('identificacion_interna', { ascending: true });

    if (error) {
      console.error('Error obteniendo propiedades:', error);
      return NextResponse.json({ error: "Error obteniendo propiedades" }, { status: 500 });
    }

    return NextResponse.json({ propiedades: propiedades || [] });

  } catch (error) {
    console.error('Error en API propiedades:', error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
