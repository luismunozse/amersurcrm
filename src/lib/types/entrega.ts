// ============================================================
// ENTREGA DE UNIDAD - Types
// ============================================================

export type EstadoEntrega = 'pendiente' | 'programada' | 'en_inspeccion' | 'observada' | 'entregada';
export type EstadoObservacion = 'pendiente' | 'en_proceso' | 'resuelta';

export interface Entrega {
  id: string;
  codigo_entrega: string;
  venta_id: string;
  cliente_id: string;
  lote_id?: string;
  estado: EstadoEntrega;
  fecha_programada?: string;
  fecha_inspeccion?: string;
  fecha_entrega?: string;
  responsable_username?: string;
  acta_url?: string;
  notas?: string;
  created_at: string;
  updated_at: string;
}

export interface EntregaObservacion {
  id: string;
  entrega_id: string;
  descripcion: string;
  foto_url?: string;
  responsable_username?: string;
  fecha_limite?: string;
  estado: EstadoObservacion;
  fecha_resolucion?: string;
  notas_resolucion?: string;
  created_at: string;
  updated_at: string;
}

export interface EntregaChecklistItem {
  id: string;
  entrega_id: string;
  item: string;
  aprobado: boolean;
  observacion?: string;
  verificado_por?: string;
  fecha_verificacion?: string;
  orden: number;
  created_at: string;
}

export const ESTADOS_ENTREGA: { value: EstadoEntrega; label: string; color: string }[] = [
  { value: 'pendiente', label: 'Pendiente', color: 'gray' },
  { value: 'programada', label: 'Programada', color: 'blue' },
  { value: 'en_inspeccion', label: 'En Inspección', color: 'purple' },
  { value: 'observada', label: 'Observada', color: 'orange' },
  { value: 'entregada', label: 'Entregada', color: 'green' },
];

export const ESTADOS_OBSERVACION: { value: EstadoObservacion; label: string; color: string }[] = [
  { value: 'pendiente', label: 'Pendiente', color: 'gray' },
  { value: 'en_proceso', label: 'En Proceso', color: 'blue' },
  { value: 'resuelta', label: 'Resuelta', color: 'green' },
];
