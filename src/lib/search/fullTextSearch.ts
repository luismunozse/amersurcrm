/**
 * Utilidades para Full-Text Search con PostgreSQL
 *
 * Este módulo proporciona funciones para realizar búsquedas de texto completo
 * usando las capacidades nativas de PostgreSQL (tsvector).
 *
 * PREREQUISITOS:
 * - Ejecutar la migración: migrations/add_fulltext_search.sql
 *
 * CARACTERÍSTICAS:
 * - Búsqueda más rápida que ILIKE
 * - Soporte para búsqueda de palabras parciales
 * - Ranking de relevancia
 * - Búsqueda en español con stemming
 * - Búsqueda por similitud usando pg_trgm
 *
 * @example
 * ```ts
 * // Búsqueda básica
 * const proyectos = await searchProyectosFullText('residencial playa');
 *
 * // Búsqueda con opciones
 * const lotes = await searchLotesFullText('uuid-proyecto', 'manzana A', {
 *   limit: 20,
 *   offset: 0,
 *   orderBy: 'rank',
 * });
 * ```
 */

import { createServerActionClient } from '@/lib/supabase.server-actions';

type SupabaseSearchClient = Awaited<ReturnType<typeof createServerActionClient>>;

let customSearchClientFactory: (() => Promise<SupabaseSearchClient>) | null = null;

export function __setFullTextSearchClientFactory(factory: (() => Promise<SupabaseSearchClient>) | null) {
  customSearchClientFactory = factory;
}

async function getSearchClient() {
  if (customSearchClientFactory) {
    return customSearchClientFactory();
  }
  return createServerActionClient();
}

/**
 * Opciones para búsqueda full-text
 */
export interface FullTextSearchOptions {
  /** Número máximo de resultados */
  limit?: number;
  /** Offset para paginación */
  offset?: number;
  /** Campo por el cual ordenar (rank | nombre | fecha) */
  orderBy?: 'rank' | 'nombre' | 'fecha';
  /** Orden ascendente o descendente */
  order?: 'asc' | 'desc';
  /** Umbral mínimo de ranking (0.0 - 1.0) */
  minRank?: number;
}

/**
 * Resultado de búsqueda de proyectos con ranking
 */
export interface ProyectoSearchResult {
  id: string;
  nombre: string;
  ubicacion: string | null;
  estado: string;
  tipo: string;
  rank: number;
}

/**
 * Resultado de búsqueda de lotes con ranking
 */
export interface LoteSearchResult {
  id: string;
  codigo: string;
  numero_lote: string | null;
  estado: string;
  precio: number | null;
  sup_m2: number | null;
  rank: number;
}

/**
 * Busca proyectos usando Full-Text Search de PostgreSQL
 *
 * Utiliza la función almacenada search_proyectos() que realiza búsqueda
 * optimizada con índices GIN y ranking de relevancia.
 *
 * @param query - Texto de búsqueda (soporta palabras parciales y operadores)
 * @param options - Opciones de búsqueda
 * @returns Array de proyectos ordenados por relevancia
 *
 * @example
 * ```ts
 * // Búsqueda simple
 * const results = await searchProyectosFullText('residencial');
 *
 * // Búsqueda con múltiples palabras
 * const results = await searchProyectosFullText('residencial playa norte');
 *
 * // Búsqueda con filtros
 * const results = await searchProyectosFullText('condominio', {
 *   limit: 10,
 *   minRank: 0.1,
 * });
 * ```
 */
