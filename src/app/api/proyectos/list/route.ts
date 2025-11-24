"use server";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/proyectos/list
 *
 * Obtiene lista de proyectos activos
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log('[API /proyectos/list] User:', user?.id, 'Error:', authError);

    if (authError || !user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // Obtener proyectos activos
    const { data: proyectos, error } = await supabase
      .from("proyecto")
      .select("id, nombre, ubicacion, estado")
      .in("estado", ["planificacion", "en_construccion", "terminado"])
      .order("nombre", { ascending: true });

    if (error) {
      console.error("[API] Error obteniendo proyectos:", error);
      return NextResponse.json(
        { error: "Error obteniendo proyectos" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      proyectos: proyectos || [],
    });
  } catch (error) {
    console.error("[API] Error en /api/proyectos/list:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
