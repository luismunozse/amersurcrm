export type TipoEvento = 'cita' | 'llamada' | 'email' | 'visita' | 'seguimiento' | 'recordatorio' | 'tarea';
export type EstadoEvento = 'pendiente' | 'en_progreso' | 'completado' | 'cancelado';
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
  estado: EstadoRecordatorio;
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