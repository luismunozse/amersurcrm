"use server";

import { getAuthorizedClient, calcularFechas, safeAction } from "./shared";

export type EtapaFunnel = "leads" | "contactados" | "visita" | "reserva" | "venta";

export interface ClienteEtapaFunnel {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  estado_cliente: string | null;
  fechaEvento: string | null;
}

export interface ResultadoEtapaFunnel {
  clientes: ClienteEtapaFunnel[];
  total: number;
  etapa: EtapaFunnel;
}

const MAX_FILAS = 100;

export async function obtenerClientesPorEtapaFunnel(
  etapa: EtapaFunnel,
  periodo: string = "30",
  fechaInicio?: string,
  fechaFin?: string,
): Promise<{ data: ResultadoEtapaFunnel | null; error: string | null }> {
  return safeAction(async () => {
    const supabase = await getAuthorizedClient();
    const { startDate, endDate } = calcularFechas(periodo, fechaInicio, fechaFin);
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    // Paso 1: IDs de leads captados en el período (mismo criterio que obtenerReporteFunnel).
    const { data: leadsData } = await supabase
      .schema("crm")
      .from("cliente")
      .select("id")
      .gte("fecha_alta", startISO)
      .lte("fecha_alta", endISO);

    const leadIds = (leadsData ?? []).map((c: { id: string }) => c.id);
    if (leadIds.length === 0) {
      return { clientes: [], total: 0, etapa };
    }

    // Paso 2: obtener IDs y fecha-de-evento según la etapa.
    let relevantIds: string[] = [];
    const fechaEventoMap = new Map<string, string>();

    if (etapa === "leads") {
      relevantIds = leadIds;
    } else if (etapa === "contactados") {
      const { data } = await supabase
        .schema("crm")
        .from("cliente_interaccion")
        .select("cliente_id, fecha_interaccion")
        .in("cliente_id", leadIds)
        .gte("fecha_interaccion", startISO)
        .lte("fecha_interaccion", endISO)
        .order("fecha_interaccion", { ascending: true });
      for (const ev of data ?? []) {
        const cid = (ev as { cliente_id: string }).cliente_id;
        if (!fechaEventoMap.has(cid)) {
          fechaEventoMap.set(cid, (ev as { fecha_interaccion: string }).fecha_interaccion);
        }
      }
      relevantIds = Array.from(fechaEventoMap.keys());
    } else if (etapa === "visita") {
      const { data } = await supabase
        .schema("crm")
        .from("visita_propiedad")
        .select("cliente_id, fecha_visita")
        .in("cliente_id", leadIds)
        .gte("fecha_visita", startISO)
        .lte("fecha_visita", endISO)
        .order("fecha_visita", { ascending: true });
      for (const ev of data ?? []) {
        const cid = (ev as { cliente_id: string }).cliente_id;
        if (!fechaEventoMap.has(cid)) {
          fechaEventoMap.set(cid, (ev as { fecha_visita: string }).fecha_visita);
        }
      }
      relevantIds = Array.from(fechaEventoMap.keys());
    } else if (etapa === "reserva") {
      const { data } = await supabase
        .schema("crm")
        .from("reserva")
        .select("cliente_id, created_at")
        .in("cliente_id", leadIds)
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .order("created_at", { ascending: true });
      for (const ev of data ?? []) {
        const cid = (ev as { cliente_id: string }).cliente_id;
        if (!fechaEventoMap.has(cid)) {
          fechaEventoMap.set(cid, (ev as { created_at: string }).created_at);
        }
      }
      relevantIds = Array.from(fechaEventoMap.keys());
    } else if (etapa === "venta") {
      const { data } = await supabase
        .schema("crm")
        .from("venta")
        .select("cliente_id, fecha_venta")
        .in("cliente_id", leadIds)
        .gte("fecha_venta", startISO)
        .lte("fecha_venta", endISO)
        .order("fecha_venta", { ascending: true });
      for (const ev of data ?? []) {
        const cid = (ev as { cliente_id: string }).cliente_id;
        if (!fechaEventoMap.has(cid)) {
          fechaEventoMap.set(cid, (ev as { fecha_venta: string }).fecha_venta);
        }
      }
      relevantIds = Array.from(fechaEventoMap.keys());
    }

    if (relevantIds.length === 0) {
      return { clientes: [], total: 0, etapa };
    }

    // Paso 3: detalles de los clientes (limitado a MAX_FILAS para la UI del modal).
    const total = relevantIds.length;
    const idsLimitados = relevantIds.slice(0, MAX_FILAS);

    const { data: clientesDetalle } = await supabase
      .schema("crm")
      .from("cliente")
      .select("id, nombre, telefono, email, estado_cliente, fecha_alta")
      .in("id", idsLimitados);

    const clientes: ClienteEtapaFunnel[] = (clientesDetalle ?? []).map((c: {
      id: string;
      nombre: string;
      telefono: string | null;
      email: string | null;
      estado_cliente: string | null;
      fecha_alta: string | null;
    }) => ({
      id: c.id,
      nombre: c.nombre,
      telefono: c.telefono,
      email: c.email,
      estado_cliente: c.estado_cliente,
      fechaEvento: etapa === "leads" ? c.fecha_alta : (fechaEventoMap.get(c.id) ?? null),
    }));

    clientes.sort((a, b) => {
      const fa = a.fechaEvento ? new Date(a.fechaEvento).getTime() : 0;
      const fb = b.fechaEvento ? new Date(b.fechaEvento).getTime() : 0;
      return fb - fa;
    });

    return { clientes, total, etapa };
  });
}
