"use server";

import { createServerActionClient } from "@/lib/supabase.server-actions";
import { PERMISOS } from "@/lib/permissions";
import { requierePermiso } from "@/lib/permissions/server";
import { revalidarCliente } from "../clientes/_actions-crm-helpers";
import { revalidatePath } from "next/cache";

// ============================================================
// INDEPENDIZACIÓN
// ============================================================

export async function crearIndependizacion(data: {
  ventaId: string;
  loteId: string;
  clienteId: string;
  contratoId?: string;
  notaria?: string;
  partidaRegistralMatriz?: string;
  notas?: string;
}) {
  await requierePermiso(PERMISOS.VENTAS.CREAR, {
    accion: 'crear_independizacion',
    recurso_tipo: 'independizacion',
  });

  const supabase = await createServerActionClient();

  try {
    const { data: independizacion, error } = await supabase
      .from('independizacion')
      .insert({
        venta_id: data.ventaId,
        lote_id: data.loteId,
        cliente_id: data.clienteId,
        contrato_id: data.contratoId,
        estado: 'pendiente',
        notaria: data.notaria,
        partida_registral_matriz: data.partidaRegistralMatriz,
        notas: data.notas,
      })
      .select()
      .single();

    if (error) throw error;

    revalidarCliente(data.clienteId);
    revalidatePath('/dashboard/independizacion');
    return { success: true, data: independizacion };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function actualizarIndependizacion(
  independizacionId: string,
  data: {
    estado?: string;
    notaria?: string;
    partidaRegistralMatriz?: string;
    partidaRegistralIndependizada?: string;
    numeroTitulo?: string;
    zonaRegistral?: string;
    fechaInicioTramite?: string;
    fechaPresentacionSunarp?: string;
    fechaInscripcion?: string;
    observacionSunarp?: string;
    fechaSubsanacion?: string;
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
    if (data.notaria !== undefined) updatePayload.notaria = data.notaria;
    if (data.partidaRegistralMatriz !== undefined) updatePayload.partida_registral_matriz = data.partidaRegistralMatriz;
    if (data.partidaRegistralIndependizada !== undefined) updatePayload.partida_registral_independizada = data.partidaRegistralIndependizada;
    if (data.numeroTitulo !== undefined) updatePayload.numero_titulo = data.numeroTitulo;
    if (data.zonaRegistral !== undefined) updatePayload.zona_registral = data.zonaRegistral;
    if (data.fechaInicioTramite !== undefined) updatePayload.fecha_inicio_tramite = data.fechaInicioTramite;
    if (data.fechaPresentacionSunarp !== undefined) updatePayload.fecha_presentacion_sunarp = data.fechaPresentacionSunarp;
    if (data.fechaInscripcion !== undefined) updatePayload.fecha_inscripcion = data.fechaInscripcion;
    if (data.observacionSunarp !== undefined) updatePayload.observacion_sunarp = data.observacionSunarp;
    if (data.fechaSubsanacion !== undefined) updatePayload.fecha_subsanacion = data.fechaSubsanacion;
    if (data.notas !== undefined) updatePayload.notas = data.notas;

    const { data: independizacion, error } = await supabase
      .from('independizacion')
      .update(updatePayload)
      .eq('id', independizacionId)
      .select()
      .single();

    if (error) throw error;

    revalidarCliente(data.clienteId);
    revalidatePath('/dashboard/independizacion');
    return { success: true, data: independizacion };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function obtenerIndependizacionesCliente(clienteId: string) {
  const supabase = await createServerActionClient();

  try {
    const { data, error } = await supabase
      .from('independizacion')
      .select('*, documentos:independizacion_documento(*)')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function obtenerIndependizaciones(filtros?: {
  estado?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = await createServerActionClient();

  try {
    let query = supabase
      .from('independizacion')
      .select('*, cliente:cliente!cliente_id(nombre), lote:lote!lote_id(codigo)');

    if (filtros?.estado) query = query.eq('estado', filtros.estado);

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

export async function agregarDocumentoIndependizacion(data: {
  independizacionId: string;
  tipoDocumento: string;
  nombre: string;
  url?: string;
  clienteId: string;
}) {
  const supabase = await createServerActionClient();

  try {
    const { data: doc, error } = await supabase
      .from('independizacion_documento')
      .insert({
        independizacion_id: data.independizacionId,
        tipo_documento: data.tipoDocumento,
        nombre: data.nombre,
        url: data.url,
        estado: data.url ? 'cargado' : 'pendiente',
      })
      .select()
      .single();

    if (error) throw error;

    revalidarCliente(data.clienteId);
    return { success: true, data: doc };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
