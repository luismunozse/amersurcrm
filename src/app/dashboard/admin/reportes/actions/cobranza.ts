"use server";

import { getAuthorizedClient, calcularFechas, safeAction } from "./shared";

export interface ReporteCobranzaResumen {
  saldoTotalPorCobrar: number;
  recaudadoEnPeriodo: number;
  moraTotal: number;
  cuotasPendientes: number;
  cuotasVencidas: number;
  cuotasEnMora: number;
  cuotasPagadasEnPeriodo: number;
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
  periodo: { inicio: string; fin: string; dias: number };
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/**
 * Reporte de Cobranza con datos reales de cuotas + pagos.
 * - Saldos pendientes y mora se calculan sobre todas las cuotas activas (acumulado).
 * - Recaudado y cuotas pagadas se filtran por el periodo (fecha_pago).
 */
export async function obtenerReporteCobranza(
  periodo: string = '30',
  fechaInicio?: string,
  fechaFin?: string,
): Promise<{ data: ReporteCobranza | null; error: string | null }> {
  return safeAction(async () => {
    const supabase = await getAuthorizedClient();
    const { startDate, endDate, days } = calcularFechas(periodo, fechaInicio, fechaFin);

    // 1. Cuotas activas (acumulado) para saldos y mora
    const { data: cuotasActivas, error: cuotasError } = await supabase
      .schema('crm')
      .from('cuota')
      .select('id, venta_id, monto_programado, monto_pagado, monto_mora, fecha_vencimiento, estado, moneda');

    if (cuotasError) throw cuotasError;

    let saldoTotalPorCobrar = 0;
    let moraTotal = 0;
    let cuotasPendientes = 0;
    let cuotasVencidas = 0;
    let cuotasEnMora = 0;
    const porEstadoCobranzaMap = new Map<string, { count: number; monto: number }>();
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    (cuotasActivas ?? []).forEach((c: any) => {
      if (c.estado === 'pagada') return;
      const saldo = Number(c.monto_programado) - Number(c.monto_pagado);
      saldoTotalPorCobrar += saldo;
      moraTotal += Number(c.monto_mora) || 0;

      if (c.estado === 'pendiente') cuotasPendientes += 1;
      else if (c.estado === 'vencida') cuotasVencidas += 1;
      else if (c.estado === 'en_mora') cuotasEnMora += 1;

      const estado = c.estado as string;
      const acc = porEstadoCobranzaMap.get(estado) ?? { count: 0, monto: 0 };
      porEstadoCobranzaMap.set(estado, { count: acc.count + 1, monto: acc.monto + saldo });
    });

    // 2. Pagos realizados en el periodo (no anulados)
    const { data: pagosPeriodo } = await supabase
      .schema('crm')
      .from('pago')
      .select('id, monto, fecha_pago, anulado')
      .eq('anulado', false)
      .gte('fecha_pago', startDate.toISOString())
      .lte('fecha_pago', endDate.toISOString());

    const recaudadoEnPeriodo = (pagosPeriodo ?? []).reduce(
      (sum: number, p: any) => sum + (Number(p.monto) || 0),
      0,
    );

    // 3. Cuotas pagadas en el periodo (segun fecha_pago de la cuota)
    const { data: cuotasPagadasPeriodo } = await supabase
      .schema('crm')
      .from('cuota')
      .select('id, fecha_pago, monto_pagado')
      .eq('estado', 'pagada')
      .gte('fecha_pago', startDate.toISOString())
      .lte('fecha_pago', endDate.toISOString());

    const cuotasPagadasEnPeriodo = (cuotasPagadasPeriodo ?? []).length;

    // 4. Recaudacion mensual: agrupar pagos por mes
    const recaudacionMap = new Map<string, { recaudado: number; vencido: number; cuotasPagadas: number }>();

    (pagosPeriodo ?? []).forEach((p: any) => {
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
    (cuotasPagadasPeriodo ?? []).forEach((c: any) => {
      if (!c.fecha_pago) return;
      const fecha = new Date(c.fecha_pago);
      const key = `${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
      const acc = recaudacionMap.get(key) ?? { recaudado: 0, vencido: 0, cuotasPagadas: 0 };
      recaudacionMap.set(key, { ...acc, cuotasPagadas: acc.cuotasPagadas + 1 });
    });

    // Cuotas vencidas en el periodo (fecha_vencimiento dentro del rango)
    (cuotasActivas ?? []).forEach((c: any) => {
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

    // 5. Top deudores: agrupar cuotas activas por cliente
    const ventaIds = Array.from(
      new Set((cuotasActivas ?? []).filter((c: any) => c.estado !== 'pagada').map((c: any) => c.venta_id)),
    );

    const ventasMap = new Map<string, { cliente_id: string; cliente_nombre: string }>();
    if (ventaIds.length > 0) {
      const { data: ventasData } = await supabase
        .schema('crm')
        .from('venta')
        .select('id, cliente_id, cliente:cliente!cliente_id(nombre)')
        .in('id', ventaIds);

      (ventasData ?? []).forEach((v: any) => {
        const cliente = Array.isArray(v.cliente) ? v.cliente[0] : v.cliente;
        ventasMap.set(v.id, {
          cliente_id: v.cliente_id,
          cliente_nombre: cliente?.nombre ?? 'Sin nombre',
        });
      });
    }

    const deudoresMap = new Map<string, TopDeudor>();
    (cuotasActivas ?? []).forEach((c: any) => {
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

    return {
      resumen: {
        saldoTotalPorCobrar,
        recaudadoEnPeriodo,
        moraTotal,
        cuotasPendientes,
        cuotasVencidas,
        cuotasEnMora,
        cuotasPagadasEnPeriodo,
      },
      recaudacionMensual,
      topDeudores,
      porEstadoCobranza,
      periodo: {
        inicio: startDate.toISOString(),
        fin: endDate.toISOString(),
        dias: days,
      },
    };
  });
}
