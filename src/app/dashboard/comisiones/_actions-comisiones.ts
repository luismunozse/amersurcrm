"use server";

import { createServerActionClient } from "@/lib/supabase.server-actions";
import { PERMISOS } from "@/lib/permissions";
import { tienePermiso, esAdmin } from "@/lib/permissions/server";
import { obtenerUsernameActual } from "../clientes/_actions-crm-helpers";
import { revalidatePath } from "next/cache";

export type EstadoComision = 'pendiente' | 'aprobada' | 'pagada' | 'anulada';

export interface Comision {
  id: string;
  codigo: string | null;
  venta_id: string;
  beneficiario_username: string;
  beneficiario_rol: string;
  base_calculo: number;
  porcentaje: number;
  monto: number;
  moneda: string;
  estado: EstadoComision;
  fecha_generacion: string;
  fecha_aprobacion: string | null;
  aprobada_por: string | null;
  fecha_pago: string | null;
  pagada_por: string | null;
  metodo_pago: string | null;
  comprobante_url: string | null;
  fecha_anulacion: string | null;
  anulada_por: string | null;
  motivo_anulacion: string | null;
  notas: string | null;
  venta?: {
    codigo_venta: string;
    cliente_id: string;
    cliente?: { nombre: string };
    lote?: { codigo: string; proyecto?: { nombre: string } };
  };
}

export interface ResumenComisiones {
  total: number;
  pendiente: { count: number; monto: number };
  aprobada: { count: number; monto: number };
  pagada: { count: number; monto: number };
  anulada: { count: number; monto: number };
}

const ESTADOS_VALIDOS: EstadoComision[] = ['pendiente', 'aprobada', 'pagada', 'anulada'];

/**
 * Lista comisiones con filtros. Vendedor solo ve las propias salvo
 * que tenga permiso COMISIONES.VER_TODAS.
 */
