"use server";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/clientes/[id]/interacciones
 *
 * Obtiene el historial de interacciones de un cliente
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: clienteId } = await params;

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // Obtener interacciones del cliente ordenadas por fecha (más recientes primero)
    const { data: interacciones, error } = await supabase
      .from("cliente_interaccion")
      .select("*")
      .eq("cliente_id", clienteId)
      .order("fecha_interaccion", { ascending: false })
      .limit(50); // Limitar a las últimas 50 interacciones

    if (error) {
      console.error("[API] Error obteniendo interacciones:", error);
      return NextResponse.json(
        { error: "Error obteniendo interacciones" },
        { status: 500 }
      );
    }

    // Mapear a formato esperado por el componente
    const interaccionesFormateadas = (interacciones || []).map((int: any) => ({
      id: int.id,
      tipo: int.tipo,
      fecha: int.fecha_interaccion,
      descripcion: int.notas || `${int.tipo} - ${int.resultado || 'sin resultado'}`,
      usuario: int.vendedor_username || 'Sistema',
      resultado: int.resultado,
      duracion_minutos: int.duracion_minutos,
      proxima_accion: int.proxima_accion,
      fecha_proxima_accion: int.fecha_proxima_accion,
    }));

    return NextResponse.json({
      success: true,
      interacciones: interaccionesFormateadas,
    });
  } catch (error) {
    console.error("[API] Error en /api/clientes/[id]/interacciones:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
