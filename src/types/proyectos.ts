/**
 * Type definitions for the Proyectos module
 */

// ============================================================================
// ENUMS AND LITERAL TYPES
// ============================================================================

export type LoteEstado = 'disponible' | 'reservado' | 'vendido';
export type ProyectoEstado = 'activo' | 'pausado' | 'completado' | 'cancelado';
export type TipoProyecto = 'propio' | 'corretaje';
export type TipoTerreno = 'residencial' | 'comercial' | 'industrial' | 'agricola' | 'mixto';

// ============================================================================
// PROYECTO INTERFACES
// ============================================================================

export interface ProyectoMediaItem {
  url: string;
  path?: string | null;
  nombre?: string | null;
  created_at?: string | null;
}

export interface Proyecto {
  id: string;
  nombre: string;
  tipo: TipoProyecto;
  descripcion: string | null;
  ubicacion: string | null;
  latitud: number | null;
  longitud: number | null;
  tipo_terreno: TipoTerreno | null;
  area_total: number | null;
  precio_desde: number | null;
  precio_hasta: number | null;
  estado: ProyectoEstado;
  imagen_url: string | null;
  logo_url: string | null;
  galeria_imagenes: ProyectoMediaItem[] | null;
  overlay_image_url: string | null;
  overlay_bounds: OverlayBounds | null;
  overlay_rotation: number | null;
  created_at: string;
  updated_at: string;
  _count?: {
    lotes: number;
  };
}

export interface ProyectoConEstadisticas extends Proyecto {
  total_lotes: number;
  lotes_disponibles: number;
  lotes_reservados: number;
  lotes_vendidos: number;
  porcentaje_vendido: number;
}

export interface ProyectoFormData {
  nombre: string;
  tipo?: TipoProyecto;
  descripcion?: string;
  ubicacion?: string;
  latitud?: number;
  longitud?: number;
  tipo_terreno?: TipoTerreno;
  area_total?: number;
  precio_desde?: number;
  precio_hasta?: number;
  estado?: ProyectoEstado;
}

// ============================================================================
// LOTE INTERFACES
// ============================================================================

export interface Lote {
  id: string;
  proyecto_id: string;
  numero_lote: string;
  etapa: string | null;
  manzana: string | null;
  area: number | null;
  precio_lista: number | null;
  precio_venta: number | null;
  estado: LoteEstado;
  coordenadas: LoteCoordenadas | null;
  descripcion: string | null;
  caracteristicas: Record<string, any> | null;
  imagen_url: string | null;
  created_at: string;
  updated_at: string;
  proyecto?: Proyecto;
  reserva?: Reserva;
  venta?: Venta;
}

export interface LoteCoordenadas {
  type: 'polygon';
  coordinates: number[][][];
}

export interface LoteConRelaciones extends Lote {
  proyecto: Proyecto;
  reserva?: Reserva;
  venta?: Venta;
}

export interface LoteFormData {
  numero_lote: string;
  etapa?: string | null;
  manzana?: string | null;
  area?: number | null;
  precio_lista?: number | null;
  precio_venta?: number | null;
  estado?: LoteEstado;
  descripcion?: string | null;
  caracteristicas?: Record<string, any> | null;
  coordenadas?: LoteCoordenadas | null;
}

// ============================================================================
// GOOGLE MAPS INTERFACES
// ============================================================================

export interface OverlayBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapPoint {
  lat: number;
  lng: number;
}

export interface MapPolygon {
  paths: MapPoint[];
  lote_id: string;
  numero_lote: string;
  estado: LoteEstado;
}

export interface GroundOverlayOptions {
  bounds: OverlayBounds;
  imageUrl: string;
  rotation?: number;
  opacity?: number;
}

export interface MapConfig {
  center: MapPoint;
  zoom: number;
  mapTypeId: string;
  styles?: google.maps.MapTypeStyle[];
}

// ============================================================================
// RESERVA INTERFACES
// ============================================================================

export interface Reserva {
  id: string;
  lote_id: string;
  cliente_id: string;
  vendedor_asignado: string | null;
  vendedor_username: string | null;
  monto_reserva: number | null;
  fecha_reserva: string;
  fecha_vencimiento: string | null;
  estado: 'activa' | 'vencida' | 'cancelada' | 'convertida';
  notas: string | null;
  created_at: string;
  updated_at: string;
  cliente?: Cliente;
  lote?: Lote;
}

export interface ReservaFormData {
  cliente_id: string;
  lote_id: string;
  monto_reserva?: number;
  fecha_vencimiento?: string;
  notas?: string;
}

