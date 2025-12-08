import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Obtener el username del vendedor
    const { data: perfil } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .select('username, meta_mensual_ventas, comision_porcentaje')
      .eq('id', user.id)
      .single();

    if (!perfil?.username) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get('periodo') || 'mes';

    // Calcular fechas según el período
    const now = new Date();
    let fechaInicio: Date;
    
    switch (periodo) {
      case 'semana':
        fechaInicio = new Date(now);
        fechaInicio.setDate(now.getDate() - 7);
        break;
      case 'trimestre':
        fechaInicio = new Date(now);
        fechaInicio.setMonth(now.getMonth() - 3);
        break;
      case 'año':
        fechaInicio = new Date(now);
        fechaInicio.setFullYear(now.getFullYear() - 1);
        break;
      case 'mes':
      default:
        fechaInicio = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const fechaInicioISO = fechaInicio.toISOString();

    // Obtener estadísticas en paralelo
    const [
      clientesResult,
      clientesNuevosResult,
      clientesActivosResult,
      ventasResult,
      ventasEnProcesoResult,
      reservasResult,
      reservasActivasResult,
    ] = await Promise.all([
      // Total de clientes asignados
      supabase
        .schema('crm')
        .from('cliente')
        .select('*', { count: 'exact', head: true })
        .eq('vendedor_username', perfil.username),

      // Clientes nuevos en el período
      supabase
        .schema('crm')
        .from('cliente')
        .select('*', { count: 'exact', head: true })
        .eq('vendedor_username', perfil.username)
        .gte('created_at', fechaInicioISO),

      // Clientes activos (con interacción reciente)
      supabase
        .schema('crm')
        .from('cliente')
        .select('*', { count: 'exact', head: true })
        .eq('vendedor_username', perfil.username)
        .in('estado_cliente', ['activo', 'interesado', 'en_proceso']),

      // Ventas completadas
      supabase
        .schema('crm')
        .from('venta')
        .select('precio_total, moneda')
        .eq('vendedor_username', perfil.username)
        .eq('estado', 'completada')
        .gte('created_at', fechaInicioISO),

      // Ventas en proceso
      supabase
        .schema('crm')
        .from('venta')
        .select('*', { count: 'exact', head: true })
        .eq('vendedor_username', perfil.username)
        .eq('estado', 'en_proceso'),

      // Total reservas
      supabase
        .schema('crm')
        .from('reserva')
        .select('*', { count: 'exact', head: true })
        .eq('vendedor_username', perfil.username)
        .gte('created_at', fechaInicioISO),

      // Reservas activas
      supabase
        .schema('crm')
        .from('reserva')
        .select('*', { count: 'exact', head: true })
        .eq('vendedor_username', perfil.username)
        .eq('estado', 'activa'),
    ]);

    // Calcular monto de ventas
    const ventas = ventasResult.data || [];
    const montoVentas = ventas.reduce((sum, v) => sum + (v.precio_total || 0), 0);

    // Obtener tendencias de los últimos 6 meses
    const ventasPorMes = await obtenerVentasPorMes(supabase, perfil.username);
    const clientesPorMes = await obtenerClientesPorMes(supabase, perfil.username);

    const reporteData = {
      totalClientes: clientesResult.count || 0,
      clientesNuevos: clientesNuevosResult.count || 0,
      clientesActivos: clientesActivosResult.count || 0,
      totalVentas: ventas.length,
      montoVentas,
      ventasEnProceso: ventasEnProcesoResult.count || 0,
      totalReservas: reservasResult.count || 0,
      reservasActivas: reservasActivasResult.count || 0,
      metaMensual: perfil.meta_mensual_ventas || 0,
      progreso: perfil.meta_mensual_ventas ? Math.round((montoVentas / perfil.meta_mensual_ventas) * 100) : 0,
      ventasPorMes,
      clientesPorMes,
    };

    return NextResponse.json({
      success: true,
      data: reporteData,
    });

  } catch (error) {
    console.error("Error en /api/vendedor/reportes:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

async function obtenerVentasPorMes(supabase: any, username: string) {
  const meses: { mes: string; cantidad: number; monto: number }[] = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const fecha = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const fechaFin = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    
    const mesNombre = fecha.toLocaleDateString('es-PE', { month: 'short' });

    const { data } = await supabase
      .schema('crm')
      .from('venta')
      .select('precio_total')
      .eq('vendedor_username', username)
      .eq('estado', 'completada')
      .gte('created_at', fecha.toISOString())
      .lte('created_at', fechaFin.toISOString());

    const ventas = data || [];
    meses.push({
      mes: mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1),
      cantidad: ventas.length,
      monto: ventas.reduce((sum: number, v: any) => sum + (v.precio_total || 0), 0),
    });
  }

  return meses;
}

async function obtenerClientesPorMes(supabase: any, username: string) {
  const meses: { mes: string; nuevos: number }[] = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const fecha = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const fechaFin = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    
    const mesNombre = fecha.toLocaleDateString('es-PE', { month: 'short' });

    const { count } = await supabase
      .schema('crm')
      .from('cliente')
      .select('*', { count: 'exact', head: true })
      .eq('vendedor_username', username)
      .gte('created_at', fecha.toISOString())
      .lte('created_at', fechaFin.toISOString());

    meses.push({
      mes: mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1),
      nuevos: count || 0,
    });
  }

  return meses;
}

