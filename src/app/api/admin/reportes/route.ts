import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { esAdmin } from "@/lib/auth/roles";

interface ClienteRecord {
  id: string;
  estado_cliente: string | null;
  fecha_alta: string;
  vendedor_asignado: string | null;
}

interface PropiedadRecord {
  id: string;
  estado_comercial: string | null;
  precio: number | string | null;
  created_at?: string;
}

interface ProyectoRecord {
  id: string;
  nombre: string;
  estado: string | null;
  created_at: string;
}

interface VendedorRecord {
  id: string;
  username: string | null;
  nombre_completo: string | null;
  activo: boolean;
  rol_id: string | null;
  meta_mensual_ventas: number | null;
  comision_porcentaje: number | null;
}

interface TendenciaRegistro {
  created_at: string | null;
  estado_comercial: string | null;
  precio: number | string | null;
}

interface TendenciaMensual {
  mes: string;
  ventas: number;
  propiedades: number;
  clientes: number;
}

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
    const clientesResponse = await supabase
      .schema('crm')
      .from('cliente')
      .select('id, estado_cliente, fecha_alta, vendedor_asignado')
      .gte('fecha_alta', startDate)
      .lte('fecha_alta', endDate);

    if (clientesResponse.error) {
      console.error('Error obteniendo clientes:', clientesResponse.error);
    }

    const clientesData = (clientesResponse.data ?? []) as ClienteRecord[];

    // Clientes totales (no solo del período)
    const totalClientesResponse = await supabase
      .schema('crm')
      .from('cliente')
      .select('id, estado_cliente')
      .eq('estado_cliente', 'cliente');

    if (totalClientesResponse.error) {
      console.error('Error obteniendo total de clientes:', totalClientesResponse.error);
    }

    const totalClientes = (totalClientesResponse.data ?? []) as ClienteRecord[];

    // 2. Métricas de Propiedades
    const propiedadesResponse = await supabase
      .schema('crm')
      .from('propiedad')
      .select('id, estado_comercial, precio, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (propiedadesResponse.error) {
      console.error('Error obteniendo propiedades:', propiedadesResponse.error);
    }

    const propiedadesData = (propiedadesResponse.data ?? []) as PropiedadRecord[];

    // Propiedades totales por estado
    const propiedadesEstadosResponse = await supabase
      .schema('crm')
      .from('propiedad')
      .select('id, estado_comercial, precio');

    if (propiedadesEstadosResponse.error) {
      console.error('Error obteniendo propiedades por estado:', propiedadesEstadosResponse.error);
    }

    const propiedadesEstados = (propiedadesEstadosResponse.data ?? []) as PropiedadRecord[];

    // 3. Métricas de Proyectos
    const proyectosResponse = await supabase
      .schema('crm')
      .from('proyecto')
      .select('id, nombre, estado, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (proyectosResponse.error) {
      console.error('Error obteniendo proyectos:', proyectosResponse.error);
    }

    const proyectosData = (proyectosResponse.data ?? []) as ProyectoRecord[];

    // 4. Métricas de Usuarios/Vendedores
    const vendedoresResponse = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .select('id, username, nombre_completo, activo, rol_id, meta_mensual_ventas, comision_porcentaje')
      .eq('activo', true);

    if (vendedoresResponse.error) {
      console.error('Error obteniendo vendedores:', vendedoresResponse.error);
    }

    const vendedoresData = (vendedoresResponse.data ?? []) as VendedorRecord[];

    // 5. Calcular métricas
    const clientesNuevos = clientesData.length;
    const clientesActivos = totalClientes.length;

    const propiedadesNuevas = propiedadesData.length;
    const propiedadesVendidas = propiedadesEstados.filter(p => p.estado_comercial === 'vendido').length;
    const propiedadesDisponibles = propiedadesEstados.filter(p => p.estado_comercial === 'disponible').length;

    // Calcular valor total de propiedades vendidas
    const valorTotalVentas = propiedadesEstados
      .filter(p => p.estado_comercial === 'vendido')
      .reduce((sum, p) => sum + (Number(p.precio) || 0), 0);

    const proyectosNuevos = proyectosData.length;
    const vendedoresActivos = vendedoresData.length;

    // Calcular tasa de conversión (clientes activos / total de leads)
    const totalLeads = clientesData.length;
    const tasaConversion = totalLeads > 0 ? (clientesActivos / totalLeads) * 100 : 0;

    // 6. Datos para gráficos de tendencias (últimos 6 meses)
    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
    
    const tendenciasResponse = await supabase
      .schema('crm')
      .from('propiedad')
      .select('created_at, estado_comercial, precio')
      .gte('created_at', seisMesesAtras.toISOString())
      .order('created_at', { ascending: true });
    if (tendenciasResponse.error) {
      console.error('Error obteniendo tendencias:', tendenciasResponse.error);
    }

    // Procesar datos para gráficos mensuales
    const tendenciasMensuales = procesarTendenciasMensuales((tendenciasResponse.data ?? []) as TendenciaRegistro[]);

    // 7. Top vendedores por ventas (simulado por ahora)
    const topVendedores = vendedoresData.slice(0, 5).map((v) => ({
      username: v.username ?? undefined,
      nombre: v.nombre_completo ?? undefined,
      ventas: Math.floor(Math.random() * 500000) + 100000, // Simulado
      propiedades: Math.floor(Math.random() * 20) + 5,
      meta: v.meta_mensual_ventas ?? 0
    }));

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
          total: propiedadesEstados.length,
          nuevas: propiedadesNuevas,
          vendidas: propiedadesVendidas,
          disponibles: propiedadesDisponibles,
          valorTotal: valorTotalVentas
        },
        proyectos: {
          nuevos: proyectosNuevos,
          total: proyectosData.length
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
function procesarTendenciasMensuales(datos: TendenciaRegistro[]): TendenciaMensual[] {
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const acumulados: Record<string, TendenciaAcumulada> = {};

  meses.forEach((mes) => {
    acumulados[mes] = { ventas: 0, propiedades: 0, clientes: 0 };
  });

  datos.forEach((item) => {
    if (!item.created_at) return;
    const fecha = new Date(item.created_at);
    if (Number.isNaN(fecha.getTime())) return;

    const mes = meses[fecha.getMonth()];
    if (!mes) return;

    const tendenciaMes = acumulados[mes];
    tendenciaMes.propiedades += 1;

    if (item.estado_comercial === 'vendido') {
      const precio = typeof item.precio === 'string' ? Number(item.precio) : item.precio ?? 0;
      tendenciaMes.ventas += Number.isFinite(precio) ? precio : 0;
    }
  });

  return meses.map((mes) => ({
    mes,
    ventas: acumulados[mes].ventas,
    propiedades: acumulados[mes].propiedades,
    clientes: acumulados[mes].clientes,
  }));
}
