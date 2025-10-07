import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { esAdmin } from "@/lib/auth/roles";

// GET - Obtener métricas principales de reportes
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const isAdminUser = await esAdmin();
    if (!isAdminUser) {
      return NextResponse.json({ error: "No tienes permisos de administrador" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get('periodo') || '30';
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');

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
    const { data: totalClientes, error: totalClientesError } = await supabase
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
    const { data: propiedadesEstados, error: propiedadesEstadosError } = await supabase
      .schema('crm')
      .from('propiedad')
      .select('id, estado_comercial, precio');

    // 3. Métricas de Proyectos
    const { data: proyectosData, error: proyectosError } = await supabase
      .schema('crm')
      .from('proyecto')
      .select('id, nombre, estado, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    // 4. Métricas de Usuarios/Vendedores
    const { data: vendedoresData, error: vendedoresError } = await supabase
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
    
    const { data: tendenciasData, error: tendenciasError } = await supabase
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

    const reporte = {
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

    return NextResponse.json(reporte);

  } catch (error) {
    console.error('Error generando reporte:', error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
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
