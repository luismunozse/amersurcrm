"use server";

import { createServerActionClient } from "@/lib/supabase.server-actions";
import { PERMISOS } from "@/lib/permissions";
import { requierePermiso, tienePermiso } from "@/lib/permissions/server";
import { obtenerUsernameActual } from "../clientes/_actions-crm-helpers";

// ============================================================
// COBRANZA
// ============================================================

export async function obtenerCobranza(filtros?: {
  estadoCobranza?: string;
  proyectoId?: string;
  vendedorUsername?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = await createServerActionClient();

  try {
    // Verificar si puede ver todos o solo los propios
    const puedeVerTodos = await tienePermiso(PERMISOS.PAGOS.VER_TODOS);

    let query = supabase
      .from('v_cobranza')
      .select('*');

    // Si no puede ver todos, filtrar solo los propios
    if (!puedeVerTodos) {
      const authResult = await obtenerUsernameActual(supabase);
      if (!authResult.success) return authResult;
      query = query.eq('vendedor_username', authResult.username);
    }

    if (filtros?.proyectoId) {
      query = query.eq('proyecto_id', filtros.proyectoId);
    }
    if (filtros?.vendedorUsername && puedeVerTodos) {
      query = query.eq('vendedor_username', filtros.vendedorUsername);
    }
    if (filtros?.estadoCobranza) {
      query = query.eq('estado_cobranza', filtros.estadoCobranza);
    }

    query = query
      .order('fecha_vencimiento', { ascending: true })
      .range(
        filtros?.offset || 0,
        (filtros?.offset || 0) + (filtros?.limit || 50) - 1
      );

    const { data, error } = await query;

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function obtenerResumenCobranza() {
  const supabase = await createServerActionClient();

  try {
    const puedeVerTodos = await tienePermiso(PERMISOS.PAGOS.VER_TODOS);

    let query = supabase
      .from('v_cobranza')
      .select('estado_cobranza, monto_programado, monto_pagado, monto_mora, dias_atraso');

    if (!puedeVerTodos) {
      const authResult = await obtenerUsernameActual(supabase);
      if (!authResult.success) return authResult;
      query = query.eq('vendedor_username', authResult.username);
    }

    const { data, error } = await query;

    if (error) throw error;

    const resumen = {
      total_cuotas: data?.length || 0,
      por_vencer: 0,
      vencidas: 0,
      en_mora: 0,
      monto_por_cobrar: 0,
      monto_mora_total: 0,
    };

    (data || []).forEach((item) => {
      const saldo = item.monto_programado - item.monto_pagado;
      resumen.monto_por_cobrar += saldo;
      resumen.monto_mora_total += item.monto_mora || 0;

      if (item.estado_cobranza === 'en_mora') resumen.en_mora++;
      else if (item.estado_cobranza === 'vencida') resumen.vencidas++;
      else if (item.estado_cobranza?.startsWith('por_vencer')) resumen.por_vencer++;
    });

    return { success: true, data: resumen };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function ejecutarActualizacionMora() {
  await requierePermiso(PERMISOS.MORA.CALCULAR, {
    accion: 'actualizar_mora',
    recurso_tipo: 'cobranza',
  });

  const supabase = await createServerActionClient();

  try {
    const { data, error } = await supabase.rpc('actualizar_cuotas_vencidas');
    if (error) throw error;
    return { success: true, data: { cuotas_actualizadas: data } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
