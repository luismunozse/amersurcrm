"use server";

import { createServerActionClient } from "@/lib/supabase.server-actions";
import { revalidatePath } from "next/cache";

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    // Obtener username del vendedor
    const { data: perfil } = await supabase
      .from('usuario_perfil')
      .select('username')
      .eq('id', user.id)
      .single();

    if (!perfil?.username) {
      return { success: false, error: 'Usuario sin username' };
    }

    const { error } = await supabase
      .from('cliente_interaccion')
      .insert({
        cliente_id: data.clienteId,
        vendedor_username: perfil.username,
        tipo: data.tipo,
        resultado: data.resultado,
        notas: data.notas,
        duracion_minutos: data.duracionMinutos,
        proxima_accion: data.proximaAccion,
        fecha_proxima_accion: data.fechaProximaAccion,
      });

    if (error) throw error;

    revalidatePath('/dashboard/clientes');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function obtenerInteracciones(clienteId: string) {
  const supabase = await createServerActionClient();

  try {
    const { data, error } = await supabase
      .from('cliente_interaccion')
      .select('*, vendedor:usuario_perfil!vendedor_username(nombre_completo, username)')
      .eq('cliente_id', clienteId)
      .order('fecha_interaccion', { ascending: false });

    if (error) throw error;

    return { success: true, data };
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const { data: perfil } = await supabase
      .from('usuario_perfil')
      .select('username')
      .eq('id', user.id)
      .single();

    if (!perfil?.username) {
      return { success: false, error: 'Usuario sin username' };
    }

    const { error } = await supabase
      .from('cliente_propiedad_interes')
      .insert({
        cliente_id: data.clienteId,
        lote_id: data.loteId,
        propiedad_id: data.propiedadId,
        prioridad: data.prioridad || 2,
        notas: data.notas,
        agregado_por: perfil.username,
      });

    if (error) throw error;

    revalidatePath('/dashboard/clientes');
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const { data: perfil } = await supabase
      .from('usuario_perfil')
      .select('username')
      .eq('id', user.id)
      .single();

    if (!perfil?.username) {
      return { success: false, error: 'Usuario sin username' };
    }

    const { error } = await supabase
      .from('visita_propiedad')
      .insert({
        cliente_id: data.clienteId,
        lote_id: data.loteId,
        propiedad_id: data.propiedadId,
        vendedor_username: perfil.username,
        fecha_visita: data.fechaVisita || new Date().toISOString(),
        duracion_minutos: data.duracionMinutos,
        feedback: data.feedback,
        nivel_interes: data.nivelInteres,
      });

    if (error) throw error;

    revalidatePath('/dashboard/clientes');
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
  moneda?: 'PEN' | 'USD' | 'EUR';
  fechaVencimiento: string;
  metodoPago?: string;
  comprobanteUrl?: string;
  notas?: string;
}) {
  const supabase = await createServerActionClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const { data: perfil } = await supabase
      .from('usuario_perfil')
      .select('username')
      .eq('id', user.id)
      .single();

    if (!perfil?.username) {
      return { success: false, error: 'Usuario sin username' };
    }

    // Crear reserva
    const { data: reserva, error } = await supabase
      .from('reserva')
      .insert({
        cliente_id: data.clienteId,
        lote_id: data.loteId,
        propiedad_id: data.propiedadId,
        vendedor_username: perfil.username,
        monto_reserva: data.montoReserva,
        moneda: data.moneda || 'PEN',
        fecha_vencimiento: data.fechaVencimiento,
        metodo_pago: data.metodoPago,
        comprobante_url: data.comprobanteUrl,
        notas: data.notas,
        estado: 'activa',
      })
      .select()
      .single();

    if (error) throw error;

    // Actualizar estado del lote a "reservado"
    if (data.loteId) {
      await supabase
        .from('lote')
        .update({ estado: 'reservado' })
        .eq('id', data.loteId);
    }

    revalidatePath('/dashboard/clientes');
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
      .from('reserva')
      .select('lote_id')
      .eq('id', reservaId)
      .single();

    // Cancelar reserva
    const { error } = await supabase
      .from('reserva')
      .update({
        estado: 'cancelada',
        motivo_cancelacion: motivo,
      })
      .eq('id', reservaId);

    if (error) throw error;

    // Liberar lote (volver a disponible)
    if (reserva?.lote_id) {
      await supabase
        .from('lote')
        .update({ estado: 'disponible' })
        .eq('id', reserva.lote_id);
    }

    revalidatePath('/dashboard/clientes');
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
  moneda?: 'PEN' | 'USD' | 'EUR';
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const { data: perfil } = await supabase
      .from('usuario_perfil')
      .select('username')
      .eq('id', user.id)
      .single();

    if (!perfil?.username) {
      return { success: false, error: 'Usuario sin username' };
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

    // Calcular saldo pendiente
    const saldoPendiente = data.precioTotal - (data.montoInicial || 0);

    // Crear venta
    const { data: venta, error: ventaError } = await supabase
      .from('venta')
      .insert({
        reserva_id: data.reservaId,
        cliente_id: reserva.cliente_id,
        lote_id: reserva.lote_id,
        propiedad_id: reserva.propiedad_id,
        vendedor_username: perfil.username,
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

    if (ventaError) throw ventaError;

    // Actualizar reserva a convertida
    await supabase
      .from('reserva')
      .update({ estado: 'convertida_venta' })
      .eq('id', data.reservaId);

    // Actualizar lote a vendido
    if (reserva.lote_id) {
      await supabase
        .from('lote')
        .update({ estado: 'vendido' })
        .eq('id', reserva.lote_id);
    }

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
          registrado_por: perfil.username,
          notas: 'Pago inicial de la venta',
        });
    }

    revalidatePath('/dashboard/clientes');
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
  moneda?: 'PEN' | 'USD' | 'EUR';
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const { data: perfil } = await supabase
      .from('usuario_perfil')
      .select('username')
      .eq('id', user.id)
      .single();

    if (!perfil?.username) {
      return { success: false, error: 'Usuario sin username' };
    }

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
        registrado_por: perfil.username,
        notas: data.notas,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/ventas');

    return { success: true, data: pago };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================
// TIMELINE / HISTORIAL COMPLETO
// ============================================================

export async function obtenerTimelineCliente(clienteId: string) {
  const supabase = await createServerActionClient();

  try {
    // Obtener todas las entidades relacionadas al cliente
    const [interacciones, visitas, reservas, ventas] = await Promise.all([
      // Interacciones
      supabase
        .from('cliente_interaccion')
        .select('*, vendedor:usuario_perfil!vendedor_username(username)')
        .eq('cliente_id', clienteId),

      // Visitas
      supabase
        .from('visita_propiedad')
        .select('*, lote:lote!lote_id(numero_lote), vendedor:usuario_perfil!vendedor_username(username)')
        .eq('cliente_id', clienteId),

      // Reservas
      supabase
        .from('reserva')
        .select('*, lote:lote!lote_id(numero_lote), vendedor:usuario_perfil!vendedor_username(username)')
        .eq('cliente_id', clienteId),

      // Ventas con pagos
      supabase
        .from('venta')
        .select('*, lote:lote!lote_id(numero_lote), vendedor:usuario_perfil!vendedor_username(username), pagos:pago(*)')
        .eq('cliente_id', clienteId),
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

    return { success: true, data: eventos };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
