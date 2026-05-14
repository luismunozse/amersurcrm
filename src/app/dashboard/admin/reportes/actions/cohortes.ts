"use server";

import { getAuthorizedClient, safeAction } from "./shared";
import { buildCachedReportFetcher } from "./shared-cache";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Análisis de cohortes: leads dados de alta en un mes (cohort)
 * y cuántos convirtieron a venta en M+0, M+1, M+2, ...
 *
 * Mide el ciclo real de venta y el "leak" entre meses.
 */

export interface CohortLagCell {
  /** Lag en meses respecto al mes de alta (0 = mismo mes). */
  lag: number;
  /** Mes calendario de la venta (YYYY-MM) — útil para tooltips. */
  mesVenta: string;
  /** Cantidad de leads del cohort que convirtieron en este lag. */
  cantidad: number;
  /** Cantidad acumulada hasta este lag. */
  cantidadAcumulada: number;
  /** Porcentaje de conversión acumulado del cohort en este lag. */
  porcentajeAcumulado: string;
}

export interface CohortRow {
  /** Mes de alta (YYYY-MM). */
  mesAlta: string;
  /** Etiqueta legible (ej. "abr 2026"). */
  etiqueta: string;
  /** Total de leads del cohort (= captados ese mes). */
  totalLeads: number;
  /** Leads convertidos a venta en cualquier momento posterior. */
  totalConvertidos: number;
  /** % conversión total del cohort. */
  conversionTotal: string;
  /** Una celda por cada lag observado (lag 0 hasta `maxLag`). */
  cells: CohortLagCell[];
}

export interface ReporteCohortesData {
  /** Cantidad de meses de cohortes incluidos (filas). */
  ventanaMeses: number;
  /** Lag máximo observable (columnas). */
  maxLag: number;
  cohortes: CohortRow[];
  /** Promedios verticales por lag (% conversión acumulado promedio del lag). */
  promediosPorLag: Array<{ lag: number; promedioPct: string }>;
  resumen: {
    totalLeadsTodosCohorts: number;
    totalConvertidosTodosCohorts: number;
    conversionGlobal: string;
    /** Mediana de meses-hasta-venta entre conversiones. */
    medianaMesesAVenta: number;
  };
}

const MESES_LABEL = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function mesKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function diffMeses(desde: string, hasta: string): number {
  const [yd, md] = desde.split("-").map(Number);
  const [yh, mh] = hasta.split("-").map(Number);
  return (yh - yd) * 12 + (mh - md);
}

function etiquetaMes(mesIso: string): string {
  const [y, m] = mesIso.split("-").map(Number);
  return `${MESES_LABEL[m - 1]} ${y}`;
}

