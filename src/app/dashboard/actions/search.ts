"use server";

import { createServerOnlyClient } from "@/lib/supabase.server";
import { SearchResult, SearchResponse, PropiedadSearchResult, ProyectoSearchResult, EventoSearchResult } from "@/types/search";

export async function globalSearch(query: string, limit: number = 10): Promise<SearchResponse> {
  if (!query || query.trim().length < 2) {
    return { results: [], total: 0, hasMore: false };
  }

  const supabase = await createServerOnlyClient();
  const results: SearchResult[] = [];

  try {
    // Búsqueda en propiedades
    const { data: propiedades, error: propError } = await supabase
      .from('propiedad')
      .select(`
        id,
        codigo,
        tipo,
        tipo_operacion,
        identificacion_interna,
        estado_comercial,
        precio_venta,
        precio_alquiler,
        moneda,
        proyecto:proyecto_id(nombre)
      `)
      .or(`codigo.ilike.%${query}%, identificacion_interna.ilike.%${query}%`)
      .limit(limit);

    if (!propError && propiedades) {
      propiedades.forEach(prop => {
        // Manejar proyecto que puede ser array u objeto
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const proyecto = prop.proyecto as any;
        const proyectoNombre = Array.isArray(proyecto) ? proyecto[0]?.nombre : proyecto?.nombre;

        const result: PropiedadSearchResult = {
          id: prop.id,
          type: 'propiedad',
          title: prop.identificacion_interna,
          subtitle: `${prop.tipo} - ${prop.tipo_operacion}`,
          description: prop.codigo,
          icon: getPropiedadIcon(prop.tipo),
          url: `/dashboard/propiedades/${prop.id}`,
          codigo: prop.codigo,
          tipo: prop.tipo,
          precio: prop.precio_venta || prop.precio_alquiler,
          moneda: prop.moneda,
          estado: prop.estado_comercial,
          proyecto_nombre: proyectoNombre,
          metadata: {
            precio_venta: prop.precio_venta,
            precio_alquiler: prop.precio_alquiler,
            tipo_operacion: prop.tipo_operacion
          }
        };
        results.push(result);
      });
    }

    // Búsqueda en proyectos
    const { data: proyectos, error: projError } = await supabase
      .from('proyecto')
      .select(`
        id,
        nombre,
        estado,
        ubicacion,
        descripcion
      `)
      .or(`nombre.ilike.%${query}%, ubicacion.ilike.%${query}%`)
      .limit(limit);

    if (!projError && proyectos) {
      proyectos.forEach(proj => {
        const result: ProyectoSearchResult = {
          id: proj.id,
          type: 'proyecto',
          title: proj.nombre,
          subtitle: proj.ubicacion || '',
          description: proj.descripcion || '',
          icon: '🏗️',
          url: `/dashboard/proyectos/${proj.id}`,
          nombre: proj.nombre,
          estado: proj.estado,
          ubicacion: proj.ubicacion,
          metadata: {
            descripcion: proj.descripcion
          }
        };
        results.push(result);
      });
    }

    // Búsqueda en eventos/tareas
    const { data: eventos, error: eventError } = await supabase
      .from('evento')
      .select(`
        id,
        titulo,
        descripcion,
        tipo,
        estado,
        fecha_inicio,
        cliente:cliente_id(nombre),
        propiedad:propiedad_id(codigo, identificacion_interna)
      `)
      .or(`titulo.ilike.%${query}%, descripcion.ilike.%${query}%`)
      .limit(limit);

    if (!eventError && eventos) {
      eventos.forEach(event => {
        // Manejar cliente y propiedad que pueden ser array u objeto
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cliente = event.cliente as any;
        const clienteNombre = Array.isArray(cliente) ? cliente[0]?.nombre : cliente?.nombre;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const propiedad = event.propiedad as any;
        const propiedadCodigo = Array.isArray(propiedad)
          ? (propiedad[0]?.codigo || propiedad[0]?.identificacion_interna)
          : (propiedad?.codigo || propiedad?.identificacion_interna);

        const result: EventoSearchResult = {
          id: event.id,
          type: 'evento',
          title: event.titulo,
          subtitle: `${event.tipo} - ${new Date(event.fecha_inicio).toLocaleDateString('es-PE')}`,
          description: event.descripcion || '',
          icon: getEventoIcon(event.tipo),
          url: `/dashboard/agenda`,
          titulo: event.titulo,
          tipo: event.tipo,
          fecha_inicio: event.fecha_inicio,
          estado: event.estado,
          cliente_nombre: clienteNombre,
          propiedad_codigo: propiedadCodigo,
          metadata: {
            descripcion: event.descripcion,
            cliente_id: Array.isArray(cliente) ? cliente[0]?.id : cliente?.id,
            propiedad_id: Array.isArray(propiedad) ? propiedad[0]?.id : propiedad?.id
          }
        };
        results.push(result);
      });
    }

    // Ordenar resultados por relevancia (títulos que empiecen con la query primero)
    const sortedResults = results.sort((a, b) => {
      const aStarts = a.title.toLowerCase().startsWith(query.toLowerCase());
      const bStarts = b.title.toLowerCase().startsWith(query.toLowerCase());
      
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.title.localeCompare(b.title);
    });

    return {
      results: sortedResults.slice(0, limit),
      total: sortedResults.length,
      hasMore: sortedResults.length > limit
    };

  } catch (error) {
    console.error('Error en búsqueda global:', error);
    return { results: [], total: 0, hasMore: false };
  }
}

function getPropiedadIcon(tipo: string): string {
  const icons: Record<string, string> = {
    'lote': '🏗️',
    'casa': '🏠',
    'departamento': '🏢',
    'oficina': '🏢',
    'otro': '📋'
  };
  return icons[tipo] || '📋';
}

function getEventoIcon(tipo: string): string {
  const icons: Record<string, string> = {
    'cita': '📅',
    'llamada': '📞',
    'email': '📧',
    'visita': '🏠',
    'seguimiento': '🔄',
    'recordatorio': '⏰',
    'tarea': '✅'
  };
  return icons[tipo] || '📋';
}
