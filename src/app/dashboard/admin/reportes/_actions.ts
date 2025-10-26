"use server";

import { createServerOnlyClient } from "@/lib/supabase.server";
import { esAdmin } from "@/lib/auth/roles";

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
    const { data: totalClientes } = await supabase
      .schema('crm')
      .from('cliente')
      .select('id, estado_cliente')
      .eq('estado_cliente', 'cliente');

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
      .select('id, estado_comercial, precio_venta, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (propiedadesError) {
      console.error('Error obteniendo propiedades:', propiedadesError);
    }

    const { data: propiedadesEstados } = await supabase
      .schema('crm')
      .from('propiedad')
      .select('id, estado_comercial, precio_venta');

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
    const clientesActivos = totalClientes?.length || 0;

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

    const valorTotalVentas = ventasData?.reduce((sum, v) => sum + (Number(v.precio_total) || 0), 0) || 0;

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
          nombre,
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
    const { data: ventasTotales } = await supabase
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
        precio_venta,
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
      precio: Number(p.precio_venta) || 0,
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
