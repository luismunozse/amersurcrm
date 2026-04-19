"use server";

import { createServerActionClient } from "@/lib/supabase.server-actions";
import { PERMISOS } from "@/lib/permissions";
import { requierePermiso } from "@/lib/permissions/server";
import { obtenerUsernameActual, revalidarCliente } from "./_actions-crm-helpers";

// ============================================================
// CONTRATO / MINUTA
// ============================================================

export async function crearContrato(data: {
  ventaId: string;
  calificacionId?: string;
  clienteId: string;
  loteId?: string;
  notaria?: string;
  notario?: string;
  notas?: string;
}) {
  await requierePermiso(PERMISOS.VENTAS.CREAR, {
    accion: 'crear_contrato',
    recurso_tipo: 'contrato',
    lanzarError: false,
  });

  const supabase = await createServerActionClient();

  try {
    const authResult = await obtenerUsernameActual(supabase);
    if (!authResult.success) return authResult;

    const { data: contrato, error } = await supabase
      .from('contrato')
      .insert({
        venta_id: data.ventaId,
        calificacion_id: data.calificacionId,
        cliente_id: data.clienteId,
        lote_id: data.loteId,
        estado: 'borrador',
        notaria: data.notaria,
        notario: data.notario,
        vendedor_username: authResult.username,
        notas: data.notas,
      })
      .select()
      .single();

    if (error) throw error;

    revalidarCliente(data.clienteId);
    return { success: true, data: contrato };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function actualizarContrato(
  contratoId: string,
  data: {
    estado?: string;
    notaria?: string;
    notario?: string;
    numeroEscritura?: string;
    partidaRegistral?: string;
    numeroTitulo?: string;
    zonaRegistral?: string;
    fechaFirma?: string;
    fechaEscritura?: string;
    fechaInscripcionSunarp?: string;
    contratoUrl?: string;
    escrituraUrl?: string;
    constanciaSunarpUrl?: string;
    notas?: string;
    clienteId: string;
  }
) {
  await requierePermiso(PERMISOS.VENTAS.MODIFICAR, {
    accion: 'actualizar_contrato',
    recurso_tipo: 'contrato',
  });

  const supabase = await createServerActionClient();

  try {
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (data.estado) updatePayload.estado = data.estado;
    if (data.notaria !== undefined) updatePayload.notaria = data.notaria;
    if (data.notario !== undefined) updatePayload.notario = data.notario;
    if (data.numeroEscritura !== undefined) updatePayload.numero_escritura = data.numeroEscritura;
    if (data.partidaRegistral !== undefined) updatePayload.partida_registral = data.partidaRegistral;
    if (data.numeroTitulo !== undefined) updatePayload.numero_titulo = data.numeroTitulo;
    if (data.zonaRegistral !== undefined) updatePayload.zona_registral = data.zonaRegistral;
    if (data.fechaFirma !== undefined) updatePayload.fecha_firma = data.fechaFirma;
    if (data.fechaEscritura !== undefined) updatePayload.fecha_escritura = data.fechaEscritura;
    if (data.fechaInscripcionSunarp !== undefined) updatePayload.fecha_inscripcion_sunarp = data.fechaInscripcionSunarp;
    if (data.contratoUrl !== undefined) updatePayload.contrato_url = data.contratoUrl;
    if (data.escrituraUrl !== undefined) updatePayload.escritura_url = data.escrituraUrl;
    if (data.constanciaSunarpUrl !== undefined) updatePayload.constancia_sunarp_url = data.constanciaSunarpUrl;
    if (data.notas !== undefined) updatePayload.notas = data.notas;

    const { data: contrato, error } = await supabase
      .from('contrato')
      .update(updatePayload)
      .eq('id', contratoId)
      .select()
      .single();

    if (error) throw error;

    revalidarCliente(data.clienteId);
    return { success: true, data: contrato };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function obtenerContratosCliente(clienteId: string) {
  const supabase = await createServerActionClient();

  try {
    const { data, error } = await supabase
      .from('contrato')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
