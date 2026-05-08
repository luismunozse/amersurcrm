"use server";

/**
 * Server actions para propiedades de interes, visitas y reservas de clientes.
 *
 * Convencion de errores: estas acciones retornan { success: boolean, error?: string, data?: T }.
 * Los consumidores verifican result.success antes de continuar.
 */

import { createServerActionClient } from "@/lib/supabase.server-actions";
import { revalidatePath } from "next/cache";
import { PERMISOS } from "@/lib/permissions";
import { requierePermiso, esAdmin } from "@/lib/permissions/server";
import type { EstadoEvento } from "@/lib/types/agenda";

import {
  obtenerUsernameActual,
  validarMonto,
  validarFechaFutura,
  crearEventoAgenda,
  revalidarCliente,
} from "./_actions-crm-helpers";

// ============================================================
// PROPIEDADES DE INTERES
// ============================================================

export async function agregarPropiedadInteres(data: {
  clienteId: string;
  loteId?: string;
  propiedadId?: string;
  proyectoId?: string;
  prioridad?: 1 | 2 | 3;
  notas?: string;
}) {
  const supabase = await createServerActionClient();

  try {
    // Obtener username usando helper
    const authResult = await obtenerUsernameActual(supabase);
    if (!authResult.success) {
      return authResult;
    }

    const { error } = await supabase
      .schema('crm')
      .from('cliente_propiedad_interes')
      .insert({
        cliente_id: data.clienteId,
        lote_id: data.loteId || null,
        propiedad_id: data.propiedadId || null,
        proyecto_id: data.proyectoId || null,
        prioridad: data.prioridad || 2,
        notas: data.notas,
        agregado_por: authResult.username,
      });

    if (error) throw error;

    revalidarCliente(data.clienteId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function actualizarPropiedadInteres(data: {
  interesId: string;
  prioridad?: 1 | 2 | 3;
  notas?: string | null;
  loteId?: string | null;
  propiedadId?: string | null;
}) {
  const supabase = await createServerActionClient();

  try {
    const updateData: Record<string, any> = {};

    if (data.prioridad !== undefined) updateData.prioridad = data.prioridad;
    if (data.notas !== undefined) updateData.notas = data.notas;
    if (data.loteId !== undefined) updateData.lote_id = data.loteId;
    if (data.propiedadId !== undefined) updateData.propiedad_id = data.propiedadId;

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: 'No hay cambios para actualizar' };
    }

    const { data: updated, error } = await supabase
      .schema('crm')
      .from('cliente_propiedad_interes')
      .update(updateData)
      .eq('id', data.interesId)
      .select('cliente_id')
      .single();

    if (error) throw error;

    revalidarCliente(updated?.cliente_id);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function eliminarPropiedadInteres(interesId: string) {
  const supabase = await createServerActionClient();

  try {
    const { data: registro } = await supabase
      .schema('crm')
      .from('cliente_propiedad_interes')
      .select('cliente_id')
      .eq('id', interesId)
      .single();

    const { error } = await supabase
      .schema('crm')
      .from('cliente_propiedad_interes')
      .delete()
      .eq('id', interesId);

    if (error) throw error;

    revalidarCliente(registro?.cliente_id);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================
// VISITAS A PROPIEDADES
// ============================================================

export async function registrarVisita(data: {
  clienteId: string;
  loteId?: string;
  propiedadId?: string;
  fechaVisita?: string;
  duracionMinutos?: number;
  feedback?: string;
  nivelInteres?: 1 | 2 | 3 | 4 | 5;
}) {
  const supabase = await createServerActionClient();

  try {
    // Obtener username usando helper
    const authResult = await obtenerUsernameActual(supabase);
    if (!authResult.success) {
      return authResult;
    }

    const fechaVisita = data.fechaVisita ? new Date(data.fechaVisita).toISOString() : new Date().toISOString();
    const { error } = await supabase
      .from('visita_propiedad')
      .insert({
        cliente_id: data.clienteId,
        lote_id: data.loteId,
        propiedad_id: data.propiedadId,
        vendedor_username: authResult.username,
        fecha_visita: fechaVisita,
        duracion_minutos: data.duracionMinutos,
        feedback: data.feedback,
        nivel_interes: data.nivelInteres,
      });

    if (error) throw error;

    const estadoEvento: EstadoEvento = new Date(fechaVisita) < new Date() ? 'completado' : 'pendiente';
    const creado = await crearEventoAgenda(supabase, authResult.userId, {
      titulo: 'Visita con cliente',
      tipo: 'visita',
      fechaInicio: fechaVisita,
      duracionMinutos: data.duracionMinutos ?? 60,
      prioridad: 'alta',
      clienteId: data.clienteId,
      propiedadId: data.propiedadId,
      descripcion: data.feedback,
      notas: data.feedback,
      estado: estadoEvento,
    });

    if (creado) {
      revalidatePath('/dashboard/agenda');
    }
    revalidarCliente(data.clienteId);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================
// RESERVAS
// ============================================================

export async function crearReserva(data: {
  clienteId: string;
  loteId?: string;
  propiedadId?: string;
  montoReserva: number;
  moneda?: 'PEN' | 'USD';
  fechaVencimiento: string;
  metodoPago?: string;
  comprobanteUrl?: string;
  notas?: string;
  tipoSeparacion?: 'separacion_simple' | 'arras_confirmatorias' | 'arras_retractacion';
  porcentajeAplicado?: number;
  precioReferencia?: number;
}) {
  await requierePermiso(PERMISOS.RESERVAS.CREAR, {
    accion: 'crear_reserva',
    recurso_tipo: 'reserva',
  });

  const supabase = await createServerActionClient();

  try {
    // Obtener username usando helper
    const authResult = await obtenerUsernameActual(supabase);
    if (!authResult.success) {
      return authResult;
    }

    if (!data.loteId && !data.propiedadId) {
      return { success: false, error: 'Debes seleccionar un lote o una propiedad para crear la separación' };
    }

    // Validar monto de reserva
    const validacionMonto = validarMonto(data.montoReserva, 'Monto de separación');
    if (!validacionMonto.valid) {
      return { success: false, error: validacionMonto.error };
    }

    // Validar fecha de vencimiento
    const validacionFecha = validarFechaFutura(data.fechaVencimiento, 'Fecha de vencimiento');
    if (!validacionFecha.valid) {
      return { success: false, error: validacionFecha.error };
    }

    const fechaVencimientoISO = new Date(data.fechaVencimiento).toISOString();

    // Validar que no exista reserva activa para este lote
    if (data.loteId) {
      const { data: reservaExistente } = await supabase
        .schema('crm')
        .from('reserva')
        .select('id, codigo_reserva')
        .eq('lote_id', data.loteId)
        .in('estado', ['activa', 'pendiente'])
        .maybeSingle();

      if (reservaExistente) {
        return {
          success: false,
          error: `Este lote ya tiene una separación activa (${reservaExistente.codigo_reserva})`
        };
      }

      // Reservar el lote usando RPC (valida estado y hace la transicion de forma segura)
      const { error: rpcError } = await supabase.rpc('reservar_lote', {
        p_lote: data.loteId
      });

      if (rpcError) {
        return {
          success: false,
          error: `No se pudo reservar el lote: ${rpcError.message}`
        };
      }
    }

    // Crear reserva
    const { data: reserva, error } = await supabase
      .schema('crm')
      .from('reserva')
      .insert({
        cliente_id: data.clienteId,
        lote_id: data.loteId,
        propiedad_id: data.propiedadId,
        vendedor_username: authResult.username,
        monto_reserva: data.montoReserva,
        moneda: data.moneda || 'PEN',
        fecha_vencimiento: fechaVencimientoISO,
        metodo_pago: data.metodoPago,
        comprobante_url: data.comprobanteUrl,
        notas: data.notas,
        estado: 'activa',
        tipo_separacion: data.tipoSeparacion || 'separacion_simple',
        porcentaje_aplicado: data.porcentajeAplicado,
        precio_referencia: data.precioReferencia,
      })
      .select()
      .single();

    if (error) {
      // Si falla la creacion de la reserva, liberar el lote
      if (data.loteId) {
        await supabase.rpc('liberar_lote', { p_lote: data.loteId });
      }
      throw error;
    }

    const fechaReserva = reserva?.fecha_reserva || reserva?.created_at || new Date().toISOString();
    const tituloReserva = reserva?.codigo_reserva ? `Reserva ${reserva.codigo_reserva}` : 'Reserva registrada';
    const eventoReserva = await crearEventoAgenda(supabase, authResult.userId, {
      titulo: tituloReserva,
      tipo: 'tarea',
      fechaInicio: fechaReserva,
      duracionMinutos: 30,
      prioridad: 'alta',
      clienteId: data.clienteId,
      propiedadId: data.propiedadId,
      descripcion: data.notas || 'Reserva creada desde el modulo de clientes',
      notas: data.notas,
      estado: 'completado',
    });

    if (eventoReserva) {
      revalidatePath('/dashboard/agenda');
    }

    // Auto-crear proceso de adquisición
    if (reserva && data.loteId) {
      try {
        // Obtener proyecto_id del lote
        const { data: loteData } = await supabase
          .from('lote')
          .select('proyecto_id')
          .eq('id', data.loteId)
          .single();

        if (loteData?.proyecto_id) {
          await supabase.rpc('crear_proceso_desde_plantilla', {
            p_cliente_id: data.clienteId,
            p_lote_id: data.loteId,
            p_reserva_id: reserva.id,
            p_vendedor_username: authResult.username,
            p_proyecto_id: loteData.proyecto_id,
          });
        }
      } catch (procesoError) {
        console.warn('No se pudo crear proceso de adquisición automáticamente:', procesoError);
      }
    }

    revalidarCliente(data.clienteId);
    revalidatePath('/dashboard/proyectos');
    revalidatePath('/dashboard/adquisicion');

    return { success: true, data: reserva };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function cancelarReserva(reservaId: string, motivo: string) {
  await requierePermiso(PERMISOS.RESERVAS.CANCELAR, {
    accion: 'cancelar_reserva',
    recurso_tipo: 'reserva',
  });

  const supabase = await createServerActionClient();

  try {
    // Obtener datos de la reserva antes de cancelar
    const { data: reserva } = await supabase
      .schema('crm')
      .from('reserva')
      .select('lote_id, estado, cliente_id')
      .eq('id', reservaId)
      .single();

    if (!reserva) {
      return { success: false, error: 'Separación no encontrada' };
    }

    // Validar que la reserva este en un estado cancelable
    if (reserva.estado === 'cancelada') {
      return { success: false, error: 'Esta separación ya esta cancelada' };
    }

    if (reserva.estado === 'convertida_venta') {
      return { success: false, error: 'No se puede cancelar una separación que ya fue convertida en venta' };
    }

    const { error } = await supabase
      .schema('crm')
      .from('reserva')
      .update({
        estado: 'cancelada',
        motivo_cancelacion: motivo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reservaId);

    if (error) throw error;

    // Cancelar proceso de adquisición asociado (si existe activo) para
    // mantener consistencia: una reserva cancelada no puede tener proceso vivo.
    const { error: procError } = await supabase
      .schema('crm')
      .from('proceso_adquisicion')
      .update({ estado: 'cancelado', fecha_cierre: new Date().toISOString().slice(0, 10) })
      .eq('reserva_id', reservaId)
      .eq('estado', 'activo');

    if (procError) {
      console.warn(`Error cancelando proceso asociado a reserva ${reservaId}:`, procError);
    }

    if (reserva.lote_id) {
      const { error: rpcError } = await supabase.rpc('liberar_lote', {
        p_lote: reserva.lote_id
      });

      if (rpcError) {
        console.warn(`Error liberando lote ${reserva.lote_id}:`, rpcError);
      }
    }

    revalidarCliente(reserva.cliente_id);
    revalidatePath('/dashboard/proyectos');

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function eliminarReserva(reservaId: string) {
  const supabase = await createServerActionClient();

  try {
    if (!(await esAdmin())) {
      return { success: false, error: "Solo un administrador puede eliminar separaciones" };
    }

    const { data: reserva } = await supabase
      .schema('crm')
      .from('reserva')
      .select('lote_id, estado, cliente_id, codigo_reserva')
      .eq('id', reservaId)
      .single();

    if (!reserva) {
      return { success: false, error: 'Separación no encontrada' };
    }

    if (reserva.estado === 'activa' && reserva.lote_id) {
      const { error: rpcError } = await supabase.rpc('liberar_lote', {
        p_lote: reserva.lote_id
      });

      if (rpcError) {
        console.warn(`Error liberando lote ${reserva.lote_id}:`, rpcError);
      }
    }

    // Borrar el proceso de adquisición asociado antes que la reserva,
    // para evitar quedarnos con un proceso huérfano (FK SET NULL deja
    // el proceso sin reserva pero visible en el tab Procesos).
    const { error: procError } = await supabase
      .schema('crm')
      .from('proceso_adquisicion')
      .delete()
      .eq('reserva_id', reservaId);

    if (procError) {
      console.warn(`Error eliminando proceso asociado a reserva ${reservaId}:`, procError);
    }

    const { data: deleted, error } = await supabase
      .schema('crm')
      .from('reserva')
      .delete()
      .eq('id', reservaId)
      .select('id');

    if (error) throw error;
    if (!deleted || deleted.length === 0) {
      return {
        success: false,
        error: 'No se eliminó la separación. Verifique policy DELETE en crm.reserva.',
      };
    }

    revalidarCliente(reserva.cliente_id);
    revalidatePath('/dashboard/proyectos');

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
