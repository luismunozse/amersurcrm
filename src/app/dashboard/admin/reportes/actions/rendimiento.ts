"use server";

import { getAuthorizedClient, calcularFechas, safeAction } from "./shared";

/**
 * Obtiene reporte de rendimiento de vendedores con datos reales
 */
export async function obtenerReporteRendimiento(
  periodo: string = '30',
  fechaInicio?: string,
  fechaFin?: string
): Promise<{ data: any | null; error: string | null }> {
  return safeAction(async () => {
    const supabase = await getAuthorizedClient();
    const { startDate, endDate, days } = calcularFechas(periodo, fechaInicio, fechaFin);

    const { data: vendedores } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .select('id, username, nombre_completo, activo, meta_mensual_ventas')
      .eq('activo', true);

    const { data: ventasData } = await supabase
      .schema('crm')
      .from('venta')
      .select('vendedor_username, precio_total, fecha_venta, cliente_id')
      .gte('fecha_venta', startDate.toISOString())
      .lte('fecha_venta', endDate.toISOString());

    const { data: leadsDelPeriodo } = await supabase
      .schema('crm')
      .from('cliente')
      .select('vendedor_username')
      .gte('fecha_alta', startDate.toISOString())
      .lte('fecha_alta', endDate.toISOString())
      .not('vendedor_username', 'is', null);

    const leadsPorVendedor = new Map<string, number>();
    leadsDelPeriodo?.forEach(c => {
      const v = c.vendedor_username as string;
      leadsPorVendedor.set(v, (leadsPorVendedor.get(v) || 0) + 1);
    });

    const ventasPorVendedor = new Map<string, {
      username: string; nombre: string; ventas: number;
      propiedades: number; clientes: Set<string>; meta: number;
    }>();

    vendedores?.forEach(vendedor => {
      ventasPorVendedor.set(vendedor.username, {
        username: vendedor.username, nombre: vendedor.nombre_completo,
        ventas: 0, propiedades: 0, clientes: new Set(), meta: vendedor.meta_mensual_ventas || 0
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
          cumplimiento: v.meta > 0 ? ((v.ventas / v.meta) * 100).toFixed(1) : '0'
        };
      })
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);

    const ventasTotales = Array.from(ventasPorVendedor.values()).reduce((sum, v) => sum + v.ventas, 0);
    const propiedadesTotales = Array.from(ventasPorVendedor.values()).reduce((sum, v) => sum + v.propiedades, 0);
    const vendedoresConVentas = Array.from(ventasPorVendedor.values()).filter(v => v.ventas > 0).length;
    const promedioPorVendedor = vendedoresConVentas > 0 ? ventasTotales / vendedoresConVentas : 0;
    const vendedoresQueSuperaronMeta = Array.from(ventasPorVendedor.values())
      .filter(v => v.meta > 0 && v.ventas >= v.meta).length;

    const performanceStats = [
      { label: "Total Vendedores", value: vendedores?.length || 0, change: "0", type: "positive" },
      { label: "Ventas Totales", value: ventasTotales, change: "0", type: "positive" },
      { label: "Promedio por Vendedor", value: promedioPorVendedor, change: "0", type: "positive" },
      { label: "Cumplieron Meta", value: vendedoresQueSuperaronMeta, change: "0", type: "positive" }
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
