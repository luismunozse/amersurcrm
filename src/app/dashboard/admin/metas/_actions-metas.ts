"use server";

import { createServerActionClient } from "@/lib/supabase.server-actions";
import { PERMISOS } from "@/lib/permissions";
import { requierePermiso, tienePermiso } from "@/lib/permissions/server";
import { obtenerUsernameActual } from "../../clientes/_actions-crm-helpers";
import { revalidatePath } from "next/cache";

// ============================================================
// METAS POR VENDEDOR
// ============================================================

export async function guardarMeta(data: {
  vendedorUsername: string;
  vendedorId?: string;
  periodoAnio: number;
  periodoMes: number;
  metaVentasMonto?: number;
  metaVentasCantidad?: number;
  metaSeparaciones?: number;
  metaContactos?: number;
  metaVisitas?: number;
}) {
  await requierePermiso(PERMISOS.METAS.ASIGNAR, {
    accion: 'asignar_meta',
    recurso_tipo: 'meta_vendedor',
  });

  const supabase = await createServerActionClient();

  try {
    // Upsert: si ya existe la meta para ese vendedor/periodo, actualizarla
    const { data: meta, error } = await supabase
      .from('meta_vendedor')
      .upsert({
        vendedor_username: data.vendedorUsername,
        vendedor_id: data.vendedorId,
        periodo_anio: data.periodoAnio,
        periodo_mes: data.periodoMes,
        meta_ventas_monto: data.metaVentasMonto || 0,
        meta_ventas_cantidad: data.metaVentasCantidad || 0,
        meta_separaciones: data.metaSeparaciones || 0,
        meta_contactos: data.metaContactos || 0,
        meta_visitas: data.metaVisitas || 0,
      }, {
        onConflict: 'vendedor_username,periodo_anio,periodo_mes',
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/admin/metas');
    return { success: true, data: meta };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function obtenerMetas(filtros?: {
  vendedorUsername?: string;
  periodoAnio?: number;
  periodoMes?: number;
}) {
  const supabase = await createServerActionClient();

  try {
    // FIX C (secure-authz-p1): global roles see all metas; vendors see only own.
    const puedeVerTodas = await tienePermiso(PERMISOS.METAS.ASIGNAR);

    let query = supabase
      .from('meta_vendedor')
      .select('*');

    if (!puedeVerTodas) {
      // Vendor: scope to own vendedor_username regardless of caller-provided filters.
      const auth = await obtenerUsernameActual(supabase);
      if (!auth.success) return auth;
      query = query.eq('vendedor_username', auth.username);
    } else {
      // Global role: apply optional caller filter if provided.
      if (filtros?.vendedorUsername) query = query.eq('vendedor_username', filtros.vendedorUsername);
    }

    if (filtros?.periodoAnio) query = query.eq('periodo_anio', filtros.periodoAnio);
    if (filtros?.periodoMes) query = query.eq('periodo_mes', filtros.periodoMes);

    query = query.order('periodo_anio', { ascending: false }).order('periodo_mes', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function obtenerKPIs(filtros?: {
  vendedorUsername?: string;
  periodoAnio?: number;
  periodoMes?: number;
}) {
  const supabase = await createServerActionClient();

  try {
    // FIX C (secure-authz-p1): global roles see all KPIs; vendors see only own.
    const puedeVerTodas = await tienePermiso(PERMISOS.METAS.ASIGNAR);

    let query = supabase
      .from('v_kpi_vendedor')
      .select('*');

    if (!puedeVerTodas) {
      const auth = await obtenerUsernameActual(supabase);
      if (!auth.success) return auth;
      query = query.eq('vendedor_username', auth.username);
    } else {
      if (filtros?.vendedorUsername) query = query.eq('vendedor_username', filtros.vendedorUsername);
    }

    if (filtros?.periodoAnio) query = query.eq('periodo_anio', filtros.periodoAnio);
    if (filtros?.periodoMes) query = query.eq('periodo_mes', filtros.periodoMes);

    const { data, error } = await query;

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function obtenerMotivosDesestimacion() {
  const supabase = await createServerActionClient();

  try {
    const { data, error } = await supabase
      .from('motivo_desestimacion')
      .select('*')
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
