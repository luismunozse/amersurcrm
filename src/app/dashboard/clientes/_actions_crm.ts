"use server";

import { createServerActionClient } from "@/lib/supabase.server-actions";
import { revalidatePath } from "next/cache";
import { PERMISOS } from "@/lib/permissions";
import { requierePermiso } from "@/lib/permissions/server";

// ============================================================
// HELPERS
// ============================================================

/**
 * Obtiene el username del usuario autenticado
 * Reutilizable en todas las acciones para evitar código duplicado
 */
async function obtenerUsernameActual(supabase: Awaited<ReturnType<typeof createServerActionClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'No autenticado' } as const;
  }

  const { data: perfil } = await supabase
    .schema('crm')
    .from('usuario_perfil')
    .select('username')
    .eq('id', user.id)
    .single();

  if (!perfil?.username) {
    return { success: false, error: 'Usuario sin username' } as const;
  }

  return { success: true, username: perfil.username } as const;
}

/**
 * Valida que un monto sea positivo
 */
function validarMonto(monto: number, nombreCampo: string = 'Monto'): { valid: boolean; error?: string } {
  if (monto <= 0) {
    return { valid: false, error: `${nombreCampo} debe ser mayor a cero` };
  }
  if (!isFinite(monto) || isNaN(monto)) {
    return { valid: false, error: `${nombreCampo} no es válido` };
  }
  return { valid: true };
}

/**
 * Valida que una fecha sea futura (para vencimientos)
 */
function validarFechaFutura(fecha: string, nombreCampo: string = 'Fecha'): { valid: boolean; error?: string } {
  const fechaObj = new Date(fecha);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  if (isNaN(fechaObj.getTime())) {
    return { valid: false, error: `${nombreCampo} no es válida` };
  }

  if (fechaObj < hoy) {
    return { valid: false, error: `${nombreCampo} no puede ser en el pasado` };
  }

  return { valid: true };
}

/**
 * Revalida paths de manera consistente
 */
function revalidarCliente(clienteId?: string) {
  if (clienteId) {
    revalidatePath(`/dashboard/clientes/${clienteId}`);
  }
  revalidatePath('/dashboard/clientes');
}

// ============================================================
// INTERACCIONES
// ============================================================

export async function registrarInteraccion(data: {
  clienteId: string;
  tipo: 'llamada' | 'email' | 'whatsapp' | 'visita' | 'reunion' | 'mensaje';
  resultado?: 'contesto' | 'no_contesto' | 'reagendo' | 'interesado' | 'no_interesado' | 'cerrado' | 'pendiente';
  notas?: string;
  duracionMinutos?: number;
  proximaAccion?: 'llamar' | 'enviar_propuesta' | 'reunion' | 'visita' | 'seguimiento' | 'cierre' | 'ninguna';
  fechaProximaAccion?: string;
}) {
  const supabase = await createServerActionClient();

  try {
    // Obtener username usando helper
    const authResult = await obtenerUsernameActual(supabase);
    if (!authResult.success) {
      return authResult;
    }

    // Validar fecha de próxima acción si se proporciona
    if (data.fechaProximaAccion) {
      const validacionFecha = validarFechaFutura(data.fechaProximaAccion, 'Fecha de próxima acción');
      if (!validacionFecha.valid) {
        return { success: false, error: validacionFecha.error };
      }
    }

    const insertData = {
      cliente_id: data.clienteId,
      vendedor_username: authResult.username,
      tipo: data.tipo,
      resultado: data.resultado,
      notas: data.notas,
      duracion_minutos: data.duracionMinutos,
      proxima_accion: data.proximaAccion,
      fecha_proxima_accion: data.fechaProximaAccion,
    };

    const { data: insertedData, error } = await supabase
      .from('cliente_interaccion')
      .insert(insertData)
      .select();

    if (error) {
      throw error;
    }

    revalidarCliente(data.clienteId);
    return { success: true, data: insertedData };
  } catch (error: any) {
    console.error('❌ Error en registrarInteraccion:', error);
    return { success: false, error: error.message };
  }
}

