"use server";

import { getAuthorizedClient, calcularFechas, safeAction } from "./shared";
import { buildCachedReportFetcher } from "./shared-cache";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ReportePorVendedorDia = {
  fecha: string;
  leadsAsignados: number;
  contactados: number;
  ventas: number;
  conversionPct: string;
  nivelInteres: {
    alto: number;
    medio: number;
    bajo: number;
    sinClasificar: number;
  };
};

export type ReportePorVendedorVendedor = {
  username: string;
  nombre: string;
};

export type ReportePorVendedorResumen = {
  totalLeads: number;
  totalContactados: number;
  totalVentas: number;
  conversionGlobal: string;
  ratioContacto: string;
  nivelInteres: {
    alto: number;
    medio: number;
    bajo: number;
    sinClasificar: number;
  };
};

export type ReportePorVendedorData = {
  vendedores: ReportePorVendedorVendedor[];
  vendedorSeleccionado: string | null;
  diario: ReportePorVendedorDia[];
  resumen: ReportePorVendedorResumen;
  periodo: { inicio: string; fin: string; dias: number };
};

/**
 * Reporte por vendedor con desglose diario:
 *  - leads asignados (clientes con vendedor + fecha_alta del día)
 *  - contactados (clientes únicos con cliente_interaccion del día)
 *  - ventas (ventas con fecha_venta del día)
 *  - conversión (ventas / leadsAsignados acumulados hasta ese día * 100)
 *  - nivel de interés (mejor prioridad de cliente_propiedad_interes)
 *
 * Si no se pasa vendedorUsername, agrega TODOS los vendedores activos.
 */
