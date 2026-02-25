import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase.server";

const WEBSITE_API_KEY = process.env.WEBSITE_API_KEY;
const ALLOWED_ORIGIN = process.env.WEBSITE_ORIGIN || "*";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-website-key",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/public/disponibilidad/[proyectoId]
 *
 * Resumen de disponibilidad de lotes de un proyecto.
 * Pensado para widgets tipo "X lotes disponibles desde S/ Y".
 * Requiere header: x-website-key
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ proyectoId: string }> }
) {
  try {
    const apiKey = request.headers.get("x-website-key");

    if (!WEBSITE_API_KEY || apiKey !== WEBSITE_API_KEY) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401, headers: corsHeaders }
      );
    }

    const { proyectoId } = await params;

    if (!proyectoId) {
      return NextResponse.json(
        { error: "ID de proyecto requerido" },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createServiceRoleClient();

    // Verificar que el proyecto existe y está activo
    const { data: proyecto } = await supabase
      .schema("crm")
      .from("proyecto")
      .select("id, nombre")
      .eq("id", proyectoId)
      .eq("estado", "activo")
      .maybeSingle();

    if (!proyecto) {
      return NextResponse.json(
        { error: "Proyecto no encontrado" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Obtener todos los lotes del proyecto
    const { data: lotes, error } = await supabase
      .schema("crm")
      .from("lote")
      .select("estado, precio, moneda")
      .eq("proyecto_id", proyectoId);

    if (error) {
      console.error("[PublicAPI] Error obteniendo lotes:", error);
      return NextResponse.json(
        { error: "Error obteniendo disponibilidad" },
        { status: 500, headers: corsHeaders }
      );
    }

    const todosLotes = lotes || [];
    const disponibles = todosLotes.filter((l) => l.estado === "disponible");

    const preciosDisponibles = disponibles
      .map((l) => l.precio)
      .filter((p): p is number => p != null && p > 0);

    return NextResponse.json(
      {
        success: true,
        proyecto_id: proyectoId,
        proyecto_nombre: proyecto.nombre,
        estadisticas: {
          total: todosLotes.length,
          disponibles: disponibles.length,
          reservados: todosLotes.filter((l) => l.estado === "reservado").length,
          vendidos: todosLotes.filter((l) => l.estado === "vendido").length,
          precio_minimo: preciosDisponibles.length > 0 ? Math.min(...preciosDisponibles) : null,
          precio_maximo: preciosDisponibles.length > 0 ? Math.max(...preciosDisponibles) : null,
          moneda: disponibles[0]?.moneda || "PEN",
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[PublicAPI] Error en /api/public/disponibilidad:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500, headers: corsHeaders }
    );
  }
}
