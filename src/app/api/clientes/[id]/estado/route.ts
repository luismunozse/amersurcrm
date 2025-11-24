import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/clientes/[id]/estado
 *
 * Actualiza el estado de un cliente
 * Usado por AmersurChat Chrome Extension
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerOnlyClient();

    // Verificar autenticación
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { estado_cliente, nota } = body;

    if (!estado_cliente) {
      return NextResponse.json(
        { error: "estado_cliente es requerido" },
        { status: 400 }
      );
    }

    // Validar estado
    const estadosValidos = [
      "por_contactar",
      "contactado",
      "interesado",
      "negociacion",
      "cerrado",
      "perdido",
    ];

    if (!estadosValidos.includes(estado_cliente)) {
      return NextResponse.json(
        { error: "Estado inválido" },
        { status: 400 }
      );
    }

    console.log(`[UpdateEstado] Actualizando cliente ${id} a estado: ${estado_cliente}`);

    // Actualizar estado
    const updateData: any = {
      estado_cliente,
      updated_at: new Date().toISOString(),
    };

    // Si hay nota, agregarla o concatenarla
    if (nota) {
      const { data: clienteActual } = await supabase
        .schema("crm")
        .from("cliente")
        .select("notas")
        .eq("id", id)
        .single();

      const notaConFecha = `[${new Date().toLocaleDateString("es-PE")}] ${nota}`;

      if (clienteActual?.notas) {
        updateData.notas = `${clienteActual.notas}\n\n${notaConFecha}`;
      } else {
        updateData.notas = notaConFecha;
      }
    }

    const { data: cliente, error } = await supabase
      .schema("crm")
      .from("cliente")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[UpdateEstado] Error en query:", error);
      return NextResponse.json(
        { error: "Error actualizando cliente", details: error.message },
        { status: 500 }
      );
    }

    console.log(`[UpdateEstado] Cliente ${id} actualizado exitosamente`);

    return NextResponse.json({
      success: true,
      cliente: {
        id: cliente.id,
        estado_cliente: cliente.estado_cliente,
        notas: cliente.notas,
      },
    });
  } catch (error) {
    console.error("[UpdateEstado] Error:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
