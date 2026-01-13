"use server";

import { createServerOnlyClient } from "@/lib/supabase.server";
import { esAdmin } from "@/lib/permissions/server";

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

/**
 * Obtiene métricas principales de reportes
 */
export async function obtenerMetricasReportes(
  periodo: string = '30',
  fechaInicio?: string,
  fechaFin?: string
): Promise<{ data: ReporteMetricas | null; error: string | null }> {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "No autorizado" };
    }

    const isAdminUser = await esAdmin();
    if (!isAdminUser) {
      return { data: null, error: "No tienes permisos de administrador" };
    }

    // Calcular fechas según el período
    let startDate: string;
    let endDate = new Date().toISOString();

    if (fechaInicio && fechaFin) {
      startDate = new Date(fechaInicio).toISOString();
      endDate = new Date(fechaFin).toISOString();
    } else {
      const days = parseInt(periodo);
      const start = new Date();
      start.setDate(start.getDate() - days);
      startDate = start.toISOString();
    }

    // 1. Métricas de Clientes
    const { data: clientesData, error: clientesError } = await supabase
      .schema('crm')
      .from('cliente')
      .select('id, estado_cliente, fecha_alta, vendedor_asignado')
      .gte('fecha_alta', startDate)
      .lte('fecha_alta', endDate);

    if (clientesError) {
      console.error('Error obteniendo clientes:', clientesError);
    }

    // Clientes totales (no solo del período)
    const { count: totalClientesCount, error: totalClientesError } = await supabase
      .schema('crm')
      .from('cliente')
      .select('id', { count: 'exact', head: true });

    if (totalClientesError) {
      console.error('Error obteniendo total de clientes:', totalClientesError);
    }

    // 2. Métricas de Propiedades (incluye lotes y propiedades)
    // 2.1 Lotes
    const { data: lotesData } = await supabase
      .schema('crm')
      .from('lote')
      .select('id, estado, precio, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    const { data: lotesEstados } = await supabase
      .schema('crm')
      .from('lote')
      .select('id, estado, precio');

    // 2.2 Propiedades
    const { data: propiedadesData, error: propiedadesError } = await supabase
      .schema('crm')
      .from('propiedad')
      .select('id, estado_comercial, precio, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (propiedadesError) {
      console.error('Error obteniendo propiedades:', propiedadesError);
    }

    const { data: propiedadesEstados } = await supabase
      .schema('crm')
      .from('propiedad')
      .select('id, estado_comercial, precio');

    // 3. Métricas de Proyectos
    const { data: proyectosData } = await supabase
      .schema('crm')
      .from('proyecto')
      .select('id, nombre, estado, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    // 4. Métricas de Usuarios/Vendedores
    const { data: vendedoresData } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .select('id, username, nombre_completo, activo, rol_id, meta_mensual_ventas, comision_porcentaje')
      .eq('activo', true);

    // 5. Calcular métricas
    const clientesNuevos = clientesData?.length || 0;
    const clientesActivos = totalClientesCount ?? 0;

    // Combinar lotes y propiedades
    const propiedadesNuevas = (lotesData?.length || 0) + (propiedadesData?.length || 0);

    const lotesVendidos = lotesEstados?.filter(l => l.estado === 'vendido').length || 0;
    const propiedadesVendidas = propiedadesEstados?.filter(p => p.estado_comercial === 'vendido').length || 0;
    const totalVendidas = lotesVendidos + propiedadesVendidas;

    const lotesDisponibles = lotesEstados?.filter(l => l.estado === 'disponible').length || 0;
    const propiedadesDisponibles = propiedadesEstados?.filter(p => p.estado_comercial === 'disponible').length || 0;
    const totalDisponibles = lotesDisponibles + propiedadesDisponibles;

    // Obtener valor total de ventas REALES desde la tabla venta
    const { data: ventasData } = await supabase
      .schema('crm')
      .from('venta')
      .select('precio_total')
      .gte('fecha_venta', startDate)
      .lte('fecha_venta', endDate);

    const valorVentasRegistradas =
      ventasData?.reduce((sum, v) => sum + (Number(v.precio_total) || 0), 0) || 0;

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

    // Calcular tasa de conversión (clientes activos / total de leads)
    const totalLeads = clientesData?.length || 0;
    const tasaConversion = totalLeads > 0 ? (clientesActivos / totalLeads) * 100 : 0;

    // 6. Datos para gráficos de tendencias (últimos 6 meses)
    // Usamos las ventas reales en lugar de created_at de propiedades
    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

    const { data: tendenciasVentasData } = await supabase
      .schema('crm')
      .from('venta')
      .select('fecha_venta, precio_total, cliente_id')
      .gte('fecha_venta', seisMesesAtras.toISOString())
      .order('fecha_venta', { ascending: true });

    // Procesar datos para gráficos mensuales
    const tendenciasMensuales = procesarTendenciasVentas(tendenciasVentasData || []);

    // 7. Top vendedores por ventas (DATOS REALES)
    // Obtener ventas reales por vendedor
    const { data: ventasVendedores } = await supabase
      .schema('crm')
      .from('venta')
      .select('vendedor_username, precio_total')
      .gte('fecha_venta', startDate)
      .lte('fecha_venta', endDate);

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
        inicio: startDate,
        fin: endDate,
        dias: parseInt(periodo)
      },
      metricas: {
        ventas: {
          valorTotal: valorTotalVentas,
          propiedadesVendidas: totalVendidas,
          promedioVenta: totalVendidas > 0 ? valorTotalVentas / totalVendidas : 0
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

    return { data: reporte, error: null };

  } catch (error) {
    console.error('Error generando reporte:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Obtiene reporte de ventas con datos reales
 */
export async function obtenerReporteVentas(
  periodo: string = '30'
): Promise<{ data: any | null; error: string | null }> {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "No autorizado" };
    }

    const isAdminUser = await esAdmin();
    if (!isAdminUser) {
      return { data: null, error: "No tienes permisos de administrador" };
    }

    // Calcular fechas
    const days = parseInt(periodo);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const endDate = new Date();

    // Obtener ventas del período
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

    // Ventas totales
    const { data: _ventasTotales } = await supabase
      .schema('crm')
      .from('venta')
      .select('precio_total, moneda');

    // Calcular métricas
    const valorTotal = ventasData?.reduce((sum, v) => sum + Number(v.precio_total), 0) || 0;
    const propiedadesVendidas = ventasData?.length || 0;
    const promedioVenta = propiedadesVendidas > 0 ? valorTotal / propiedadesVendidas : 0;

    // Ventas mensuales (últimos 6 meses)
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
      data: {
        resumen: {
          valorTotal,
          propiedadesVendidas,
          promedioVenta,
          ventasPeriodoAnterior: 0 // TODO: calcular período anterior
        },
        salesData,
        topProjects,
        formasPago,
        periodo: {
          inicio: startDate.toISOString(),
          fin: endDate.toISOString(),
          dias: days
        }
      },
      error: null
    };
  } catch (error) {
    console.error('Error obteniendo reporte de ventas:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Obtiene reporte de clientes con datos reales
 */
export async function obtenerReporteClientes(
  periodo: string = '30'
): Promise<{ data: any | null; error: string | null }> {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "No autorizado" };
    }

    const isAdminUser = await esAdmin();
    if (!isAdminUser) {
      return { data: null, error: "No tienes permisos de administrador" };
    }

    // Calcular fechas
    const days = parseInt(periodo);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const endDate = new Date();

    // Clientes nuevos del período
    const { data: clientesNuevos } = await supabase
      .schema('crm')
      .from('cliente')
      .select('*')
      .gte('fecha_alta', startDate.toISOString())
      .lte('fecha_alta', endDate.toISOString());

    // Todos los clientes
    const { data: todosClientes } = await supabase
      .schema('crm')
      .from('cliente')
      .select('id, estado_cliente, origen_lead, propiedades_compradas, propiedades_reservadas');

    // Clientes activos
    const clientesActivos = todosClientes?.filter(c => c.estado_cliente === 'activo').length || 0;

    // Clientes por fuente (origen_lead)
    const fuentesMap = new Map<string, number>();
    todosClientes?.forEach(cliente => {
      const fuente = cliente.origen_lead || 'No especificado';
      fuentesMap.set(fuente, (fuentesMap.get(fuente) || 0) + 1);
    });

    const clientSources = Array.from(fuentesMap.entries()).map(([source, count]) => ({
      source,
      count,
      percentage: todosClientes ? (count / todosClientes.length) * 100 : 0
    }));

    // Top clientes por valor (usando propiedades compradas como proxy)
    const { data: topClientesData } = await supabase
      .schema('crm')
      .from('cliente')
      .select(`
        id,
        nombre,
        email,
        estado_cliente,
        propiedades_compradas,
        propiedades_reservadas
      `)
      .order('propiedades_compradas', { ascending: false })
      .limit(10);

    // Obtener ventas para calcular valor real de top clientes
    const { data: ventasClientes } = await supabase
      .schema('crm')
      .from('venta')
      .select('cliente_id, precio_total');

    const valorPorCliente = new Map<string, number>();
    ventasClientes?.forEach(venta => {
      const actual = valorPorCliente.get(venta.cliente_id) || 0;
      valorPorCliente.set(venta.cliente_id, actual + Number(venta.precio_total));
    });

    const topClients = topClientesData?.map(cliente => ({
      name: cliente.nombre,
      email: cliente.email || 'No especificado',
      value: valorPorCliente.get(cliente.id) || 0,
      status: cliente.estado_cliente
    })) || [];

    // Segmentación por número de propiedades
    const segmentos = [
      { segment: 'VIP (3+ propiedades)', count: todosClientes?.filter(c => (c.propiedades_compradas || 0) >= 3).length || 0 },
      { segment: 'Premium (2 propiedades)', count: todosClientes?.filter(c => (c.propiedades_compradas || 0) === 2).length || 0 },
      { segment: 'Standard (1 propiedad)', count: todosClientes?.filter(c => (c.propiedades_compradas || 0) === 1).length || 0 },
      { segment: 'Básico (0 propiedades)', count: todosClientes?.filter(c => (c.propiedades_compradas || 0) === 0).length || 0 }
    ];

    const clientStats = [
      {
        label: "Total Clientes",
        value: todosClientes?.length || 0,
        change: clientesNuevos?.length || 0,
        type: "positive"
      },
      {
        label: "Clientes Activos",
        value: clientesActivos,
        change: 0, // TODO: calcular vs período anterior
        type: "positive"
      },
      {
        label: "Nuevos Clientes",
        value: clientesNuevos?.length || 0,
        change: 0, // TODO: calcular vs período anterior
        type: "positive"
      },
      {
        label: "Con Compras",
        value: todosClientes?.filter(c => (c.propiedades_compradas || 0) > 0).length || 0,
        change: 0,
        type: "positive"
      }
    ];

    return {
      data: {
        clientStats,
        clientSources,
        topClients,
        clientSegments: segmentos,
        periodo: {
          inicio: startDate.toISOString(),
          fin: endDate.toISOString(),
          dias: days
        }
      },
      error: null
    };
  } catch (error) {
    console.error('Error obteniendo reporte de clientes:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Obtiene reporte de propiedades con datos reales (incluye lotes y propiedades)
 */
export async function obtenerReportePropiedades(
  periodo: string = '30'
): Promise<{ data: any | null; error: string | null }> {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "No autorizado" };
    }

    const isAdminUser = await esAdmin();
    if (!isAdminUser) {
      return { data: null, error: "No tienes permisos de administrador" };
    }

    // Calcular fechas
    const days = parseInt(periodo);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 1. Obtener LOTES
    const { data: lotes } = await supabase
      .schema('crm')
      .from('lote')
      .select(`
        id,
        codigo,
        estado,
        precio,
        sup_m2,
        created_at,
        proyecto:proyecto_id (
          nombre
        )
      `);

    // 2. Obtener PROPIEDADES
    const { data: propiedades } = await supabase
      .schema('crm')
      .from('propiedad')
      .select(`
        id,
        codigo,
        tipo,
        estado_comercial,
        precio,
        created_at,
        proyecto:proyecto_id (
          nombre
        )
      `);

    // 3. Normalizar y combinar datos
    interface PropiedadNormalizada {
      id: string;
      codigo: string;
      tipo: string;
      estado: string;
      precio: number;
      created_at: string;
      nombreProyecto: string;
    }

    const lotesNormalizados: PropiedadNormalizada[] = (lotes || []).map((l: any) => ({
      id: l.id,
      codigo: l.codigo,
      tipo: 'lote',
      estado: l.estado,
      precio: Number(l.precio) || 0,
      created_at: l.created_at,
      nombreProyecto: l.proyecto?.nombre || 'Sin proyecto'
    }));

    const propiedadesNormalizadas: PropiedadNormalizada[] = (propiedades || []).map((p: any) => ({
      id: p.id,
      codigo: p.codigo,
      tipo: p.tipo || 'propiedad',
      estado: p.estado_comercial,
      precio: Number(p.precio ?? p.precio_venta) || 0,
      created_at: p.created_at,
      nombreProyecto: p.proyecto?.nombre || 'Sin proyecto'
    }));

    const todasPropiedades = [...lotesNormalizados, ...propiedadesNormalizadas];

    // 4. Calcular métricas
    const propiedadesNuevas = todasPropiedades.filter(p =>
      new Date(p.created_at) >= startDate
    ).length;

    const disponibles = todasPropiedades.filter(p => p.estado === 'disponible').length;
    const vendidas = todasPropiedades.filter(p => p.estado === 'vendido').length;
    const reservadas = todasPropiedades.filter(p => p.estado === 'reservado').length;

    const valorTotal = todasPropiedades.reduce((sum, p) => sum + p.precio, 0);
    const valorDisponible = todasPropiedades
      .filter(p => p.estado === 'disponible')
      .reduce((sum, p) => sum + p.precio, 0);

    // 5. Distribución por proyecto
    const proyectosMap = new Map<string, { total: number; disponibles: number; vendidas: number; reservadas: number }>();

    todasPropiedades.forEach(prop => {
      const actual = proyectosMap.get(prop.nombreProyecto) || { total: 0, disponibles: 0, vendidas: 0, reservadas: 0 };

      actual.total += 1;
      if (prop.estado === 'disponible') actual.disponibles += 1;
      if (prop.estado === 'vendido') actual.vendidas += 1;
      if (prop.estado === 'reservado') actual.reservadas += 1;

      proyectosMap.set(prop.nombreProyecto, actual);
    });

    const distribucionProyectos = Array.from(proyectosMap.entries()).map(([nombre, data]) => ({
      proyecto: nombre,
      ...data
    }));

    // 6. Distribución por tipo
    const tipoMap = new Map<string, number>();
    todasPropiedades.forEach(p => {
      tipoMap.set(p.tipo, (tipoMap.get(p.tipo) || 0) + 1);
    });

    const distribucionTipo = Array.from(tipoMap.entries()).map(([tipo, count]) => ({
      tipo,
      cantidad: count,
      porcentaje: todasPropiedades.length > 0 ? (count / todasPropiedades.length) * 100 : 0
    }));

    const propertyStats = [
      {
        label: "Total Propiedades",
        value: todasPropiedades.length,
        change: `+${propiedadesNuevas}`,
        type: "positive"
      },
      {
        label: "Disponibles",
        value: disponibles,
        change: "0",
        type: "neutral"
      },
      {
        label: "Vendidas",
        value: vendidas,
        change: "0",
        type: "positive"
      },
      {
        label: "Valor Total",
        value: valorTotal,
        change: "0",
        type: "positive"
      }
    ];

    return {
      data: {
        propertyStats,
        distribucionProyectos,
        distribucionTipo,
        resumen: {
          total: todasPropiedades.length,
          lotes: lotesNormalizados.length,
          propiedades: propiedadesNormalizadas.length,
          disponibles,
          vendidas,
          reservadas,
          valorTotal,
          valorDisponible,
          nuevas: propiedadesNuevas
        },
        periodo: {
          inicio: startDate.toISOString(),
          fin: new Date().toISOString(),
          dias: days
        }
      },
      error: null
    };
  } catch (error) {
    console.error('Error obteniendo reporte de propiedades:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Obtiene reporte de rendimiento de vendedores con datos reales
 */
export async function obtenerReporteRendimiento(
  periodo: string = '30'
): Promise<{ data: any | null; error: string | null }> {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "No autorizado" };
    }

    const isAdminUser = await esAdmin();
    if (!isAdminUser) {
      return { data: null, error: "No tienes permisos de administrador" };
    }

    // Calcular fechas
    const days = parseInt(periodo);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const endDate = new Date();

    // Obtener todos los vendedores activos
    const { data: vendedores } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .select('id, username, nombre_completo, activo, meta_mensual_ventas')
      .eq('activo', true);

    // Obtener todas las ventas del período
    const { data: ventasData } = await supabase
      .schema('crm')
      .from('venta')
      .select('vendedor_username, precio_total, fecha_venta, cliente_id')
      .gte('fecha_venta', startDate.toISOString())
      .lte('fecha_venta', endDate.toISOString());

    // Calcular métricas por vendedor
    const ventasPorVendedor = new Map<string, {
      username: string;
      nombre: string;
      ventas: number;
      propiedades: number;
      clientes: Set<string>;
      meta: number;
    }>();

    vendedores?.forEach(vendedor => {
      ventasPorVendedor.set(vendedor.username, {
        username: vendedor.username,
        nombre: vendedor.nombre_completo,
        ventas: 0,
        propiedades: 0,
        clientes: new Set(),
        meta: vendedor.meta_mensual_ventas || 0
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

    // Top performers
    const topPerformers = Array.from(ventasPorVendedor.values())
      .map(v => ({
        name: v.nombre,
        avatar: v.nombre.split(' ').map(n => n[0]).join('').toUpperCase(),
        sales: v.ventas,
        deals: v.propiedades,
        conversion: v.propiedades > 0 ? (v.clientes.size / v.propiedades * 100).toFixed(1) + '%' : '0%',
        meta: v.meta,
        cumplimiento: v.meta > 0 ? ((v.ventas / v.meta) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);

    // Métricas generales
    const ventasTotales = Array.from(ventasPorVendedor.values())
      .reduce((sum, v) => sum + v.ventas, 0);

    const propiedadesTotales = Array.from(ventasPorVendedor.values())
      .reduce((sum, v) => sum + v.propiedades, 0);

    const vendedoresConVentas = Array.from(ventasPorVendedor.values())
      .filter(v => v.ventas > 0).length;

    const promedioPorVendedor = vendedoresConVentas > 0
      ? ventasTotales / vendedoresConVentas
      : 0;

    // Vendedores que superaron meta
    const vendedoresQueSuperaronMeta = Array.from(ventasPorVendedor.values())
      .filter(v => v.meta > 0 && v.ventas >= v.meta).length;

    const performanceStats = [
      {
        label: "Total Vendedores",
        value: vendedores?.length || 0,
        change: "0",
        type: "positive"
      },
      {
        label: "Ventas Totales",
        value: ventasTotales,
        change: "0", // TODO: calcular vs período anterior
        type: "positive"
      },
      {
        label: "Promedio por Vendedor",
        value: promedioPorVendedor,
        change: "0",
        type: "positive"
      },
      {
        label: "Cumplieron Meta",
        value: vendedoresQueSuperaronMeta,
        change: "0",
        type: "positive"
      }
    ];

    return {
      data: {
        performanceStats,
        topPerformers,
        resumen: {
          totalVendedores: vendedores?.length || 0,
          vendedoresActivos: vendedoresConVentas,
          ventasTotales,
          propiedadesTotales,
          promedioPorVendedor,
          vendedoresQueSuperaronMeta
        },
        periodo: {
          inicio: startDate.toISOString(),
          fin: endDate.toISOString(),
          dias: days
        }
      },
      error: null
    };
  } catch (error) {
    console.error('Error obteniendo reporte de rendimiento:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Exporta reporte a PDF
 */
export async function exportarReportePDF(): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Por ahora retornamos un mock
    return {
      success: true,
      url: `data:application/pdf;base64,${Buffer.from('Mock PDF content').toString('base64')}`
    };
  } catch (error) {
    console.error('Error exportando reporte:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Obtiene métricas de rendimiento con datos reales
 */
export async function obtenerMetricasRendimiento(
  periodo: string = '30'
): Promise<{ data: any | null; error: string | null }> {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "No autorizado" };
    }

    const isAdminUser = await esAdmin();
    if (!isAdminUser) {
      return { data: null, error: "No tienes permisos de administrador" };
    }

    // Calcular fechas
    const days = parseInt(periodo);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const endDate = new Date();

    // 1. TASA DE CONVERSIÓN
    // Total de leads/prospectos
    const { data: totalLeads } = await supabase
      .schema('crm')
      .from('cliente')
      .select('id')
      .in('estado_cliente', ['lead', 'prospecto']);

    // Clientes que han comprado (tienen ventas)
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

    // 2. TIEMPO PROMEDIO DE VENTA
    // Obtener ventas con información del cliente
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
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays;
        });

      if (tiempos.length > 0) {
        tiempoPromedioVenta = Math.round(
          tiempos.reduce((sum, dias) => sum + dias, 0) / tiempos.length
        );
      }
    }

    return {
      data: {
        tasaConversion: Math.round(tasaConversion * 10) / 10, // Redondear a 1 decimal
        tiempoPromedioVenta,
        totalLeads: totalLeads?.length || 0,
        clientesConvertidos: clientesUnicos.size
      },
      error: null
    };
  } catch (error) {
    console.error('Error obteniendo métricas de rendimiento:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Obtiene comparación de objetivos vs realidad
 */
export async function obtenerObjetivosVsRealidad(
  periodo: string = '30'
): Promise<{ data: any | null; error: string | null }> {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "No autorizado" };
    }

    const isAdminUser = await esAdmin();
    if (!isAdminUser) {
      return { data: null, error: "No tienes permisos de administrador" };
    }

    // Calcular fechas
    const days = parseInt(periodo);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const endDate = new Date();

    // 1. META DE VENTAS
    // Obtener metas de todos los vendedores activos
    const { data: vendedores } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .select('meta_mensual_ventas')
      .eq('activo', true);

    const metaTotalVentas = vendedores?.reduce(
      (sum, v) => sum + (v.meta_mensual_ventas || 0),
      0
    ) || 0;

    // Obtener ventas reales del período
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

    // 2. META DE PROPIEDADES
    // Asumimos una meta de propiedades vendidas (por ejemplo, 100 propiedades por mes)
    // Esto podría venir de una tabla de configuración
    const metaPropiedades = 100;
    const propiedadesVendidas = ventasReales?.length || 0;

    // 3. META DE CLIENTES NUEVOS
    const metaClientesNuevos = 50; // Meta asumida, debería venir de configuración

    const { data: clientesNuevos } = await supabase
      .schema('crm')
      .from('cliente')
      .select('id')
      .gte('fecha_alta', startDate.toISOString())
      .lte('fecha_alta', endDate.toISOString());

    const clientesNuevosRealizados = clientesNuevos?.length || 0;

    return {
      data: {
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
      },
      error: null
    };
  } catch (error) {
    console.error('Error obteniendo objetivos vs realidad:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Obtiene reporte de gestión de clientes con estados de seguimiento
 */
export async function obtenerReporteGestionClientes(
  periodo: string = '30'
): Promise<{ data: any | null; error: string | null }> {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "No autorizado" };
    }

    const isAdminUser = await esAdmin();
    if (!isAdminUser) {
      return { data: null, error: "No tienes permisos de administrador" };
    }

    // Calcular fechas
    const days = parseInt(periodo);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Obtener todos los clientes con su información de seguimiento
    const { data: clientes } = await supabase
      .schema('crm')
      .from('cliente')
      .select(`
        id,
        nombre,
        email,
        telefono,
        estado_cliente,
        vendedor_username,
        fecha_alta,
        ultimo_contacto,
        proxima_accion
      `)
      .gte('fecha_alta', startDate.toISOString())
      .order('fecha_alta', { ascending: false });

    // Obtener última interacción de cada cliente
    const { data: ultimasInteracciones } = await supabase
      .schema('crm')
      .from('cliente_interaccion')
      .select(`
        cliente_id,
        tipo,
        resultado,
        fecha_interaccion,
        proxima_accion,
        fecha_proxima_accion
      `)
      .order('fecha_interaccion', { ascending: false });

    // Agrupar última interacción por cliente
    const ultimaInteraccionPorCliente = new Map<string, any>();
    ultimasInteracciones?.forEach(interaccion => {
      if (!ultimaInteraccionPorCliente.has(interaccion.cliente_id)) {
        ultimaInteraccionPorCliente.set(interaccion.cliente_id, interaccion);
      }
    });

    // Clasificar clientes por estado de seguimiento
    const hoy = new Date();
    const hace7dias = new Date(hoy);
    hace7dias.setDate(hace7dias.getDate() - 7);
    const hace30dias = new Date(hoy);
    hace30dias.setDate(hace30dias.getDate() - 30);

    let sinContactar = 0;
    let contactadosReciente = 0; // < 7 días
    let contactadosMedio = 0; // 7-30 días
    let sinSeguimiento = 0; // > 30 días
    let conAccionPendiente = 0;

    const clientesDetalle = clientes?.map(cliente => {
      const ultimaInteraccion = ultimaInteraccionPorCliente.get(cliente.id);
      const fechaUltimoContacto = ultimaInteraccion?.fecha_interaccion
        ? new Date(ultimaInteraccion.fecha_interaccion)
        : cliente.ultimo_contacto
          ? new Date(cliente.ultimo_contacto)
          : null;

      let estadoSeguimiento = 'sin_contactar';

      if (!fechaUltimoContacto) {
        sinContactar++;
        estadoSeguimiento = 'sin_contactar';
      } else if (fechaUltimoContacto >= hace7dias) {
        contactadosReciente++;
        estadoSeguimiento = 'contactado_reciente';
      } else if (fechaUltimoContacto >= hace30dias) {
        contactadosMedio++;
        estadoSeguimiento = 'contactado_medio';
      } else {
        sinSeguimiento++;
        estadoSeguimiento = 'sin_seguimiento';
      }

      if (ultimaInteraccion?.fecha_proxima_accion) {
        conAccionPendiente++;
      }

      return {
        ...cliente,
        ultimaInteraccion: ultimaInteraccion || null,
        fechaUltimoContacto,
        estadoSeguimiento,
        diasSinContacto: fechaUltimoContacto
          ? Math.floor((hoy.getTime() - fechaUltimoContacto.getTime()) / (1000 * 60 * 60 * 24))
          : null
      };
    }) || [];

    // Agrupar por vendedor
    const clientesPorVendedor = new Map<string, { total: number; sinContactar: number; contactados: number }>();
    clientesDetalle.forEach(cliente => {
      const vendedor = cliente.vendedor_username || 'Sin asignar';
      const actual = clientesPorVendedor.get(vendedor) || { total: 0, sinContactar: 0, contactados: 0 };
      actual.total++;
      if (cliente.estadoSeguimiento === 'sin_contactar') {
        actual.sinContactar++;
      } else {
        actual.contactados++;
      }
      clientesPorVendedor.set(vendedor, actual);
    });

    const distribucionPorVendedor = Array.from(clientesPorVendedor.entries())
      .map(([vendedor, data]) => ({
        vendedor,
        ...data,
        porcentajeContactados: data.total > 0 ? ((data.contactados / data.total) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.total - a.total);

    // Agrupar por estado de cliente
    const estadosCliente = new Map<string, number>();
    clientes?.forEach(cliente => {
      const estado = cliente.estado_cliente || 'No especificado';
      estadosCliente.set(estado, (estadosCliente.get(estado) || 0) + 1);
    });

    const distribucionEstados = Array.from(estadosCliente.entries())
      .map(([estado, cantidad]) => ({
        estado,
        cantidad,
        porcentaje: clientes ? ((cantidad / clientes.length) * 100).toFixed(1) : '0'
      }));

    return {
      data: {
        resumen: {
          totalClientes: clientes?.length || 0,
          sinContactar,
          contactadosReciente,
          contactadosMedio,
          sinSeguimiento,
          conAccionPendiente
        },
        distribucionSeguimiento: [
          { estado: 'Sin contactar', cantidad: sinContactar, color: 'red' },
          { estado: 'Contactado (<7 días)', cantidad: contactadosReciente, color: 'green' },
          { estado: 'Contactado (7-30 días)', cantidad: contactadosMedio, color: 'yellow' },
          { estado: 'Sin seguimiento (>30 días)', cantidad: sinSeguimiento, color: 'orange' }
        ],
        distribucionEstados,
        distribucionPorVendedor,
        clientesDetalle: clientesDetalle.slice(0, 50), // Limitar para el frontend
        periodo: {
          inicio: startDate.toISOString(),
          fin: new Date().toISOString(),
          dias: days
        }
      },
      error: null
    };
  } catch (error) {
    console.error('Error obteniendo reporte de gestión de clientes:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Obtiene reporte de interacciones por vendedor
 */
export async function obtenerReporteInteracciones(
  periodo: string = '30'
): Promise<{ data: any | null; error: string | null }> {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "No autorizado" };
    }

    const isAdminUser = await esAdmin();
    if (!isAdminUser) {
      return { data: null, error: "No tienes permisos de administrador" };
    }

    // Calcular fechas
    const days = parseInt(periodo);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Obtener todas las interacciones del período
    const { data: interacciones } = await supabase
      .schema('crm')
      .from('cliente_interaccion')
      .select(`
        id,
        cliente_id,
        vendedor_username,
        tipo,
        resultado,
        duracion_minutos,
        fecha_interaccion,
        proxima_accion
      `)
      .gte('fecha_interaccion', startDate.toISOString())
      .order('fecha_interaccion', { ascending: false });

    // Obtener información de vendedores
    const { data: vendedores } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .select('username, nombre_completo')
      .eq('activo', true);

    const vendedoresMap = new Map(vendedores?.map(v => [v.username, v.nombre_completo]) || []);

    // Agrupar por vendedor
    const interaccionesPorVendedor = new Map<string, {
      total: number;
      porTipo: Map<string, number>;
      porResultado: Map<string, number>;
      duracionTotal: number;
      clientesUnicos: Set<string>;
    }>();

    interacciones?.forEach(interaccion => {
      const vendedor = interaccion.vendedor_username;
      if (!interaccionesPorVendedor.has(vendedor)) {
        interaccionesPorVendedor.set(vendedor, {
          total: 0,
          porTipo: new Map(),
          porResultado: new Map(),
          duracionTotal: 0,
          clientesUnicos: new Set()
        });
      }

      const data = interaccionesPorVendedor.get(vendedor)!;
      data.total++;
      data.porTipo.set(interaccion.tipo, (data.porTipo.get(interaccion.tipo) || 0) + 1);
      if (interaccion.resultado) {
        data.porResultado.set(interaccion.resultado, (data.porResultado.get(interaccion.resultado) || 0) + 1);
      }
      data.duracionTotal += interaccion.duracion_minutos || 0;
      data.clientesUnicos.add(interaccion.cliente_id);
    });

    // Formatear datos por vendedor
    const rankingVendedores = Array.from(interaccionesPorVendedor.entries())
      .map(([username, data]) => ({
        username,
        nombre: vendedoresMap.get(username) || username,
        totalInteracciones: data.total,
        clientesAtendidos: data.clientesUnicos.size,
        duracionTotal: data.duracionTotal,
        promedioPorCliente: data.clientesUnicos.size > 0
          ? (data.total / data.clientesUnicos.size).toFixed(1)
          : '0',
        porTipo: Object.fromEntries(data.porTipo),
        porResultado: Object.fromEntries(data.porResultado)
      }))
      .sort((a, b) => b.totalInteracciones - a.totalInteracciones);

    // Totales por tipo de interacción
    const totalesPorTipo = new Map<string, number>();
    interacciones?.forEach(i => {
      totalesPorTipo.set(i.tipo, (totalesPorTipo.get(i.tipo) || 0) + 1);
    });

    const distribucionTipo = Array.from(totalesPorTipo.entries())
      .map(([tipo, cantidad]) => ({
        tipo,
        cantidad,
        porcentaje: interacciones ? ((cantidad / interacciones.length) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.cantidad - a.cantidad);

    // Totales por resultado
    const totalesPorResultado = new Map<string, number>();
    interacciones?.forEach(i => {
      if (i.resultado) {
        totalesPorResultado.set(i.resultado, (totalesPorResultado.get(i.resultado) || 0) + 1);
      }
    });

    const distribucionResultado = Array.from(totalesPorResultado.entries())
      .map(([resultado, cantidad]) => ({
        resultado,
        cantidad,
        porcentaje: interacciones ? ((cantidad / interacciones.length) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.cantidad - a.cantidad);

    // Interacciones por día (para gráfico)
    const interaccionesPorDia = new Map<string, number>();
    interacciones?.forEach(i => {
      const fecha = new Date(i.fecha_interaccion).toISOString().split('T')[0];
      interaccionesPorDia.set(fecha, (interaccionesPorDia.get(fecha) || 0) + 1);
    });

    const tendenciaDiaria = Array.from(interaccionesPorDia.entries())
      .map(([fecha, cantidad]) => ({ fecha, cantidad }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .slice(-30); // últimos 30 días

    return {
      data: {
        resumen: {
          totalInteracciones: interacciones?.length || 0,
          vendedoresActivos: interaccionesPorVendedor.size,
          promedioPoVendedor: interaccionesPorVendedor.size > 0
            ? Math.round((interacciones?.length || 0) / interaccionesPorVendedor.size)
            : 0,
          clientesContactados: new Set(interacciones?.map(i => i.cliente_id) || []).size
        },
        rankingVendedores,
        distribucionTipo,
        distribucionResultado,
        tendenciaDiaria,
        periodo: {
          inicio: startDate.toISOString(),
          fin: new Date().toISOString(),
          dias: days
        }
      },
      error: null
    };
  } catch (error) {
    console.error('Error obteniendo reporte de interacciones:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Obtiene reporte de nivel de interés de leads por proyecto
 */
export async function obtenerReporteNivelInteres(
  periodo: string = '30',
  proyectoId?: string,
  fechaInicio?: string,
  fechaFin?: string
): Promise<{ data: any | null; error: string | null }> {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "No autorizado" };
    }

    const isAdminUser = await esAdmin();
    if (!isAdminUser) {
      return { data: null, error: "No tienes permisos de administrador" };
    }

    // Calcular fechas
    const days = parseInt(periodo);
    let startDate: Date;
    let endDate = new Date();

    if (fechaInicio && fechaFin) {
      startDate = new Date(fechaInicio);
      endDate = new Date(fechaFin);
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }

    // Obtener todos los proyectos para el filtro
    const { data: proyectos } = await supabase
      .schema('crm')
      .from('proyecto')
      .select('id, nombre')
      .eq('estado', 'activo')
      .order('nombre');

    // Obtener clientes con su última interacción
    const { data: clientes } = await supabase
      .schema('crm')
      .from('cliente')
      .select(`
        id,
        nombre,
        estado_cliente,
        vendedor_username,
        fecha_alta,
        ultimo_contacto
      `);

    // Obtener TODAS las interacciones para determinar la última de cada cliente
    const interaccionesQuery = supabase
      .schema('crm')
      .from('cliente_interaccion')
      .select(`
        cliente_id,
        resultado,
        fecha_interaccion
      `)
      .order('fecha_interaccion', { ascending: false });

    const { data: interacciones } = await interaccionesQuery;

    // Obtener intereses de clientes en proyectos
    const interesQuery = supabase
      .schema('crm')
      .from('cliente_propiedad_interes')
      .select(`
        cliente_id,
        lote:lote_id (
          proyecto_id
        ),
        propiedad:propiedad_id (
          proyecto_id
        )
      `);

    const { data: interesesProyecto } = await interesQuery;

    // Mapear clientes con interés en proyectos específicos
    const clientesConProyecto = new Map<string, string[]>();
    interesesProyecto?.forEach((interes: any) => {
      const proyId = interes.lote?.proyecto_id || interes.propiedad?.proyecto_id;
      if (proyId) {
        const proyectos = clientesConProyecto.get(interes.cliente_id) || [];
        if (!proyectos.includes(proyId)) {
          proyectos.push(proyId);
        }
        clientesConProyecto.set(interes.cliente_id, proyectos);
      }
    });

    // Agrupar última interacción por cliente
    const ultimaInteraccionPorCliente = new Map<string, any>();
    interacciones?.forEach(interaccion => {
      if (!ultimaInteraccionPorCliente.has(interaccion.cliente_id)) {
        ultimaInteraccionPorCliente.set(interaccion.cliente_id, interaccion);
      }
    });

    // Mapear niveles de interés basados en estado_cliente + resultado de interacción
    const mapearNivelInteres = (estadoCliente: string, resultado: string | null): string => {
      // Si no hay interacción, usar estado del cliente
      if (!resultado) {
        if (estadoCliente === 'por_contactar') return 'Por Contactar';
        if (estadoCliente === 'transferido') return 'Contacto Transferido';
        return 'En Contacto';
      }

      // Mapear según resultado de última interacción
      switch (resultado) {
        case 'interesado':
          return 'Alto';
        case 'contesto':
        case 'reagendo':
          return 'En Contacto';
        case 'no_contesto':
        case 'pendiente':
          return 'Intermedio';
        case 'no_interesado':
          return 'No Interesado';
        case 'cerrado':
          return 'Desestimado';
        default:
          return 'Bajo';
      }
    };

    // Colores para cada nivel
    const coloresNivel: Record<string, string> = {
      'Alto': '#3B82F6',           // blue
      'Bajo': '#6B7280',           // gray
      'Contacto Transferido': '#10B981', // green
      'Desestimado': '#F97316',    // orange
      'En Contacto': '#8B5CF6',    // purple
      'Intermedio': '#EF4444',     // red
      'No Interesado': '#FCD34D',  // yellow
      'Por Contactar': '#14B8A6'   // teal
    };

    // Procesar clientes y clasificar por nivel de interés
    // Mostrar clientes que tienen interés en proyectos (via cliente_propiedad_interes)
    const nivelesConteo = new Map<string, number>();
    let totalRegistros = 0;

    // Set de clientes con interés en proyectos
    const clientesConInteres = new Set(clientesConProyecto.keys());

    clientes?.forEach(cliente => {
      // Solo procesar clientes que tienen interés en algún proyecto
      if (!clientesConInteres.has(cliente.id)) {
        return; // Skip - no tiene interés en proyectos
      }

      // Filtrar por proyecto si se especifica
      if (proyectoId && proyectoId !== 'todos') {
        const proyectosCliente = clientesConProyecto.get(cliente.id) || [];
        if (!proyectosCliente.includes(proyectoId)) {
          return; // Skip this client
        }
      }

      // Filtrar por rango de fechas de última interacción si se especifica
      const ultimaInteraccion = ultimaInteraccionPorCliente.get(cliente.id);
      if (ultimaInteraccion && fechaInicio && fechaFin) {
        const fechaInteraccion = new Date(ultimaInteraccion.fecha_interaccion);
        if (fechaInteraccion < startDate || fechaInteraccion > endDate) {
          return; // Skip - última interacción fuera del rango
        }
      }

      const nivelInteres = mapearNivelInteres(
        cliente.estado_cliente,
        ultimaInteraccion?.resultado || null
      );

      nivelesConteo.set(nivelInteres, (nivelesConteo.get(nivelInteres) || 0) + 1);
      totalRegistros++;
    });

    // Convertir a array para el gráfico
    const distribucionNiveles = Array.from(nivelesConteo.entries())
      .map(([nivel, cantidad]) => ({
        nivel,
        cantidad,
        porcentaje: totalRegistros > 0 ? ((cantidad / totalRegistros) * 100).toFixed(1) : '0',
        color: coloresNivel[nivel] || '#6B7280'
      }))
      .sort((a, b) => b.cantidad - a.cantidad);

    // Distribución por proyecto (clientes con interés en proyectos)
    const nivelesPorProyecto = new Map<string, Map<string, number>>();

    clientes?.forEach(cliente => {
      // Solo procesar clientes que tienen interés en algún proyecto
      if (!clientesConInteres.has(cliente.id)) {
        return;
      }

      // Filtrar por rango de fechas de última interacción si se especifica
      const ultimaInteraccion = ultimaInteraccionPorCliente.get(cliente.id);
      if (ultimaInteraccion && fechaInicio && fechaFin) {
        const fechaInteraccion = new Date(ultimaInteraccion.fecha_interaccion);
        if (fechaInteraccion < startDate || fechaInteraccion > endDate) {
          return; // Skip - última interacción fuera del rango
        }
      }

      const proyectosCliente = clientesConProyecto.get(cliente.id) || [];
      const nivelInteres = mapearNivelInteres(
        cliente.estado_cliente,
        ultimaInteraccion?.resultado || null
      );

      proyectosCliente.forEach(proyId => {
        if (!nivelesPorProyecto.has(proyId)) {
          nivelesPorProyecto.set(proyId, new Map());
        }
        const nivelesProyecto = nivelesPorProyecto.get(proyId)!;
        nivelesProyecto.set(nivelInteres, (nivelesProyecto.get(nivelInteres) || 0) + 1);
      });
    });

    // Formatear distribución por proyecto
    const proyectosMap = new Map(proyectos?.map(p => [p.id, p.nombre]) || []);
    const distribucionPorProyecto = Array.from(nivelesPorProyecto.entries())
      .map(([proyId, niveles]) => ({
        proyecto: proyectosMap.get(proyId) || 'Sin nombre',
        proyectoId: proyId,
        total: Array.from(niveles.values()).reduce((a, b) => a + b, 0),
        niveles: Object.fromEntries(niveles)
      }))
      .sort((a, b) => b.total - a.total);

    return {
      data: {
        resumen: {
          totalRegistros,
          totalProyectos: proyectos?.length || 0,
          fechaInicio: startDate.toISOString(),
          fechaFin: endDate.toISOString()
        },
        distribucionNiveles,
        distribucionPorProyecto,
        proyectos: proyectos || [],
        periodo: {
          inicio: startDate.toISOString(),
          fin: endDate.toISOString(),
          dias: days
        }
      },
      error: null
    };
  } catch (error) {
    console.error('Error obteniendo reporte de nivel de interés:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Obtiene reporte de clientes captados según origen del lead
 */
export async function obtenerReporteOrigenLead(
  periodo: string = '30',
  fechaInicio?: string,
  fechaFin?: string
): Promise<{ data: any | null; error: string | null }> {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "No autorizado" };
    }

    const isAdminUser = await esAdmin();
    if (!isAdminUser) {
      return { data: null, error: "No tienes permisos de administrador" };
    }

    // Calcular fechas
    const days = parseInt(periodo);
    let startDate: Date;
    let endDate = new Date();

    if (fechaInicio && fechaFin) {
      startDate = new Date(fechaInicio);
      endDate = new Date(fechaFin);
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }

    // Obtener clientes del período
    const { data: clientesPeriodo } = await supabase
      .schema('crm')
      .from('cliente')
      .select('id, nombre, origen_lead, estado_cliente, fecha_alta, vendedor_asignado')
      .gte('fecha_alta', startDate.toISOString())
      .lte('fecha_alta', endDate.toISOString())
      .order('fecha_alta', { ascending: false });

    // Obtener el total real de clientes (sin límite)
    const { count: totalClientesCount } = await supabase
      .schema('crm')
      .from('cliente')
      .select('id', { count: 'exact', head: true });

    // Obtener clientes para análisis (con límite alto para tendencias y efectividad)
    const { data: todosClientes } = await supabase
      .schema('crm')
      .from('cliente')
      .select('id, origen_lead, estado_cliente, fecha_alta')
      .order('fecha_alta', { ascending: false })
      .limit(50000); // Límite alto para análisis

    // Colores para cada origen (incluye orígenes del sistema)
    const coloresOrigen: Record<string, string> = {
      // Orígenes del sistema
      'whatsapp_web': '#25D366',        // verde whatsapp
      'publicidad': '#F59E0B',          // amber
      'referido': '#10B981',            // green
      'facebook': '#1877F2',            // facebook blue
      'instagram': '#E4405F',           // instagram pink
      'google': '#EA4335',              // google red
      'tiktok': '#000000',              // tiktok black
      'youtube': '#FF0000',             // youtube red
      'linkedin': '#0A66C2',            // linkedin blue
      // Orígenes adicionales
      'web': '#3B82F6',                 // blue
      'recomendacion': '#10B981',       // green
      'feria': '#8B5CF6',               // purple
      'campaña_facebook': '#1877F2',    // facebook blue
      'campaña_instagram': '#E4405F',   // instagram pink
      'campaña_google': '#EA4335',      // google red
      'llamada_entrante': '#14B8A6',    // teal
      'visita_oficina': '#6366F1',      // indigo
      'otro': '#6B7280',                // gray
      'No especificado': '#9CA3AF'      // gray-400
    };

    const etiquetasOrigen: Record<string, string> = {
      // Orígenes del sistema
      'whatsapp_web': 'WhatsApp Web',
      'publicidad': 'Publicidad',
      'referido': 'Referido',
      'facebook': 'Facebook',
      'instagram': 'Instagram',
      'google': 'Google',
      'tiktok': 'TikTok',
      'youtube': 'YouTube',
      'linkedin': 'LinkedIn',
      // Orígenes adicionales
      'web': 'Página Web',
      'recomendacion': 'Recomendación',
      'feria': 'Feria Inmobiliaria',
      'campaña_facebook': 'Campaña Facebook',
      'campaña_instagram': 'Campaña Instagram',
      'campaña_google': 'Campaña Google',
      'llamada_entrante': 'Llamada Entrante',
      'visita_oficina': 'Visita a Oficina',
      'otro': 'Otro',
      'No especificado': 'No especificado'
    };

    // Contar por origen (período seleccionado)
    const origenConteo = new Map<string, number>();
    clientesPeriodo?.forEach(cliente => {
      const origen = cliente.origen_lead || 'No especificado';
      origenConteo.set(origen, (origenConteo.get(origen) || 0) + 1);
    });

    const totalPeriodo = clientesPeriodo?.length || 0;

    // Distribución por origen
    const distribucionOrigen = Array.from(origenConteo.entries())
      .map(([origen, cantidad]) => ({
        origen,
        etiqueta: etiquetasOrigen[origen] || origen,
        cantidad,
        porcentaje: totalPeriodo > 0 ? ((cantidad / totalPeriodo) * 100).toFixed(1) : '0',
        color: coloresOrigen[origen] || '#6B7280'
      }))
      .sort((a, b) => b.cantidad - a.cantidad);

    // Tendencia por mes (últimos 6 meses)
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const tendenciaPorMes = new Map<string, Map<string, number>>();

    // Inicializar últimos 6 meses
    const hoy = new Date();
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(hoy);
      fecha.setMonth(hoy.getMonth() - i);
      const mesKey = `${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
      tendenciaPorMes.set(mesKey, new Map());
    }

    // Procesar todos los clientes para tendencia
    todosClientes?.forEach(cliente => {
      const fecha = new Date(cliente.fecha_alta);
      const mesKey = `${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;

      if (tendenciaPorMes.has(mesKey)) {
        const origenes = tendenciaPorMes.get(mesKey)!;
        const origen = cliente.origen_lead || 'No especificado';
        origenes.set(origen, (origenes.get(origen) || 0) + 1);
      }
    });

    // Formatear tendencia para gráfico de líneas
    const tendenciaData = Array.from(tendenciaPorMes.entries()).map(([mes, origenes]) => {
      const entry: any = { mes, total: 0 };
      origenes.forEach((cantidad, origen) => {
        entry[origen] = cantidad;
        entry.total += cantidad;
      });
      return entry;
    });

    // Contar por estado para cada origen (avance en el embudo)
    // "Avanzados" = clientes que progresaron: activo, en_seguimiento, interesado, reserva, comprador
    // "Sin avance" = por_contactar, no_interesado, descartado
    const avancePorOrigen = new Map<string, { total: number; avanzados: number }>();

    const estadosAvanzados = ['activo', 'en_seguimiento', 'interesado', 'reserva', 'comprador', 'contactado'];

    todosClientes?.forEach(cliente => {
      const origen = cliente.origen_lead || 'No especificado';
      const actual = avancePorOrigen.get(origen) || { total: 0, avanzados: 0 };
      actual.total++;
      if (estadosAvanzados.includes(cliente.estado_cliente)) {
        actual.avanzados++;
      }
      avancePorOrigen.set(origen, actual);
    });

    const tasaConversionPorOrigen = Array.from(avancePorOrigen.entries())
      .map(([origen, data]) => ({
        origen,
        etiqueta: etiquetasOrigen[origen] || origen,
        total: data.total,
        avanzados: data.avanzados,
        tasaConversion: data.total > 0 ? ((data.avanzados / data.total) * 100).toFixed(1) : '0',
        color: coloresOrigen[origen] || '#6B7280'
      }))
      .filter(item => item.total > 0) // Solo mostrar orígenes con clientes
      .sort((a, b) => parseFloat(b.tasaConversion) - parseFloat(a.tasaConversion));

    // Clientes por vendedor y origen
    const clientesPorVendedor = new Map<string, Map<string, number>>();
    clientesPeriodo?.forEach(cliente => {
      const vendedor = cliente.vendedor_asignado || 'Sin asignar';
      const origen = cliente.origen_lead || 'No especificado';

      if (!clientesPorVendedor.has(vendedor)) {
        clientesPorVendedor.set(vendedor, new Map());
      }
      const origenes = clientesPorVendedor.get(vendedor)!;
      origenes.set(origen, (origenes.get(origen) || 0) + 1);
    });

    const distribucionPorVendedor = Array.from(clientesPorVendedor.entries())
      .map(([vendedor, origenes]) => ({
        vendedor,
        total: Array.from(origenes.values()).reduce((a, b) => a + b, 0),
        origenes: Object.fromEntries(origenes)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Lista detallada de clientes del período
    const clientesDetalle = clientesPeriodo?.slice(0, 50).map(cliente => ({
      id: cliente.id,
      nombre: cliente.nombre,
      origen: etiquetasOrigen[cliente.origen_lead || 'No especificado'] || cliente.origen_lead || 'No especificado',
      estado: cliente.estado_cliente,
      fechaAlta: cliente.fecha_alta,
      vendedor: cliente.vendedor_asignado || 'Sin asignar'
    })) || [];

    return {
      data: {
        resumen: {
          totalPeriodo,
          totalHistorico: totalClientesCount || 0,
          origenPrincipal: distribucionOrigen[0]?.etiqueta || 'N/A',
          mejorConversion: tasaConversionPorOrigen[0]?.etiqueta || 'N/A'
        },
        distribucionOrigen,
        tendenciaData,
        tasaConversionPorOrigen,
        distribucionPorVendedor,
        clientesDetalle,
        periodo: {
          inicio: startDate.toISOString(),
          fin: endDate.toISOString(),
          dias: days
        }
      },
      error: null
    };
  } catch (error) {
    console.error('Error obteniendo reporte de origen de lead:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

// Función para procesar tendencias de ventas
function procesarTendenciasVentas(datos: any[]) {
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const tendencias: any = {};

  // Inicializar últimos 6 meses
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

  // Procesar datos de ventas
  datos.forEach(item => {
    const fecha = new Date(item.fecha_venta);
    const mesKey = `${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;

    if (tendencias[mesKey]) {
      tendencias[mesKey].ventas += Number(item.precio_total) || 0;
      tendencias[mesKey].propiedades++;
      if (item.cliente_id) {
        tendencias[mesKey].clientes.add(item.cliente_id);
      }
    }
  });

  // Convertir a array para gráficos
  return Object.entries(tendencias).map(([mes, data]: [string, any]) => ({
    mes,
    ventas: data.ventas,
    propiedades: data.propiedades,
    clientes: data.clientes.size
  }));
}