export async function searchProyectosFullText(
  query: string,
  options: FullTextSearchOptions = {}
): Promise<ProyectoSearchResult[]> {
  const {
    limit = 50,
    offset = 0,
    orderBy = 'rank',
    order = 'desc',
    minRank = 0.001,
  } = options;

  if (!query || query.trim().length === 0) {
    return [];
  }

  try {
    const supabase = await getSearchClient();

    // Usar la función almacenada de PostgreSQL (schema crm)
    const { data, error } = await supabase.rpc('search_proyectos', {
      search_query: query.trim(),
      limit_count: limit,
      offset_count: offset,
    });

    if (error) {
      console.error('Error in full-text search (proyectos):', error);
      throw error;
    }

    // Filtrar por ranking mínimo y ordenar
    let results = (data || []) as ProyectoSearchResult[];

    if (minRank > 0) {
      results = results.filter((r) => r.rank >= minRank);
    }

    // Ordenar si se especifica algo diferente a rank
    if (orderBy !== 'rank') {
      results.sort((a, b) => {
        let comparison = 0;
        if (orderBy === 'nombre') {
          comparison = a.nombre.localeCompare(b.nombre);
        } else if (orderBy === 'fecha') {
          // Esto requeriría tener el campo fecha en el resultado
          comparison = 0;
        }
        return order === 'asc' ? comparison : -comparison;
      });
    }

    return results;
  } catch (error) {
    console.error('searchProyectosFullText error:', error);
    return [];
  }
}

/**
 * Busca lotes usando Full-Text Search de PostgreSQL
 *
 * Utiliza la función almacenada search_lotes() que realiza búsqueda
 * optimizada con índices GIN y ranking de relevancia.
 *
 * @param proyectoId - ID del proyecto donde buscar
 * @param query - Texto de búsqueda
 * @param options - Opciones de búsqueda
 * @returns Array de lotes ordenados por relevancia
 *
 * @example
 * ```ts
 * const results = await searchLotesFullText(
 *   'uuid-del-proyecto',
 *   'manzana A lote 10',
 *   { limit: 20 }
 * );
 * ```
 */
export async function searchLotesFullText(
  proyectoId: string,
  query: string,
  options: FullTextSearchOptions = {}
): Promise<LoteSearchResult[]> {
  const {
    limit = 100,
    offset = 0,
    orderBy = 'rank',
    order = 'desc',
    minRank = 0.001,
  } = options;

  if (!query || query.trim().length === 0) {
    return [];
  }

  try {
    const supabase = await getSearchClient();

    // Usar la función almacenada de PostgreSQL (schema crm)
    const { data, error } = await supabase.rpc('search_lotes', {
      proyecto_id_param: proyectoId,
      search_query: query.trim(),
      limit_count: limit,
      offset_count: offset,
    });

    if (error) {
      console.error('Error in full-text search (lotes):', error);
      throw error;
    }

    // Filtrar por ranking mínimo
    let results = (data || []) as LoteSearchResult[];

    if (minRank > 0) {
      results = results.filter((r) => r.rank >= minRank);
    }

    // Ordenar si se especifica algo diferente a rank
    if (orderBy !== 'rank') {
      results.sort((a, b) => {
        let comparison = 0;
        if (orderBy === 'nombre') {
          comparison = a.codigo.localeCompare(b.codigo);
        }
        return order === 'asc' ? comparison : -comparison;
      });
    }

    return results;
  } catch (error) {
    console.error('searchLotesFullText error:', error);
    return [];
  }
}

/**
 * Búsqueda híbrida: intenta full-text search y si falla usa ILIKE
 *
 * Esta función es útil para garantizar que siempre se obtengan resultados,
 * incluso si la migración de full-text search no se ha ejecutado.
 *
 * @param proyectoId - ID del proyecto (null para búsqueda de proyectos)
 * @param query - Texto de búsqueda
 * @param options - Opciones de búsqueda
 * @returns Array de resultados
 */
export async function searchHybrid(
  query: string,
  options: FullTextSearchOptions & { proyectoId?: string } = {}
): Promise<ProyectoSearchResult[] | LoteSearchResult[]> {
  const { proyectoId, ...searchOptions } = options;

  try {
    // Intentar full-text search primero
    if (proyectoId) {
      const results = await searchLotesFullText(proyectoId, query, searchOptions);
      if (results.length > 0) return results;
    } else {
      const results = await searchProyectosFullText(query, searchOptions);
      if (results.length > 0) return results;
    }

    // Fallback a ILIKE si full-text no retorna resultados
    return await searchWithILike(query, options);
  } catch (error) {
    console.error('searchHybrid error, falling back to ILIKE:', error);
    return await searchWithILike(query, options);
  }
}

/**
 * Búsqueda usando ILIKE (fallback)
 */