async function _fetchPorVendedor(
  supabase: SupabaseClient<any, "crm">,
  startISO: string,
  endISO: string,
  days: number,
  filtroVendedor: string | null,
): Promise<ReportePorVendedorData> {
    const { data: vendedores } = await supabase
      .schema("crm")
      .from("usuario_perfil")
      .select("username, nombre_completo")
      .eq("activo", true)
      .not("username", "is", null)
      .order("nombre_completo", { ascending: true });

    const vendedoresList: ReportePorVendedorVendedor[] = (vendedores || [])
      .filter((v) => v.username)
      .map((v) => ({
        username: v.username as string,
        nombre: v.nombre_completo || (v.username as string),
      }));

    let leadsQuery = supabase
      .schema("crm")
      .from("cliente")
      .select("id, vendedor_username, fecha_alta")
      .gte("fecha_alta", startISO)
      .lte("fecha_alta", endISO)
      .not("vendedor_username", "is", null);

    if (filtroVendedor) leadsQuery = leadsQuery.eq("vendedor_username", filtroVendedor);

    let interaccionesQuery = supabase
      .schema("crm")
      .from("cliente_interaccion")
      .select("cliente_id, vendedor_username, fecha_interaccion")
      .gte("fecha_interaccion", startISO)
      .lte("fecha_interaccion", endISO);

    if (filtroVendedor) interaccionesQuery = interaccionesQuery.eq("vendedor_username", filtroVendedor);

    let ventasQuery = supabase
      .schema("crm")
      .from("venta")
      .select("cliente_id, vendedor_username, fecha_venta")
      .gte("fecha_venta", startISO)
      .lte("fecha_venta", endISO);

    if (filtroVendedor) ventasQuery = ventasQuery.eq("vendedor_username", filtroVendedor);

    // Fase 1: leads + interacciones + ventas en paralelo (independientes).
    const [leadsRes, interaccionesRes, ventasRes] = await Promise.all([
      leadsQuery,
      interaccionesQuery,
      ventasQuery,
    ]);

    const leads = leadsRes.data || [];
    const interacciones = interaccionesRes.data || [];
    const ventas = ventasRes.data || [];

    // Fase 2: intereses SOLO de los leads del período (no toda la tabla).
    let intereses: Array<{ cliente_id: string; prioridad: number | null }> = [];
    if (leads.length > 0) {
      const { data: interesData } = await supabase
        .schema("crm")
        .from("cliente_propiedad_interes")
        .select("cliente_id, prioridad")
        .in("cliente_id", leads.map((l: any) => l.id));
      intereses = (interesData || []) as typeof intereses;
    }

    // Mejor prioridad por cliente (1=alta, menor = mejor)
    const prioridadCliente = new Map<string, number>();
    intereses.forEach((i: any) => {
      const actual = prioridadCliente.get(i.cliente_id);
      const nueva = i.prioridad ?? 2;
      if (actual === undefined || nueva < actual) {
        prioridadCliente.set(i.cliente_id, nueva);
      }
    });

    const nivelDeCliente = (clienteId: string): keyof ReportePorVendedorDia["nivelInteres"] => {
      const p = prioridadCliente.get(clienteId);
      if (p === undefined) return "sinClasificar";
      if (p === 1) return "alto";
      if (p === 2) return "medio";
      return "bajo";
    };

    const fechaKey = (iso: string) => new Date(iso).toISOString().split("T")[0];

    // Generar buckets diarios entre startISO y endISO (incluyendo días sin actividad)
    const diasMap = new Map<string, ReportePorVendedorDia>();
    const cursor = new Date(startISO);
    cursor.setUTCHours(0, 0, 0, 0);
    const hasta = new Date(endISO);
    hasta.setUTCHours(0, 0, 0, 0);
    while (cursor <= hasta) {
      const key = cursor.toISOString().split("T")[0];
      diasMap.set(key, {
        fecha: key,
        leadsAsignados: 0,
        contactados: 0,
        ventas: 0,
        conversionPct: "0",
        nivelInteres: { alto: 0, medio: 0, bajo: 0, sinClasificar: 0 },
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    // Acumular leads + nivel de interés
    leads.forEach((l: any) => {
      const k = fechaKey(l.fecha_alta);
      const d = diasMap.get(k);
      if (!d) return;
      d.leadsAsignados += 1;
      const nivel = nivelDeCliente(l.id);
      d.nivelInteres[nivel] += 1;
    });

    // Contactados: clientes únicos con interacción ese día
    const contactadosPorDia = new Map<string, Set<string>>();
    interacciones.forEach((i: any) => {
      const k = fechaKey(i.fecha_interaccion);
      if (!diasMap.has(k)) return;
      if (!contactadosPorDia.has(k)) contactadosPorDia.set(k, new Set());
      contactadosPorDia.get(k)!.add(i.cliente_id);
    });
    contactadosPorDia.forEach((set, k) => {
      const d = diasMap.get(k);
      if (d) d.contactados = set.size;
    });

    // Ventas por día
    ventas.forEach((v: any) => {
      const k = fechaKey(v.fecha_venta);
      const d = diasMap.get(k);
      if (d) d.ventas += 1;
    });

    // Conversión diaria: ventas día / leads del día (% del día)
    diasMap.forEach((d) => {
      d.conversionPct = d.leadsAsignados > 0
        ? ((d.ventas / d.leadsAsignados) * 100).toFixed(1)
        : "0";
    });

    const diario = Array.from(diasMap.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));

    // Resumen global
    const totalLeads = leads.length;
    const totalContactados = new Set(interacciones.map((i: any) => i.cliente_id)).size;
    const totalVentas = ventas.length;
    const conversionGlobal = totalLeads > 0
      ? ((totalVentas / totalLeads) * 100).toFixed(1)
      : "0";
    const ratioContacto = totalLeads > 0
      ? ((totalContactados / totalLeads) * 100).toFixed(1)
      : "0";

    const nivelTotales = { alto: 0, medio: 0, bajo: 0, sinClasificar: 0 };
    diario.forEach((d) => {
      nivelTotales.alto += d.nivelInteres.alto;
      nivelTotales.medio += d.nivelInteres.medio;
      nivelTotales.bajo += d.nivelInteres.bajo;
      nivelTotales.sinClasificar += d.nivelInteres.sinClasificar;
    });

    return {
      vendedores: vendedoresList,
      vendedorSeleccionado: filtroVendedor,
      diario,
      resumen: {
        totalLeads,
        totalContactados,
        totalVentas,
        conversionGlobal,
        ratioContacto,
        nivelInteres: nivelTotales,
      },
      periodo: { inicio: startISO, fin: endISO, dias: days },
    };
}

const fetchPorVendedorCached = buildCachedReportFetcher(
  _fetchPorVendedor,
  ["reporte-por-vendedor"],
  60,
);

export async function obtenerReportePorVendedor(
  periodo: string = "30",
  fechaInicio?: string,
  fechaFin?: string,
  vendedorUsername?: string
): Promise<{ data: ReportePorVendedorData | null; error: string | null }> {
  return safeAction(async () => {
    await getAuthorizedClient();

    const { startDate, endDate, days } = calcularFechas(periodo, fechaInicio, fechaFin);
    const filtroVendedor = vendedorUsername && vendedorUsername !== "todos"
      ? vendedorUsername
      : null;

    return fetchPorVendedorCached(
      startDate.toISOString(),
      endDate.toISOString(),
      days,
      filtroVendedor,
    );
  });
}