async function _fetchCohortes(
  supabase: SupabaseClient<any, "crm">,
  ventanaMeses: number,
  hoyISO: string,
): Promise<ReporteCohortesData> {
  const hoy = new Date(hoyISO);
  hoy.setUTCDate(1);
  hoy.setUTCHours(0, 0, 0, 0);

  // Mes inicio del cohort más antiguo (ventanaMeses meses atrás del mes actual incluido)
  const inicioVentana = new Date(hoy);
  inicioVentana.setUTCMonth(inicioVentana.getUTCMonth() - (ventanaMeses - 1));

  const startISO = inicioVentana.toISOString();

  // Próximo mes (exclusivo) para acotar superior
  const finExclusivo = new Date(hoy);
  finExclusivo.setUTCMonth(finExclusivo.getUTCMonth() + 1);
  const endISO = finExclusivo.toISOString();

  // 1) Leads del rango (clientes con fecha_alta dentro de la ventana)
  const { data: leadsData } = await supabase
    .schema("crm")
    .from("cliente")
    .select("id, fecha_alta")
    .gte("fecha_alta", startISO)
    .lt("fecha_alta", endISO);

  const leads = leadsData || [];
  const leadIds = leads.map((l: any) => l.id);

  // 2) Ventas asociadas a esos leads (en cualquier fecha posterior)
  let ventasData: Array<{ cliente_id: string; fecha_venta: string }> = [];
  if (leadIds.length > 0) {
    const { data } = await supabase
      .schema("crm")
      .from("venta")
      .select("cliente_id, fecha_venta")
      .in("cliente_id", leadIds);
    ventasData = (data || []) as typeof ventasData;
  }

  // Mapear primer venta por cliente (la conversión "real" es la primera)
  const primeraVentaCliente = new Map<string, string>();
  ventasData.forEach((v) => {
    const fecha = new Date(v.fecha_venta).toISOString();
    const actual = primeraVentaCliente.get(v.cliente_id);
    if (!actual || fecha < actual) primeraVentaCliente.set(v.cliente_id, fecha);
  });

  // 3) Construir cohortes por mes de alta
  const cohortMap = new Map<string, { leads: string[]; mesAlta: string }>();
  // Pre-poblar todos los meses de la ventana (incluso sin leads)
  const cursor = new Date(inicioVentana);
  while (cursor <= hoy) {
    const k = mesKey(cursor);
    cohortMap.set(k, { leads: [], mesAlta: k });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  leads.forEach((l: any) => {
    const k = mesKey(new Date(l.fecha_alta));
    cohortMap.get(k)?.leads.push(l.id);
  });

  // 4) Por cohort, calcular conversiones por lag
  const mesesHastaVenta: number[] = [];
  const cohortes: CohortRow[] = [];

  cohortMap.forEach(({ leads: cohortLeads, mesAlta }) => {
    const lagsCount = new Map<number, number>();
    let totalConvertidos = 0;

    cohortLeads.forEach((cid) => {
      const fechaVenta = primeraVentaCliente.get(cid);
      if (!fechaVenta) return;
      const lag = diffMeses(mesAlta, mesKey(new Date(fechaVenta)));
      if (lag < 0) return; // venta anterior al alta — descartar (data sucia)
      lagsCount.set(lag, (lagsCount.get(lag) || 0) + 1);
      mesesHastaVenta.push(lag);
      totalConvertidos += 1;
    });

    // Construir celdas hasta el maxLag posible para este cohort
    const maxLagCohort = diffMeses(mesAlta, mesKey(hoy));
    const cells: CohortLagCell[] = [];
    let acumulado = 0;
    for (let lag = 0; lag <= maxLagCohort; lag++) {
      const cantidad = lagsCount.get(lag) || 0;
      acumulado += cantidad;
      const fechaCelda = new Date(mesAlta + "-01T00:00:00Z");
      fechaCelda.setUTCMonth(fechaCelda.getUTCMonth() + lag);
      cells.push({
        lag,
        mesVenta: mesKey(fechaCelda),
        cantidad,
        cantidadAcumulada: acumulado,
        porcentajeAcumulado: cohortLeads.length > 0
          ? ((acumulado / cohortLeads.length) * 100).toFixed(1)
          : "0",
      });
    }

    cohortes.push({
      mesAlta,
      etiqueta: etiquetaMes(mesAlta),
      totalLeads: cohortLeads.length,
      totalConvertidos,
      conversionTotal: cohortLeads.length > 0
        ? ((totalConvertidos / cohortLeads.length) * 100).toFixed(1)
        : "0",
      cells,
    });
  });

  // Ordenar cohortes asc por mes
  cohortes.sort((a, b) => a.mesAlta.localeCompare(b.mesAlta));

  // 5) Promedios por lag (sólo entre cohortes que tienen ese lag observable y leads > 0)
  const maxLag = ventanaMeses - 1;
  const promediosPorLag: Array<{ lag: number; promedioPct: string }> = [];
  for (let lag = 0; lag <= maxLag; lag++) {
    const cohortesConLag = cohortes.filter((c) => c.cells.length > lag && c.totalLeads > 0);
    if (cohortesConLag.length === 0) {
      promediosPorLag.push({ lag, promedioPct: "0" });
      continue;
    }
    const suma = cohortesConLag.reduce(
      (acc, c) => acc + parseFloat(c.cells[lag].porcentajeAcumulado),
      0,
    );
    promediosPorLag.push({
      lag,
      promedioPct: (suma / cohortesConLag.length).toFixed(1),
    });
  }

  // 6) Mediana meses-a-venta
  let mediana = 0;
  if (mesesHastaVenta.length > 0) {
    const sorted = [...mesesHastaVenta].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    mediana = sorted.length % 2 === 1
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  const totalLeadsTodosCohorts = cohortes.reduce((s, c) => s + c.totalLeads, 0);
  const totalConvertidosTodosCohorts = cohortes.reduce((s, c) => s + c.totalConvertidos, 0);

  return {
    ventanaMeses,
    maxLag,
    cohortes,
    promediosPorLag,
    resumen: {
      totalLeadsTodosCohorts,
      totalConvertidosTodosCohorts,
      conversionGlobal: totalLeadsTodosCohorts > 0
        ? ((totalConvertidosTodosCohorts / totalLeadsTodosCohorts) * 100).toFixed(1)
        : "0",
      medianaMesesAVenta: mediana,
    },
  };
}

const fetchCohortesCached = buildCachedReportFetcher(
  _fetchCohortes,
  ["reporte-cohortes"],
  300, // TTL 5min: cohortes cambian poco intra-día
);

export async function obtenerReporteCohortes(
  ventanaMeses: number = 6,
): Promise<{ data: ReporteCohortesData | null; error: string | null }> {
  return safeAction(async () => {
    await getAuthorizedClient();
    const ventana = Math.max(2, Math.min(12, Math.floor(ventanaMeses)));
    // Snap "hoy" a primer día del mes para que la cache key sea estable durante el día
    const hoy = new Date();
    hoy.setUTCDate(1);
    hoy.setUTCHours(0, 0, 0, 0);
    return fetchCohortesCached(ventana, hoy.toISOString());
  });
}
