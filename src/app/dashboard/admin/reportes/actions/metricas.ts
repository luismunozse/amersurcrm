"use server";

import { getAuthorizedClient, calcularFechas, safeAction, cachedReport } from "./shared";

export interface ReporteMetricas {
  periodo: {
    inicio: string;
    fin: string;
    dias: number;
  };
  metricas: {
    ventas: {
      valorTotal: number;
      propiedadesVendidas: number;
      promedioVenta: number;
      /** Ventas registradas en tabla venta dentro del período (valor confiable para comparaciones) */
      ventasRegistradasEnPeriodo: number;
      /** Cantidad de ventas registradas en tabla venta dentro del período */
      cantidadVentasEnPeriodo: number;
    };
    clientes: {
      nuevos: number;
      activos: number;
      tasaConversion: number;
    };
    propiedades: {
      total: number;
      nuevas: number;
      vendidas: number;
      disponibles: number;
      valorTotal: number;
    };
    proyectos: {
      nuevos: number;
      total: number;
    };
    vendedores: {
      activos: number;
      topVendedores: Array<{
        username: string;
        nombre: string;
        ventas: number;
        propiedades: number;
        meta: number;
      }>;
    };
  };
  tendencias: Array<{
    mes: string;
    ventas: number;
    propiedades: number;
    clientes: number;
  }>;
}

