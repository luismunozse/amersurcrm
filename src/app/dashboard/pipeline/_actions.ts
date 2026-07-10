"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createOptimizedServerClient, createServiceRoleClient } from "@/lib/supabase.server";
import { crearNotificacionSistema } from "@/lib/notifications/system";
import { getEstadoClienteLabel, type EstadoCliente } from "@/lib/types/clientes";

export type MoverClienteResult =
  | { ok: true; cambiado: boolean; estadoAnterior?: string; estadoNuevo?: string }
  | { ok: false; error: string };

const ESTADOS_VALIDOS = new Set([
  "por_contactar",
  "contactado",
  "intermedio",
  "potencial",
  "desestimado",
  "transferido",
]);

export async function moverClientePipeline(
  clienteId: string,
  estadoNuevo: string,
  motivo?: string,
): Promise<MoverClienteResult> {
  if (!clienteId || !ESTADOS_VALIDOS.has(estadoNuevo)) {
    return { ok: false, error: "Parámetros inválidos" };
  }

  const supabase = await createOptimizedServerClient();
  const { data, error } = await supabase
    .schema("crm")
    .rpc("mover_cliente_pipeline", {
      p_cliente_id: clienteId,
      p_estado_nuevo: estadoNuevo,
      p_motivo: motivo ?? null,
    });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/pipeline");
  revalidatePath("/dashboard/clientes");

  const payload = (data ?? {}) as {
    cambiado?: boolean;
    estado_anterior?: string;
    estado_nuevo?: string;
  };

  const cambiado = payload.cambiado ?? false;

  // Notificación no-bloqueante: mismo evento que el path del formulario
  // (actualizarEstadoCliente en dashboard/clientes/_actions.ts) — el
  // vendedor asignado debe enterarse del cambio de estado sin importar si
  // vino del Kanban o del formulario de edición.
  //
  // NOTE: inside after() Next.js runs with phase='after', where cookie writes
  // throw ReadonlyRequestCookiesError. A session client's getUser() may write
  // cookies when the token happens to refresh, which would intermittently and
  // silently drop the notification — so this callback uses the service-role
  // client + the session-free emitter (crearNotificacionSistema) instead of
  // notifyVendedorAsignado/crearNotificacion.
  if (cambiado && payload.estado_nuevo) {
    const estadoNuevoNotificado = payload.estado_nuevo;
    after(async () => {
      try {
        const supabaseAdmin = createServiceRoleClient();
        const { data: cliente } = await supabaseAdmin
          .schema("crm")
          .from("cliente")
          .select("nombre, vendedor_username")
          .eq("id", clienteId)
          .maybeSingle();

        if (!cliente?.vendedor_username) return;

        const { data: perfil } = await supabaseAdmin
          .schema("crm")
          .from("usuario_perfil")
          .select("id")
          .eq("username", cliente.vendedor_username)
          .maybeSingle();

        if (!perfil?.id) {
          console.warn("Vendedor no encontrado para notificar tras mover el pipeline:", cliente.vendedor_username);
          return;
        }

        await crearNotificacionSistema(
          perfil.id,
          "cliente",
          "Estado de cliente actualizado",
          `El cliente ${cliente.nombre ?? ""} ahora está marcado como ${getEstadoClienteLabel(estadoNuevoNotificado as EstadoCliente)}.`,
          {
            cliente_id: clienteId,
            nuevo_estado: estadoNuevoNotificado,
            url: `/dashboard/clientes/${clienteId}`,
          },
        );
      } catch (notifyError) {
        console.warn("No se pudo notificar al vendedor tras mover el pipeline:", notifyError);
      }
    });
  }

  return {
    ok: true,
    cambiado,
    estadoAnterior: payload.estado_anterior,
    estadoNuevo: payload.estado_nuevo,
  };
}
