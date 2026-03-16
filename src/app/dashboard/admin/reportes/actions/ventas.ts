"use server";

import { getAuthorizedClient, calcularFechas, safeAction } from "./shared";

/**
 * Obtiene reporte de ventas con datos reales
 */
export async function obtenerReporteVentas(
  periodo: string = '30',
  fechaInicio?: string,
  fechaFin?: string
): Promise<{ data: any | null; error: string | null }> {
  return safeAction(async () => {
    const supabase = await getAuthorizedClient();
    const { startDate, endDate, days } = calcularFechas(periodo, fechaInicio, fechaFin);

    const { data: ventasData, error: ventasError } = await supabase
      .schema('crm')
      .from('venta')
      .select(`
        id,
        codigo_venta,
        precio_total,
        moneda,
        fecha_venta,
        forma_pago,
        vendedor_username,
        propiedad:propiedad_id (
          codigo,
          identificacion_interna,
          proyecto:proyecto_id (
            nombre
          )
        ),
        lote:lote_id (
          codigo,
          proyecto:proyecto_id (
            nombre
          )
        )
      `)
      .gte('fecha_venta', startDate.toISOString())
      .lte('fecha_venta', endDate.toISOString())
      .order('fecha_venta', { ascending: false });

    if (ventasError) {
      console.error('Error obteniendo ventas:', ventasError);
    }

    // Calcular métricas
    const valorTotal = ventasData?.reduce((sum, v) => sum + Number(v.precio_total), 0) || 0;
    const propiedadesVendidas = ventasData?.length || 0;
    const promedioVenta = propiedadesVendidas > 0 ? valorTotal / propiedadesVendidas : 0;

    // Ventas mensuales
    const ventasPorMes: any = {};
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    ventasData?.forEach(venta => {
      const fecha = new Date(venta.fecha_venta);
      const mesKey = `${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;

      if (!ventasPorMes[mesKey]) {
        ventasPorMes[mesKey] = { ventas: 0, propiedades: 0 };
      }

      ventasPorMes[mesKey].ventas += Number(venta.precio_total);
      ventasPorMes[mesKey].propiedades += 1;
    });

    const salesData = Object.entries(ventasPorMes).map(([month, data]: [string, any]) => ({
      month,
      sales: data.ventas,
      properties: data.propiedades
    }));

    // Top proyectos
    const proyectosMap = new Map<string, { sales: number; units: number }>();

    ventasData?.forEach((venta: any) => {
      const nombreProyecto = venta.propiedad?.proyecto?.nombre || venta.lote?.proyecto?.nombre || 'Sin proyecto';
      const actual = proyectosMap.get(nombreProyecto) || { sales: 0, units: 0 };

      proyectosMap.set(nombreProyecto, {
        sales: actual.sales + Number(venta.precio_total),
        units: actual.units + 1
      });
    });

    const topProjects = Array.from(proyectosMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);

    // Distribución por forma de pago
    const formasPagoMap = new Map<string, number>();
    ventasData?.forEach(venta => {
      const forma = venta.forma_pago || 'No especificado';
      formasPagoMap.set(forma, (formasPagoMap.get(forma) || 0) + 1);
    });

    const formasPago = Array.from(formasPagoMap.entries()).map(([forma, count]) => ({
      forma,
      count,
      porcentaje: propiedadesVendidas > 0 ? (count / propiedadesVendidas) * 100 : 0
    }));

    return {
      resumen: {
        valorTotal,
        propiedadesVendidas,
        promedioVenta,
        ventasPeriodoAnterior: 0
      },
      salesData,
      topProjects,
      formasPago,
      periodo: {
        inicio: startDate.toISOString(),
        fin: endDate.toISOString(),
        dias: days
      }
    };
  });
}

/**
 * Obtiene métricas de rendimiento con datos reales
 */
export async function obtenerMetricasRendimiento(
  periodo: string = '30',
  fechaInicio?: string,
  fechaFin?: string
): Promise<{ data: any | null; error: string | null }> {
  return safeAction(async () => {
    const supabase = await getAuthorizedClient();
    const { startDate, endDate } = calcularFechas(periodo, fechaInicio, fechaFin);

    const { data: totalLeads } = await supabase
      .schema('crm')
      .from('cliente')
      .select('id')
      .in('estado_cliente', ['lead', 'prospecto']);

    const { data: clientesConVentas } = await supabase
      .schema('crm')
      .from('venta')
      .select('cliente_id')
      .gte('fecha_venta', startDate.toISOString())
      .lte('fecha_venta', endDate.toISOString());

    const clientesUnicos = new Set(clientesConVentas?.map(v => v.cliente_id) || []);
    const tasaConversion = (totalLeads && totalLeads.length > 0)
      ? (clientesUnicos.size / totalLeads.length) * 100
      : 0;

    const { data: ventasConCliente } = await supabase
      .schema('crm')
      .from('venta')
      .select(`
        fecha_venta,
        cliente:cliente_id (
          fecha_alta
        )
      `)
      .gte('fecha_venta', startDate.toISOString())
      .lte('fecha_venta', endDate.toISOString())
      .not('cliente_id', 'is', null);

    let tiempoPromedioVenta = 0;
    if (ventasConCliente && ventasConCliente.length > 0) {
      const tiempos = ventasConCliente
        .filter((v: any) => v.cliente?.fecha_alta)
        .map((v: any) => {
          const fechaVenta = new Date(v.fecha_venta);
          const fechaAlta = new Date(v.cliente.fecha_alta);
          const diffTime = Math.abs(fechaVenta.getTime() - fechaAlta.getTime());
          return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        });

      if (tiempos.length > 0) {
        tiempoPromedioVenta = Math.round(
          tiempos.reduce((sum, dias) => sum + dias, 0) / tiempos.length
        );
      }
    }

    return {
      tasaConversion: Math.round(tasaConversion * 10) / 10,
      tiempoPromedioVenta,
      totalLeads: totalLeads?.length || 0,
      clientesConvertidos: clientesUnicos.size
    };
  });
}

/**
 * Obtiene comparación de objetivos vs realidad
 */
export async function obtenerObjetivosVsRealidad(
  periodo: string = '30',
  fechaInicio?: string,
  fechaFin?: string
): Promise<{ data: any | null; error: string | null }> {
  return safeAction(async () => {
    const supabase = await getAuthorizedClient();
    const { startDate, endDate } = calcularFechas(periodo, fechaInicio, fechaFin);

    const { data: vendedores } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .select('meta_mensual_ventas')
      .eq('activo', true);

    const metaTotalVentas = vendedores?.reduce(
      (sum, v) => sum + (v.meta_mensual_ventas || 0),
      0
    ) || 0;

    const { data: ventasReales } = await supabase
      .schema('crm')
      .from('venta')
      .select('precio_total')
      .gte('fecha_venta', startDate.toISOString())
      .lte('fecha_venta', endDate.toISOString());

    const ventasRealizadas = ventasReales?.reduce(
      (sum, v) => sum + Number(v.precio_total),
      0
    ) || 0;

    const propiedadesVendidas = ventasReales?.length || 0;
    const ticketPromedio = propiedadesVendidas > 0
      ? ventasRealizadas / propiedadesVendidas
      : 0;
    const numVendedores = vendedores?.length || 1;
    const metaPropiedades = ticketPromedio > 0 && metaTotalVentas > 0
      ? Math.max(1, Math.ceil(metaTotalVentas / ticketPromedio))
      : numVendedores * 5;

    const metaClientesNuevos = numVendedores * 10;

    const { data: clientesNuevos } = await supabase
      .schema('crm')
      .from('cliente')
      .select('id')
      .gte('fecha_alta', startDate.toISOString())
      .lte('fecha_alta', endDate.toISOString());

    const clientesNuevosRealizados = clientesNuevos?.length || 0;

    return {
      ventasMensuales: {
        meta: metaTotalVentas,
        realizado: ventasRealizadas,
        porcentaje: metaTotalVentas > 0 ? (ventasRealizadas / metaTotalVentas) * 100 : 0
      },
      propiedades: {
        meta: metaPropiedades,
        realizado: propiedadesVendidas,
        porcentaje: metaPropiedades > 0 ? (propiedadesVendidas / metaPropiedades) * 100 : 0
      },
      clientesNuevos: {
        meta: metaClientesNuevos,
        realizado: clientesNuevosRealizados,
        porcentaje: metaClientesNuevos > 0 ? (clientesNuevosRealizados / metaClientesNuevos) * 100 : 0
      }
    };
  });
}
