import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";

interface DeleteResult {
  success: boolean;
  total: number;
  deleted: number;
  errors: Array<{
    lote_id: string;
    codigo?: string;
    error: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerOnlyClient();

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    // Verificar permisos de administrador
    const { data: perfil, error: perfilError } = await supabase
      .from("usuario_perfil")
      .select("rol_id")
      .eq("id", user.id)
      .single();

    if (perfilError || !perfil?.rol_id) {
      return NextResponse.json(
        { error: "No tienes permisos para eliminar lotes. Solo los administradores pueden realizar esta acción." },
        { status: 403 }
      );
    }

    const { data: rol, error: rolError } = await supabase
      .from("rol")
      .select("nombre")
      .eq("id", perfil.rol_id)
      .single();

    if (rolError || rol?.nombre !== "ROL_ADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos para eliminar lotes. Solo los administradores pueden realizar esta acción." },
        { status: 403 }
      );
    }

    // Obtener los IDs de los lotes a eliminar
    const { lote_ids, proyecto_id } = await request.json();

    if (!lote_ids || !Array.isArray(lote_ids) || lote_ids.length === 0) {
      return NextResponse.json(
        { error: "No se proporcionaron IDs de lotes para eliminar" },
        { status: 400 }
      );
    }

    if (!proyecto_id) {
      return NextResponse.json(
        { error: "No se proporcionó el ID del proyecto" },
        { status: 400 }
      );
    }

    const result: DeleteResult = {
      success: true,
      total: lote_ids.length,
      deleted: 0,
      errors: [],
    };

    // Eliminar cada lote
    for (const loteId of lote_ids) {
      try {
        // Verificar que el lote pertenece al proyecto
        const { data: lote, error: fetchError } = await supabase
          .from("lote")
          .select("id, codigo, proyecto_id")
          .eq("id", loteId)
          .single();

        if (fetchError) {
          result.errors.push({
            lote_id: loteId,
            error: `Error obteniendo lote: ${fetchError.message}`,
          });
          continue;
        }

        if (!lote) {
          result.errors.push({
            lote_id: loteId,
            error: "Lote no encontrado",
          });
          continue;
        }

        if (lote.proyecto_id !== proyecto_id) {
          result.errors.push({
            lote_id: loteId,
            codigo: lote.codigo,
            error: "El lote no pertenece a este proyecto",
          });
          continue;
        }

        // Verificar si el lote tiene reservas o ventas
        const { data: reservas } = await supabase
          .from("reserva")
          .select("id")
          .eq("lote_id", loteId)
          .limit(1);

        const { data: ventas } = await supabase
          .from("venta")
          .select("id")
          .eq("lote_id", loteId)
          .limit(1);

        if (reservas && reservas.length > 0) {
          result.errors.push({
            lote_id: loteId,
            codigo: lote.codigo,
            error: "No se puede eliminar porque tiene reservas asociadas",
          });
          continue;
        }

        if (ventas && ventas.length > 0) {
          result.errors.push({
            lote_id: loteId,
            codigo: lote.codigo,
            error: "No se puede eliminar porque tiene ventas asociadas",
          });
          continue;
        }

        // Eliminar el lote
        const { error: deleteError } = await supabase
          .from("lote")
          .delete()
          .eq("id", loteId);

        if (deleteError) {
          result.errors.push({
            lote_id: loteId,
            codigo: lote.codigo,
            error: deleteError.message,
          });
        } else {
          result.deleted++;
        }
      } catch (error) {
        result.errors.push({
          lote_id: loteId,
          error: error instanceof Error ? error.message : "Error desconocido",
        });
      }
    }

    // Si no se eliminó ninguno, marcar como error
    if (result.deleted === 0) {
      result.success = false;
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error eliminando lotes:", error);
    return NextResponse.json(
      {
        error: "Error procesando la solicitud",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}
