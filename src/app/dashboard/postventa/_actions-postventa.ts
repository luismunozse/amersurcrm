"use server";

import { createServerActionClient } from "@/lib/supabase.server-actions";
import { PERMISOS } from "@/lib/permissions";
import { requierePermiso } from "@/lib/permissions/server";
import { revalidarCliente } from "../clientes/_actions-crm-helpers";
import { revalidatePath } from "next/cache";

// ============================================================
// POST-VENTA
// ============================================================

export async function crearSolicitudPostVenta(data: {
  ventaId: string;
  entregaId?: string;
  clienteId: string;
  loteId?: string;
  tipo: string;
  prioridad?: string;
  asunto: string;
  descripcion?: string;
  notas?: string;
}) {
  await requierePermiso(PERMISOS.VENTAS.CREAR, {
    accion: 'crear_solicitud_postventa',
    recurso_tipo: 'solicitud_postventa',
  });

  const supabase = await createServerActionClient();

  try {
    const { data: solicitud, error } = await supabase
      .from('solicitud_postventa')
      .insert({
        venta_id: data.ventaId,
        entrega_id: data.entregaId,
        cliente_id: data.clienteId,
        lote_id: data.loteId,
        tipo: data.tipo,
        prioridad: data.prioridad || 'media',
        estado: 'registrada',
        asunto: data.asunto,
        descripcion: data.descripcion,
        notas: data.notas,
      })
      .select()
      .single();

    if (error) throw error;

    revalidarCliente(data.clienteId);
    revalidatePath('/dashboard/postventa');
    return { success: true, data: solicitud };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function actualizarSolicitudPostVenta(
  solicitudId: string,
  data: {
    estado?: string;
    asignadoA?: string;
    prioridad?: string;
    comentarioResolucion?: string;
    comentarioCierre?: string;
    calificacionCliente?: number;
    comentarioCalificacion?: string;
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
    if (data.asignadoA !== undefined) {
      updatePayload.asignado_a = data.asignadoA;
      updatePayload.fecha_asignacion = new Date().toISOString();
      if (!data.estado) updatePayload.estado = 'asignada';
    }
    if (data.prioridad) updatePayload.prioridad = data.prioridad;
    if (data.comentarioResolucion !== undefined) {
      updatePayload.comentario_resolucion = data.comentarioResolucion;
      updatePayload.fecha_resolucion = new Date().toISOString();
    }
    if (data.comentarioCierre !== undefined) {
      updatePayload.comentario_cierre = data.comentarioCierre;
      updatePayload.fecha_cierre = new Date().toISOString();
    }
    if (data.calificacionCliente) updatePayload.calificacion_cliente = data.calificacionCliente;
    if (data.comentarioCalificacion !== undefined) updatePayload.comentario_calificacion = data.comentarioCalificacion;
    if (data.notas !== undefined) updatePayload.notas = data.notas;

    const { data: solicitud, error } = await supabase
      .from('solicitud_postventa')
      .update(updatePayload)
      .eq('id', solicitudId)
      .select()
      .single();

    if (error) throw error;

    revalidarCliente(data.clienteId);
    revalidatePath('/dashboard/postventa');
    return { success: true, data: solicitud };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function obtenerSolicitudesPostVentaCliente(clienteId: string) {
  const supabase = await createServerActionClient();

  try {
    const { data, error } = await supabase
      .from('solicitud_postventa')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function obtenerSolicitudesPostVenta(filtros?: {
  estado?: string;
  tipo?: string;
  prioridad?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = await createServerActionClient();

  try {
    let query = supabase
      .from('solicitud_postventa')
      .select('*, cliente:cliente!cliente_id(nombre), venta:venta!venta_id(codigo_venta)');

    if (filtros?.estado) query = query.eq('estado', filtros.estado);
    if (filtros?.tipo) query = query.eq('tipo', filtros.tipo);
    if (filtros?.prioridad) query = query.eq('prioridad', filtros.prioridad);

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
