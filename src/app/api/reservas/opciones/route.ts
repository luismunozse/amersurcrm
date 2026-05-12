import { NextResponse, type NextRequest } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";
export const dynamic = 'force-dynamic';

type LoteDisponible = {
  id: string;
  proyecto_id: string;
  codigo: string | null;
  precio: number | null;
  sup_m2: number | null;
  estado?: string | null;
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

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const incluirLotesCliente = req.nextUrl.searchParams.get("incluirLotesCliente");

    // Lotes propios del cliente (reservados o vendidos) — solo si se pasa clienteId
    let lotesDelClienteIds: string[] = [];
    if (incluirLotesCliente) {
      const [{ data: reservasCliente }, { data: ventasCliente }] = await Promise.all([
        supabase
          .schema("crm")
          .from("reserva")
          .select("lote_id")
          .eq("cliente_id", incluirLotesCliente)
          .in("estado", ["activa", "vencida", "convertida_venta"]),
        supabase
          .schema("crm")
          .from("venta")
          .select("lote_id")
          .eq("cliente_id", incluirLotesCliente),
      ]);
      const ids = new Set<string>();
      reservasCliente?.forEach((r: any) => r.lote_id && ids.add(r.lote_id));
      ventasCliente?.forEach((v: any) => v.lote_id && ids.add(v.lote_id));
      lotesDelClienteIds = Array.from(ids);
    }

    const [{ data: proyectos, error: proyectosError }, { data: lotesDisp, error: lotesError }] =
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

    // Combinar disponibles + lotes propios del cliente (sin duplicados)
    let lotes: LoteDisponible[] = (lotesDisp as LoteDisponible[] | null) ?? [];
    if (lotesDelClienteIds.length > 0) {
      const yaIncluidos = new Set(lotes.map((l) => l.id));
      const faltantes = lotesDelClienteIds.filter((id) => !yaIncluidos.has(id));
      if (faltantes.length > 0) {
        const { data: lotesCliente } = await supabase
          .schema("crm")
          .from("lote")
          .select("id, proyecto_id, codigo, precio, sup_m2, estado, data")
          .in("id", faltantes);
        if (lotesCliente) {
          lotes = lotes.concat(lotesCliente as LoteDisponible[]);
        }
      }
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
          estado: lote.estado ?? null,
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
