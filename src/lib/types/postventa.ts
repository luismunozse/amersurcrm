// ============================================================
// POST-VENTA - Types
// ============================================================

export type TipoSolicitudPostVenta = 'reclamo' | 'queja' | 'consulta' | 'solicitud_mejora' | 'garantia';
export type PrioridadSolicitud = 'baja' | 'media' | 'alta' | 'urgente';
export type EstadoSolicitudPostVenta = 'registrada' | 'asignada' | 'en_proceso' | 'resuelta' | 'cerrada';

export interface SolicitudPostVenta {
  id: string;
  codigo_solicitud: string;
  venta_id: string;
  entrega_id?: string;
  cliente_id: string;
  lote_id?: string;
  tipo: TipoSolicitudPostVenta;
  prioridad: PrioridadSolicitud;
  estado: EstadoSolicitudPostVenta;
  asunto: string;
  descripcion?: string;
  asignado_a?: string;
  fecha_asignacion?: string;
  fecha_resolucion?: string;
  fecha_cierre?: string;
  comentario_resolucion?: string;
  comentario_cierre?: string;
  sla_respuesta_horas: number;
  sla_resolucion_horas: number;
  calificacion_cliente?: number;
  comentario_calificacion?: string;
  notas?: string;
  created_at: string;
  updated_at: string;
}

export const TIPOS_SOLICITUD_PV: { value: TipoSolicitudPostVenta; label: string; color: string }[] = [
  { value: 'reclamo', label: 'Reclamo', color: 'red' },
  { value: 'queja', label: 'Queja', color: 'orange' },
  { value: 'consulta', label: 'Consulta', color: 'blue' },
  { value: 'solicitud_mejora', label: 'Solicitud de Mejora', color: 'purple' },
  { value: 'garantia', label: 'Garantía', color: 'green' },
];

export const PRIORIDADES_SOLICITUD: { value: PrioridadSolicitud; label: string; color: string }[] = [
  { value: 'baja', label: 'Baja', color: 'gray' },
  { value: 'media', label: 'Media', color: 'blue' },
  { value: 'alta', label: 'Alta', color: 'orange' },
  { value: 'urgente', label: 'Urgente', color: 'red' },
];

export const ESTADOS_SOLICITUD_PV: { value: EstadoSolicitudPostVenta; label: string; color: string }[] = [
  { value: 'registrada', label: 'Registrada', color: 'gray' },
  { value: 'asignada', label: 'Asignada', color: 'blue' },
  { value: 'en_proceso', label: 'En Proceso', color: 'purple' },
  { value: 'resuelta', label: 'Resuelta', color: 'green' },
  { value: 'cerrada', label: 'Cerrada', color: 'green' },
];