// Función para procesar tendencias completas (ventas + propiedades agregadas)
function procesarTendenciasCompletas(
  ventasData: any[],
  lotesData: any[],
  propiedadesData: any[]
) {
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const tendencias: any = {};

  const hoy = new Date();
  for (let i = 5; i >= 0; i--) {
    const fecha = new Date(hoy);
    fecha.setMonth(hoy.getMonth() - i);
    const mesKey = `${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
    tendencias[mesKey] = {
      ventas: 0,
      propiedades: 0,
      clientes: new Set()
    };
  }

  ventasData.forEach(item => {
    const fecha = new Date(item.fecha_venta);
    const mesKey = `${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
    if (tendencias[mesKey]) {
      tendencias[mesKey].ventas += Number(item.precio_total) || 0;
      if (item.cliente_id) {
        tendencias[mesKey].clientes.add(item.cliente_id);
      }
    }
  });

  lotesData.forEach(item => {
    const fecha = new Date(item.created_at);
    const mesKey = `${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
    if (tendencias[mesKey]) {
      tendencias[mesKey].propiedades++;
    }
  });

  propiedadesData.forEach(item => {
    const fecha = new Date(item.created_at);
    const mesKey = `${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
    if (tendencias[mesKey]) {
      tendencias[mesKey].propiedades++;
    }
  });

  return Object.entries(tendencias).map(([mes, data]: [string, any]) => ({
    mes,
    ventas: data.ventas,
    propiedades: data.propiedades,
    clientes: data.clientes.size
  }));
}

/**
 * Obtiene métricas principales de reportes
 */
export async function obtenerMetricasReportes(
  periodo: string = '30',
  fechaInicio?: string,
  fechaFin?: string
): Promise<{ data: ReporteMetricas | null; error: string | null }> {
  return safeAction(async () => {
    const supabase = await getAuthorizedClient();
    const { startDate, endDate, days } = calcularFechas(periodo, fechaInicio, fechaFin);
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

    const [
      clientesResult,
      totalClientesResult,
      lotesResult,
      lotesEstadosResult,
      propiedadesResult,
      propiedadesEstadosResult,
      proyectosResult,
      vendedoresResult,
      ventasResult,
      tendenciasVentasResult,
      lotesTendenciaResult,
      propiedadesTendenciaResult,
      ventasVendedoresResult,
    ] = await Promise.all([
      supabase.schema('crm').from('cliente')
        .select('id, estado_cliente, fecha_alta, vendedor_asignado')
        .gte('fecha_alta', startISO).lte('fecha_alta', endISO),
      // Clientes acumulados hasta el fin del período (para comparación correcta entre períodos)
      supabase.schema('crm').from('cliente')
        .select('id', { count: 'exact', head: true })
        .lte('fecha_alta', endISO),
      supabase.schema('crm').from('lote')
        .select('id, estado, precio, created_at')
        .gte('created_at', startISO).lte('created_at', endISO),
      // Lotes con estado hasta el fin del período
      supabase.schema('crm').from('lote')
        .select('id, estado, precio')
        .lte('created_at', endISO),
      supabase.schema('crm').from('propiedad')
        .select('id, estado_comercial, precio, created_at')
        .gte('created_at', startISO).lte('created_at', endISO),
      // Propiedades con estado hasta el fin del período
      supabase.schema('crm').from('propiedad')
        .select('id, estado_comercial, precio')
        .lte('created_at', endISO),
      supabase.schema('crm').from('proyecto')
        .select('id, nombre, estado, created_at')
        .gte('created_at', startISO).lte('created_at', endISO),
      supabase.schema('crm').from('usuario_perfil')
        .select('id, username, nombre_completo, activo, rol_id, meta_mensual_ventas, comision_porcentaje')
        .eq('activo', true),
      supabase.schema('crm').from('venta')
        .select('id, precio_total')
        .gte('fecha_venta', startISO).lte('fecha_venta', endISO),
      supabase.schema('crm').from('venta')
        .select('fecha_venta, precio_total, cliente_id')
        .gte('fecha_venta', seisMesesAtras.toISOString())
        .order('fecha_venta', { ascending: true }),
      supabase.schema('crm').from('lote')
        .select('created_at')
        .gte('created_at', seisMesesAtras.toISOString()),
      supabase.schema('crm').from('propiedad')
        .select('created_at')
        .gte('created_at', seisMesesAtras.toISOString()),
      supabase.schema('crm').from('venta')
        .select('vendedor_username, precio_total')
        .gte('fecha_venta', startISO).lte('fecha_venta', endISO),
    ]);

    const { data: clientesData } = clientesResult;
    const { count: totalClientesCount } = totalClientesResult;
    const { data: lotesData } = lotesResult;
    const { data: lotesEstados } = lotesEstadosResult;
    const { data: propiedadesData } = propiedadesResult;
    const { data: propiedadesEstados } = propiedadesEstadosResult;
    const { data: proyectosData } = proyectosResult;
    const { data: vendedoresData } = vendedoresResult;
    const { data: ventasData } = ventasResult;
    const { data: tendenciasVentasData } = tendenciasVentasResult;
    const { data: lotesTendencia } = lotesTendenciaResult;
    const { data: propiedadesTendencia } = propiedadesTendenciaResult;
    const { data: ventasVendedores } = ventasVendedoresResult;

    const clientesNuevos = clientesData?.length || 0;
    const clientesActivos = totalClientesCount ?? 0;
    const propiedadesNuevas = (lotesData?.length || 0) + (propiedadesData?.length || 0);

    const lotesVendidos = lotesEstados?.filter(l => l.estado === 'vendido').length || 0;
    const propiedadesVendidas = propiedadesEstados?.filter(p => p.estado_comercial === 'vendido').length || 0;
    const totalVendidas = lotesVendidos + propiedadesVendidas;

    const lotesDisponibles = lotesEstados?.filter(l => l.estado === 'disponible').length || 0;
    const propiedadesDisponibles = propiedadesEstados?.filter(p => p.estado_comercial === 'disponible').length || 0;
    const totalDisponibles = lotesDisponibles + propiedadesDisponibles;

    const valorVentasRegistradas =
      ventasData?.reduce((sum, v) => sum + (Number(v.precio_total) || 0), 0) || 0;
    const ventasEnPeriodo = ventasData?.length || 0;

    const valorLotesVendidos =
      lotesEstados
        ?.filter((l) => l.estado === "vendido")
        .reduce((sum, lote) => sum + (Number((lote as { precio?: number }).precio) || 0), 0) || 0;

    const valorPropiedadesVendidas =
      propiedadesEstados
        ?.filter((p) => p.estado_comercial === "vendido")
        .reduce(
          (sum, propiedad) => sum + (Number((propiedad as { precio?: number }).precio) || 0),
          0,
        ) || 0;

    const valorTotalVentas =
      valorVentasRegistradas > 0 ? valorVentasRegistradas : valorLotesVendidos + valorPropiedadesVendidas;

    const proyectosNuevos = proyectosData?.length || 0;
    const vendedoresActivos = vendedoresData?.length || 0;

    const totalLeads = clientesData?.length || 0;
    const clientesConvertidos = clientesData?.filter((c) => c.estado_cliente === 'cliente').length || 0;
    const tasaConversion = totalLeads > 0 ? (clientesConvertidos / totalLeads) * 100 : 0;

    const tendenciasMensuales = procesarTendenciasCompletas(
      tendenciasVentasData || [],
      lotesTendencia || [],
      propiedadesTendencia || []
    );

    const ventasPorVendedor = new Map<string, { ventas: number; propiedades: number }>();
    ventasVendedores?.forEach(venta => {
      const actual = ventasPorVendedor.get(venta.vendedor_username) || { ventas: 0, propiedades: 0 };
      ventasPorVendedor.set(venta.vendedor_username, {
        ventas: actual.ventas + Number(venta.precio_total),
        propiedades: actual.propiedades + 1
      });
    });

    const topVendedores = vendedoresData?.map(v => ({
      username: v.username,
      nombre: v.nombre_completo,
      ventas: ventasPorVendedor.get(v.username)?.ventas || 0,
      propiedades: ventasPorVendedor.get(v.username)?.propiedades || 0,
      meta: v.meta_mensual_ventas || 0
    }))
    .sort((a, b) => b.ventas - a.ventas)
    .slice(0, 5) || [];

    const totalPropiedades = (lotesEstados?.length || 0) + (propiedadesEstados?.length || 0);

    const reporte: ReporteMetricas = {
      periodo: {
        inicio: startISO,
        fin: endISO,
        dias: days
      },
      metricas: {
        ventas: {
          valorTotal: valorTotalVentas,
          propiedadesVendidas: totalVendidas,
          promedioVenta: totalVendidas > 0 ? valorTotalVentas / totalVendidas : 0,
          ventasRegistradasEnPeriodo: valorVentasRegistradas,
          cantidadVentasEnPeriodo: ventasEnPeriodo,
        },
        clientes: {
          nuevos: clientesNuevos,
          activos: clientesActivos,
          tasaConversion: Math.round(tasaConversion * 100) / 100
        },
        propiedades: {
          total: totalPropiedades,
          nuevas: propiedadesNuevas,
          vendidas: totalVendidas,
          disponibles: totalDisponibles,
          valorTotal: valorTotalVentas
        },
        proyectos: {
          nuevos: proyectosNuevos,
          total: proyectosData?.length || 0
        },
        vendedores: {
          activos: vendedoresActivos,
          topVendedores: topVendedores
        }
      },
      tendencias: tendenciasMensuales
    };

    return reporte;
  });
}
