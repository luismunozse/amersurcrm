export type TipoEvento = 'cita' | 'llamada' | 'email' | 'visita' | 'seguimiento' | 'recordatorio' | 'tarea';
export type EstadoEvento = 'pendiente' | 'en_progreso' | 'vencida' | 'reprogramado' | 'completado' | 'cancelado';
export type Prioridad = 'baja' | 'media' | 'alta' | 'urgente';
export type TipoRecordatorio = 'seguimiento_cliente' | 'llamada_prospecto' | 'envio_documentos' | 'visita_propiedad' | 'reunion_equipo' | 'personalizado';
export type EstadoRecordatorio = 'pendiente' | 'enviado' | 'leido' | 'completado' | 'cancelado';

export interface Evento {
  id: string;
  titulo: string;
  descripcion?: string;
  tipo: TipoEvento;
  prioridad: Prioridad;
  fecha_inicio: string;
  fecha_fin?: string;
  duracion_minutos: number;
  todo_el_dia: boolean;
  vendedor_id: string;
  cliente_id?: string;
  propiedad_id?: string;
  oportunidad_id?: string;
  ubicacion?: string;
  direccion?: string;
  recordar_antes_minutos: number;
  notificar_email: boolean;
  notificar_push: boolean;
  es_recurrente: boolean;
  patron_recurrencia?: {
    tipo: 'diario' | 'semanal' | 'mensual';
    intervalo: number;
    dias_semana?: number[];
    fin_fecha?: string;
  };
  notas?: string;
  etiquetas: string[];
  color: string;
  estado: EstadoEvento;
  // Campos de disciplina comercial
  objetivo?: string;
  resultado_id?: string;
  resultado_notas?: string;
  proximo_paso_objetivo?: string;
  proximo_paso_fecha?: string;
  sla_tipo?: string;
  sla_vencimiento?: string;
  recordatorio_canal?: string;
  snooze_motivo_id?: string;
  snooze_hasta?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Recordatorio {
  id: string;
  titulo: string;
  descripcion?: string;
  tipo: TipoRecordatorio;
  prioridad: Prioridad;
  fecha_recordatorio: string;
  vendedor_id: string;
  cliente_id?: string;
  propiedad_id?: string;
  evento_id?: string;
  notificar_email: boolean;
  notificar_push: boolean;
  notas?: string;
  etiquetas: string[];
  // La BD usa campos booleanos en lugar de un campo estado
  completado: boolean;
  leido: boolean;
  enviado: boolean;
  fecha_completado?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PlantillaRecordatorio {
  id: string;
  nombre: string;
  descripcion?: string;
  tipo: TipoRecordatorio;
  titulo_template: string;
  descripcion_template?: string;
  dias_antes: number;
  activa: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EventoFormState {
  titulo: string;
  descripcion: string;
  tipo: TipoEvento;
  prioridad: Prioridad;
  fecha_inicio: string;
  fecha_fin: string;
  duracion_minutos: number;
  todo_el_dia: boolean;
  cliente_id: string;
  propiedad_id: string;
  oportunidad_id: string;
  ubicacion: string;
  direccion: string;
  recordar_antes_minutos: number;
  notificar_email: boolean;
  notificar_push: boolean;
  es_recurrente: boolean;
  patron_recurrencia?: {
    tipo: 'diario' | 'semanal' | 'mensual';
    intervalo: number;
    dias_semana?: number[];
    fin_fecha?: string;
  };
  notas: string;
  etiquetas: string[];
  color: string;
  // Campos de disciplina comercial
  objetivo: string;
  resultado_id: string;
  resultado_notas: string;
  proximo_paso_objetivo: string;
  proximo_paso_fecha: string;
  sla_tipo: string;
  sla_vencimiento: string;
  recordatorio_canal: string;
  snooze_motivo_id: string;
  snooze_hasta: string;
}

export interface RecordatorioFormState {
  titulo: string;
  descripcion: string;
  tipo: TipoRecordatorio;
  prioridad: Prioridad;
  fecha_recordatorio: string;
  cliente_id: string;
  propiedad_id: string;
  evento_id: string;
  notificar_email: boolean;
  notificar_push: boolean;
  notas: string;
  etiquetas: string[];
}

// Backwards-compatible alias for components expecting this name
export type RecordatorioFormData = RecordatorioFormState;

export interface EventoCalendario {
  id: string;
  titulo: string;
  descripcion?: string;
  tipo: TipoEvento;
  prioridad: Prioridad;
  fecha_inicio: string;
  fecha_fin?: string;
  duracion_minutos: number;
  todo_el_dia: boolean;
  ubicacion?: string;
  direccion?: string;
  color: string;
  cliente_id?: string;
  propiedad_id?: string;
  created_at: string;
}

export interface EstadisticasAgenda {
  totalEventos: number;
  eventosHoy: number;
  eventosEstaSemana: number;
  eventosPendientes: number;
  eventosCompletados: number;
  totalRecordatorios: number;
  recordatoriosPendientes: number;
  recordatoriosEnviados: number;
}

// Shared UI option helpers
export const PRIORIDADES_OPTIONS: Array<{ value: Prioridad; label: string }> = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
];

export const TIPOS_RECORDATORIO_OPTIONS: Array<{
  value: TipoRecordatorio;
  label: string;
  icon?: string;
}> = [
  { value: 'seguimiento_cliente', label: 'Seguimiento a cliente', icon: '👤' },
  { value: 'llamada_prospecto', label: 'Llamada a prospecto', icon: '📞' },
  { value: 'envio_documentos', label: 'Envío de documentos', icon: '📄' },
  { value: 'visita_propiedad', label: 'Visita a propiedad', icon: '🏠' },
  { value: 'reunion_equipo', label: 'Reunión de equipo', icon: '👥' },
  { value: 'personalizado', label: 'Personalizado', icon: '✏️' },
];
