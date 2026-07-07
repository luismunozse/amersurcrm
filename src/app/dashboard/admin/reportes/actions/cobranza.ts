"use server";

import { getAuthorizedClient, calcularFechas, safeAction } from "./shared";
import { buildCachedReportFetcher } from "./shared-cache";
import { fetchAllRows } from "@/lib/reportes/pagination";
import { computeTier, limaToday } from "@/lib/cobranza/tiers";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ReporteCobranzaResumen {
  saldoTotalPorCobrar: number;
  recaudadoEnPeriodo: number;
  /**
   * Legacy/accrued figure: sum of `cuota.monto_mora` across non-`pagada`
   * cuotas. A DIFFERENT quantity from `moraTierTotal` — kept so no
   * information is lost (ADR6 "Mora definition alignment"). Do NOT use this
   * for cross-system parity checks against the dashboard cobranza hub.
   */
  moraTotal: number;
  cuotasPendientes: number;
  cuotasVencidas: number;
  /**
   * Legacy/accrued figure: count of cuotas with raw `estado === 'en_mora'`,
   * with no 90-day cap. See `cuotasEnMoraTier` for the tier-aligned figure.
   */
  cuotasEnMora: number;
  cuotasPagadasEnPeriodo: number;
  /**
   * Tier-aligned mora (ADR6): count of cuotas where
   * `computeTier(...) === 'mora'`, using the same Lima calendar date and
   * 90-day overdue cap as the dashboard cobranza hub (`src/lib/cobranza/tiers.ts`).
   * This is the figure that reconciles with the dashboard's mora total —
   * prefer this over `cuotasEnMora` for parity checks.
   */
  cuotasEnMoraTier: number;
  /**
   * Tier-aligned mora saldo (ADR6): sum of `(monto_programado - monto_pagado)`
   * across cuotas where `computeTier(...) === 'mora'`. Reconciles with the
   * dashboard's mora saldo; a distinct quantity from the accrued `moraTotal`
   * (`monto_mora` column sum).
   */
  moraTierTotal: number;
}

export interface GestionCobranzaPorResultado {
  resultado: string;
  count: number;
}

/** One row of `gestion_cobranza` activity, joined to cliente/cuota for display. */
export interface GestionCobranzaReciente {
  id: string;
  fecha_gestion: string;
  medio: string;
  resultado: string;
  cliente_id: string;
  cliente_nombre: string;
  cuota_numero: number | null;
  notas: string | null;
}

export interface RecaudacionMensual {
  month: string;
  recaudado: number;
  vencido: number;
  cuotasPagadas: number;
}

export interface TopDeudor {
  cliente_id: string;
  cliente_nombre: string;
  cuotas_pendientes: number;
  saldo_total: number;
  mora_total: number;
  dias_max_atraso: number;
  moneda: string;
}

export interface ReporteCobranza {
  resumen: ReporteCobranzaResumen;
  recaudacionMensual: RecaudacionMensual[];
  topDeudores: TopDeudor[];
  porEstadoCobranza: Array<{ estado: string; count: number; monto: number }>;
  /** ADR6: gestión de cobranza activity in the period, grouped by `resultado`. */
  gestionPorResultado: GestionCobranzaPorResultado[];
  /** ADR6: most recent gestión de cobranza entries, capped for display (see `GESTIONES_RECIENTES_LIMIT`). */
  gestionesRecientes: GestionCobranzaReciente[];
  periodo: { inicio: string; fin: string; dias: number };
}

/** Display cap for `gestionesRecientes` — mirrors `topDeudores`'s `.slice(0, 10)` precedent. */
const GESTIONES_RECIENTES_LIMIT = 20;

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/**
 * Reporte de Cobranza con datos reales de cuotas + pagos.
 * - Saldos pendientes y mora se calculan sobre todas las cuotas activas (acumulado).
 * - Recaudado y cuotas pagadas se filtran por el periodo (fecha_pago).
 *
 * Pure fetcher (no auth) — mirrors `funnel.ts`'s `_fetchFunnel` shape so it
 * can run behind `buildCachedReportFetcher` on a service-role client. Auth
 * lives only in the public `obtenerReporteCobranza` wrapper below.
 */
