"use server";

import { revalidatePath } from "next/cache";
import { createServerActionClient } from "@/lib/supabase.server-actions";
import { PERMISOS } from "@/lib/permissions";
import { requierePermiso, tienePermiso } from "@/lib/permissions/server";
import { handleSupabaseError } from "@/lib/errors";
import { obtenerUsernameActual } from "../clientes/_actions-crm-helpers";
import { limaToday } from "@/lib/cobranza/tiers";
import { getClienteIdsEquipo, buildVentaEquipoOrFilter } from "@/lib/dashboard/command-center.server";
import type { EquipoScope } from "@/lib/auth/equipo-scope.server";

export type MedioGestionCobranza = "llamada" | "whatsapp" | "email" | "visita" | "mensaje";
export type ResultadoGestionCobranza =
  | "contactado"
  | "no_contactado"
  | "promesa_pago"
  | "pago_parcial"
  | "renegociacion"
  | "ilocalizable";

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

type CobranzaResumenRow = {
  estado_cobranza: string | null;
  monto_programado: number;
  monto_pagado: number;
  monto_mora: number | null;
};

type ResumenCobranza = {
  total_cuotas: number;
  por_vencer: number;
  vencidas: number;
  en_mora: number;
  monto_por_cobrar: number;
  monto_mora_total: number;
};

