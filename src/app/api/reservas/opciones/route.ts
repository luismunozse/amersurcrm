import { NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";

type LoteDisponible = {
  id: string;
  proyecto_id: string;
  codigo: string | null;
  precio: number | null;
  sup_m2: number | null;
  data?: Record<string, unknown> | null;
};

function extraerNumeroLote(lote: LoteDisponible): string | null {
  if ("numero_lote" in lote && typeof (lote as any).numero_lote === "string") {
    return (lote as any).numero_lote;
  }

  const data = lote.data as Record<string, unknown> | null | undefined;
  if (data && typeof data === "object") {
    const numero = data["numero_lote"] ?? data["numero"] ?? data["codigo"];
    if (typeof numero === "string") return numero;
    if (typeof numero === "number") return String(numero);
  }

  return lote.codigo;
}

export async function GET() {
  try {
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const [{ data: proyectos, error: proyectosError }, { data: lotes, error: lotesError }] =
      await Promise.all([
        supabase
          .schema("crm")
          .from("proyecto")
          .select("id, nombre, ubicacion, estado")
          .order("nombre", { ascending: true }),
        supabase
          .schema("crm")
          .from("lote")
          .select("id, proyecto_id, codigo, precio, sup_m2, estado, data")
          .eq("estado", "disponible")
          .order("codigo", { ascending: true }),
      ]);

    if (proyectosError || lotesError) {
      console.error("[reservas/opciones] Error cargando datos:", proyectosError || lotesError);
      return NextResponse.json({ error: "No se pudieron cargar los proyectos" }, { status: 500 });
    }

    const lotesPorProyecto = new Map<string, LoteDisponible[]>();
    (lotes as LoteDisponible[] | null)?.forEach((lote) => {
      if (!lote?.proyecto_id) return;
      if (!lotesPorProyecto.has(lote.proyecto_id)) {
        lotesPorProyecto.set(lote.proyecto_id, []);
      }
      lotesPorProyecto.get(lote.proyecto_id)?.push(lote);
    });

    const proyectosFiltrados = (proyectos || []).filter((proyecto) => {
      const estado = (proyecto?.estado ?? "").toString().trim().toLowerCase();
      if (!estado) return true;
      return estado.startsWith("activo") || estado.startsWith("pausado");
    });

    const payload = proyectosFiltrados.map((proyecto) => ({
      id: proyecto.id,
      nombre: proyecto.nombre,
      ubicacion: proyecto.ubicacion,
      estado: proyecto.estado,
      lotes: (lotesPorProyecto.get(proyecto.id) || []).map((lote) => {
        const numeroLote = extraerNumeroLote(lote);
        return {
          id: lote.id,
          numero_lote: numeroLote,
          codigo: lote.codigo,
          precio: lote.precio,
          sup_m2: lote.sup_m2,
        };
      }),
    }));

    return NextResponse.json({
      success: true,
      proyectos: payload,
    });
  } catch (error) {
    console.error("[reservas/opciones] Error inesperado:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
