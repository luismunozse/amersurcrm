"use server";

import { createServerOnlyClient } from "@/lib/supabase.server";
import { startOfDay, endOfDay } from "date-fns";

export type ItemAgendaResumen = {
  id: string;
  origen: "evento" | "recordatorio";
  titulo: string;
  tipo: string;
  estado: string;
  prioridad: string;
  fecha: string;
  cliente_nombre: string | null;
  ubicacion: string | null;
};

export type ResumenAgendaHoy = {
  eventos: ItemAgendaResumen[];
  total: number;
  proximoEnMinutos: number | null;
};

const ESTADOS_EVENTO_ACTIVOS = ["pendiente", "en_progreso", "reprogramado"];

export async function obtenerResumenAgendaHoy(): Promise<ResumenAgendaHoy> {
  const empty: ResumenAgendaHoy = { eventos: [], total: 0, proximoEnMinutos: null };
  try {
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return empty;

    const ahora = new Date();
    const inicio = startOfDay(ahora);
    const fin = endOfDay(ahora);

    const [eventosRes, recordatoriosRes] = await Promise.all([
      supabase
        .from("evento")
        .select(
          `id, titulo, tipo, estado, prioridad, fecha_inicio, ubicacion,
           cliente:cliente_id(nombre)`
        )
        .eq("vendedor_id", user.id)
        .in("estado", ESTADOS_EVENTO_ACTIVOS)
        .gte("fecha_inicio", inicio.toISOString())
        .lte("fecha_inicio", fin.toISOString())
        .order("fecha_inicio", { ascending: true })
        .limit(10),

      supabase
        .from("recordatorio")
        .select(
          `id, titulo, tipo, prioridad, fecha_recordatorio, completado,
           cliente:cliente_id(nombre)`
        )
        .eq("vendedor_id", user.id)
        .eq("completado", false)
        .gte("fecha_recordatorio", inicio.toISOString())
        .lte("fecha_recordatorio", fin.toISOString())
        .order("fecha_recordatorio", { ascending: true })
        .limit(10),
    ]);

    const eventos: ItemAgendaResumen[] = (eventosRes.data ?? []).map((e: any) => {
      const cliente = Array.isArray(e.cliente) ? e.cliente[0] : e.cliente;
      return {
        id: e.id,
        origen: "evento" as const,
        titulo: e.titulo,
        tipo: e.tipo,
        estado: e.estado,
        prioridad: e.prioridad,
        fecha: e.fecha_inicio,
        cliente_nombre: cliente?.nombre ?? null,
        ubicacion: e.ubicacion ?? null,
      };
    });

    const recordatorios: ItemAgendaResumen[] = (recordatoriosRes.data ?? []).map(
      (r: any) => {
        const cliente = Array.isArray(r.cliente) ? r.cliente[0] : r.cliente;
        return {
          id: r.id,
          origen: "recordatorio" as const,
          titulo: r.titulo,
          tipo: r.tipo,
          estado: "pendiente",
          prioridad: r.prioridad,
          fecha: r.fecha_recordatorio,
          cliente_nombre: cliente?.nombre ?? null,
          ubicacion: null,
        };
      }
    );

    const items = [...eventos, ...recordatorios]
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
      .slice(0, 5);

    const proximoFuturo = items.find(
      (i) => new Date(i.fecha).getTime() > ahora.getTime()
    );
    const proximoEnMinutos = proximoFuturo
      ? Math.floor(
          (new Date(proximoFuturo.fecha).getTime() - ahora.getTime()) / 60000
        )
      : null;

    return {
      eventos: items,
      total: items.length,
      proximoEnMinutos,
    };
  } catch (err) {
    console.warn("Error obteniendo resumen agenda hoy:", err);
    return empty;
  }
}
