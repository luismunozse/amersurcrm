import type {
  NotificacionDbRecord,
  NotificacionItem,
  NotificacionPrioridad,
  NotificacionTipo,
} from "@/types/notificaciones";

export const NOTIFICATION_TYPES: NotificacionTipo[] = [
  "evento",
  "recordatorio",
  "sistema",
  "venta",
  "reserva",
  "cliente",
  "proyecto",
  "lote",
];

export const NOTIFICATION_PRIORITIES: NotificacionPrioridad[] = ["baja", "media", "alta", "urgente"];

export function normalizeNotifications(records: NotificacionDbRecord[]): NotificacionItem[] {
  return records.map((item) => {
    const tipo = NOTIFICATION_TYPES.includes(item.tipo as NotificacionTipo)
      ? (item.tipo as NotificacionTipo)
      : "sistema";

    const payload = (item.data ?? null) as { prioridad?: unknown } | null;
    const prioridadRaw = typeof payload?.prioridad === "string" ? payload.prioridad : undefined;
    const prioridad = NOTIFICATION_PRIORITIES.includes(prioridadRaw as NotificacionPrioridad)
      ? (prioridadRaw as NotificacionPrioridad)
      : "media";

    return {
      id: item.id,
      tipo,
      titulo: item.titulo,
      mensaje: item.mensaje,
      leida: Boolean(item.leida),
      data: item.data,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      prioridad,
    };
  });
}
