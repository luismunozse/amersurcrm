// Tipos para el sistema de búsqueda global
export type SearchResultType = 'propiedad' | 'proyecto' | 'evento';

export interface BaseSearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  description?: string;
  icon: string;
  url: string;
  metadata?: Record<string, any>;
}

export interface PropiedadSearchResult extends BaseSearchResult {
  type: 'propiedad';
  codigo: string;
  tipo: string;
  precio?: number;
  moneda?: string;
  estado: string;
  proyecto_nombre?: string;
}

export interface ProyectoSearchResult extends BaseSearchResult {
  type: 'proyecto';
  nombre: string;
  estado: string;
  ubicacion?: string;
  total_propiedades?: number;
}

export interface EventoSearchResult extends BaseSearchResult {
  type: 'evento';
  titulo: string;
  tipo: string;
  fecha_inicio: string;
  estado: string;
  cliente_nombre?: string;
  propiedad_codigo?: string;
}

export type SearchResult = PropiedadSearchResult | ProyectoSearchResult | EventoSearchResult;

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  hasMore: boolean;
}
