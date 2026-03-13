"use server";

import { getAuthorizedClient, calcularFechas, safeAction } from "./shared";

/**
 * Obtiene reporte de clientes con datos reales
 */
export async function obtenerReporteClientes(
  periodo: string = '30'
): Promise<{ data: any | null; error: string | null }> {
  return safeAction(async () => {
    const supabase = await getAuthorizedClient();
    const { startDate, endDate, days } = calcularFechas(periodo);

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

    // Top clientes por valor
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
        change: 0,
        type: "positive"
      },
      {
        label: "Nuevos Clientes",
        value: clientesNuevos?.length || 0,
        change: 0,
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
      clientStats,
      clientSources,
      topClients,
      clientSegments: segmentos,
      periodo: {
        inicio: startDate.toISOString(),
        fin: endDate.toISOString(),
        dias: days
      }
    };
  });
}

/**
 * Obtiene reporte de gestión de clientes con estados de seguimiento
 */
export async function obtenerReporteGestionClientes(
  periodo: string = '30'
): Promise<{ data: any | null; error: string | null }> {
  return safeAction(async () => {
    const supabase = await getAuthorizedClient();
    const { startDate, days } = calcularFechas(periodo);

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

    const idsClientesGestion = clientes?.map(c => c.id) || [];
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
      .in('cliente_id', idsClientesGestion.length > 0 ? idsClientesGestion : ['00000000-0000-0000-0000-000000000000'])
      .order('fecha_interaccion', { ascending: false });

    const ultimaInteraccionPorCliente = new Map<string, any>();
    ultimasInteracciones?.forEach(interaccion => {
      if (!ultimaInteraccionPorCliente.has(interaccion.cliente_id)) {
        ultimaInteraccionPorCliente.set(interaccion.cliente_id, interaccion);
      }
    });

    const hoy = new Date();
    const hace7dias = new Date(hoy);
    hace7dias.setDate(hace7dias.getDate() - 7);
    const hace30dias = new Date(hoy);
    hace30dias.setDate(hace30dias.getDate() - 30);

    let sinContactar = 0;
    let contactadosReciente = 0;
    let contactadosMedio = 0;
    let sinSeguimiento = 0;
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
      clientesDetalle: clientesDetalle.slice(0, 50),
      periodo: {
        inicio: startDate.toISOString(),
        fin: new Date().toISOString(),
        dias: days
      }
    };
  });
}