function agregarResumenCobranza(rows: CobranzaResumenRow[]): ResumenCobranza {
  const resumen: ResumenCobranza = {
    total_cuotas: rows.length,
    por_vencer: 0,
    vencidas: 0,
    en_mora: 0,
    monto_por_cobrar: 0,
    monto_mora_total: 0,
  };

  rows.forEach((item) => {
    const saldo = item.monto_programado - item.monto_pagado;
    resumen.monto_por_cobrar += saldo;
    resumen.monto_mora_total += item.monto_mora || 0;

    if (item.estado_cobranza === 'en_mora') resumen.en_mora++;
    else if (item.estado_cobranza === 'vencida') resumen.vencidas++;
    else if (item.estado_cobranza?.startsWith('por_vencer')) resumen.por_vencer++;
  });

  return resumen;
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

    return { success: true, data: agregarResumenCobranza(data || []) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Scope-aware mora summary for MoraAlertasBlock (Task 4b — design.md §3).
 * Unlike `obtenerResumenCobranza` (permission-gated: all-or-own-username),
 * this filters by EquipoScope tier so a coordinador sees their TEAM's mora
 * total, matching the alertasSinGestionar count rendered next to it.
 * `CommandCenter.tsx` only ever renders MoraAlertasBlock for tier "global"
 * or "equipo" — "propio"/"anonimo" return a zeroed default here purely as
 * defense-in-depth, same convention as every command-center fetcher.
 *
 * `tier: "global"` here is ROLE-derived (resolved once in
 * `equipo-scope.server.ts` from ROL_ADMIN/ROL_GERENTE), NOT re-derived from
 * `PERMISOS.PAGOS.VER_TODOS` the way `obtenerResumenCobranza` does — this is
 * the deliberate convention every command-center block already follows
 * (`getResumenGeneral`, `getAgingLeads`, etc. all key off `EquipoScope`, not
 * a permission check), and intentionally supersedes the old permission gate
 * for THIS block only. Do not "fix" this back to a `tienePermiso()` call.
 *
 * The `tier: "equipo"` filter reuses `getClienteIdsEquipo` +
 * `buildVentaEquipoOrFilter` from `command-center.server.ts` (`prefix ""`,
 * since `v_cobranza` exposes `vendedor_username`/`cliente_id` as flat
 * columns — see supabase/migrations/20260406000000_cobranza.sql) instead of
 * a bare `.in('vendedor_username', ...)`. This is the SAME team-scope
 * resolution `getAlertasSinGestionarCount` uses, so the mora total actually
 * matches the alertasSinGestionar count rendered next to it: a cuota whose
 * venta's OWN vendedor_username isn't on the team, but whose linked cliente
 * IS team-owned, is still counted here — the same gap
 * `getAlertasSinGestionarCount`/`getVentasMensuales` closed earlier for
 * their own fetchers. Also fails CLOSED (returns the zeroed summary with no
 * query) when the team filter is doubly empty, mirroring those two
 * fetchers' guard.
 */
export async function obtenerResumenCobranzaScoped(scope: EquipoScope) {
  if (scope.tier !== 'global' && scope.tier !== 'equipo') {
    return { success: true, data: agregarResumenCobranza([]) };
  }

  const supabase = await createServerActionClient();

  try {
    let filtroEquipo: string | null = null;
    if (scope.tier === 'equipo') {
      const clienteIdsEquipo = await getClienteIdsEquipo(supabase, scope);
      filtroEquipo = buildVentaEquipoOrFilter(scope, clienteIdsEquipo, '');
      if (!filtroEquipo) return { success: true, data: agregarResumenCobranza([]) };
    }

    let query = supabase
      .from('v_cobranza')
      .select('estado_cobranza, monto_programado, monto_pagado, monto_mora, dias_atraso');

    if (filtroEquipo) {
      query = query.or(filtroEquipo);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data: agregarResumenCobranza(data || []) };
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

// ============================================================
// ALERTAS DE COBRANZA (crm.alerta_cobranza + crm.gestion_cobranza)
// See openspec/changes/cobranza-alertas/design.md D7 for the shape of
// obtenerAlertasCobranza's response and registrarGestionCobranza's inputs.
// ============================================================

const ALERTA_COBRANZA_SELECT = `
  id, tipo_alerta, fecha_alerta, canal, enviada, gestionada, gestionada_at,
  cuota:cuota!cuota_id!inner(
    id, numero_cuota, monto_programado, moneda, fecha_vencimiento,
    venta:venta!venta_id!inner(
      id, codigo_venta,
      cliente:cliente!cliente_id!inner(id, nombre, telefono, telefono_whatsapp, vendedor_username)
    )
  )
`;

export async function obtenerAlertasCobranza() {
  const supabase = await createServerActionClient();

  try {
    const puedeVerTodos = await tienePermiso(PERMISOS.PAGOS.VER_TODOS);

    // Excluye deuda ya resuelta: cuota pagada o venta cancelada/suspendida —
    // mismo filtro que el cron de cobranza-alertas
    // (src/app/api/cron/cobranza-alertas/route.ts:140-141). `!inner` en cada
    // relación embebida (ALERTA_COBRANZA_SELECT) es obligatorio para que
    // estos filtros excluyan la fila padre y no solo el objeto anidado —
    // mismo gotcha documentado en el cron route.
    let query = supabase
      .from('alerta_cobranza')
      .select(ALERTA_COBRANZA_SELECT)
      .neq('cuota.estado', 'pagada')
      .not('cuota.venta.estado', 'in', '("cancelada","suspendida")');

    // Sin PAGOS.VER_TODOS, solo alertas de clientes propios. `!inner` en cada
    // relación embebida es obligatorio: sin él, PostgREST filtra el objeto
    // anidado pero NO la fila padre (gotcha documentado en el cron route de
    // cobranza-alertas — src/app/api/cron/cobranza-alertas/route.ts:129-134).
    if (!puedeVerTodos) {
      const authResult = await obtenerUsernameActual(supabase);
      if (!authResult.success) return authResult;
      query = query.eq('cuota.venta.cliente.vendedor_username', authResult.username);
    }

    const { data, error } = await query.order('fecha_alerta', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    return (
      handleSupabaseError(error, 'obtenerAlertasCobranza') ?? {
        success: false,
        error: error?.message || 'No se pudieron cargar las alertas de cobranza',
      }
    );
  }
}

export interface RegistrarGestionCobranzaInput {
  cuotaId: string;
  clienteId: string;
  alertaId?: string | null;
  medio: MedioGestionCobranza;
  resultado: ResultadoGestionCobranza;
  notas?: string;
  fechaGestion?: string;
}

const MEDIOS_GESTION_VALIDOS: MedioGestionCobranza[] = [
  'llamada', 'whatsapp', 'email', 'visita', 'mensaje',
];
const RESULTADOS_GESTION_VALIDOS: ResultadoGestionCobranza[] = [
  'contactado', 'no_contactado', 'promesa_pago', 'pago_parcial', 'renegociacion', 'ilocalizable',
];

/**
 * Valida que la fecha de gestión sea parseable y no esté en el futuro.
 * Compara por prefijo de fecha (YYYY-MM-DD) contra el día calendario de Lima
 * (limaToday()) en vez de la fecha UTC del proceso servidor — evita rechazar
 * una gestión de "hoy" cuando el instante UTC ya cruzó la medianoche pero en
 * Lima (UTC-5) todavía es el día calendario anterior (mismo criterio que el
 * <input type="date"> del modal, que también usa limaToday()).
 */
function validarFechaGestionNoFutura(fecha: string): { valid: boolean; error?: string } {
  const fechaObj = new Date(fecha);
  if (isNaN(fechaObj.getTime())) {
    return { valid: false, error: 'Fecha de gestión no es válida' };
  }
  const hoySoloDia = limaToday();
  const fechaSoloDia = fecha.slice(0, 10);
  if (fechaSoloDia > hoySoloDia) {
    return { valid: false, error: 'La fecha de gestión no puede ser en el futuro' };
  }
  return { valid: true };
}

export async function registrarGestionCobranza(input: RegistrarGestionCobranzaInput) {
  if (!MEDIOS_GESTION_VALIDOS.includes(input.medio)) {
    return { success: false, error: 'El medio de gestión no es válido' };
  }
  if (!RESULTADOS_GESTION_VALIDOS.includes(input.resultado)) {
    return { success: false, error: 'El resultado de gestión no es válido' };
  }

  // Fallback also uses limaToday() (not new Date().toISOString()) so the
  // omitted-fechaGestion path shares the same Lima-anchored date format as
  // an explicit "YYYY-MM-DD" input, instead of a UTC-instant ISO string.
  const fechaGestion = input.fechaGestion || limaToday();
  const validacionFecha = validarFechaGestionNoFutura(fechaGestion);
  if (!validacionFecha.valid) {
    return { success: false, error: validacionFecha.error! };
  }

  const supabase = await createServerActionClient();

  try {
    const authResult = await obtenerUsernameActual(supabase);
    if (!authResult.success) return authResult;

    // p_fecha_gestion is timestamptz and the Postgres session TimeZone is
    // UTC, so a bare "YYYY-MM-DD" string would parse as UTC midnight — 19:00
    // the PREVIOUS day in América/Lima (UTC-5, no DST). Anchor date-only
    // strings explicitly to Lima midnight before sending them to the RPC so
    // the gestión is stored on the intended Lima calendar day.
    const fechaGestionRpc = /^\d{4}-\d{2}-\d{2}$/.test(fechaGestion)
      ? `${fechaGestion}T00:00:00-05:00`
      : fechaGestion;

    // RPC atómica: inserta la gestión y, si viene de una alerta real, marca
    // gestionada = true en la MISMA transacción (crm.registrar_gestion_cobranza,
    // 20260705000000_cobranza_alertas_p2.sql) — evita el gestión-huérfana que
    // dejaba el insert+update en dos pasos si el update era filtrado por RLS.
    const { data, error } = await supabase.schema('crm').rpc('registrar_gestion_cobranza', {
      p_alerta_id: input.alertaId || null,
      p_cuota_id: input.cuotaId,
      p_cliente_id: input.clienteId,
      p_medio: input.medio,
      p_resultado: input.resultado,
      p_notas: input.notas || null,
      p_fecha_gestion: fechaGestionRpc,
    });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Ya existe una gestión registrada para esta alerta' };
      }
      return (
        handleSupabaseError(error, 'registrarGestionCobranza') ?? {
          success: false,
          error: 'No se pudo registrar la gestión',
        }
      );
    }

    revalidatePath('/dashboard/cobranza');
    return { success: true, data: { id: data as string } };
  } catch (error: any) {
    return (
      handleSupabaseError(error, 'registrarGestionCobranza') ?? {
        success: false,
        error: error?.message || 'No se pudo registrar la gestión',
      }
    );
  }
}
