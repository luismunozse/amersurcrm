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
 * GET /api/public/proyectos
 *
 * Lista proyectos activos con datos públicos.
 * Requiere header: x-website-key
 */
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-website-key");

    if (!WEBSITE_API_KEY || apiKey !== WEBSITE_API_KEY) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401, headers: corsHeaders }
      );
    }

    const supabase = createServiceRoleClient();

    const { data: proyectos, error } = await supabase
      .schema("crm")
      .from("proyecto")
      .select(
        "id, nombre, descripcion, ubicacion, latitud, longitud, imagen_url, logo_url, galeria_imagenes, tipo, tipo_terreno, area_total, precio_desde, precio_hasta"
      )
      .eq("estado", "activo")
      .order("nombre");

    if (error) {
      console.error("[PublicAPI] Error obteniendo proyectos:", error);
      return NextResponse.json(
        { error: "Error obteniendo proyectos" },
        { status: 500, headers: corsHeaders }
      );
    }

    // Obtener conteo de lotes por proyecto
    const proyectoIds = (proyectos || []).map((p) => p.id);

    let loteStats: Record<string, { total: number; disponibles: number }> = {};

    if (proyectoIds.length > 0) {
      const { data: lotes } = await supabase
        .schema("crm")
        .from("lote")
        .select("proyecto_id, estado")
        .in("proyecto_id", proyectoIds);

      if (lotes) {
        for (const lote of lotes) {
          if (!loteStats[lote.proyecto_id]) {
            loteStats[lote.proyecto_id] = { total: 0, disponibles: 0 };
          }
          loteStats[lote.proyecto_id].total++;
          if (lote.estado === "disponible") {
            loteStats[lote.proyecto_id].disponibles++;
          }
        }
      }
    }

    const resultado = (proyectos || []).map((p) => ({
      ...p,
      lotes_total: loteStats[p.id]?.total ?? 0,
      lotes_disponibles: loteStats[p.id]?.disponibles ?? 0,
    }));

    return NextResponse.json(
      { success: true, proyectos: resultado },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[PublicAPI] Error en /api/public/proyectos:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500, headers: corsHeaders }
    );
  }
}
