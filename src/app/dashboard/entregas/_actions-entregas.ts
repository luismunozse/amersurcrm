"use server";

import { createServerActionClient } from "@/lib/supabase.server-actions";
import { PERMISOS } from "@/lib/permissions";
import { requierePermiso } from "@/lib/permissions/server";
import { obtenerUsernameActual, revalidarCliente } from "../clientes/_actions-crm-helpers";
import { revalidatePath } from "next/cache";

// ============================================================
// ENTREGAS
// ============================================================

export async function crearEntrega(data: {
  ventaId: string;
  clienteId: string;
  loteId?: string;
  fechaProgramada?: string;
  notas?: string;
}) {
  await requierePermiso(PERMISOS.VENTAS.CREAR, {
    accion: 'crear_entrega',
    recurso_tipo: 'entrega',
  });

  const supabase = await createServerActionClient();

  try {
    const authResult = await obtenerUsernameActual(supabase);
    if (!authResult.success) return authResult;

    const { data: entrega, error } = await supabase
      .from('entrega')
      .insert({
        venta_id: data.ventaId,
        cliente_id: data.clienteId,
        lote_id: data.loteId,
        estado: data.fechaProgramada ? 'programada' : 'pendiente',
        fecha_programada: data.fechaProgramada,
        responsable_username: authResult.username,
        notas: data.notas,
      })
      .select()
      .single();

    if (error) throw error;

    revalidarCliente(data.clienteId);
    revalidatePath('/dashboard/entregas');
    return { success: true, data: entrega };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function actualizarEntrega(
  entregaId: string,
  data: {
    estado?: string;
    fechaProgramada?: string;
    fechaInspeccion?: string;
    fechaEntrega?: string;
    responsableUsername?: string;
    actaUrl?: string;
    notas?: string;
    clienteId: string;
  }
) {
  const supabase = await createServerActionClient();

  try {
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (data.estado) updatePayload.estado = data.estado;
    if (data.fechaProgramada !== undefined) updatePayload.fecha_programada = data.fechaProgramada;
    if (data.fechaInspeccion !== undefined) updatePayload.fecha_inspeccion = data.fechaInspeccion;
    if (data.fechaEntrega !== undefined) updatePayload.fecha_entrega = data.fechaEntrega;
    if (data.responsableUsername !== undefined) updatePayload.responsable_username = data.responsableUsername;
    if (data.actaUrl !== undefined) updatePayload.acta_url = data.actaUrl;
    if (data.notas !== undefined) updatePayload.notas = data.notas;

    const { data: entrega, error } = await supabase
      .from('entrega')
      .update(updatePayload)
      .eq('id', entregaId)
      .select()
      .single();

    if (error) throw error;

    revalidarCliente(data.clienteId);
    revalidatePath('/dashboard/entregas');
    return { success: true, data: entrega };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function obtenerEntregasCliente(clienteId: string) {
  const supabase = await createServerActionClient();

  try {
    const { data, error } = await supabase
      .from('entrega')
      .select('*, observaciones:entrega_observacion(*), checklist:entrega_checklist_item(*)')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function obtenerEntregas(filtros?: {
  estado?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = await createServerActionClient();

  try {
    let query = supabase
      .from('entrega')
      .select('*, cliente:cliente!cliente_id(nombre), lote:lote!lote_id(codigo), venta:venta!venta_id(codigo_venta)');

    if (filtros?.estado) {
      query = query.eq('estado', filtros.estado);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(
        filtros?.offset || 0,
        (filtros?.offset || 0) + (filtros?.limit || 50) - 1
      );

    const { data, error } = await query;

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function agregarObservacionEntrega(data: {
  entregaId: string;
  descripcion: string;
  fotoUrl?: string;
  responsableUsername?: string;
  fechaLimite?: string;
  clienteId: string;
}) {
  const supabase = await createServerActionClient();

  try {
    const { data: obs, error } = await supabase
      .from('entrega_observacion')
      .insert({
        entrega_id: data.entregaId,
        descripcion: data.descripcion,
        foto_url: data.fotoUrl,
        responsable_username: data.responsableUsername,
        fecha_limite: data.fechaLimite,
        estado: 'pendiente',
      })
      .select()
      .single();

    if (error) throw error;

    // Si hay observaciones pendientes, marcar entrega como observada
    await supabase
      .from('entrega')
      .update({ estado: 'observada', updated_at: new Date().toISOString() })
      .eq('id', data.entregaId)
      .in('estado', ['en_inspeccion', 'programada']);

    revalidarCliente(data.clienteId);
    revalidatePath('/dashboard/entregas');
    return { success: true, data: obs };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function agregarChecklistItem(data: {
  entregaId: string;
  item: string;
  orden?: number;
}) {
  const supabase = await createServerActionClient();

  try {
    const { data: checkItem, error } = await supabase
      .from('entrega_checklist_item')
      .insert({
        entrega_id: data.entregaId,
        item: data.item,
        orden: data.orden || 0,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/entregas');
    return { success: true, data: checkItem };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleChecklistItem(itemId: string, aprobado: boolean, verificadoPor: string) {
  const supabase = await createServerActionClient();

  try {
    const { error } = await supabase
      .from('entrega_checklist_item')
      .update({
        aprobado,
        verificado_por: verificadoPor,
        fecha_verificacion: aprobado ? new Date().toISOString() : null,
      })
      .eq('id', itemId);

    if (error) throw error;

    revalidatePath('/dashboard/entregas');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
