"use server";

import { getAuthorizedClient, calcularFechas, mesesEnRango, safeAction } from "./shared";
import { obtenerMetas } from "@/app/dashboard/admin/metas/_actions-metas";

export interface PerformanceStat {
  label: string;
  value: number;
  change: string;
  type: "positive" | "negative" | "neutral";
}

export interface TopPerformer {
  name: string;
  avatar: string;
  sales: number;
  deals: number;
  conversion: string;
  meta: number | null;
  cumplimiento: string | null;
}

export interface ReporteRendimientoData {
  performanceStats: PerformanceStat[];
  topPerformers: TopPerformer[];
  resumen: {
    totalVendedores: number;
    vendedoresActivos: number;
    ventasTotales: number;
    propiedadesTotales: number;
    promedioPorVendedor: number;
    vendedoresQueSuperaronMeta: number;
  };
  periodo: { inicio: string; fin: string; dias: number };
}

/**
 * Obtiene reporte de rendimiento de vendedores con datos reales
 */
export async function obtenerReporteRendimiento(
  periodo: string = '30',
  fechaInicio?: string,
  fechaFin?: string
): Promise<{ data: ReporteRendimientoData | null; error: string | null }> {
  return safeAction(async () => {
    const supabase = await getAuthorizedClient();
    const { startDate, endDate, days } = calcularFechas(periodo, fechaInicio, fechaFin);

    // Meta real (design.md ADR4): `meta_vendedor` sumado por vendedor a
    // través de cada mes calendario que el período solapa. Reemplaza
    // `usuario_perfil.meta_mensual_ventas` como fuente canónica; ese campo
    // sólo se usa como último recurso cuando no existe ninguna fila de
    // `meta_vendedor` para el vendedor.
    //
    // Las 4 fuentes son independientes entre sí — se piden en paralelo
    // (async-parallel) en vez de encadenar 4 awaits secuenciales.
    const meses = mesesEnRango(startDate, endDate);
    const [
      { data: vendedores },
      { data: ventasData },
      { data: leadsDelPeriodo },
      metasPorMes,
    ] = await Promise.all([
      supabase
        .schema('crm')
        .from('usuario_perfil')
        .select('id, username, nombre_completo, activo, meta_mensual_ventas')
        .eq('activo', true),
      supabase
        .schema('crm')
        .from('venta')
        .select('vendedor_username, precio_total, fecha_venta, cliente_id')
        .gte('fecha_venta', startDate.toISOString())
        .lte('fecha_venta', endDate.toISOString()),
      supabase
        .schema('crm')
        .from('cliente')
        .select('vendedor_username')
        .gte('fecha_alta', startDate.toISOString())
        .lte('fecha_alta', endDate.toISOString())
        .not('vendedor_username', 'is', null),
      Promise.all(meses.map((m) => obtenerMetas({ periodoAnio: m.anio, periodoMes: m.mes }))),
    ]);

    const leadsPorVendedor = new Map<string, number>();
    leadsDelPeriodo?.forEach(c => {
      const v = c.vendedor_username as string;
      leadsPorVendedor.set(v, (leadsPorVendedor.get(v) || 0) + 1);
    });

    const metaRows = metasPorMes.flatMap((r) => (r.success ? r.data ?? [] : []));

    const metaPorVendedor = new Map<string, number>();
    const vendedoresConMeta = new Set<string>();
    metaRows.forEach((m: any) => {
      const username = m.vendedor_username as string;
      vendedoresConMeta.add(username);
      metaPorVendedor.set(username, (metaPorVendedor.get(username) || 0) + Number(m.meta_ventas_monto || 0));
    });

    const ventasPorVendedor = new Map<string, {
      username: string; nombre: string; ventas: number;
      propiedades: number; clientes: Set<string>; meta: number | null;
    }>();

    vendedores?.forEach(vendedor => {
      const tieneMetaReal = vendedoresConMeta.has(vendedor.username);
      const metaFallback = vendedor.meta_mensual_ventas || 0;
      const meta = tieneMetaReal
        ? metaPorVendedor.get(vendedor.username) ?? 0
        : (metaFallback > 0 ? metaFallback : null);

      ventasPorVendedor.set(vendedor.username, {
        username: vendedor.username, nombre: vendedor.nombre_completo,
        ventas: 0, propiedades: 0, clientes: new Set(), meta
      });
    });

    ventasData?.forEach(venta => {
      const vendedorData = ventasPorVendedor.get(venta.vendedor_username);
      if (vendedorData) {
        vendedorData.ventas += Number(venta.precio_total);
        vendedorData.propiedades += 1;
        vendedorData.clientes.add(venta.cliente_id);
      }
    });

    const topPerformers = Array.from(ventasPorVendedor.values())
      .map(v => {
        const totalLeads = leadsPorVendedor.get(v.username) || 0;
        const conversion = totalLeads > 0
          ? ((v.clientes.size / totalLeads) * 100).toFixed(1) + '%'
          : 'N/A';
        return {
          name: v.nombre,
          avatar: v.nombre.split(' ').map(n => n[0]).join('').toUpperCase(),
          sales: v.ventas, deals: v.propiedades, conversion,
          meta: v.meta,
          // "Sin meta asignada" (null), nunca un 0 presentado como meta real.
          cumplimiento: v.meta !== null && v.meta > 0 ? ((v.ventas / v.meta) * 100).toFixed(1) : null
        };
      })
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);

    const ventasTotales = Array.from(ventasPorVendedor.values()).reduce((sum, v) => sum + v.ventas, 0);
    const propiedadesTotales = Array.from(ventasPorVendedor.values()).reduce((sum, v) => sum + v.propiedades, 0);
    const vendedoresConVentas = Array.from(ventasPorVendedor.values()).filter(v => v.ventas > 0).length;
    const promedioPorVendedor = vendedoresConVentas > 0 ? ventasTotales / vendedoresConVentas : 0;
    const vendedoresQueSuperaronMeta = Array.from(ventasPorVendedor.values())
      .filter(v => v.meta !== null && v.meta > 0 && v.ventas >= v.meta).length;

    const performanceStats: PerformanceStat[] = [
      { label: "Total Vendedores", value: vendedores?.length || 0, change: "0", type: "positive" },
      { label: "Ventas Totales", value: ventasTotales, change: "0", type: "positive" },
      { label: "Promedio por Vendedor", value: promedioPorVendedor, change: "0", type: "positive" },
      { label: "Cumplieron Meta", value: vendedoresQueSuperaronMeta, change: "0", type: "positive" },
    ];

    return {
      performanceStats, topPerformers,
      resumen: {
        totalVendedores: vendedores?.length || 0, vendedoresActivos: vendedoresConVentas,
        ventasTotales, propiedadesTotales, promedioPorVendedor, vendedoresQueSuperaronMeta
      },
      periodo: { inicio: startDate.toISOString(), fin: endDate.toISOString(), dias: days }
    };
  });
}