export async function _fetchCobranza(
  supabase: SupabaseClient<any, "crm">,
  startISO: string,
  endISO: string,
): Promise<ReporteCobranza> {
  const startDate = new Date(startISO);
  const endDate = new Date(endISO);
  const days = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  // ADR6: same Lima calendar date + tier logic as the dashboard cobranza hub
  // (src/lib/cobranza/tiers.ts). Computed once, reused for every cuota below.
  const today = limaToday();

  // 1. Cuotas activas (acumulado) para saldos y mora — Strategy B (ADR2):
  // saldo/mora/topDeudores need the actual per-cuota rows, not just a count,
  // and this is the headline 1000-cap offender (no bound at all previously).
  const cuotasActivas = await fetchAllRows<{
    id: string; venta_id: string; monto_programado: number; monto_pagado: number;
    monto_mora: number; fecha_vencimiento: string; estado: string; moneda: string;
  }>((offset) =>
    supabase
      .schema('crm')
      .from('cuota')
      .select('id, venta_id, monto_programado, monto_pagado, monto_mora, fecha_vencimiento, estado, moneda')
      .range(offset, offset + 999),
  );

  let saldoTotalPorCobrar = 0;
  let moraTotal = 0;
  let cuotasPendientes = 0;
  let cuotasVencidas = 0;
  let cuotasEnMora = 0;
  // ADR6: tier-aligned mora (computeTier), tracked separately from the legacy
  // accrued figures above — see ReporteCobranzaResumen's JSDoc.
  let cuotasEnMoraTier = 0;
  let moraTierTotal = 0;
  const porEstadoCobranzaMap = new Map<string, { count: number; monto: number }>();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  cuotasActivas.forEach((c: any) => {
    if (c.estado === 'pagada') return;
    const saldo = Number(c.monto_programado) - Number(c.monto_pagado);
    saldoTotalPorCobrar += saldo;
    moraTotal += Number(c.monto_mora) || 0;

    if (c.estado === 'pendiente') cuotasPendientes += 1;
    else if (c.estado === 'vencida') cuotasVencidas += 1;
    else if (c.estado === 'en_mora') cuotasEnMora += 1;

    // ADR6: classify with the same tier logic + Lima calendar date as the
    // dashboard. `fecha_vencimiento` is a date-only "YYYY-MM-DD" column —
    // passed through unchanged (no `.toISOString()` re-stringify, which would
    // shift the tier at day boundaries per tiers.ts's documented gotcha).
    if (computeTier({ fechaVencimiento: c.fecha_vencimiento, estado: c.estado, today }) === 'mora') {
      cuotasEnMoraTier += 1;
      moraTierTotal += saldo;
    }

    const estado = c.estado as string;
    const acc = porEstadoCobranzaMap.get(estado) ?? { count: 0, monto: 0 };
    porEstadoCobranzaMap.set(estado, { count: acc.count + 1, monto: acc.monto + saldo });
  });

  // 2. Top deudores (venta ids referenced by active cuotas) + gestión de
  // cobranza are independent of the pagos/cuotas-pagadas period queries below
  // — computed here so all four can run in one Promise.all (async-parallel).
  const ventaIds = Array.from(
    new Set(cuotasActivas.filter((c: any) => c.estado !== 'pagada').map((c: any) => c.venta_id)),
  );

  // 2-5. Pagos del periodo, cuotas pagadas del periodo, ventas (para nombres
  // de top-deudores) y gestiones de cobranza del periodo — cuatro fetches
  // independientes, cada uno Strategy B (ADR2: se agregan/agrupan filas, no
  // solo se cuenta), corridos en paralelo en vez de secuencialmente.
  const [pagosPeriodo, cuotasPagadasPeriodo, ventasData, gestionesPeriodo] = await Promise.all([
    fetchAllRows<{ id: string; monto: number; fecha_pago: string; anulado: boolean }>((offset) =>
      supabase
        .schema('crm')
        .from('pago')
        .select('id, monto, fecha_pago, anulado')
        .eq('anulado', false)
        .gte('fecha_pago', startDate.toISOString())
        .lte('fecha_pago', endDate.toISOString())
        .range(offset, offset + 999),
    ),
    fetchAllRows<{ id: string; fecha_pago: string; monto_pagado: number }>((offset) =>
      supabase
        .schema('crm')
        .from('cuota')
        .select('id, fecha_pago, monto_pagado')
        .eq('estado', 'pagada')
        .gte('fecha_pago', startDate.toISOString())
        .lte('fecha_pago', endDate.toISOString())
        .range(offset, offset + 999),
    ),
    ventaIds.length > 0
      ? fetchAllRows<{
          id: string;
          cliente_id: string;
          cliente: { nombre: string } | { nombre: string }[] | null;
        }>((offset) =>
          supabase
            .schema('crm')
            .from('venta')
            .select('id, cliente_id, cliente:cliente!cliente_id(nombre)')
            .in('id', ventaIds)
            .range(offset, offset + 999),
        )
      : Promise.resolve([]),
    // ADR6: gestión de cobranza en el periodo (por fecha_gestion) — Strategy B
    // porque se muestran filas (lista de gestiones recientes), no solo un conteo.
    fetchAllRows<{
      id: string;
      fecha_gestion: string;
      medio: string;
      resultado: string;
      notas: string | null;
      cliente_id: string;
      cuota_id: string;
      cliente: { nombre: string } | { nombre: string }[] | null;
      cuota: { numero_cuota: number } | { numero_cuota: number }[] | null;
    }>((offset) =>
      supabase
        .schema('crm')
        .from('gestion_cobranza')
        .select('id, fecha_gestion, medio, resultado, notas, cliente_id, cuota_id, cliente:cliente!cliente_id(nombre), cuota:cuota!cuota_id(numero_cuota)')
        .gte('fecha_gestion', startDate.toISOString())
        .lte('fecha_gestion', endDate.toISOString())
        .order('fecha_gestion', { ascending: false })
        .range(offset, offset + 999),
    ),
  ]);

  const recaudadoEnPeriodo = pagosPeriodo.reduce(
    (sum: number, p: any) => sum + (Number(p.monto) || 0),
    0,
  );

  const cuotasPagadasEnPeriodo = cuotasPagadasPeriodo.length;

  // 6. Recaudacion mensual: agrupar pagos por mes
  const recaudacionMap = new Map<string, { recaudado: number; vencido: number; cuotasPagadas: number }>();

  pagosPeriodo.forEach((p: any) => {
    const fecha = new Date(p.fecha_pago);
    const key = `${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
    const acc = recaudacionMap.get(key) ?? { recaudado: 0, vencido: 0, cuotasPagadas: 0 };
    recaudacionMap.set(key, {
      recaudado: acc.recaudado + (Number(p.monto) || 0),
      vencido: acc.vencido,
      cuotasPagadas: acc.cuotasPagadas,
    });
  });

  // Cuotas pagadas dentro del periodo cuentan en su mes
  cuotasPagadasPeriodo.forEach((c: any) => {
    if (!c.fecha_pago) return;
    const fecha = new Date(c.fecha_pago);
    const key = `${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
    const acc = recaudacionMap.get(key) ?? { recaudado: 0, vencido: 0, cuotasPagadas: 0 };
    recaudacionMap.set(key, { ...acc, cuotasPagadas: acc.cuotasPagadas + 1 });
  });

  // Cuotas vencidas en el periodo (fecha_vencimiento dentro del rango)
  cuotasActivas.forEach((c: any) => {
    if (c.estado === 'pagada') return;
    const fechaVenc = new Date(c.fecha_vencimiento);
    if (fechaVenc < startDate || fechaVenc > endDate) return;
    if (fechaVenc < hoy) {
      const key = `${MESES[fechaVenc.getMonth()]} ${fechaVenc.getFullYear()}`;
      const acc = recaudacionMap.get(key) ?? { recaudado: 0, vencido: 0, cuotasPagadas: 0 };
      recaudacionMap.set(key, {
        ...acc,
        vencido: acc.vencido + (Number(c.monto_programado) - Number(c.monto_pagado)),
      });
    }
  });

  const recaudacionMensual: RecaudacionMensual[] = Array.from(recaudacionMap.entries())
    .map(([month, v]) => ({ month, ...v }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // 7. Top deudores: agrupar cuotas activas por cliente (ventasData ya fue
  // fetcheado en el Promise.all de arriba).
  const ventasMap = new Map<string, { cliente_id: string; cliente_nombre: string }>();
  ventasData.forEach((v: any) => {
    const cliente = Array.isArray(v.cliente) ? v.cliente[0] : v.cliente;
    ventasMap.set(v.id, {
      cliente_id: v.cliente_id,
      cliente_nombre: cliente?.nombre ?? 'Sin nombre',
    });
  });

  const deudoresMap = new Map<string, TopDeudor>();
  cuotasActivas.forEach((c: any) => {
    if (c.estado === 'pagada') return;
    const venta = ventasMap.get(c.venta_id);
    if (!venta) return;

    const saldo = Number(c.monto_programado) - Number(c.monto_pagado);
    const fechaVenc = new Date(c.fecha_vencimiento);
    const diasAtraso = fechaVenc < hoy
      ? Math.floor((hoy.getTime() - fechaVenc.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const acc = deudoresMap.get(venta.cliente_id) ?? {
      cliente_id: venta.cliente_id,
      cliente_nombre: venta.cliente_nombre,
      cuotas_pendientes: 0,
      saldo_total: 0,
      mora_total: 0,
      dias_max_atraso: 0,
      moneda: c.moneda || 'PEN',
    };

    deudoresMap.set(venta.cliente_id, {
      ...acc,
      cuotas_pendientes: acc.cuotas_pendientes + 1,
      saldo_total: acc.saldo_total + saldo,
      mora_total: acc.mora_total + (Number(c.monto_mora) || 0),
      dias_max_atraso: Math.max(acc.dias_max_atraso, diasAtraso),
    });
  });

  const topDeudores = Array.from(deudoresMap.values())
    .sort((a, b) => (b.saldo_total + b.mora_total) - (a.saldo_total + a.mora_total))
    .slice(0, 10);

  const porEstadoCobranza = Array.from(porEstadoCobranzaMap.entries())
    .map(([estado, v]) => ({ estado, ...v }))
    .sort((a, b) => b.monto - a.monto);

  // 8. Gestión de cobranza (ADR6): breakdown por resultado + lista reciente.
  const gestionPorResultadoMap = new Map<string, number>();
  gestionesPeriodo.forEach((g: any) => {
    gestionPorResultadoMap.set(g.resultado, (gestionPorResultadoMap.get(g.resultado) ?? 0) + 1);
  });
  const gestionPorResultado: GestionCobranzaPorResultado[] = Array.from(
    gestionPorResultadoMap.entries(),
  )
    .map(([resultado, count]) => ({ resultado, count }))
    .sort((a, b) => b.count - a.count);

  // `gestionesPeriodo` ya viene ordenado por `fecha_gestion desc` (query),
  // así que un simple `.slice` conserva las más recientes primero — mismo
  // patrón que `topDeudores`'s `.slice(0, 10)`.
  const gestionesRecientes: GestionCobranzaReciente[] = gestionesPeriodo
    .slice(0, GESTIONES_RECIENTES_LIMIT)
    .map((g: any) => {
      const cliente = Array.isArray(g.cliente) ? g.cliente[0] : g.cliente;
      const cuota = Array.isArray(g.cuota) ? g.cuota[0] : g.cuota;
      return {
        id: g.id,
        fecha_gestion: g.fecha_gestion,
        medio: g.medio,
        resultado: g.resultado,
        cliente_id: g.cliente_id,
        cliente_nombre: cliente?.nombre ?? 'Sin nombre',
        cuota_numero: cuota?.numero_cuota ?? null,
        notas: g.notas ?? null,
      };
    });

  return {
    resumen: {
      saldoTotalPorCobrar,
      recaudadoEnPeriodo,
      moraTotal,
      cuotasPendientes,
      cuotasVencidas,
      cuotasEnMora,
      cuotasPagadasEnPeriodo,
      cuotasEnMoraTier,
      moraTierTotal,
    },
    recaudacionMensual,
    topDeudores,
    porEstadoCobranza,
    gestionPorResultado,
    gestionesRecientes,
    periodo: {
      inicio: startDate.toISOString(),
      fin: endDate.toISOString(),
      dias: days,
    },
  };
}

const fetchCobranzaCached = buildCachedReportFetcher(
  _fetchCobranza,
  ["reporte-cobranza"],
  60,
);

export async function obtenerReporteCobranza(
  periodo: string = '30',
  fechaInicio?: string,
  fechaFin?: string,
): Promise<{ data: ReporteCobranza | null; error: string | null }> {
  return safeAction(async () => {
    // Auth check fuera de la cache (per-request, sin cookies adentro).
    await getAuthorizedClient();

    const { startDate, endDate } = calcularFechas(periodo, fechaInicio, fechaFin);
    return fetchCobranzaCached(startDate.toISOString(), endDate.toISOString());
  });
}
