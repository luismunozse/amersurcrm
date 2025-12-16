export type NotificacionTipo =
  | "evento"
  | "recordatorio"
  | "sistema"
  | "venta"
  | "reserva"
  | "cliente"
  | "proyecto"
  | "lote"
  | "lead_asignado";

export type NotificacionPrioridad = "baja" | "media" | "alta" | "urgente";

export interface NotificacionDbRecord {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean | null;
  data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string | null;
}

export interface NotificacionItem {
  id: string;
  tipo: NotificacionTipo;
  titulo: string;
  mensaje: string;
  leida: boolean;
  createdAt: string;
  prioridad: NotificacionPrioridad;
  data?: Record<string, unknown> | null;
  updatedAt?: string | null;
}