export async function obtenerInteracciones(
  clienteId: string,
  options?: { limit?: number }
) {
  const supabase = await createServerActionClient();

  try {
    const limit = options?.limit ?? 100;

    // Obtener interacciones sin el join problemático
    let { data, error } = await supabase
      .from('cliente_interaccion')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('fecha_interaccion', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    // Si hay datos, obtener la información del vendedor por separado
    if (data && data.length > 0) {
      const vendedorUsernames = [...new Set(data.map(d => d.vendedor_username).filter(Boolean))];

      if (vendedorUsernames.length > 0) {
        const { data: vendedores } = await supabase
          .from('usuario_perfil')
          .select('username, nombre_completo')
          .in('username', vendedorUsernames);

        // Combinar los datos
        if (vendedores) {
          const vendedoresMap = Object.fromEntries(
            vendedores.map(v => [v.username, v])
          );

          data = data.map(interaccion => ({
            ...interaccion,
            vendedor: vendedoresMap[interaccion.vendedor_username] || { username: interaccion.vendedor_username }
          }));
        }
      }
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function actualizarInteraccion(data: {
  interaccionId: string;
  tipo?: 'llamada' | 'email' | 'whatsapp' | 'visita' | 'reunion' | 'mensaje';
  resultado?: 'contesto' | 'no_contesto' | 'reagendo' | 'interesado' | 'no_interesado' | 'cerrado' | 'pendiente';
  notas?: string;
  duracionMinutos?: number;
  proximaAccion?: 'llamar' | 'enviar_propuesta' | 'reunion' | 'visita' | 'seguimiento' | 'cierre' | 'ninguna';
  fechaProximaAccion?: string;
}) {
  const supabase = await createServerActionClient();

  try {

    // Validar fecha de próxima acción si se proporciona
    if (data.fechaProximaAccion) {
      const validacionFecha = validarFechaFutura(data.fechaProximaAccion, 'Fecha de próxima acción');
      if (!validacionFecha.valid) {
        console.error('❌ Error validando fecha:', validacionFecha.error);
        return { success: false, error: validacionFecha.error };
      }
    }

    const updateData: any = {};
    if (data.tipo !== undefined) updateData.tipo = data.tipo;
    if (data.resultado !== undefined) updateData.resultado = data.resultado;
    if (data.notas !== undefined) updateData.notas = data.notas;
    if (data.duracionMinutos !== undefined) updateData.duracion_minutos = data.duracionMinutos;
    if (data.proximaAccion !== undefined) updateData.proxima_accion = data.proximaAccion;
    if (data.fechaProximaAccion !== undefined) updateData.fecha_proxima_accion = data.fechaProximaAccion;

    const { data: updatedData, error } = await supabase
      .from('cliente_interaccion')
      .update(updateData)
      .eq('id', data.interaccionId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Revalidar el cliente
    if (updatedData.cliente_id) {
      revalidarCliente(updatedData.cliente_id);
    }

    return { success: true, data: updatedData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function eliminarInteraccion(interaccionId: string) {
  const supabase = await createServerActionClient();

  try {
    // Primero obtener la interacción para saber el cliente_id
    const { data: interaccion } = await supabase
      .from('cliente_interaccion')
      .select('cliente_id')
      .eq('id', interaccionId)
      .single();

    const { error } = await supabase
      .from('cliente_interaccion')
      .delete()
      .eq('id', interaccionId);

    if (error) {
      throw error;
    }

    // Revalidar el cliente
    if (interaccion?.cliente_id) {
      revalidarCliente(interaccion.cliente_id);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================
// PROPIEDADES DE INTERÉS
// ============================================================

export async function agregarPropiedadInteres(data: {
  clienteId: string;
  loteId?: string;
  propiedadId?: string;
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
        lote_id: data.loteId,
        propiedad_id: data.propiedadId,
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

    const { error } = await supabase
      .from('visita_propiedad')
      .insert({
        cliente_id: data.clienteId,
        lote_id: data.loteId,
        propiedad_id: data.propiedadId,
        vendedor_username: authResult.username,
        fecha_visita: data.fechaVisita || new Date().toISOString(),
        duracion_minutos: data.duracionMinutos,
        feedback: data.feedback,
        nivel_interes: data.nivelInteres,
      });

    if (error) throw error;

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
}) {
  const supabase = await createServerActionClient();

  try {
    // Obtener username usando helper
    const authResult = await obtenerUsernameActual(supabase);
    if (!authResult.success) {
      return authResult;
    }

    if (!data.loteId && !data.propiedadId) {
      return { success: false, error: 'Debes seleccionar un lote o una propiedad para crear la reserva' };
    }

    // Validar monto de reserva
    const validacionMonto = validarMonto(data.montoReserva, 'Monto de reserva');
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
          error: `Este lote ya tiene una reserva activa (${reservaExistente.codigo_reserva})`
        };
      }

      // Reservar el lote usando RPC (valida estado y hace la transición de forma segura)
      const { error: rpcError } = await supabase.rpc('crm.reservar_lote', {
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
      })
      .select()
      .single();

    if (error) {
      // Si falla la creación de la reserva, liberar el lote
      if (data.loteId) {
        await supabase.rpc('crm.liberar_lote', { p_lote: data.loteId });
      }
      throw error;
    }

    revalidarCliente(data.clienteId);
    revalidatePath('/dashboard/proyectos');

    return { success: true, data: reserva };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function cancelarReserva(reservaId: string, motivo: string) {
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
      return { success: false, error: 'Reserva no encontrada' };
    }

    // Validar que la reserva esté en un estado cancelable
    if (reserva.estado === 'cancelada') {
      return { success: false, error: 'Esta reserva ya está cancelada' };
    }

    if (reserva.estado === 'convertida_venta') {
      return { success: false, error: 'No se puede cancelar una reserva que ya fue convertida en venta' };
    }

    // Cancelar reserva
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

    // Liberar lote usando RPC (valida estado y hace la transición de forma segura)
    if (reserva.lote_id) {
      const { error: rpcError } = await supabase.rpc('crm.liberar_lote', {
        p_lote: reserva.lote_id
      });

      if (rpcError) {
        console.warn(`Error liberando lote ${reserva.lote_id}:`, rpcError);
        // No fallar la cancelación si el lote ya está liberado
      }
    }

    revalidarCliente(reserva.cliente_id);
    revalidatePath('/dashboard/proyectos');

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

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

    // Validar que la reserva esté en estado activo
    if (reserva.estado !== 'activa') {
      return {
        success: false,
        error: `No se puede convertir una reserva con estado "${reserva.estado}". Solo se permiten reservas activas.`
      };
    }

    // Calcular saldo pendiente
    const saldoPendiente = data.precioTotal - (data.montoInicial || 0);

    // Vender el lote usando RPC (valida estado y hace la transición de forma segura)
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
      // Si falla la creación de la venta, revertir el lote a reservado
      if (reserva.lote_id) {
        await supabase.rpc('reservar_lote', { p_lote: reserva.lote_id });
      }
      throw ventaError;
    }

    // Actualizar reserva a convertida
    await supabase
      .from('reserva')
      .update({
        estado: 'convertida_venta',
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.reservaId);

    // Si hay monto inicial, registrar como primer pago
    if (data.montoInicial && data.montoInicial > 0) {
      await supabase
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
    const nuevoSaldo = venta.saldo_pendiente - data.monto;
    const { error: updateError } = await supabase
      .from('venta')
      .update({
        saldo_pendiente: nuevoSaldo,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.ventaId);

    if (updateError) {
      console.error('Error actualizando saldo pendiente:', updateError);
      // No lanzamos error porque el pago ya se registró exitosamente
      // pero advertimos del problema
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

    // Obtener todas las entidades relacionadas al cliente con límite
    const [interacciones, visitas, reservas, ventas] = await Promise.all([
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
    ]);

    const eventos: any[] = [];

    // Agregar interacciones
    interacciones.data?.forEach((item) => {
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
    visitas.data?.forEach((item) => {
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
    reservas.data?.forEach((item) => {
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
    ventas.data?.forEach((item) => {
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

    // Ordenar eventos por fecha (más reciente primero)
    eventos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    // Aplicar paginación al resultado combinado
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
