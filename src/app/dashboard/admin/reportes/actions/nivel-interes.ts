"use server";

import { getAuthorizedClient, calcularFechas, safeAction } from "./shared";

/**
 * Obtiene reporte de nivel de interés de leads por proyecto
 */
export async function obtenerReporteNivelInteres(
  periodo: string = '30',
  proyectoId?: string,
  fechaInicio?: string,
  fechaFin?: string
): Promise<{ data: any | null; error: string | null }> {
  return safeAction(async () => {
    const supabase = await getAuthorizedClient();
    const { startDate, endDate, days } = calcularFechas(periodo, fechaInicio, fechaFin);

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

    // Obtener intereses de clientes en proyectos CON PRIORIDAD
    const interesQuery = supabase
      .schema('crm')
      .from('cliente_propiedad_interes')
      .select(`
        cliente_id,
        prioridad,
        lote:lote_id (
          proyecto_id
        ),
        propiedad:propiedad_id (
          proyecto_id
        )
      `);

    const { data: interesesProyecto } = await interesQuery;

    // Mapear clientes con interés en proyectos específicos Y su mejor prioridad
    const clientesConProyecto = new Map<string, string[]>();
    const clientePrioridad = new Map<string, number>(); // Mejor prioridad del cliente (1=alta, menor es mejor)

    interesesProyecto?.forEach((interes: any) => {
      const proyId = interes.lote?.proyecto_id || interes.propiedad?.proyecto_id;
      if (proyId) {
        const proyectos = clientesConProyecto.get(interes.cliente_id) || [];
        if (!proyectos.includes(proyId)) {
          proyectos.push(proyId);
        }
        clientesConProyecto.set(interes.cliente_id, proyectos);

        // Guardar la mejor prioridad (menor número = mayor prioridad)
        const prioridadActual = clientePrioridad.get(interes.cliente_id) || 3;
        const nuevaPrioridad = interes.prioridad || 2;
        if (nuevaPrioridad < prioridadActual) {
          clientePrioridad.set(interes.cliente_id, nuevaPrioridad);
        }
      }
    });

    // Agrupar última interacción por cliente
    const ultimaInteraccionPorCliente = new Map<string, any>();
    interacciones?.forEach(interaccion => {
      if (!ultimaInteraccionPorCliente.has(interaccion.cliente_id)) {
        ultimaInteraccionPorCliente.set(interaccion.cliente_id, interaccion);
      }
    });

    // Mapear niveles de interés COMBINANDO prioridad del proyecto + resultado de interacción
    // prioridad: 1=Alta, 2=Media, 3=Baja
    const mapearNivelInteres = (
      estadoCliente: string,
      resultado: string | null,
      prioridad: number = 2
    ): string => {
      // Casos especiales de estado del cliente
      if (estadoCliente === 'transferido') return 'Contacto Transferido';
      if (resultado === 'cerrado') return 'Desestimado';
      if (resultado === 'no_interesado') return 'No Interesado';

      // Si no hay interacción, basarse en prioridad + estado
      if (!resultado) {
        if (estadoCliente === 'por_contactar') {
          return prioridad === 1 ? 'Alto (Por Contactar)' : 'Por Contactar';
        }
        // Solo tiene proyecto de interés asignado
        if (prioridad === 1) return 'Alto';
        if (prioridad === 2) return 'Medio';
        return 'Bajo';
      }

      // COMBINAR prioridad + resultado de interacción
      // Prioridad Alta (1)
      if (prioridad === 1) {
        if (resultado === 'interesado') return 'Muy Alto';
        if (resultado === 'contesto' || resultado === 'reagendo') return 'Alto';
        if (resultado === 'no_contesto' || resultado === 'pendiente') return 'Alto (Pendiente)';
        return 'Alto';
      }

      // Prioridad Media (2)
      if (prioridad === 2) {
        if (resultado === 'interesado') return 'Alto';
        if (resultado === 'contesto' || resultado === 'reagendo') return 'Medio';
        if (resultado === 'no_contesto' || resultado === 'pendiente') return 'Medio (Pendiente)';
        return 'Medio';
      }

      // Prioridad Baja (3)
      if (resultado === 'interesado') return 'Medio';
      if (resultado === 'contesto' || resultado === 'reagendo') return 'Bajo';
      if (resultado === 'no_contesto' || resultado === 'pendiente') return 'Bajo (Pendiente)';
      return 'Bajo';
    };

    // Colores para cada nivel (actualizado con nuevos niveles)
    const coloresNivel: Record<string, string> = {
      'Muy Alto': '#059669',              // emerald-600
      'Alto': '#3B82F6',                  // blue
      'Alto (Por Contactar)': '#0EA5E9',  // sky-500
      'Alto (Pendiente)': '#6366F1',      // indigo
      'Medio': '#8B5CF6',                 // purple
      'Medio (Pendiente)': '#A855F7',     // purple-500
      'Bajo': '#6B7280',                  // gray
      'Bajo (Pendiente)': '#9CA3AF',      // gray-400
      'Por Contactar': '#14B8A6',         // teal
      'Contacto Transferido': '#10B981',  // green
      'No Interesado': '#FCD34D',         // yellow
      'Desestimado': '#F97316'            // orange
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

      // Obtener prioridad del cliente
      const prioridad = clientePrioridad.get(cliente.id) || 2;

      const nivelInteres = mapearNivelInteres(
        cliente.estado_cliente,
        ultimaInteraccion?.resultado || null,
        prioridad
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
      const prioridad = clientePrioridad.get(cliente.id) || 2;
      const nivelInteres = mapearNivelInteres(
        cliente.estado_cliente,
        ultimaInteraccion?.resultado || null,
        prioridad
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

    // ===== Contar clientes interesados por proyecto (respetando filtros) =====
    const clientesPorProyectoMap = new Map<string, number>();
    const clientesFiltradosConInteres = new Set<string>();

    // Contar cuántos clientes tienen interés en cada proyecto, aplicando filtros
    clientesConProyecto.forEach((proyectosCliente, clienteId) => {
      // Aplicar filtro de fecha: si hay fechas y el cliente tiene interacción, verificar rango
      if (fechaInicio && fechaFin) {
        const ultimaInteraccion = ultimaInteraccionPorCliente.get(clienteId);
        if (ultimaInteraccion) {
          const fechaInteraccion = new Date(ultimaInteraccion.fecha_interaccion);
          if (fechaInteraccion < startDate || fechaInteraccion > endDate) {
            return; // Skip - última interacción fuera del rango
          }
        }
      }

      // Aplicar filtro de proyecto
      const proyectosAContar = (proyectoId && proyectoId !== 'todos')
        ? proyectosCliente.filter(pId => pId === proyectoId)
        : proyectosCliente;

      if (proyectosAContar.length > 0) {
        clientesFiltradosConInteres.add(clienteId);
        proyectosAContar.forEach(proyId => {
          clientesPorProyectoMap.set(proyId, (clientesPorProyectoMap.get(proyId) || 0) + 1);
        });
      }
    });

    // Formatear lista de clientes por proyecto
    const clientesPorProyecto = (proyectos || [])
      .map(p => ({
        proyectoId: p.id,
        proyecto: p.nombre,
        clientesInteresados: clientesPorProyectoMap.get(p.id) || 0
      }))
      .filter(p => p.clientesInteresados > 0)
      .sort((a, b) => b.clientesInteresados - a.clientesInteresados);

    // Total de clientes únicos con interés (filtrados)
    const totalClientesConInteres = clientesFiltradosConInteres.size;

    // ===== Distribución por vendedor (respetando filtros) =====
    const clientesMap = new Map(clientes?.map(c => [c.id, c]) || []);
    const vendedorProyectoMap = new Map<string, { total: number; proyectos: Map<string, number> }>();

    clientesFiltradosConInteres.forEach(clienteId => {
      const cliente = clientesMap.get(clienteId);
      const vendedor = cliente?.vendedor_username || 'Sin asignar';
      const proyectosCliente = clientesConProyecto.get(clienteId) || [];

      // Aplicar filtro de proyecto
      const proyectosFiltrados = (proyectoId && proyectoId !== 'todos')
        ? proyectosCliente.filter(pId => pId === proyectoId)
        : proyectosCliente;

      if (!vendedorProyectoMap.has(vendedor)) {
        vendedorProyectoMap.set(vendedor, { total: 0, proyectos: new Map() });
      }
      const entry = vendedorProyectoMap.get(vendedor)!;
      entry.total++;
      proyectosFiltrados.forEach(pId => {
        entry.proyectos.set(pId, (entry.proyectos.get(pId) || 0) + 1);
      });
    });

    const proyectosNombreMap = new Map(proyectos?.map(p => [p.id, p.nombre]) || []);
    const distribucionPorVendedor = Array.from(vendedorProyectoMap.entries())
      .map(([vendedor, data]) => ({
        vendedor,
        totalInteresados: data.total,
        proyectos: Array.from(data.proyectos.entries())
          .map(([pId, count]) => ({
            proyecto: proyectosNombreMap.get(pId) || 'Sin nombre',
            cantidad: count
          }))
          .sort((a, b) => b.cantidad - a.cantidad)
          .slice(0, 3), // Top 3 proyectos por vendedor
        porcentaje: totalClientesConInteres > 0
          ? ((data.total / totalClientesConInteres) * 100).toFixed(1)
          : '0'
      }))
      .sort((a, b) => b.totalInteresados - a.totalInteresados);

    return {
      resumen: {
        totalRegistros,
        totalProyectos: proyectos?.length || 0,
        totalClientesConInteres,
        fechaInicio: startDate.toISOString(),
        fechaFin: endDate.toISOString()
      },
      distribucionNiveles,
      distribucionPorProyecto,
      distribucionPorVendedor,
      clientesPorProyecto,
      proyectos: proyectos || [],
      periodo: {
        inicio: startDate.toISOString(),
        fin: endDate.toISOString(),
        dias: days
      }
    };
  });
}
