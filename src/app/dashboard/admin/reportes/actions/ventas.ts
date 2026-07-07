"use server";

import { getAuthorizedClient, calcularFechas, calcularVentanaAnterior, mesesEnRango, safeAction } from "./shared";
import { EXCLUIR_IMPORTACION_NUNCA_CONTACTADO } from "@/lib/dashboard/aging";
import { obtenerMetas } from "@/app/dashboard/admin/metas/_actions-metas";

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

    // Comparación real vs. período anterior (design.md ADR3) — ventana de la
    // misma longitud inmediatamente anterior a `startDate`, nunca un 0
    // hardcodeado. Corre en paralelo con la consulta del período actual: son
    // independientes, no hay razón para encadenarlas (async-parallel).
    const { prevStart, prevEnd } = calcularVentanaAnterior(startDate, endDate);

    const [
      { data: ventasData, error: ventasError },
      { data: ventasPeriodoAnteriorData },
    ] = await Promise.all([
      supabase
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
        .order('fecha_venta', { ascending: false }),
      supabase
        .schema('crm')
        .from('venta')
        .select('precio_total')
        .gte('fecha_venta', prevStart.toISOString())
        .lte('fecha_venta', prevEnd.toISOString()),
    ]);

    if (ventasError) {
      console.error('Error obteniendo ventas:', ventasError);
    }

    const ventasPeriodoAnterior = ventasPeriodoAnteriorData?.reduce(
      (sum, v) => sum + Number(v.precio_total),
      0,
    ) || 0;

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
        ventasPeriodoAnterior
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

    // Conversion denominator = leads del período (funnel-cohort semantics,
    // single-sourced with funnel.ts) excluyendo el backlog de importación
    // nunca contactado — ver design.md ADR1 "Conversion denominator".
    const { data: leadsPeriodo } = await supabase
      .schema('crm')
      .from('cliente')
      .select('id')
      .gte('fecha_alta', startDate.toISOString())
      .lte('fecha_alta', endDate.toISOString())
      .or(EXCLUIR_IMPORTACION_NUNCA_CONTACTADO);

    const leadIds = new Set((leadsPeriodo ?? []).map((c: any) => c.id));

    const { data: clientesConVentas } = await supabase
      .schema('crm')
      .from('venta')
      .select('cliente_id')
      .gte('fecha_venta', startDate.toISOString())
      .lte('fecha_venta', endDate.toISOString());

    // Numerador = leads del período que llegaron a venta (intersección con
    // el set de leads, mismo patrón que funnel.ts's leadIds/ventasCerradasIds).
    const clientesUnicos = new Set(
      (clientesConVentas ?? [])
        .map((v: any) => v.cliente_id)
        .filter((clienteId: string) => leadIds.has(clienteId)),
    );
    const totalLeads = leadIds.size;
    const tasaConversion = totalLeads > 0
      ? (clientesUnicos.size / totalLeads) * 100
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
      totalLeads,
      clientesConvertidos: clientesUnicos.size
    };
  });
}

/**
 * Obtiene comparación de objetivos vs realidad.
 *
 * Meta source is `meta_vendedor` (design.md ADR4), read through the existing
 * `obtenerMetas` action so parity with `MetaDelMes`/`VentasVsMetaBlock` is
 * structural. The `numVendedores * 5` / `numVendedores * 10` heuristics are
 * deleted with no replacement — they were exactly the "numbers that lie"
 * this change exists to kill.
 *
 * `meta_vendedor` targets are monthly; the report period is an arbitrary day
 * range, so the meta figure sums every vendedor's monthly meta across every
 * calendar month `mesesEnRango` says the period overlaps.
 *
 * `clientesNuevos.meta` stays `null` permanently: `meta_vendedor` has no
 * clientes-nuevos target column. `ventasMensuales`/`propiedades` still
 * return a `meta` number (the real, possibly-zero sum) when zero
 * `meta_vendedor` rows exist for the period, flagged `esEstimado: true` so
 * the UI can mark it as an aggregate estimate instead of presenting it as a
 * trustworthy target.
 */
export async function obtenerObjetivosVsRealidad(
  periodo: string = '30',
  fechaInicio?: string,
  fechaFin?: string
): Promise<{ data: any | null; error: string | null }> {
  return safeAction(async () => {
    const supabase = await getAuthorizedClient();
    const { startDate, endDate } = calcularFechas(periodo, fechaInicio, fechaFin);

    // Las tres fuentes son independientes entre sí — se piden en paralelo
    // (async-parallel) en vez de encadenarlas con awaits secuenciales.
    const meses = mesesEnRango(startDate, endDate);
    const [metasPorMes, { data: ventasReales }, { data: clientesNuevos }] = await Promise.all([
      Promise.all(meses.map((m) => obtenerMetas({ periodoAnio: m.anio, periodoMes: m.mes }))),
      supabase
        .schema('crm')
        .from('venta')
        .select('precio_total')
        .gte('fecha_venta', startDate.toISOString())
        .lte('fecha_venta', endDate.toISOString()),
      supabase
        .schema('crm')
        .from('cliente')
        .select('id')
        .gte('fecha_alta', startDate.toISOString())
        .lte('fecha_alta', endDate.toISOString()),
    ]);

    const metaRows = metasPorMes.flatMap((r) => (r.success ? r.data ?? [] : []));
    const esEstimado = metaRows.length === 0;

    const metaTotalVentas = metaRows.reduce(
      (sum, m) => sum + Number(m.meta_ventas_monto || 0),
      0
    );
    const metaTotalPropiedades = metaRows.reduce(
      (sum, m) => sum + Number(m.meta_ventas_cantidad || 0),
      0
    );

    const ventasRealizadas = ventasReales?.reduce(
      (sum, v) => sum + Number(v.precio_total),
      0
    ) || 0;

    const propiedadesVendidas = ventasReales?.length || 0;
    const clientesNuevosRealizados = clientesNuevos?.length || 0;

    return {
      ventasMensuales: {
        meta: metaTotalVentas,
        realizado: ventasRealizadas,
        porcentaje: metaTotalVentas > 0 ? (ventasRealizadas / metaTotalVentas) * 100 : 0,
        esEstimado
      },
      propiedades: {
        meta: metaTotalPropiedades,
        realizado: propiedadesVendidas,
        porcentaje: metaTotalPropiedades > 0 ? (propiedadesVendidas / metaTotalPropiedades) * 100 : 0,
        esEstimado
      },
      clientesNuevos: {
        // meta_vendedor no tiene columna de meta de clientes nuevos: sin
        // reemplazo posible, se muestra "Sin meta asignada" siempre.
        meta: null,
        realizado: clientesNuevosRealizados,
        porcentaje: 0,
        esEstimado: false
      }
    };
  });
}
