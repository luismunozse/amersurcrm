"use server";

import { createServerActionClient } from "@/lib/supabase.server-actions";
import { PERMISOS } from "@/lib/permissions";
import { requierePermiso, esAdmin, tienePermiso } from "@/lib/permissions/server";
import { obtenerUsernameActual, validarMonto, revalidarCliente } from "./_actions-crm-helpers";
import { revalidatePath } from "next/cache";

// ============================================================
// CRONOGRAMA DE PAGOS (CUOTAS)
// ============================================================

export async function generarCronogramaPagos(ventaId: string, clienteId: string) {
  await requierePermiso(PERMISOS.CUOTAS.GESTIONAR, {
    accion: 'generar_cronograma',
    recurso_tipo: 'cuota',
  });

  const supabase = await createServerActionClient();

  try {
    const { data, error } = await supabase.rpc('generar_cronograma_pagos', {
      p_venta_id: ventaId,
    });

    if (error) throw error;

    revalidarCliente(clienteId);
    return { success: true, data: { cuotas_generadas: data } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function obtenerCronogramaVenta(ventaId: string) {
  const supabase = await createServerActionClient();

  try {
    const { data, error } = await supabase
      .from('cuota')
      .select('*')
      .eq('venta_id', ventaId)
      .order('numero_cuota', { ascending: true });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function obtenerCuotasCliente(clienteId: string) {
  if (!clienteId) return { success: false, error: 'ID de cliente requerido' };

  const supabase = await createServerActionClient();

  try {
    // FIX C (secure-authz-p1): verify caller can see the target client.
    // Global roles bypass; vendors must own the client.
    const puedeVerTodas = await tienePermiso(PERMISOS.VENTAS.VER_TODAS);

    if (!puedeVerTodas) {
      const auth = await obtenerUsernameActual(supabase);
      if (!auth.success) return auth;

      const { data: clienteAcceso } = await supabase
        .from('cliente')
        .select('id')
        .eq('id', clienteId)
        .eq('vendedor_username', auth.username)
        .maybeSingle();

      if (!clienteAcceso) {
        return { success: false, error: 'Permiso insuficiente para ver las cuotas de este cliente' };
      }
    }

    const { data, error } = await supabase
      .from('cuota')
      .select('*, venta:venta!inner(codigo_venta, cliente_id, lote_id)')
      .eq('venta.cliente_id', clienteId)
      .order('fecha_vencimiento', { ascending: true });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function registrarPagoCuota(data: {
  ventaId: string;
  cuotaId: string;
  monto: number;
  moneda?: string;
  metodoPago: string;
  numeroOperacion?: string;
  banco?: string;
  comprobanteUrl?: string;
  notas?: string;
  clienteId: string;
}) {
  await requierePermiso(PERMISOS.PAGOS.REGISTRAR, {
    accion: 'registrar_pago_cuota',
    recurso_tipo: 'pago',
  });

  const supabase = await createServerActionClient();

  try {
    const authResult = await obtenerUsernameActual(supabase);
    if (!authResult.success) return authResult;

    const validacionMonto = validarMonto(data.monto, 'Monto del pago');
    if (!validacionMonto.valid) {
      return { success: false, error: validacionMonto.error };
    }

    // Obtener la cuota
    const { data: cuota, error: cuotaError } = await supabase
      .from('cuota')
      .select('*')
      .eq('id', data.cuotaId)
      .single();

    if (cuotaError || !cuota) {
      return { success: false, error: 'Cuota no encontrada' };
    }

    const saldoCuota = cuota.monto_programado - cuota.monto_pagado + cuota.monto_mora;
    if (data.monto > saldoCuota) {
      return {
        success: false,
        error: `El monto (${data.monto}) excede el saldo de la cuota (${saldoCuota})`,
      };
    }

    // Obtener saldo de la venta
    const { data: venta } = await supabase
      .from('venta')
      .select('saldo_pendiente')
      .eq('id', data.ventaId)
      .single();

    // Insertar pago vinculado a la cuota
    const { data: pago, error: pagoError } = await supabase
      .from('pago')
      .insert({
        venta_id: data.ventaId,
        cuota_id: data.cuotaId,
        numero_cuota: cuota.numero_cuota,
        monto: data.monto,
        moneda: data.moneda || cuota.moneda,
        fecha_pago: new Date().toISOString(),
        metodo_pago: data.metodoPago,
        numero_operacion: data.numeroOperacion,
        banco: data.banco,
        comprobante_url: data.comprobanteUrl,
        registrado_por: authResult.username,
        notas: data.notas,
      })
      .select()
      .single();

    if (pagoError) throw pagoError;

    // El trigger trg_pago_actualizar_cuota se encarga de actualizar la cuota
    // Pero también actualizamos el saldo de la venta manualmente
    if (venta) {
      const nuevoSaldo = Math.max(0, venta.saldo_pendiente - data.monto);
      const updatePayload: Record<string, unknown> = {
        saldo_pendiente: nuevoSaldo,
        updated_at: new Date().toISOString(),
      };
      if (nuevoSaldo === 0) {
        updatePayload.estado = 'finalizada';
      }

      await supabase
        .from('venta')
        .update(updatePayload)
        .eq('id', data.ventaId);
    }

    revalidarCliente(data.clienteId);
    revalidatePath('/dashboard/cobranza');
    return { success: true, data: pago };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================
// HISTORIAL Y ANULACION DE PAGOS (Etapa 4)
// ============================================================

export interface PagoCuota {
  id: string;
  venta_id: string;
  cuota_id: string | null;
  numero_cuota: number | null;
  monto: number;
  moneda: string;
  fecha_pago: string;
  metodo_pago: string | null;
  numero_operacion: string | null;
  banco: string | null;
  comprobante_url: string | null;
  registrado_por: string;
  notas: string | null;
  anulado: boolean;
  anulado_por: string | null;
  fecha_anulacion: string | null;
  motivo_anulacion: string | null;
  created_at: string;
}

/**
 * Lista los pagos asociados a una cuota (incluye anulados, ordenados por fecha desc).
 */
export async function obtenerPagosCuota(cuotaId: string): Promise<{
  success: boolean;
  error?: string;
  data?: PagoCuota[];
}> {
  if (!cuotaId) return { success: false, error: 'ID de cuota requerido' };

  const supabase = await createServerActionClient();

  try {
    const { data, error } = await supabase
      .from('pago')
      .select('*')
      .eq('cuota_id', cuotaId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: (data ?? []) as PagoCuota[] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Anula un pago registrado. Solo admin.
 * Revierte cuota.monto_pagado y venta.saldo_pendiente atomicamente via RPC.
 */
export async function anularPago(
  pagoId: string,
  motivo: string,
): Promise<{ success: boolean; error?: string; data?: { ventaId: string; cuotaId: string | null } }> {
  if (!pagoId) return { success: false, error: 'ID de pago requerido' };
  if (!motivo || !motivo.trim()) return { success: false, error: 'Motivo de anulacion requerido' };

  if (!(await esAdmin())) {
    return { success: false, error: 'Solo un administrador puede anular pagos' };
  }

  const supabase = await createServerActionClient();

  try {
    const auth = await obtenerUsernameActual(supabase);
    if (!auth.success) return auth;

    const { data, error } = await supabase.rpc('anular_pago', {
      p_pago_id: pagoId,
      p_username: auth.username,
      p_motivo: motivo.trim(),
    });

    if (error) return { success: false, error: error.message };

    const result = data as Record<string, unknown> | null;
    const ventaId = (result?.venta_id as string) ?? '';
    const cuotaId = (result?.cuota_id as string) ?? null;

    // Revalidar paths que muestran cobranza/cronograma. No tenemos clienteId
    // del pago directo: revalidamos el layout completo de clientes.
    revalidatePath('/dashboard/clientes', 'layout');
    revalidatePath('/dashboard/cobranza');

    return { success: true, data: { ventaId, cuotaId } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
