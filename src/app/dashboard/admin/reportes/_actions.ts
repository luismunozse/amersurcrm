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

    // 2. Métricas de Propiedades
    const { data: propiedadesData, error: propiedadesError } = await supabase
      .schema('crm')
      .from('propiedad')
      .select('id, estado_comercial, precio, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (propiedadesError) {
      console.error('Error obteniendo propiedades:', propiedadesError);
    }

    // Propiedades totales por estado
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
    const clientesActivos = totalClientes?.length || 0;
    
    const propiedadesNuevas = propiedadesData?.length || 0;
    const propiedadesVendidas = propiedadesEstados?.filter(p => p.estado_comercial === 'vendido').length || 0;
    const propiedadesDisponibles = propiedadesEstados?.filter(p => p.estado_comercial === 'disponible').length || 0;
    
    // Calcular valor total de propiedades vendidas
    const valorTotalVentas = propiedadesEstados
      ?.filter(p => p.estado_comercial === 'vendido')
      ?.reduce((sum, p) => sum + (Number(p.precio) || 0), 0) || 0;

    const proyectosNuevos = proyectosData?.length || 0;
    const vendedoresActivos = vendedoresData?.length || 0;

    // Calcular tasa de conversión (clientes activos / total de leads)
    const totalLeads = clientesData?.length || 0;
    const tasaConversion = totalLeads > 0 ? (clientesActivos / totalLeads) * 100 : 0;

    // 6. Datos para gráficos de tendencias (últimos 6 meses)
    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

    const { data: tendenciasData } = await supabase
      .schema('crm')
      .from('propiedad')
      .select('created_at, estado_comercial, precio')
      .gte('created_at', seisMesesAtras.toISOString())
      .order('created_at', { ascending: true });

    // Procesar datos para gráficos mensuales
    const tendenciasMensuales = procesarTendenciasMensuales(tendenciasData || []);

    // 7. Top vendedores por ventas (simulado por ahora)
    const topVendedores = vendedoresData?.slice(0, 5).map(v => ({
      username: v.username,
      nombre: v.nombre_completo,
      ventas: Math.floor(Math.random() * 500000) + 100000, // Simulado
      propiedades: Math.floor(Math.random() * 20) + 5,
      meta: v.meta_mensual_ventas || 0
    })) || [];

    const reporte: ReporteMetricas = {
      periodo: {
        inicio: startDate,
        fin: endDate,
        dias: parseInt(periodo)
      },
      metricas: {
        ventas: {
          valorTotal: valorTotalVentas,
          propiedadesVendidas: propiedadesVendidas,
          promedioVenta: propiedadesVendidas > 0 ? valorTotalVentas / propiedadesVendidas : 0
        },
        clientes: {
          nuevos: clientesNuevos,
          activos: clientesActivos,
          tasaConversion: Math.round(tasaConversion * 100) / 100
        },
        propiedades: {
          total: propiedadesEstados?.length || 0,
          nuevas: propiedadesNuevas,
          vendidas: propiedadesVendidas,
          disponibles: propiedadesDisponibles,
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
 * Obtiene reporte de ventas
 */
export async function obtenerReporteVentas(
  periodo: string = '30'
): Promise<{ data: any | null; error: string | null }> {
  try {
    // Implementación simplificada por ahora
    const metricas = await obtenerMetricasReportes(periodo);
    return { data: metricas.data, error: metricas.error };
  } catch (error) {
    console.error('Error obteniendo reporte de ventas:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Obtiene reporte de clientes
 */
export async function obtenerReporteClientes(
  periodo: string = '30'
): Promise<{ data: any | null; error: string | null }> {
  try {
    // Implementación simplificada por ahora
    const metricas = await obtenerMetricasReportes(periodo);
    return { data: metricas.data, error: metricas.error };
  } catch (error) {
    console.error('Error obteniendo reporte de clientes:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Obtiene reporte de propiedades
 */
export async function obtenerReportePropiedades(
  periodo: string = '30'
): Promise<{ data: any | null; error: string | null }> {
  try {
    // Implementación simplificada por ahora
    const metricas = await obtenerMetricasReportes(periodo);
    return { data: metricas.data, error: metricas.error };
  } catch (error) {
    console.error('Error obteniendo reporte de propiedades:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Obtiene reporte de rendimiento
 */
export async function obtenerReporteRendimiento(
  periodo: string = '30'
): Promise<{ data: any | null; error: string | null }> {
  try {
    // Implementación simplificada por ahora
    const metricas = await obtenerMetricasReportes(periodo);
    return { data: metricas.data, error: metricas.error };
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

// Función para procesar tendencias mensuales
function procesarTendenciasMensuales(datos: any[]) {
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const tendencias: any = {};

  // Inicializar meses
  meses.forEach(mes => {
    tendencias[mes] = {
      ventas: 0,
      propiedades: 0,
      clientes: 0
    };
  });

  // Procesar datos
  datos.forEach(item => {
    const fecha = new Date(item.created_at);
    const mes = meses[fecha.getMonth()];
    
    if (tendencias[mes]) {
      tendencias[mes].propiedades++;
      if (item.estado_comercial === 'vendido') {
        tendencias[mes].ventas += Number(item.precio) || 0;
      }
    }
  });

  // Convertir a array para gráficos
  return Object.entries(tendencias).map(([mes, data]: [string, any]) => ({
    mes,
    ventas: data.ventas,
    propiedades: data.propiedades,
    clientes: data.clientes
  }));
}
