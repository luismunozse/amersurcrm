import "server-only";

import { notificarUsuariosPorRoles } from "@/app/_actionsNotifications";

export interface VentaCreadaNotificacionInput {
  clienteNombre: string;
  loteCodigo?: string | null;
  monto?: number | null;
  actorId: string;
  actorNombre?: string | null;
  ventaId?: string;
  codigoVenta?: string;
  proyectoId?: string | null;
  url?: string;
}

const ROLES_NOTIFICADOS_VENTA_CREADA = ["ROL_ADMIN", "ROL_COORDINADOR_VENTAS"] as const;

/**
 * Single source of truth for the "venta creada" business event: notifies
 * ROL_ADMIN + ROL_COORDINADOR_VENTAS (excluding the acting user), regardless
 * of which action path created the venta (reserva -> venta conversion from
 * the proyecto view, from the cliente view, or closing an adquisicion
 * process). Extracted so all three paths emit the exact same notification
 * instead of copy-pasted (and drifting) notify blocks.
 *
 * Fire-and-forget by contract: callers MUST wrap this call in try/catch (or
 * `after()`) so a notification failure never fails venta creation itself.
 */
export async function notificarVentaCreada(input: VentaCreadaNotificacionInput) {
  const actor = input.actorNombre?.trim() || "Un usuario";
  const tituloDestino = input.loteCodigo ? `lote ${input.loteCodigo}` : input.clienteNombre;
  const codigoTexto = input.codigoVenta ? ` (${input.codigoVenta})` : "";
  const montoTexto = input.monto != null ? ` por ${input.monto}` : "";

  const data: Record<string, unknown> = { cliente_nombre: input.clienteNombre };
  if (input.loteCodigo) data.loteCodigo = input.loteCodigo;
  if (input.ventaId) data.ventaId = input.ventaId;
  if (input.codigoVenta) data.codigoVenta = input.codigoVenta;
  if (input.proyectoId) data.proyectoId = input.proyectoId;
  if (input.url) data.url = input.url;

  return notificarUsuariosPorRoles(
    [...ROLES_NOTIFICADOS_VENTA_CREADA],
    "venta",
    `Nueva venta: ${tituloDestino}`,
    `${actor} registró una venta para ${input.clienteNombre}${codigoTexto}${montoTexto}.`,
    data,
    input.actorId,
  );
}
