"use server";

import { createServerOnlyClient } from "@/lib/supabase.server";
import { SearchResult, SearchResponse, PropiedadSearchResult, ProyectoSearchResult, EventoSearchResult } from "@/types/search";

type RelationValue<T> = T | T[] | null | undefined;

interface PropiedadRow {
  id: string;
  codigo: string | null;
  tipo: string;
  tipo_operacion: string;
  identificacion_interna: string | null;
  estado_comercial: string | null;
  precio_venta: number | null;
  precio_alquiler: number | null;
  moneda: string | null;
  proyecto: RelationValue<{ nombre: string | null }>;
}

interface ProyectoRow {
  id: string;
  nombre: string | null;
  estado: string | null;
  ubicacion: string | null;
  descripcion: string | null;
}

interface EventoRow {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: string;
  estado: string | null;
  fecha_inicio: string;
  cliente: RelationValue<{ id?: string; nombre: string | null }>;
  propiedad: RelationValue<{ id?: string; codigo: string | null; identificacion_interna: string | null }>;
}

function getFirstRelation<T>(value: RelationValue<T>): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function globalSearch(query: string, limit: number = 10): Promise<SearchResponse> {
  if (!query || query.trim().length < 2) {
    return { results: [], total: 0, hasMore: false };
  }

  const supabase = await createServerOnlyClient();
  const results: SearchResult[] = [];

  try {
    // Búsqueda en propiedades
    const { data: propiedadesRaw, error: propError } = await supabase
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

    if (propError) {
      console.error('Error buscando propiedades:', propError);
    }

    const propiedades = (propiedadesRaw ?? []) as PropiedadRow[];

    if (!propError && propiedades.length > 0) {
      propiedades.forEach((prop) => {
        const proyecto = getFirstRelation(prop.proyecto);
        const proyectoNombre = proyecto?.nombre ?? undefined;

        const result: PropiedadSearchResult = {
          id: prop.id,
          type: 'propiedad',
          title: prop.identificacion_interna || prop.codigo || 'Propiedad',
          subtitle: `${prop.tipo} - ${prop.tipo_operacion}`,
          description: prop.codigo ?? undefined,
          icon: getPropiedadIcon(prop.tipo),
          url: `/dashboard/propiedades/${prop.id}`,
          codigo: prop.codigo || prop.id,
          tipo: prop.tipo,
          precio: prop.precio_venta ?? prop.precio_alquiler ?? undefined,
          moneda: prop.moneda ?? undefined,
          estado: prop.estado_comercial || 'sin_estado',
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
    const { data: proyectosRaw, error: projError } = await supabase
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

    if (projError) {
      console.error('Error buscando proyectos:', projError);
    }

    const proyectos = (proyectosRaw ?? []) as ProyectoRow[];

    if (!projError && proyectos.length > 0) {
      proyectos.forEach((proj) => {
        const result: ProyectoSearchResult = {
          id: proj.id,
          type: 'proyecto',
          title: proj.nombre || 'Proyecto sin nombre',
          subtitle: proj.ubicacion || '',
          description: proj.descripcion || '',
          icon: '🏗️',
          url: `/dashboard/proyectos/${proj.id}`,
          nombre: proj.nombre || 'Proyecto sin nombre',
          estado: proj.estado || 'sin_estado',
          ubicacion: proj.ubicacion ?? undefined,
          metadata: {
            descripcion: proj.descripcion
          }
        };
        results.push(result);
      });
    }

    // Búsqueda en eventos/tareas
    const { data: eventosRaw, error: eventError } = await supabase
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

    if (eventError) {
      console.error('Error buscando eventos:', eventError);
    }

    const eventos = (eventosRaw ?? []) as EventoRow[];

    if (!eventError && eventos.length > 0) {
      eventos.forEach((event) => {
        const cliente = getFirstRelation(event.cliente);
        const clienteNombre = cliente?.nombre ?? undefined;

        const propiedad = getFirstRelation(event.propiedad);
        const propiedadCodigo = propiedad?.codigo || propiedad?.identificacion_interna || undefined;

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
          estado: event.estado || 'sin_estado',
          cliente_nombre: clienteNombre,
          propiedad_codigo: propiedadCodigo,
          metadata: {
            descripcion: event.descripcion,
            cliente_id: cliente?.id,
            propiedad_id: propiedad?.id
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