// ============================================================================
// VENTA INTERFACES
// ============================================================================

export interface Venta {
  id: string;
  lote_id: string;
  cliente_id: string;
  vendedor_asignado: string | null;
  vendedor_username: string | null;
  precio_venta: number;
  modalidad_pago: 'contado' | 'financiado' | 'mixto';
  cuota_inicial: number | null;
  numero_cuotas: number | null;
  monto_cuota: number | null;
  fecha_venta: string;
  estado: 'pendiente' | 'completada' | 'cancelada';
  notas: string | null;
  created_at: string;
  updated_at: string;
  cliente?: Cliente;
  lote?: Lote;
}

export interface VentaFormData {
  cliente_id: string;
  lote_id: string;
  precio_venta: number;
  modalidad_pago: 'contado' | 'financiado' | 'mixto';
  cuota_inicial?: number;
  numero_cuotas?: number;
  monto_cuota?: number;
  fecha_venta?: string;
  notas?: string;
}

// ============================================================================
// CLIENTE INTERFACE (referenced by Reserva/Venta)
// ============================================================================

export interface Cliente {
  id: string;
  nombre: string;
  apellido: string | null;
  email: string | null;
  telefono: string | null;
  dni: string | null;
  direccion: string | null;
  ciudad: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// REPORT INTERFACES
// ============================================================================

export interface ProyectoReport {
  proyecto: Proyecto;
  estadisticas: {
    total_lotes: number;
    disponibles: number;
    reservados: number;
    vendidos: number;
    porcentaje_vendido: number;
    area_total: number;
    area_disponible: number;
    area_vendida: number;
    ingresos_totales: number;
    ingresos_pendientes: number;
  };
  lotes_por_etapa: {
    etapa: string | null;
    total: number;
    disponibles: number;
    reservados: number;
    vendidos: number;
  }[];
  ventas_recientes: Venta[];
  reservas_activas: Reserva[];
}

export interface LoteReport {
  lote: Lote;
  historial: {
    fecha: string;
    tipo: 'creacion' | 'reserva' | 'venta' | 'cancelacion';
    descripcion: string;
    usuario: string | null;
  }[];
  timeline: {
    dias_desde_creacion: number;
    dias_en_estado_actual: number;
    proyeccion_venta: string | null;
  };
}

// ============================================================================
// ACTION RESPONSE TYPES
// ============================================================================

export interface ActionResponse<T = void> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export type ProyectoActionResponse = ActionResponse<Proyecto>;
export type LoteActionResponse = ActionResponse<Lote>;
export type ReservaActionResponse = ActionResponse<Reserva>;
export type VentaActionResponse = ActionResponse<Venta>;

// ============================================================================
// FILTER AND SORT TYPES
// ============================================================================

export interface ProyectoFilters {
  estado?: ProyectoEstado[];
  tipo_terreno?: TipoTerreno[];
  precio_min?: number;
  precio_max?: number;
  search?: string;
}

export interface LoteFilters {
  estado?: LoteEstado[];
  etapa?: string[];
  manzana?: string[];
  area_min?: number;
  area_max?: number;
  precio_min?: number;
  precio_max?: number;
  search?: string;
}

export type ProyectoSortField = 'nombre' | 'created_at' | 'updated_at' | 'precio_desde';
export type LoteSortField = 'numero_lote' | 'area' | 'precio_lista' | 'estado' | 'created_at';
export type SortOrder = 'asc' | 'desc';

export interface SortConfig<T> {
  field: T;
  order: SortOrder;
}

// ============================================================================
// PAGINATION TYPES
// ============================================================================

export interface PaginationConfig {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// ============================================================================
// MAPEO (COORDINATE MAPPING) TYPES
// ============================================================================

export interface MapeoState {
  isDrawingMode: boolean;
  selectedLoteId: string | null;
  hoveredLoteId: string | null;
  editingPolygonId: string | null;
}

export interface LoteCoordinateUpdate {
  lote_id: string;
  coordenadas: LoteCoordenadas;
}

export interface BatchCoordinateUpdate {
  updates: LoteCoordinateUpdate[];
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

export interface ExportConfig {
  format: 'excel' | 'csv' | 'pdf';
  includeImages: boolean;
  includeStats: boolean;
  filters?: LoteFilters;
}

export interface ExportData {
  proyectos?: Proyecto[];
  lotes?: Lote[];
  ventas?: Venta[];
  reservas?: Reserva[];
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string;
}

export interface ToastMessage {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}
