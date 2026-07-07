"use server";

import { getAuthorizedClient, calcularFechas, safeAction } from "./shared";
import { buildCachedReportFetcher } from "./shared-cache";
import { fetchAllRows } from "@/lib/reportes/pagination";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ResumenComisionesReporte {
  pendientes: { count: number; monto: number };
  aprobadas: { count: number; monto: number };
  pagadas: { count: number; monto: number };
  anuladas: { count: number; monto: number };
  totalGenerado: number;
  totalPagadoEnPeriodo: number;
}

export interface ComisionPorVendedor {
  username: string;
  nombre_completo: string | null;
  pendiente_count: number;
  pendiente_monto: number;
  aprobada_count: number;
  aprobada_monto: number;
  pagada_count: number;
  pagada_monto: number;
  total_generado: number;
}

export interface ComisionMensual {
  month: string;
  generado: number;
  pagado: number;
}

export interface ReporteComisiones {
  resumen: ResumenComisionesReporte;
  porVendedor: ComisionPorVendedor[];
  porMes: ComisionMensual[];
  periodo: { inicio: string; fin: string; dias: number };
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/**
 * Reporte de Comisiones con datos reales.
 * - Resumen por estado (acumulado).
 * - Generado y pagado en periodo (filtrados).
 * - Por vendedor (acumulado).
 * - Evolucion mensual: generado por fecha_generacion, pagado por fecha_pago.
 *
 * Pure fetcher (no auth) — mirrors `funnel.ts`'s `_fetchFunnel` shape so it
 * can run behind `buildCachedReportFetcher` on a service-role client. Auth
 * lives only in the public `obtenerReporteComisiones` wrapper below. Exported
 * (not just the public action) — PR3's scorecard reuses it directly (ADR5).
 */
export async function _fetchComisiones(
  supabase: SupabaseClient<any, "crm">,
  startISO: string,
  endISO: string,
): Promise<ReporteComisiones> {
  const startDate = new Date(startISO);
  const endDate = new Date(endISO);
  const days = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // 1. Todas las comisiones para resumen + por vendedor — Strategy B (ADR2):
  // resumen/porVendedor/porMes all aggregate row values, so a head:true
  // count cannot substitute; paginate via `fetchAllRows`.
  const comisiones = await fetchAllRows<{
    id: string; beneficiario_username: string; monto: number; estado: string;
    fecha_generacion: string | null; fecha_pago: string | null; moneda: string;
  }>((offset) =>
    supabase
      .schema('crm')
      .from('comision')
      .select('id, beneficiario_username, monto, estado, fecha_generacion, fecha_pago, moneda')
      .range(offset, offset + 999),
  );

  const resumen: ResumenComisionesReporte = {
    pendientes: { count: 0, monto: 0 },
    aprobadas: { count: 0, monto: 0 },
    pagadas: { count: 0, monto: 0 },
    anuladas: { count: 0, monto: 0 },
    totalGenerado: 0,
    totalPagadoEnPeriodo: 0,
  };

  const start = startDate.getTime();
  const end = endDate.getTime();

  const porVendedorMap = new Map<string, ComisionPorVendedor>();
  const porMesMap = new Map<string, { generado: number; pagado: number }>();

  comisiones.forEach((c: any) => {
    const monto = Number(c.monto) || 0;
    const estado = c.estado as 'pendiente' | 'aprobada' | 'pagada' | 'anulada';

    // Resumen agregado
    if (estado === 'pendiente') {
      resumen.pendientes.count += 1;
      resumen.pendientes.monto += monto;
    } else if (estado === 'aprobada') {
      resumen.aprobadas.count += 1;
      resumen.aprobadas.monto += monto;
    } else if (estado === 'pagada') {
      resumen.pagadas.count += 1;
      resumen.pagadas.monto += monto;
    } else if (estado === 'anulada') {
      resumen.anuladas.count += 1;
      resumen.anuladas.monto += monto;
    }

    if (estado !== 'anulada') resumen.totalGenerado += monto;

    // Pagado en periodo
    if (estado === 'pagada' && c.fecha_pago) {
      const ts = new Date(c.fecha_pago).getTime();
      if (ts >= start && ts <= end) {
        resumen.totalPagadoEnPeriodo += monto;
      }
    }

    // Por vendedor
    const username = c.beneficiario_username as string;
    const acc = porVendedorMap.get(username) ?? {
      username,
      nombre_completo: null,
      pendiente_count: 0, pendiente_monto: 0,
      aprobada_count: 0, aprobada_monto: 0,
      pagada_count: 0, pagada_monto: 0,
      total_generado: 0,
    };

    if (estado === 'pendiente') {
      acc.pendiente_count += 1;
      acc.pendiente_monto += monto;
    } else if (estado === 'aprobada') {
      acc.aprobada_count += 1;
      acc.aprobada_monto += monto;
    } else if (estado === 'pagada') {
      acc.pagada_count += 1;
      acc.pagada_monto += monto;
    }
    if (estado !== 'anulada') acc.total_generado += monto;

    porVendedorMap.set(username, acc);

    // Por mes
    if (c.fecha_generacion) {
      const f = new Date(c.fecha_generacion);
      const key = `${MESES[f.getMonth()]} ${f.getFullYear()}`;
      const m = porMesMap.get(key) ?? { generado: 0, pagado: 0 };
      if (estado !== 'anulada') m.generado += monto;
      porMesMap.set(key, m);
    }
    if (estado === 'pagada' && c.fecha_pago) {
      const f = new Date(c.fecha_pago);
      const key = `${MESES[f.getMonth()]} ${f.getFullYear()}`;
      const m = porMesMap.get(key) ?? { generado: 0, pagado: 0 };
      m.pagado += monto;
      porMesMap.set(key, m);
    }
  });

  // 2. Enriquecer porVendedor con nombre_completo
  const usernames = Array.from(porVendedorMap.keys()).filter((u) => u && u.length > 0);
  if (usernames.length > 0) {
    const { data: perfiles } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .select('username, nombre_completo')
      .in('username', usernames);

    (perfiles ?? []).forEach((p: any) => {
      const acc = porVendedorMap.get(p.username);
      if (acc) {
        acc.nombre_completo = p.nombre_completo;
        porVendedorMap.set(p.username, acc);
      }
    });
  }

  const porVendedor = Array.from(porVendedorMap.values())
    .sort((a, b) => b.total_generado - a.total_generado);

  const porMes: ComisionMensual[] = Array.from(porMesMap.entries())
    .map(([month, v]) => ({ month, ...v }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    resumen,
    porVendedor,
    porMes,
    periodo: {
      inicio: startDate.toISOString(),
      fin: endDate.toISOString(),
      dias: days,
    },
  };
}

const fetchComisionesCached = buildCachedReportFetcher(
  _fetchComisiones,
  ["reporte-comisiones"],
  60,
);

export async function obtenerReporteComisiones(
  periodo: string = '30',
  fechaInicio?: string,
  fechaFin?: string,
): Promise<{ data: ReporteComisiones | null; error: string | null }> {
  return safeAction(async () => {
    // Auth check fuera de la cache (per-request, sin cookies adentro).
    await getAuthorizedClient();

    const { startDate, endDate } = calcularFechas(periodo, fechaInicio, fechaFin);
    return fetchComisionesCached(startDate.toISOString(), endDate.toISOString());
  });
}
