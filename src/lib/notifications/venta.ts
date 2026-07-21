import "server-only";

import { notificarUsuariosPorRoles, crearNotificacion } from "@/app/_actionsNotifications";
import { createServerActionClient } from "@/lib/supabase.server-actions";

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
  /** Username of the vendedor who owns the cliente/reserva this venta came from (not the actor). */
  vendedorUsername?: string | null;
}

const ROLES_NOTIFICADOS_VENTA_CREADA = ["ROL_ADMIN", "ROL_COORDINADOR_VENTAS"] as const;

interface RolRelacion {
  nombre: string | null;
}

interface VendedorPerfilConRol {
  id: string;
  rol: RolRelacion | RolRelacion[] | null;
}

/**
 * Resolves a vendedor's username to their perfil id + rol name, so the
 * caller can decide whether to notify them directly (dedupe against the
 * role-based fanout, exclude the actor). Returns null when the username is
 * missing or no matching active perfil is found — treated as "nothing to
 * notify", never as an error.
 */
async function resolveVendedorAsignado(vendedorUsername: string | null | undefined) {
  if (!vendedorUsername) return null;

  const supabase = await createServerActionClient();
  const { data, error } = await supabase
    .schema("crm")
    .from("usuario_perfil")
    .select("id, rol:rol!usuario_perfil_rol_id_fkey(nombre)")
    .eq("username", vendedorUsername)
    .eq("activo", true)
    .maybeSingle<VendedorPerfilConRol>();

  if (error || !data) return null;

  const rolObj = Array.isArray(data.rol) ? data.rol[0] : data.rol;
  return { id: data.id, rolNombre: rolObj?.nombre ?? null };
}

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

  const titulo = `Nueva venta: ${tituloDestino}`;
  const mensaje = `${actor} registró una venta para ${input.clienteNombre}${codigoTexto}${montoTexto}.`;

  const resultadoRoles = await notificarUsuariosPorRoles(
    [...ROLES_NOTIFICADOS_VENTA_CREADA],
    "venta",
    titulo,
    mensaje,
    data,
    input.actorId,
  );

  // The role-based fanout above only reaches ROL_ADMIN / ROL_COORDINADOR_VENTAS.
  // Also notify the vendedor who owns the cliente/reserva, since it's their sale
  // too. Skip when: no vendedor was provided, the vendedor IS the actor (would
  // be a self-notify — already excluded from the fanout above), or the vendedor
  // already holds one of the roles above (already notified there).
  const vendedor = await resolveVendedorAsignado(input.vendedorUsername);
  const rolesNotificados: readonly string[] = ROLES_NOTIFICADOS_VENTA_CREADA;
  if (vendedor && vendedor.id !== input.actorId && !rolesNotificados.includes(vendedor.rolNombre ?? "")) {
    try {
      await crearNotificacion(vendedor.id, "venta", titulo, mensaje, data);
    } catch (err) {
      console.warn("No se pudo notificar al vendedor asignado sobre la venta:", err);
    }
  }

  return resultadoRoles;
}
