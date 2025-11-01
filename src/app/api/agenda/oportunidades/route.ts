import { NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";

export async function GET() {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener oportunidades abiertas del vendedor con datos del cliente
    const { data: oportunidades, error } = await supabase
      .from('oportunidad')
      .select(`
        id,
        cliente_id,
        etapa,
        estado,
        valor_estimado,
        moneda,
        probabilidad,
        cliente:cliente_id (
          id,
          nombre,
          telefono,
          email
        )
      `)
      .eq('vendedor_id', user.id)
      .in('estado', ['abierta', 'pausada'])
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error obteniendo oportunidades:', error);
      return NextResponse.json({ error: "Error obteniendo oportunidades" }, { status: 500 });
    }

    // Formatear datos para el select
    const oportunidadesFormateadas = (oportunidades || []).map((op: any) => ({
      id: op.id,
      cliente_id: op.cliente_id,
      cliente_nombre: op.cliente?.nombre || 'Sin cliente',
      etapa: op.etapa,
      estado: op.estado,
      valor_estimado: op.valor_estimado,
      moneda: op.moneda || 'PEN',
      probabilidad: op.probabilidad,
      label: `${op.cliente?.nombre || 'Sin cliente'} - ${op.etapa} (${op.probabilidad || 0}%)`,
    }));

    return NextResponse.json({ oportunidades: oportunidadesFormateadas });

  } catch (error) {
    console.error('Error en API oportunidades:', error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
