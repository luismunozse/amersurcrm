"use server";

/**
 * Server actions para operaciones masivas de clientes:
 * eliminar, asignar vendedor y cambiar estado en lote.
 */

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createServerActionClient } from "@/lib/supabase.server-actions";
import { crearNotificacion } from "@/app/_actionsNotifications";
import { esAdmin } from "@/lib/permissions/server";
import { PERMISOS } from "@/lib/permissions";
import { requierePermiso } from "@/lib/permissions/server";
import {
  EstadoCliente,
  getEstadoClienteLabel,
} from "@/lib/types/clientes";

import {
  buildNombreResumen,
  getVendedoresMap,
} from "./_actions-helpers";

// Eliminar múltiples clientes
export async function eliminarClientesMasivo(ids: string[]) {
  await requierePermiso(PERMISOS.CLIENTES.ELIMINAR, {
    accion: 'eliminar_clientes_masivo',
    recurso_tipo: 'cliente',
    cliente_ids: ids,
  });
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  if (ids.length === 0) {
    return { success: false, count: 0 };
  }

  const { error, count } = await supabase
    .from("cliente")
    .delete({ count: 'exact' })
    .in("id", ids);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/clientes");
  return { success: true, count: count ?? 0 };
}

// Asignar vendedor a múltiples clientes
export async function asignarVendedorMasivo(ids: string[], vendedorUsername: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Verificar que el usuario es administrador
  const isAdmin = await esAdmin();
  if (!isAdmin) {
    throw new Error("No tienes permisos para asignar vendedores masivamente");
  }

  // Validar que el vendedor existe
  const { data: vendedor, error: vendedorError } = await supabase
    .schema('crm')
    .from('usuario_perfil')
    .select('id, username, nombre_completo')
    .eq('username', vendedorUsername)
    .eq('activo', true)
    .single();

  if (vendedorError || !vendedor) {
    throw new Error("Vendedor no encontrado o inactivo");
  }

  const { data: clientesSeleccionados } = await supabase
    .from("cliente")
    .select("id, nombre")
    .in("id", ids);

  // Actualizar ambos campos para mantener consistencia
  const payload = {
    vendedor_username: vendedorUsername,
    vendedor_asignado: vendedorUsername,
  };

  const { error } = await supabase
    .from("cliente")
    .update(payload)
    .in("id", ids);

  if (error) {
    console.error('Error asignando vendedor masivo:', error);
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/clientes");

  // Notificación no-bloqueante
  if (vendedor?.id) {
    const vendedorId = vendedor.id;
    const nombresClientes = (clientesSeleccionados ?? []).map((c) => c?.nombre);
    const totalIds = ids.length;
    const idsClientes = [...ids];
    after(async () => {
      try {
        const resumen = buildNombreResumen(nombresClientes);
        const descripcionExtra = resumen ? ` (${resumen})` : "";
        await crearNotificacion(
          vendedorId,
          "cliente",
          "Asignación de clientes",
          `Se te asignaron ${totalIds} cliente${totalIds === 1 ? "" : "s"}${descripcionExtra}.`,
          {
            cliente_ids: idsClientes,
            url: "/dashboard/clientes?vista=asignados",
          },
        );
      } catch (notifyError) {
        console.warn("No se pudo crear notificación para asignación masiva:", notifyError);
      }
    });
  }

  return { success: true, count: ids.length };
}

// Cambiar estado a múltiples clientes
export async function cambiarEstadoMasivo(ids: string[], nuevoEstado: EstadoCliente) {
  await requierePermiso(PERMISOS.CLIENTES.EDITAR_TODOS, {
    accion: 'cambiar_estado_masivo',
    recurso_tipo: 'cliente',
  });

  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: clientes } = await supabase
    .from("cliente")
    .select("id, nombre, vendedor_username")
    .in("id", ids);

  const { error } = await supabase
    .from("cliente")
    .update({ estado_cliente: nuevoEstado })
    .in("id", ids);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/clientes");

  // Notificaciones no-bloqueantes
  const clientesCopy = [...(clientes ?? [])];
  after(async () => {
    try {
      const supabaseAfter = await createServerActionClient();
      const agrupados = new Map<string, { id: string; nombre: string | null }[]>();
      clientesCopy.forEach((cliente) => {
        if (!cliente?.vendedor_username) return;
        const lista = agrupados.get(cliente.vendedor_username) ?? [];
        lista.push({ id: cliente.id, nombre: cliente.nombre });
        agrupados.set(cliente.vendedor_username, lista);
      });

      if (agrupados.size > 0) {
        const vendedoresMap = await getVendedoresMap(supabaseAfter, Array.from(agrupados.keys()));
        await Promise.all(
          Array.from(agrupados.entries()).map(async ([username, lista]) => {
            const perfil = vendedoresMap.get(username);
            if (!perfil?.id) return;
            const nombres = lista.map((item) => item.nombre);
            const resumen = buildNombreResumen(nombres);
            const mensaje =
              lista.length === 1
                ? `El cliente ${nombres[0] ?? ""} ahora está marcado como ${getEstadoClienteLabel(nuevoEstado as EstadoCliente)}.`
                : `${lista.length} clientes${resumen ? ` (${resumen})` : ""} ahora están marcados como ${getEstadoClienteLabel(nuevoEstado as EstadoCliente)}.`;

            await crearNotificacion(
              perfil.id,
              "cliente",
              "Clientes actualizados",
              mensaje,
              {
                cliente_ids: lista.map((item) => item.id),
                nuevo_estado: nuevoEstado,
              },
            );
          }),
        );
      }
    } catch (notificationError) {
      console.warn("No se pudieron enviar notificaciones por cambio masivo:", notificationError);
    }
  });

  return { success: true, count: ids.length };
}
