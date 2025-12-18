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

    // OPTIMIZADO: Obtener todos los datos en 3 queries paralelas en lugar de N*4 queries
    const [lotesResult, reservasResult, ventasResult] = await Promise.all([
      // Query 1: Obtener todos los lotes de una vez
      supabase
        .from("lote")
        .select("id, codigo, proyecto_id")
        .in("id", lote_ids),

      // Query 2: Obtener todas las reservas de esos lotes
      supabase
        .from("reserva")
        .select("lote_id")
        .in("lote_id", lote_ids),

      // Query 3: Obtener todas las ventas de esos lotes
      supabase
        .from("venta")
        .select("lote_id")
        .in("lote_id", lote_ids),
    ]);

    // Crear mapas para búsqueda rápida O(1)
    const lotesMap = new Map<string, { id: string; codigo: string; proyecto_id: string }>();
    (lotesResult.data || []).forEach(lote => lotesMap.set(lote.id, lote));

    const lotesConReservas = new Set<string>();
    (reservasResult.data || []).forEach(r => lotesConReservas.add(r.lote_id));

    const lotesConVentas = new Set<string>();
    (ventasResult.data || []).forEach(v => lotesConVentas.add(v.lote_id));

    // Procesar cada lote y determinar cuáles se pueden eliminar
    const lotesAEliminar: string[] = [];

    for (const loteId of lote_ids) {
      const lote = lotesMap.get(loteId);

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

      if (lotesConReservas.has(loteId)) {
        result.errors.push({
          lote_id: loteId,
          codigo: lote.codigo,
          error: "No se puede eliminar porque tiene reservas asociadas",
        });
        continue;
      }

      if (lotesConVentas.has(loteId)) {
        result.errors.push({
          lote_id: loteId,
          codigo: lote.codigo,
          error: "No se puede eliminar porque tiene ventas asociadas",
        });
        continue;
      }

      lotesAEliminar.push(loteId);
    }

    // Query 4: Eliminar todos los lotes válidos de una vez
    if (lotesAEliminar.length > 0) {
      const { error: deleteError } = await supabase
        .from("lote")
        .delete()
        .in("id", lotesAEliminar);

      if (deleteError) {
        // Si falla el batch, agregar error para cada lote
        lotesAEliminar.forEach(loteId => {
          const lote = lotesMap.get(loteId);
          result.errors.push({
            lote_id: loteId,
            codigo: lote?.codigo,
            error: deleteError.message,
          });
        });
      } else {
        result.deleted = lotesAEliminar.length;
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
