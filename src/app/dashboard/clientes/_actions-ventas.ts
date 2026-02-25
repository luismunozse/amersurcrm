"use server";

/**
 * Server actions para ventas, pagos y timeline de clientes.
 *
 * Convencion de errores: estas acciones retornan { success: boolean, error?: string, data?: T }.
 * Los consumidores verifican result.success antes de continuar.
 */

import { createServerActionClient } from "@/lib/supabase.server-actions";
import { revalidatePath } from "next/cache";
import { PERMISOS } from "@/lib/permissions";
import { requierePermiso } from "@/lib/permissions/server";

import {
  obtenerUsernameActual,
  validarMonto,
  revalidarCliente,
} from "./_actions-crm-helpers";

// ============================================================
// VENTAS
// ============================================================

export async function convertirReservaEnVenta(data: {
  reservaId: string;
  precioTotal: number;
  moneda?: 'PEN' | 'USD';
  formaPago: 'contado' | 'financiado' | 'credito_bancario' | 'mixto';
  montoInicial?: number;
  numeroCuotas?: number;
  fechaEntrega?: string;
  contratoUrl?: string;
  comisionVendedor?: number;
  notas?: string;
}) {
  await requierePermiso(PERMISOS.VENTAS.CREAR, {
    accion: 'convertir_reserva_en_venta',
    recurso_tipo: 'venta',
  });

  const supabase = await createServerActionClient();

  try {
    // Obtener username usando helper
    const authResult = await obtenerUsernameActual(supabase);
    if (!authResult.success) {
      return authResult;
    }

    // Validar precio total
    const validacionPrecio = validarMonto(data.precioTotal, 'Precio total');
    if (!validacionPrecio.valid) {
      return { success: false, error: validacionPrecio.error };
    }

    // Validar monto inicial si se proporciona
    if (data.montoInicial !== undefined && data.montoInicial !== null) {
      const validacionInicial = validarMonto(data.montoInicial, 'Monto inicial');
      if (!validacionInicial.valid) {
        return { success: false, error: validacionInicial.error };
      }

      if (data.montoInicial > data.precioTotal) {
        return { success: false, error: 'El monto inicial no puede ser mayor al precio total' };
      }
    }

    // Obtener datos de la reserva
    const { data: reserva } = await supabase
      .from('reserva')
      .select('*')
      .eq('id', data.reservaId)
      .single();

    if (!reserva) {
      return { success: false, error: 'Reserva no encontrada' };
    }

    // Validar que la reserva este en estado activo
    if (reserva.estado !== 'activa') {
      return {
        success: false,
        error: `No se puede convertir una reserva con estado "${reserva.estado}". Solo se permiten reservas activas.`
      };
    }

    // Calcular saldo pendiente
    const saldoPendiente = data.precioTotal - (data.montoInicial || 0);

    // Vender el lote usando RPC (valida estado y hace la transicion de forma segura)
    if (reserva.lote_id) {
      const { error: rpcError } = await supabase.rpc('vender_lote', {
        p_lote: reserva.lote_id
      });

      if (rpcError) {
        return {
          success: false,
          error: `No se pudo marcar el lote como vendido: ${rpcError.message}`
        };
      }
    }

    // Crear venta
    const { data: venta, error: ventaError } = await supabase
      .from('venta')
      .insert({
        reserva_id: data.reservaId,
        cliente_id: reserva.cliente_id,
        lote_id: reserva.lote_id,
        propiedad_id: reserva.propiedad_id,
        vendedor_username: authResult.username,
        precio_total: data.precioTotal,
        moneda: data.moneda || reserva.moneda,
        forma_pago: data.formaPago,
        monto_inicial: data.montoInicial,
        saldo_pendiente: saldoPendiente,
        numero_cuotas: data.numeroCuotas,
        fecha_entrega: data.fechaEntrega,
        contrato_url: data.contratoUrl,
        comision_vendedor: data.comisionVendedor,
        notas: data.notas,
        estado: 'en_proceso',
      })
      .select()
      .single();

    if (ventaError) {
      // Si falla la creacion de la venta, revertir el lote a reservado (no liberarlo)
      if (reserva.lote_id) {
        try {
          await supabase.rpc('reservar_lote', { p_lote: reserva.lote_id });
        } catch (revertError) {
          console.error('Error revirtiendo lote a reservado:', revertError);
        }
      }
      throw ventaError;
    }

    // Actualizar reserva a convertida
    const { error: reservaUpdateError } = await supabase
      .from('reserva')
      .update({
        estado: 'convertida_venta',
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.reservaId);

    if (reservaUpdateError) {
      console.error('Error actualizando estado de reserva a convertida_venta:', reservaUpdateError);
      // La venta ya se creo, pero la reserva no se marco como convertida
      // No hacemos rollback de la venta porque ya existe - solo logueamos el error
    }

    // Si hay monto inicial, registrar como primer pago
    if (data.montoInicial && data.montoInicial > 0) {
      const { error: pagoError } = await supabase
        .from('pago')
        .insert({
          venta_id: venta.id,
          numero_cuota: 1,
          monto: data.montoInicial,
          moneda: data.moneda || reserva.moneda,
          metodo_pago: 'inicial',
          registrado_por: authResult.username,
          notas: 'Pago inicial de la venta',
        });

      if (pagoError) {
        console.error('Error registrando pago inicial:', pagoError);
      }
    }

    revalidarCliente(reserva.cliente_id);
    revalidatePath('/dashboard/proyectos');
    revalidatePath('/dashboard/ventas');

    return { success: true, data: venta };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function registrarPago(data: {
  ventaId: string;
  numeroCuota?: number;
  monto: number;
  moneda?: 'PEN' | 'USD';
  fechaPago?: string;
  fechaVencimiento?: string;
  metodoPago: 'efectivo' | 'transferencia' | 'tarjeta' | 'cheque' | 'deposito';
  numeroOperacion?: string;
  banco?: string;
  comprobanteUrl?: string;
  notas?: string;
}) {
  await requierePermiso(PERMISOS.PAGOS.REGISTRAR, {
    accion: 'registrar_pago',
    recurso_tipo: 'pago',
  });

  const supabase = await createServerActionClient();

  try {
    // Obtener username usando helper
    const authResult = await obtenerUsernameActual(supabase);
    if (!authResult.success) {
      return authResult;
    }

    // Validar monto del pago
    const validacionMonto = validarMonto(data.monto, 'Monto del pago');
    if (!validacionMonto.valid) {
      return { success: false, error: validacionMonto.error };
    }

    // Obtener datos de la venta para actualizar el saldo pendiente
    const { data: venta, error: ventaError } = await supabase
      .from('venta')
      .select('saldo_pendiente, cliente_id')
      .eq('id', data.ventaId)
      .single();

    if (ventaError || !venta) {
      return { success: false, error: 'Venta no encontrada' };
    }

    // Validar que el monto del pago no exceda el saldo pendiente
    if (data.monto > venta.saldo_pendiente) {
      return {
        success: false,
        error: `El monto del pago (${data.monto}) no puede ser mayor al saldo pendiente (${venta.saldo_pendiente})`
      };
    }

    // Insertar el pago
    const { data: pago, error } = await supabase
      .from('pago')
      .insert({
        venta_id: data.ventaId,
        numero_cuota: data.numeroCuota,
        monto: data.monto,
        moneda: data.moneda || 'PEN',
        fecha_pago: data.fechaPago || new Date().toISOString(),
        fecha_vencimiento: data.fechaVencimiento,
        metodo_pago: data.metodoPago,
        numero_operacion: data.numeroOperacion,
        banco: data.banco,
        comprobante_url: data.comprobanteUrl,
        registrado_por: authResult.username,
        notas: data.notas,
      })
      .select()
      .single();

    if (error) throw error;

    // CRITICAL: Actualizar el saldo pendiente de la venta
    const nuevoSaldo = Math.max(0, venta.saldo_pendiente - data.monto);
    const nuevoEstado = nuevoSaldo === 0 ? 'finalizada' : undefined;
    const updatePayload: Record<string, unknown> = {
      saldo_pendiente: nuevoSaldo,
      updated_at: new Date().toISOString(),
    };
    if (nuevoEstado) {
      updatePayload.estado = nuevoEstado;
    }

    const { error: updateError } = await supabase
      .from('venta')
      .update(updatePayload)
      .eq('id', data.ventaId);

    if (updateError) {
      console.error('Error actualizando saldo pendiente:', updateError);
      // El pago se registro pero el saldo no se actualizo - advertir al usuario
      return {
        success: true,
        data: pago,
        warning: 'El pago se registro pero hubo un error actualizando el saldo pendiente. Contacte al administrador.',
      };
    }

    revalidarCliente(venta.cliente_id);
    revalidatePath('/dashboard/ventas');

    return { success: true, data: pago };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function anularVenta(ventaId: string, motivo: string) {
  const supabase = await createServerActionClient();

  try {
    await requierePermiso(PERMISOS.VENTAS.ANULAR);

    const { data: venta } = await supabase
      .from('venta')
      .select('id, estado, cliente_id, lote_id')
      .eq('id', ventaId)
      .single();

    if (!venta) {
      return { success: false, error: 'Venta no encontrada' };
    }

    if (venta.estado === 'cancelada') {
      return { success: false, error: 'Esta venta ya fue anulada previamente' };
    }

    const { error } = await supabase
      .from('venta')
      .update({
        estado: 'cancelada',
        motivo_cancelacion: motivo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ventaId);

    if (error) {
      throw error;
    }

    if (venta.lote_id) {
      try {
        await supabase.rpc('liberar_lote', { p_lote: venta.lote_id });
      } catch (rpcError) {
        console.warn('No se pudo liberar lote asociado a la venta anulada:', rpcError);
      }
    }

    revalidarCliente(venta.cliente_id);
    revalidatePath('/dashboard/ventas');

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error al anular la venta' };
  }
}

// ============================================================
// TIMELINE / HISTORIAL COMPLETO
// ============================================================

export async function obtenerTimelineCliente(
  clienteId: string,
  options?: { limit?: number; offset?: number }
) {
  const supabase = await createServerActionClient();

  try {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    // Obtener todas las entidades relacionadas al cliente con limite
    const [interacciones, visitas, reservas, ventas, eventosAgenda] = await Promise.all([
      // Interacciones
      supabase
        .from('cliente_interaccion')
        .select('*, vendedor:usuario_perfil!vendedor_username(username)')
        .eq('cliente_id', clienteId)
        .order('fecha_interaccion', { ascending: false })
        .limit(limit),

      // Visitas
      supabase
        .from('visita_propiedad')
        .select('*, lote:lote!lote_id(numero_lote), vendedor:usuario_perfil!vendedor_username(username)')
        .eq('cliente_id', clienteId)
        .order('fecha_visita', { ascending: false })
        .limit(limit),

      // Reservas
      supabase
        .from('reserva')
        .select('*, lote:lote!lote_id(numero_lote), vendedor:usuario_perfil!vendedor_username(username)')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false })
        .limit(limit),

      // Ventas con pagos
      supabase
        .from('venta')
        .select('*, lote:lote!lote_id(numero_lote), vendedor:usuario_perfil!vendedor_username(username), pagos:pago(*)')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false })
        .limit(limit),

      // Eventos de agenda
      supabase
        .from('evento')
        .select('id, titulo, tipo, estado, prioridad, fecha_inicio, duracion_minutos, notas, descripcion')
        .eq('cliente_id', clienteId)
        .neq('estado', 'cancelado')
        .order('fecha_inicio', { ascending: false })
        .limit(limit),
    ]);

    // Verificar errores en las queries
    const queryErrors = [
      interacciones.error && `interacciones: ${interacciones.error.message}`,
      visitas.error && `visitas: ${visitas.error.message}`,
      reservas.error && `reservas: ${reservas.error.message}`,
      ventas.error && `ventas: ${ventas.error.message}`,
      eventosAgenda.error && `eventos: ${eventosAgenda.error.message}`,
    ].filter(Boolean);

    if (queryErrors.length > 0) {
      console.error('Errores obteniendo timeline:', queryErrors);
    }

    const eventos: any[] = [];

    // Agregar interacciones
    (interacciones.data ?? []).forEach((item) => {
      eventos.push({
        id: `interaccion-${item.id}`,
        type: 'interaccion',
        fecha: item.fecha_interaccion,
        titulo: `${item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1)}`,
        descripcion: item.notas,
        metadata: {
          tipo: item.tipo,
          resultado: item.resultado,
          duracion_minutos: item.duracion_minutos,
          proxima_accion: item.proxima_accion,
          vendedor_username: item.vendedor?.username,
        },
      });
    });

    // Agregar visitas
    (visitas.data ?? []).forEach((item) => {
      eventos.push({
        id: `visita-${item.id}`,
        type: 'visita',
        fecha: item.fecha_visita,
        titulo: `Visita a propiedad`,
        descripcion: item.feedback,
        metadata: {
          lote: item.lote?.numero_lote,
          nivel_interes: item.nivel_interes,
          duracion_minutos: item.duracion_minutos,
          vendedor_username: item.vendedor?.username,
        },
      });
    });

    // Agregar reservas
    (reservas.data ?? []).forEach((item) => {
      eventos.push({
        id: `reserva-${item.id}`,
        type: 'reserva',
        fecha: item.fecha_reserva,
        titulo: `Reserva ${item.codigo_reserva}`,
        descripcion: item.notas,
        metadata: {
          codigo: item.codigo_reserva,
          monto: item.monto_reserva,
          moneda: item.moneda,
          lote: item.lote?.numero_lote,
          estado: item.estado,
          vendedor_username: item.vendedor?.username,
        },
      });
    });

    // Agregar ventas
    (ventas.data ?? []).forEach((item) => {
      eventos.push({
        id: `venta-${item.id}`,
        type: 'venta',
        fecha: item.created_at,
        titulo: `Venta ${item.codigo_venta}`,
        descripcion: item.notas,
        metadata: {
          codigo: item.codigo_venta,
          precio_total: item.precio_total,
          moneda: item.moneda,
          forma_pago: item.forma_pago,
          lote: item.lote?.numero_lote,
          vendedor_username: item.vendedor?.username,
        },
      });

      // Agregar pagos de esta venta
      item.pagos?.forEach((pago: any) => {
        eventos.push({
          id: `pago-${pago.id}`,
          type: 'pago',
          fecha: pago.fecha_pago,
          titulo: `Pago recibido`,
          descripcion: pago.notas,
          metadata: {
            monto: pago.monto,
            moneda: pago.moneda,
            numero_cuota: pago.numero_cuota,
            metodo_pago: pago.metodo_pago,
            venta_codigo: item.codigo_venta,
            vendedor_username: pago.registrado_por,
          },
        });
      });
    });

    // Agregar eventos de agenda
    (eventosAgenda.data ?? []).forEach((item) => {
      eventos.push({
        id: `evento-agenda-${item.id}`,
        type: 'evento_agenda',
        fecha: item.fecha_inicio,
        titulo: item.titulo,
        descripcion: item.descripcion ?? item.notas ?? undefined,
        metadata: {
          tipo: item.tipo,
          estado: item.estado,
          prioridad: item.prioridad,
          duracion_minutos: item.duracion_minutos,
        },
      });
    });

    // Ordenar eventos por fecha (mas reciente primero)
    eventos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    // Aplicar paginacion al resultado combinado
    const total = eventos.length;
    const eventosPaginados = eventos.slice(offset, offset + limit);

    return {
      success: true,
      data: eventosPaginados,
      total,
      hasMore: offset + limit < total,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
