"use server";

import { createServerActionClient } from "@/lib/supabase.server-actions";
import { PERMISOS } from "@/lib/permissions";
import { requierePermiso } from "@/lib/permissions/server";
import { obtenerUsernameActual, revalidarCliente } from "./_actions-crm-helpers";

// ============================================================
// CALIFICACIÓN BANCARIA
// ============================================================

export async function crearCalificacionBancaria(data: {
  reservaId?: string;
  clienteId: string;
  loteId?: string;
  banco?: string;
  ejecutivoBancario?: string;
  telefonoEjecutivo?: string;
  emailEjecutivo?: string;
  montoSolicitado?: number;
  moneda?: string;
  notas?: string;
}) {
  await requierePermiso(PERMISOS.VENTAS.CREAR, {
    accion: 'crear_calificacion_bancaria',
    recurso_tipo: 'calificacion_bancaria',
  });

  const supabase = await createServerActionClient();

  try {
    const authResult = await obtenerUsernameActual(supabase);
    if (!authResult.success) return authResult;

    const { data: calificacion, error } = await supabase
      .from('calificacion_bancaria')
      .insert({
        reserva_id: data.reservaId,
        cliente_id: data.clienteId,
        lote_id: data.loteId,
        vendedor_username: authResult.username,
        estado: 'pendiente',
        banco: data.banco,
        ejecutivo_bancario: data.ejecutivoBancario,
        telefono_ejecutivo: data.telefonoEjecutivo,
        email_ejecutivo: data.emailEjecutivo,
        monto_solicitado: data.montoSolicitado,
        moneda: data.moneda || 'PEN',
        fecha_solicitud: new Date().toISOString(),
        notas: data.notas,
      })
      .select()
      .single();

    if (error) throw error;

    revalidarCliente(data.clienteId);
    return { success: true, data: calificacion };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function actualizarCalificacionBancaria(
  calificacionId: string,
  data: {
    estado?: string;
    banco?: string;
    ejecutivoBancario?: string;
    telefonoEjecutivo?: string;
    emailEjecutivo?: string;
    montoSolicitado?: number;
    montoAprobado?: number;
    tasaInteres?: number;
    plazoMeses?: number;
    motivoRechazo?: string;
    observaciones?: string;
    notas?: string;
    clienteId: string;
  }
) {
  await requierePermiso(PERMISOS.VENTAS.MODIFICAR, {
    accion: 'actualizar_calificacion_bancaria',
    recurso_tipo: 'calificacion_bancaria',
  });

  const supabase = await createServerActionClient();

  try {
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (data.estado) updatePayload.estado = data.estado;
    if (data.banco !== undefined) updatePayload.banco = data.banco;
    if (data.ejecutivoBancario !== undefined) updatePayload.ejecutivo_bancario = data.ejecutivoBancario;
    if (data.telefonoEjecutivo !== undefined) updatePayload.telefono_ejecutivo = data.telefonoEjecutivo;
    if (data.emailEjecutivo !== undefined) updatePayload.email_ejecutivo = data.emailEjecutivo;
    if (data.montoSolicitado !== undefined) updatePayload.monto_solicitado = data.montoSolicitado;
    if (data.montoAprobado !== undefined) updatePayload.monto_aprobado = data.montoAprobado;
    if (data.tasaInteres !== undefined) updatePayload.tasa_interes = data.tasaInteres;
    if (data.plazoMeses !== undefined) updatePayload.plazo_meses = data.plazoMeses;
    if (data.motivoRechazo !== undefined) updatePayload.motivo_rechazo = data.motivoRechazo;
    if (data.observaciones !== undefined) updatePayload.observaciones = data.observaciones;
    if (data.notas !== undefined) updatePayload.notas = data.notas;

    if (data.estado === 'aprobada' || data.estado === 'rechazada') {
      updatePayload.fecha_respuesta = new Date().toISOString();
    }

    const { data: calificacion, error } = await supabase
      .from('calificacion_bancaria')
      .update(updatePayload)
      .eq('id', calificacionId)
      .select()
      .single();

    if (error) throw error;

    revalidarCliente(data.clienteId);
    return { success: true, data: calificacion };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function obtenerCalificacionesCliente(clienteId: string) {
  const supabase = await createServerActionClient();

  try {
    const { data, error } = await supabase
      .from('calificacion_bancaria')
      .select('*, documentos:calificacion_documento(*)')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function agregarDocumentoCalificacion(data: {
  calificacionId: string;
  tipoDocumento: string;
  nombre: string;
  url?: string;
  clienteId: string;
}) {
  const supabase = await createServerActionClient();

  try {
    const { data: doc, error } = await supabase
      .from('calificacion_documento')
      .insert({
        calificacion_id: data.calificacionId,
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

export async function actualizarDocumentoCalificacion(
  documentoId: string,
  data: { estado?: string; url?: string; notas?: string; clienteId: string }
) {
  const supabase = await createServerActionClient();

  try {
    const updatePayload: Record<string, unknown> = {};
    if (data.estado) updatePayload.estado = data.estado;
    if (data.url) updatePayload.url = data.url;
    if (data.notas !== undefined) updatePayload.notas = data.notas;

    const { error } = await supabase
      .from('calificacion_documento')
      .update(updatePayload)
      .eq('id', documentoId);

    if (error) throw error;

    revalidarCliente(data.clienteId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
