import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener clientes del usuario
    const { data: clientes, error } = await supabase
      .from('cliente')
      .select('id, nombre, telefono, email')
      .eq('vendedor_asignado', user.id)
      .order('nombre', { ascending: true });

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
