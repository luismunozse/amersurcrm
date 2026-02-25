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
 * GET /api/public/proyectos/[id]
 *
 * Detalle de un proyecto activo con sus lotes.
 * Requiere header: x-website-key
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const apiKey = request.headers.get("x-website-key");

    if (!WEBSITE_API_KEY || apiKey !== WEBSITE_API_KEY) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401, headers: corsHeaders }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID de proyecto requerido" },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createServiceRoleClient();

    // Obtener proyecto (solo si está activo)
    const { data: proyecto, error: proyectoError } = await supabase
      .schema("crm")
      .from("proyecto")
      .select(
        "id, nombre, descripcion, ubicacion, latitud, longitud, imagen_url, logo_url, galeria_imagenes, tipo, tipo_terreno, area_total, precio_desde, precio_hasta"
      )
      .eq("id", id)
      .eq("estado", "activo")
      .maybeSingle();

    if (proyectoError) {
      console.error("[PublicAPI] Error obteniendo proyecto:", proyectoError);
      return NextResponse.json(
        { error: "Error obteniendo proyecto" },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!proyecto) {
      return NextResponse.json(
        { error: "Proyecto no encontrado" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Obtener lotes del proyecto
    const { data: lotes, error: lotesError } = await supabase
      .schema("crm")
      .from("lote")
      .select("id, codigo, sup_m2, precio, moneda, estado")
      .eq("proyecto_id", id)
      .order("codigo");

    if (lotesError) {
      console.error("[PublicAPI] Error obteniendo lotes:", lotesError);
    }

    const todosLotes = lotes || [];
    const estadisticas = {
      total: todosLotes.length,
      disponibles: todosLotes.filter((l) => l.estado === "disponible").length,
      reservados: todosLotes.filter((l) => l.estado === "reservado").length,
      vendidos: todosLotes.filter((l) => l.estado === "vendido").length,
    };

    return NextResponse.json(
      {
        success: true,
        proyecto,
        lotes: todosLotes,
        estadisticas,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[PublicAPI] Error en /api/public/proyectos/[id]:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500, headers: corsHeaders }
    );
  }
}