async function searchWithILike(
  query: string,
  options: FullTextSearchOptions & { proyectoId?: string }
): Promise<any[]> {
  const { proyectoId, limit = 50 } = options;
  const supabase = await createServerActionClient();

  if (proyectoId) {
    // Buscar lotes con ILIKE (schema crm)
    const { data } = await supabase
      .schema('crm')
      .from('lote')
      .select('id, codigo, numero_lote, estado, precio, sup_m2')
      .eq('proyecto_id', proyectoId)
      .or(`codigo.ilike.%${query}%,numero_lote.ilike.%${query}%`)
      .limit(limit);

    return (data || []).map((item) => ({ ...item, rank: 0.5 }));
  } else {
    // Buscar proyectos con ILIKE (schema crm)
    const { data } = await supabase
      .schema('crm')
      .from('proyecto')
      .select('id, nombre, ubicacion, estado, tipo')
      .or(`nombre.ilike.%${query}%,ubicacion.ilike.%${query}%`)
      .limit(limit);

    return (data || []).map((item) => ({ ...item, rank: 0.5 }));
  }
}

/**
 * Verificar si el full-text search está disponible
 *
 * @returns true si la migración de full-text search se ha ejecutado
 */
export async function isFullTextSearchAvailable(): Promise<boolean> {
  try {
    const supabase = await createServerActionClient();

    // Intentar ejecutar la función de búsqueda con un query vacío (schema crm)
    const { error } = await supabase.rpc('search_proyectos', {
      search_query: 'test',
      limit_count: 1,
      offset_count: 0,
    });

    // Si no hay error, la función existe y está disponible
    return !error;
  } catch {
    return false;
  }
}

/**
 * Obtener sugerencias de búsqueda basadas en coincidencias parciales
 *
 * Usa pg_trgm para encontrar términos similares
 *
 * @param query - Texto parcial de búsqueda
 * @param type - Tipo de entidad (proyecto | lote)
 * @param limit - Número máximo de sugerencias
 * @returns Array de sugerencias únicas
 */
export async function getSearchSuggestions(
  query: string,
  type: 'proyecto' | 'lote',
  limit: number = 5
): Promise<string[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const supabase = await createServerActionClient();
    const trimmedQuery = query.trim();

    if (type === 'proyecto') {
      const { data } = await supabase
        .schema('crm')
        .from('proyecto')
        .select('nombre')
        .ilike('nombre', `%${trimmedQuery}%`)
        .limit(limit);

      return [...new Set((data || []).map((p) => p.nombre))];
    } else {
      const { data } = await supabase
        .schema('crm')
        .from('lote')
        .select('codigo, numero_lote')
        .or(`codigo.ilike.%${trimmedQuery}%,numero_lote.ilike.%${trimmedQuery}%`)
        .limit(limit);

      const suggestions = (data || []).flatMap((l) => [l.codigo, l.numero_lote]);
      return [...new Set(suggestions)].filter(Boolean).slice(0, limit);
    }
  } catch (error) {
    console.error('getSearchSuggestions error:', error);
    return [];
  }
}

/**
 * Exportar estadísticas de búsqueda para análisis
 *
 * @param query - Texto de búsqueda
 * @param resultCount - Número de resultados obtenidos
 */
export function logSearchStats(query: string, resultCount: number): void {
  if (typeof window !== 'undefined') {
    const stats = {
      query,
      resultCount,
      timestamp: new Date().toISOString(),
    };

    // Guardar en localStorage para análisis posterior
    const historyKey = 'search-stats';
    try {
      const existing = localStorage.getItem(historyKey);
      const history = existing ? JSON.parse(existing) : [];
      history.push(stats);

      // Mantener solo los últimos 100
      const limited = history.slice(-100);
      localStorage.setItem(historyKey, JSON.stringify(limited));
    } catch (error) {
      console.error('Error logging search stats:', error);
    }
  }
}

/**
 * Obtener estadísticas de búsqueda guardadas
 */
export function getSearchStats(): Array<{
  query: string;
  resultCount: number;
  timestamp: string;
}> {
  if (typeof window === 'undefined') return [];

  try {
    const existing = localStorage.getItem('search-stats');
    return existing ? JSON.parse(existing) : [];
  } catch (error) {
    console.error('Error getting search stats:', error);
    return [];
  }
}
