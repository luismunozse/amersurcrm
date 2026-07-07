"use server";

import { getAuthorizedClient, calcularFechas, safeAction } from "./shared";
import { buildCachedReportFetcher } from "./shared-cache";
import { fetchAllRows } from "@/lib/reportes/pagination";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface EtapaFunnelStat {
  id: string;
  label: string;
  descripcion: string;
  cantidad: number;
  porcentaje: number;
  color: string;
}

export interface ConversionEntreEtapas {
  desde: string;
  tasa: number;
}

export interface ReporteFunnelData {
  etapas: EtapaFunnelStat[];
  conversiones: ConversionEntreEtapas[];
  distribucionEstado: Record<string, number>;
  valorVentas: number;
  totalLeads: number;
  totalVentas: number;
  tasaConversionFinal: number;
}

export async function _fetchFunnel(
  supabase: SupabaseClient<any, "crm">,
  startISO: string,
  endISO: string,
): Promise<ReporteFunnelData> {
  // Strategy B (ADR2): every source here needs the actual `cliente_id` rows
  // for cross-referencing/dedupe, not just a count, so a head:true count
  // cannot substitute — paginate each unbounded select via `fetchAllRows`
  // instead of relying on PostgREST's ~1000-row cap. The 5 fetches still run
  // in parallel (Promise.all); pagination happens inside each independently.
  const [leads, interacciones, visitas, reservas, ventas] = await Promise.all([
    fetchAllRows<{ id: string; estado_cliente: string | null }>((offset) =>
      supabase.schema('crm').from('cliente')
        .select('id, estado_cliente')
        .gte('fecha_alta', startISO).lte('fecha_alta', endISO)
        .range(offset, offset + 999)
    ),
    fetchAllRows<{ cliente_id: string }>((offset) =>
      supabase.schema('crm').from('cliente_interaccion')
        .select('cliente_id')
        .gte('fecha_interaccion', startISO).lte('fecha_interaccion', endISO)
        .range(offset, offset + 999)
    ),
    fetchAllRows<{ cliente_id: string }>((offset) =>
      supabase.schema('crm').from('visita_propiedad')
        .select('cliente_id')
        .gte('fecha_visita', startISO).lte('fecha_visita', endISO)
        .range(offset, offset + 999)
    ),
    fetchAllRows<{ cliente_id: string }>((offset) =>
      supabase.schema('crm').from('reserva')
        .select('cliente_id')
        .gte('created_at', startISO).lte('created_at', endISO)
        .range(offset, offset + 999)
    ),
    fetchAllRows<{ cliente_id: string; precio_total: number | null }>((offset) =>
      supabase.schema('crm').from('venta')
        .select('cliente_id, precio_total')
        .gte('fecha_venta', startISO).lte('fecha_venta', endISO)
        .range(offset, offset + 999)
    ),
  ]);

  const leadIds = new Set(leads.map((l: any) => l.id));

  const contactadosIds = new Set(
    interacciones.filter((i: any) => leadIds.has(i.cliente_id)).map((i: any) => i.cliente_id)
  );
  const conVisitaIds = new Set(
    visitas.filter((v: any) => leadIds.has(v.cliente_id)).map((v: any) => v.cliente_id)
  );
  const conReservaIds = new Set(
    reservas.filter((r: any) => leadIds.has(r.cliente_id)).map((r: any) => r.cliente_id)
  );
  const ventasCerradasIds = new Set(
    ventas.filter((v: any) => leadIds.has(v.cliente_id)).map((v: any) => v.cliente_id)
  );

  const totalLeads = leads.length;
  const totalContactados = contactadosIds.size;
  const totalConVisita = conVisitaIds.size;
  const totalConReserva = conReservaIds.size;
  const totalVentas = ventasCerradasIds.size;
  const valorVentas = ventas.reduce((sum: number, v: any) => sum + (v.precio_total || 0), 0);

  const distribucionEstado = leads.reduce<Record<string, number>>((acc, c: any) => {
    const estado = c.estado_cliente || 'sin_estado';
    acc[estado] = (acc[estado] || 0) + 1;
    return acc;
  }, {});

  const etapas = [
    { id: 'leads',       label: 'Leads captados',   descripcion: 'Total clientes registrados en el período',       cantidad: totalLeads,       porcentaje: 100,                                                                                    color: '#6366f1' },
    { id: 'contactados', label: 'Contactados',       descripcion: 'Leads con al menos una interacción registrada',  cantidad: totalContactados, porcentaje: totalLeads > 0 ? Math.round((totalContactados / totalLeads) * 100) : 0,       color: '#3b82f6' },
    { id: 'visita',      label: 'Visita realizada',  descripcion: 'Leads que visitaron al menos un proyecto',       cantidad: totalConVisita,   porcentaje: totalLeads > 0 ? Math.round((totalConVisita / totalLeads) * 100) : 0,          color: '#f59e0b' },
    { id: 'reserva',     label: 'Separación activa',    descripcion: 'Leads con separación de lote generada',             cantidad: totalConReserva,  porcentaje: totalLeads > 0 ? Math.round((totalConReserva / totalLeads) * 100) : 0,         color: '#f97316' },
    { id: 'venta',       label: 'Venta cerrada',     descripcion: 'Leads que finalizaron en venta confirmada',      cantidad: totalVentas,      porcentaje: totalLeads > 0 ? Math.round((totalVentas / totalLeads) * 100) : 0,             color: '#22c55e' },
  ];

  const conversiones = [
    { desde: 'Leads → Contactados', tasa: totalLeads > 0       ? Math.round((totalContactados / totalLeads) * 100)       : 0 },
    { desde: 'Contactados → Visita', tasa: totalContactados > 0 ? Math.round((totalConVisita / totalContactados) * 100)   : 0 },
    { desde: 'Visita → Separación',    tasa: totalConVisita > 0   ? Math.round((totalConReserva / totalConVisita) * 100)     : 0 },
    { desde: 'Separación → Venta',     tasa: totalConReserva > 0  ? Math.round((totalVentas / totalConReserva) * 100)        : 0 },
  ];

  return {
    etapas, conversiones, distribucionEstado, valorVentas,
    totalLeads, totalVentas,
    tasaConversionFinal: totalLeads > 0 ? Math.round((totalVentas / totalLeads) * 100) : 0,
  };
}

const fetchFunnelCached = buildCachedReportFetcher(
  _fetchFunnel,
  ["reporte-funnel"],
  60,
);

export async function obtenerReporteFunnel(
  periodo: string = '30',
  fechaInicio?: string,
  fechaFin?: string
): Promise<{ data: ReporteFunnelData | null; error: string | null }> {
  return safeAction(async () => {
    // Auth check fuera de la cache (per-request, sin cookies adentro).
    await getAuthorizedClient();

    const { startDate, endDate } = calcularFechas(periodo, fechaInicio, fechaFin);
    return fetchFunnelCached(startDate.toISOString(), endDate.toISOString());
  });
}