export async function obtenerComisiones(filtros?: {
  estado?: EstadoComision;
  beneficiarioUsername?: string;
  ventaId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ success: boolean; error?: string; data?: Comision[] }> {
  const supabase = await createServerActionClient();

  try {
    const puedeVerTodas = await tienePermiso(PERMISOS.COMISIONES.VER_TODAS);

    let query = supabase
      .from('comision')
      .select(`
        *,
        venta:venta!venta_id(
          codigo_venta,
          cliente_id,
          cliente:cliente!cliente_id(nombre),
          lote:lote!lote_id(codigo, proyecto:proyecto!proyecto_id(nombre))
        )
      `);

    if (!puedeVerTodas) {
      const auth = await obtenerUsernameActual(supabase);
      if (!auth.success) return auth;
      query = query.eq('beneficiario_username', auth.username);
    }

    if (filtros?.estado) query = query.eq('estado', filtros.estado);
    if (filtros?.beneficiarioUsername && puedeVerTodas) {
      query = query.eq('beneficiario_username', filtros.beneficiarioUsername);
    }
    if (filtros?.ventaId) query = query.eq('venta_id', filtros.ventaId);

    query = query
      .order('fecha_generacion', { ascending: false })
      .range(filtros?.offset || 0, (filtros?.offset || 0) + (filtros?.limit || 100) - 1);

    const { data, error } = await query;
    if (error) throw error;

    const unwrap = <T,>(x: T | T[] | null | undefined): T | undefined => {
      if (x == null) return undefined;
      return Array.isArray(x) ? x[0] : x;
    };

    const flat = (data ?? []).map((c: any) => {
      const venta = unwrap<any>(c.venta);
      if (!venta) return { ...c, venta: undefined };

      const cliente = unwrap<any>(venta.cliente);
      const lote = unwrap<any>(venta.lote);
      const proyecto = lote ? unwrap<any>(lote.proyecto) : undefined;

      return {
        ...c,
        venta: {
          codigo_venta: venta.codigo_venta,
          cliente_id: venta.cliente_id,
          cliente: cliente ? { nombre: cliente.nombre } : undefined,
          lote: lote
            ? {
                codigo: lote.codigo,
                proyecto: proyecto ? { nombre: proyecto.nombre } : undefined,
              }
            : undefined,
        },
      };
    });

    return { success: true, data: flat as Comision[] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Resumen agregado por estado.
 */
export async function obtenerResumenComisiones(): Promise<{
  success: boolean;
  error?: string;
  data?: ResumenComisiones;
}> {
  const supabase = await createServerActionClient();

  try {
    const puedeVerTodas = await tienePermiso(PERMISOS.COMISIONES.VER_TODAS);

    let query = supabase.from('comision').select('estado, monto');

    if (!puedeVerTodas) {
      const auth = await obtenerUsernameActual(supabase);
      if (!auth.success) return auth;
      query = query.eq('beneficiario_username', auth.username);
    }

    const { data, error } = await query;
    if (error) throw error;

    const resumen: ResumenComisiones = {
      total: data?.length || 0,
      pendiente: { count: 0, monto: 0 },
      aprobada: { count: 0, monto: 0 },
      pagada: { count: 0, monto: 0 },
      anulada: { count: 0, monto: 0 },
    };

    (data ?? []).forEach((c: any) => {
      const estado = c.estado as EstadoComision;
      if (resumen[estado]) {
        resumen[estado].count += 1;
        resumen[estado].monto += Number(c.monto) || 0;
      }
    });

    return { success: true, data: resumen };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Aprueba una comision (pendiente -> aprobada). Solo admin.
 */
export async function aprobarComision(comisionId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!comisionId) return { success: false, error: 'ID de comision requerido' };

  if (!(await esAdmin())) {
    return { success: false, error: 'Solo un administrador puede aprobar comisiones' };
  }

  const supabase = await createServerActionClient();

  try {
    const auth = await obtenerUsernameActual(supabase);
    if (!auth.success) return auth;

    const { error } = await supabase.rpc('aprobar_comision', {
      p_comision_id: comisionId,
      p_username: auth.username,
    });

    if (error) return { success: false, error: error.message };

    revalidatePath('/dashboard/comisiones');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Marca una comision como pagada (aprobada -> pagada). Solo admin.
 */
export async function pagarComision(input: {
  comisionId: string;
  metodoPago: string;
  comprobanteUrl?: string;
  notas?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!input.comisionId) return { success: false, error: 'ID de comision requerido' };
  if (!input.metodoPago || !input.metodoPago.trim()) {
    return { success: false, error: 'Metodo de pago requerido' };
  }

  if (!(await esAdmin())) {
    return { success: false, error: 'Solo un administrador puede pagar comisiones' };
  }

  const supabase = await createServerActionClient();

  try {
    const auth = await obtenerUsernameActual(supabase);
    if (!auth.success) return auth;

    const { error } = await supabase.rpc('pagar_comision', {
      p_comision_id: input.comisionId,
      p_username: auth.username,
      p_metodo_pago: input.metodoPago,
      p_comprobante_url: input.comprobanteUrl ?? null,
      p_notas: input.notas ?? null,
    });

    if (error) return { success: false, error: error.message };

    revalidatePath('/dashboard/comisiones');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Anula una comision (pendiente/aprobada -> anulada). No revierte pago. Solo admin.
 */
export async function anularComision(comisionId: string, motivo: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!comisionId) return { success: false, error: 'ID de comision requerido' };
  if (!motivo || !motivo.trim()) return { success: false, error: 'Motivo requerido' };

  if (!(await esAdmin())) {
    return { success: false, error: 'Solo un administrador puede anular comisiones' };
  }

  const supabase = await createServerActionClient();

  try {
    const auth = await obtenerUsernameActual(supabase);
    if (!auth.success) return auth;

    const { error } = await supabase.rpc('anular_comision', {
      p_comision_id: comisionId,
      p_username: auth.username,
      p_motivo: motivo.trim(),
    });

    if (error) return { success: false, error: error.message };

    revalidatePath('/dashboard/comisiones');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Genera manualmente una comision para una venta que no la tiene.
 * Util para regularizar ventas legacy. Solo admin.
 * Idempotente: si ya existe activa, retorna su id.
 */
export async function generarComisionVenta(ventaId: string): Promise<{
  success: boolean;
  error?: string;
  data?: { comisionId: string };
}> {
  if (!ventaId) return { success: false, error: 'ID de venta requerido' };

  if (!(await esAdmin())) {
    return { success: false, error: 'Solo un administrador puede generar comisiones manualmente' };
  }

  const supabase = await createServerActionClient();

  try {
    const { data, error } = await supabase.rpc('generar_comision_venta', {
      p_venta_id: ventaId,
    });

    if (error) return { success: false, error: error.message };

    revalidatePath('/dashboard/comisiones');
    return { success: true, data: { comisionId: data as string } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Validacion: ESTADOS_VALIDOS export para reuso en UI/tests.
 */
export const ESTADOS_COMISION_VALIDOS = ESTADOS_VALIDOS;
