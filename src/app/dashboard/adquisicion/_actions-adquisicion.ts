"use server";

import { createServerActionClient } from "@/lib/supabase.server-actions";
import { PERMISOS } from "@/lib/permissions";
import { tienePermiso } from "@/lib/permissions/server";
import { obtenerUsernameActual } from "../clientes/_actions-crm-helpers";

export async function obtenerSeparaciones(filtros?: {
  estado?: string;
  proyectoId?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = await createServerActionClient();

  try {
    const puedeVerTodas = await tienePermiso(PERMISOS.RESERVAS.VER_TODAS);

    let query = supabase
      .from('reserva')
      .select('*, cliente:cliente!cliente_id(id, nombre), lote:lote!lote_id(codigo, proyecto_id, proyecto:proyecto!proyecto_id(nombre))');

    if (!puedeVerTodas) {
      const authResult = await obtenerUsernameActual(supabase);
      if (!authResult.success) return authResult;
      query = query.eq('vendedor_username', authResult.username);
    }

    if (filtros?.estado) query = query.eq('estado', filtros.estado);

    query = query
      .order('created_at', { ascending: false })
      .range(filtros?.offset || 0, (filtros?.offset || 0) + (filtros?.limit || 50) - 1);

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function obtenerVentasGlobal(filtros?: {
  estado?: string;
  formaPago?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = await createServerActionClient();

  try {
    const puedeVerTodas = await tienePermiso(PERMISOS.VENTAS.VER_TODAS);

    let query = supabase
      .from('venta')
      .select('*, cliente:cliente!cliente_id(id, nombre), lote:lote!lote_id(codigo, proyecto:proyecto!proyecto_id(nombre)), pagos:pago(count)');

    if (!puedeVerTodas) {
      const authResult = await obtenerUsernameActual(supabase);
      if (!authResult.success) return authResult;
      query = query.eq('vendedor_username', authResult.username);
    }

    if (filtros?.estado) query = query.eq('estado', filtros.estado);
    if (filtros?.formaPago) query = query.eq('forma_pago', filtros.formaPago);

    query = query
      .order('created_at', { ascending: false })
      .range(filtros?.offset || 0, (filtros?.offset || 0) + (filtros?.limit || 50) - 1);

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function obtenerProformasGlobal(filtros?: {
  estado?: string;
  tipoOperacion?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = await createServerActionClient();

  try {
    let query = supabase
      .from('proforma')
      .select('*, cliente:cliente!cliente_id(id, nombre), lote:lote!lote_id(codigo)');

    if (filtros?.estado) query = query.eq('estado', filtros.estado);
    if (filtros?.tipoOperacion) query = query.eq('tipo_operacion', filtros.tipoOperacion);

    query = query
      .order('created_at', { ascending: false })
      .range(filtros?.offset || 0, (filtros?.offset || 0) + (filtros?.limit || 50) - 1);

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
