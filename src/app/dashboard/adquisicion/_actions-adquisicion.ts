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

    // Query plana sin JOINs (los JOINs anidados con !fk_name a veces fallan
    // silenciosamente cuando la FK no está perfectamente nombrada). Cargamos
    // los datos relacionados en queries separadas y los unificamos en cliente.
    let query = supabase
      .from('reserva')
      .select('*');

    if (!puedeVerTodas) {
      const authResult = await obtenerUsernameActual(supabase);
      if (!authResult.success) return authResult;
      query = query.eq('vendedor_username', authResult.username);
    }

    if (filtros?.estado) query = query.eq('estado', filtros.estado);

    query = query
      .order('created_at', { ascending: false })
      .range(filtros?.offset || 0, (filtros?.offset || 0) + (filtros?.limit || 50) - 1);

    const { data: reservas, error } = await query;
    if (error) {
      console.error('[obtenerSeparaciones] reserva query error:', error);
      throw error;
    }

    if (!reservas || reservas.length === 0) {
      return { success: true, data: [] };
    }

    // Enriquecer con cliente + lote + proyecto en queries separadas.
    const clienteIds = [...new Set(reservas.map((r: any) => r.cliente_id).filter(Boolean))];
    const loteIds = [...new Set(reservas.map((r: any) => r.lote_id).filter(Boolean))];

    const [clientesResult, lotesResult] = await Promise.all([
      clienteIds.length > 0
        ? supabase.from('cliente').select('id, nombre').in('id', clienteIds)
        : Promise.resolve({ data: [], error: null }),
      loteIds.length > 0
        ? supabase
            .from('lote')
            .select('id, codigo, proyecto_id, proyecto:proyecto!proyecto_id(id, nombre)')
            .in('id', loteIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const clientesMap = new Map<string, any>(
      (clientesResult.data ?? []).map((c: any) => [c.id, c]),
    );
    const lotesMap = new Map<string, any>(
      (lotesResult.data ?? []).map((l: any) => {
        const proyecto = Array.isArray(l.proyecto) ? l.proyecto[0] : l.proyecto;
        return [l.id, { ...l, proyecto }];
      }),
    );

    const enriched = reservas.map((r: any) => ({
      ...r,
      cliente: r.cliente_id ? clientesMap.get(r.cliente_id) ?? null : null,
      lote: r.lote_id ? lotesMap.get(r.lote_id) ?? null : null,
    }));

    return { success: true, data: enriched };
  } catch (error: any) {
    console.error('[obtenerSeparaciones] caught error:', error);
    return { success: false, error: error?.message ?? String(error) };
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
