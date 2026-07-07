import "server-only";
import { cache } from "react";
import { createOptimizedServerClient } from "@/lib/supabase.server";
import {
  isAgingLead,
  AGING_THRESHOLD_DAYS,
  AGING_WINDOW_DAYS,
  EXCLUIR_IMPORTACION_NUNCA_CONTACTADO,
  type AgingClienteInput,
} from "./aging";

/**
 * Command-center data layer (design.md §2 "New fetchers — explicit flags").
 * Three genuinely new fetchers, all accepting `esGlobal` resolved once
 * by the caller (via `getPerfilRol()` in `scope.server.ts`) so they skip
 * their own `usuario_perfil` lookup. When `esGlobal` is false they return
 * empty defensively — the command center is already role-gated at the page
 * and DB RLS (`crm.p1_puede_ver_cliente` / `es_visibilidad_global()`) is the
 * real backstop, mirroring the existing coordinador-global behavior in
 * `getCachedPipelineClientes` and `sidebar-badges`.
 *
 * Each fetcher takes a single primitive argument (`esGlobal: boolean`), not
 * `{ esGlobal }`. `React.cache` dedupes by `Object.is` on the arguments — a
 * fresh object literal is a new reference on every call site, so wrapping
 * the flag in an object made `cache()` inert (every call was a miss). A
 * primitive argument lets two calls with the same boolean actually dedupe
 * within a request (dashboard-rol PR2a review round 1, fix 4).
 */

/* ========= Aging leads (ADR-3) ========= */

export type AgingLead = AgingClienteInput & {
  id: string;
  nombre: string;
};

export type AgingLeadsResult = {
  count: number;
  /**
   * `true` when `count` is exact; `false` when the candidate scan hit
   * `AGING_CANDIDATE_LIMIT` and `count` is an honest upper bound instead
   * (see the count-semantics comment inside `getAgingLeads`). PR2b's UI
   * should render a non-exact count as e.g. "200+" rather than a precise
   * number.
   */
  isExact: boolean;
  top: AgingLead[];
};

// Bounds the raw candidate scan, mirroring the crowd-out guard already used
// by getCachedSeguimientosHoy's global branch (cache.server.ts).
const AGING_CANDIDATE_LIMIT = 200;
const AGING_TOP_LIMIT = 5;

// States excluded from the aging candidate pool. Full estado_cliente CHECK
// list (verified against 20260512000000_estado_propietario.sql:15-24):
// por_contactar, contactado, intermedio, potencial, en_proceso, propietario,
// desestimado, transferido.
//  - 'desestimado' : lead discarded — nothing left to chase.
//  - 'transferido' : ownership moved elsewhere — no longer this org's follow-up.
//  - 'propietario' : terminal state added by that migration — the client
//                     already bought (crm.cerrar_proceso_y_crear_venta moves
//                     them here on close); there is no "next action" left to
//                     age. Omitting it was a bug (dashboard-rol PR2a review
//                     round 1, fix 1): a bought client with a stale
//                     `ultimo_contacto` was incorrectly counted as aging.
// 'en_proceso' is intentionally INCLUDED: a client mid-sale-process can still
// go stale if follow-up lapses, and design.md ADR-3's predicate never carved
// it out.
const ESTADOS_EXCLUIDOS_SQL = '("desestimado","transferido","propietario")';

export const getAgingLeads = cache(
  async (esGlobal: boolean): Promise<AgingLeadsResult> => {
    if (!esGlobal) return { count: 0, isExact: true, top: [] };

    const supabase = await createOptimizedServerClient();
    const now = new Date();
    const umbral = new Date(now.getTime() - AGING_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
    // Fix 2: only clientes created within the last AGING_WINDOW_DAYS days are
    // actionable aging candidates (aging.ts's doc comment has the full WHY —
    // legacy/historical clients pre-dating the window aren't actionable,
    // mirroring the cobranza 90-day standing-cap decision). Computed ONCE and
    // reused by BOTH the candidate query below and the at-cap head-count
    // query further down — mirrors the existing own-scope `.or()` predicate
    // that's already duplicated between those two queries; don't add a
    // second independent copy of this filter too.
    const cutoffFechaAlta = new Date(now.getTime() - AGING_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Step 1: candidate clientes by state + stale/null ultimo_contacto +
    // recency window. PostgREST has no NOT EXISTS, so the future-action
    // exclusion (step 2) runs as a separate query — same two-step pattern as
    // getCachedPipelineClientes / getCachedSeguimientosHoy (ADR-3, design.md).
    const { data: candidatos, error: errorCandidatos } = await supabase
      .schema('crm')
      .from('cliente')
      .select('id, nombre, estado_cliente, ultimo_contacto, fecha_alta')
      .not('estado_cliente', 'in', ESTADOS_EXCLUIDOS_SQL)
      .or(`ultimo_contacto.is.null,ultimo_contacto.lte.${umbral.toISOString()}`)
      // Data-provenance fix: bulk imports stamp `origen_lead = 'importacion'`
      // with `fecha_alta` set to the import date, so the AGING_WINDOW_DAYS
      // cutoff above cannot tell a stale-but-recently-imported cliente from
      // a genuinely fresh, never-worked lead — without this, ~22k imported
      // contacts would dominate the aging-leads count. Excluding a shared
      // constant (not a locally re-derived string) keeps this query and the
      // at-cap head-count query below in lockstep, same as cutoffFechaAlta.
      .or(EXCLUIR_IMPORTACION_NUNCA_CONTACTADO)
      .gte('fecha_alta', cutoffFechaAlta)
      .order('ultimo_contacto', { ascending: true, nullsFirst: true })
      .limit(AGING_CANDIDATE_LIMIT);

    if (errorCandidatos) {
      console.error('Error obteniendo candidatos aging:', errorCandidatos);
      return { count: 0, isExact: true, top: [] };
    }

    const candidatosList = (candidatos ?? []) as AgingLead[];
    if (candidatosList.length === 0) return { count: 0, isExact: true, top: [] };

    // Step 2: which candidates have a FUTURE scheduled action — excluded.
    const candidateIds = candidatosList.map((c) => c.id);
    const { data: futuras, error: errorFuturas } = await supabase
      .schema('crm')
      .from('cliente_interaccion')
      .select('cliente_id')
      .in('cliente_id', candidateIds)
      .gt('fecha_proxima_accion', now.toISOString());

    if (errorFuturas) {
      console.error('Error obteniendo acciones futuras (aging):', errorFuturas);
    }

    const idsConAccionFutura = new Set(
      (futuras ?? []).map((row: { cliente_id: string }) => row.cliente_id),
    );

    const aging = candidatosList.filter((c) =>
      isAgingLead(c, idsConAccionFutura.has(c.id), now),
    );
    const top = aging.slice(0, AGING_TOP_LIMIT);

    // Count semantics (design.md ADR-3: "count from a count query", NOT
    // derived from the LIMIT-200 preview fetch — dashboard-rol PR2a review
    // round 1, fix 2).
    //
    // When the capped candidate scan above returned FEWER rows than
    // AGING_CANDIDATE_LIMIT, it necessarily captured the ENTIRE candidate
    // population — a plain COUNT(*) with the same WHERE would return the
    // same number. The future-action exclusion (step 2) was also computed
    // over that complete set, so `aging.length` IS the exact aging count
    // here, with zero extra queries.
    //
    // When the scan HITS the cap (candidatosList.length === 200), there may
    // be more matching clientes beyond the visible window, and extending
    // the future-action exclusion exactly to all of them would require
    // either fetching every matching cliente id (unbounded — defeats the
    // crowd-out guard the cap exists for) or an embedded-join head-count
    // that risks counting cliente_interaccion row fan-out (a client with
    // several future interactions) instead of distinct clientes — neither
    // is cheap or safely exact. Instead we run ONE extra head-count query
    // (same WHERE, no order/limit) to report an honest UPPER BOUND: the
    // true aging count is <= this number, since it is not reduced by the
    // future-action exclusion beyond what's already visible. `isExact:
    // false` tells the caller this is a bound, not a precise count.
    if (candidatosList.length < AGING_CANDIDATE_LIMIT) {
      return { count: aging.length, isExact: true, top };
    }

    const { count: totalCandidatos, error: errorCount } = await supabase
      .schema('crm')
      .from('cliente')
      .select('id', { count: 'exact', head: true })
      .not('estado_cliente', 'in', ESTADOS_EXCLUIDOS_SQL)
      .or(`ultimo_contacto.is.null,ultimo_contacto.lte.${umbral.toISOString()}`)
      // Count-parity: same shared exclusion constant as the candidate query
      // above — an inexact upper-bound count must never be wider than what
      // the visible candidate pool already reflects.
      .or(EXCLUIR_IMPORTACION_NUNCA_CONTACTADO)
      .gte('fecha_alta', cutoffFechaAlta);

    if (errorCount || totalCandidatos == null) {
      console.error('Error obteniendo conteo total de candidatos aging:', errorCount);
      // Conservative floor: the scan already proved at least this many exist.
      return { count: AGING_CANDIDATE_LIMIT, isExact: false, top };
    }

    return { count: totalCandidatos, isExact: false, top };
  },
);

/* ========= Inventory by project (ADR-4) ========= */

export type ProyectoInventario = {
  proyectoId: string;
  nombre: string;
  disponible: number;
  reservado: number;
  vendido: number;
  total: number;
  pctVendido: number;
};

export type InventarioLotesResult = {
  proyectos: ProyectoInventario[];
  totales: { disponible: number; reservado: number; vendido: number; total: number; pctVendido: number };
};

const INVENTARIO_VACIO: InventarioLotesResult = {
  proyectos: [],
  totales: { disponible: 0, reservado: 0, vendido: 0, total: 0, pctVendido: 0 },
};

function pct(numerador: number, denominador: number): number {
  return denominador > 0 ? Math.round((numerador / denominador) * 100) : 0;
}

export const getInventarioLotesPorProyecto = cache(
  async (esGlobal: boolean): Promise<InventarioLotesResult> => {
    if (!esGlobal) return INVENTARIO_VACIO;

    const supabase = await createOptimizedServerClient();
    // Single query — lote(proyecto_id, estado) joined to proyecto(nombre) —
    // aggregated in JS. Avoids the N+1 of a per-project getCachedLotes call
    // (ADR-4 rejected alternative).
    const { data, error } = await supabase
      .schema('crm')
      .from('lote')
      .select('proyecto_id, estado, proyecto:proyecto!proyecto_id(nombre)');

    if (error) {
      console.error('Error obteniendo inventario de lotes por proyecto:', error);
      return INVENTARIO_VACIO;
    }

    type LoteInventarioRow = {
      proyecto_id: string | null;
      estado: string;
      proyecto: { nombre: string } | { nombre: string }[] | null;
    };

    const porProyecto = new Map<string, { nombre: string; disponible: number; reservado: number; vendido: number }>();

    for (const row of (data ?? []) as LoteInventarioRow[]) {
      const proyectoId = row.proyecto_id;
      if (!proyectoId) continue;

      const proyectoData = row.proyecto;
      const nombre = Array.isArray(proyectoData) ? proyectoData[0]?.nombre : proyectoData?.nombre;

      const entry = porProyecto.get(proyectoId) ?? {
        nombre: nombre ?? 'Sin nombre',
        disponible: 0,
        reservado: 0,
        vendido: 0,
      };

      if (row.estado === 'disponible') entry.disponible += 1;
      else if (row.estado === 'reservado') entry.reservado += 1;
      else if (row.estado === 'vendido') entry.vendido += 1;

      porProyecto.set(proyectoId, entry);
    }

    const proyectos: ProyectoInventario[] = Array.from(porProyecto.entries()).map(([proyectoId, e]) => {
      const total = e.disponible + e.reservado + e.vendido;
      return {
        proyectoId,
        nombre: e.nombre,
        disponible: e.disponible,
        reservado: e.reservado,
        vendido: e.vendido,
        total,
        pctVendido: pct(e.vendido, total),
      };
    });

    const totales = proyectos.reduce(
      (acc, p) => ({
        disponible: acc.disponible + p.disponible,
        reservado: acc.reservado + p.reservado,
        vendido: acc.vendido + p.vendido,
        total: acc.total + p.total,
      }),
      { disponible: 0, reservado: 0, vendido: 0, total: 0 },
    );

    return {
      proyectos,
      totales: { ...totales, pctVendido: pct(totales.vendido, totales.total) },
    };
  },
);

/* ========= Unmanaged alerts count (ADR-5) ========= */

// Same !inner join filters as obtenerAlertasCobranza
// (_actions-cobranza.ts) — excludes deuda already resolved (cuota pagada or
// venta cancelada/suspendida). `!inner` is required so the filters exclude
// the parent alerta_cobranza row, not just the nested object (same gotcha
// documented in src/app/api/cron/cobranza-alertas/route.ts).
//
// Correctness of the embedded `venta:venta!venta_id!inner(id, estado)` join
// below for a coordinador depends on crm.venta's OWN row-level SELECT
// policy, not just alerta_cobranza's/cuota's — RLS applies per-table to
// embedded joins, so a narrower policy on the joined table silently drops
// rows here even when alerta_cobranza_select/cuota_select already allow
// them. Fixed in
// supabase/migrations/20260706000000_venta_select_visibilidad_global.sql
// (adds `OR crm.es_visibilidad_global()` to venta_select_policy); until that
// migration is applied, this count silently undercounts for
// ROL_COORDINADOR_VENTAS. No TS-side change needed here — the fix is purely
// RLS-side.
const ALERTA_SIN_GESTIONAR_SELECT = `
  id,
  cuota:cuota!cuota_id!inner(
    id, estado,
    venta:venta!venta_id!inner(id, estado)
  )
`;

export const getAlertasSinGestionarCount = cache(
  async (esGlobal: boolean): Promise<number> => {
    if (!esGlobal) return 0;

    const supabase = await createOptimizedServerClient();
    const { count, error } = await supabase
      .schema('crm')
      .from('alerta_cobranza')
      .select(ALERTA_SIN_GESTIONAR_SELECT, { count: 'exact', head: true })
      .eq('gestionada', false)
      .neq('cuota.estado', 'pagada')
      .not('cuota.venta.estado', 'in', '("cancelada","suspendida")');

    if (error) {
      console.error('Error obteniendo conteo de alertas sin gestionar:', error);
      return 0;
    }

    return count ?? 0;
  },
);

/* ========= Resumen general (KPI tiles) ========= */

export type ResumenGeneral = {
  clientesNuevosMes: number;
  clientesTotales: number;
  proyectosActivos: number;
  lotesTotales: number;
  lotesPctDisponible: number;
  lotesPctVendido: number;
  vendedoresActivos: number;
};

const RESUMEN_GENERAL_VACIO: ResumenGeneral = {
  clientesNuevosMes: 0,
  clientesTotales: 0,
  proyectosActivos: 0,
  lotesTotales: 0,
  lotesPctDisponible: 0,
  lotesPctVendido: 0,
  vendedoresActivos: 0,
};

// Roles counted as "vendedores activos" for the KPI tile — front-line sales
// (ROL_VENDEDOR) plus their coordinator (ROL_COORDINADOR_VENTAS), who also
// carries an individual sales quota. ROL_ADMIN/ROL_GERENTE are excluded,
// they don't sell.
export const ROLES_VENDEDOR_ACTIVOS = ['ROL_VENDEDOR', 'ROL_COORDINADOR_VENTAS'] as const;

export const getResumenGeneral = cache(
  async (esGlobal: boolean): Promise<ResumenGeneral> => {
    if (!esGlobal) return RESUMEN_GENERAL_VACIO;

    const supabase = await createOptimizedServerClient();
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();

    const [clientesNuevosRes, clientesTotalesRes, proyectosActivosRes, inventario, vendedoresActivosRes] = await Promise.all([
      // "Clientes nuevos este mes" uses `cliente.fecha_alta`, NOT `created_at`.
      // `fecha_alta` (added by 2025-09-14_060_clientes_mejorados, DEFAULT NOW())
      // is the column every CURRENT reportes fetcher treats as "cuándo entró
      // el lead" — see funnel.ts:45 (`cliente` filters on `fecha_alta`) vs :54
      // (`reserva`, a different table, still keys off `created_at`), and
      // clientes-etapa-funnel.ts's "leads captados" step. The deleted
      // DashboardStats.tsx (git show 7d5cf39~1) queried `cliente.created_at`,
      // which predates `fecha_alta` and would silently disagree with every
      // other report's "nuevos" count — not reused here on purpose.
      supabase
        .schema('crm')
        .from('cliente')
        .select('id', { count: 'exact', head: true })
        .gte('fecha_alta', inicioMes),
      supabase.schema('crm').from('cliente').select('id', { count: 'exact', head: true }),
      supabase
        .schema('crm')
        .from('proyecto')
        .select('id', { count: 'exact', head: true })
        .eq('estado', 'activo'),
      // Reuse getInventarioLotesPorProyecto's already-computed totals instead
      // of running a second full `lote` scan — React.cache dedupes this call
      // against InventarioLotesBlock's/LotesDonutBlock's own call to the same
      // fetcher within the same request (same primitive `esGlobal` arg).
      getInventarioLotesPorProyecto(esGlobal),
      // Head-count of active vendedores/coordinador — PostgREST can filter a
      // head-count on an embedded column, but only when the embed is declared
      // `!inner` (same mechanism as ALERTA_SIN_GESTIONAR_SELECT above); without
      // it, `.in('rol.nombre', ...)` would silently narrow only the nested
      // `rol` object, not exclude non-matching `usuario_perfil` rows from the
      // count. `usuario_perfil` is small (tens of rows), so this single
      // head-count query is cheap — no need to fetch rows and filter in JS.
      supabase
        .schema('crm')
        .from('usuario_perfil')
        .select('id, rol:rol!usuario_perfil_rol_id_fkey!inner(nombre)', { count: 'exact', head: true })
        .eq('activo', true)
        .in('rol.nombre', ROLES_VENDEDOR_ACTIVOS),
    ]);

    if (clientesNuevosRes.error) {
      console.error('Error obteniendo clientes nuevos del mes:', clientesNuevosRes.error);
    }
    if (clientesTotalesRes.error) {
      console.error('Error obteniendo total de clientes:', clientesTotalesRes.error);
    }
    if (proyectosActivosRes.error) {
      console.error('Error obteniendo proyectos activos:', proyectosActivosRes.error);
    }
    if (vendedoresActivosRes.error) {
      console.error('Error obteniendo vendedores activos:', vendedoresActivosRes.error);
    }

    return {
      clientesNuevosMes: clientesNuevosRes.count ?? 0,
      clientesTotales: clientesTotalesRes.count ?? 0,
      proyectosActivos: proyectosActivosRes.count ?? 0,
      lotesTotales: inventario.totales.total,
      lotesPctDisponible: pct(inventario.totales.disponible, inventario.totales.total),
      lotesPctVendido: inventario.totales.pctVendido,
      vendedoresActivos: vendedoresActivosRes.count ?? 0,
    };
  },
);

/* ========= Ventas mensuales (últimos 6 meses) ========= */

export type VentasMensuales = Record<string, number>;

export const getVentasMensuales = cache(
  async (esGlobal: boolean): Promise<VentasMensuales> => {
    if (!esGlobal) return {};

    const supabase = await createOptimizedServerClient();
    const ahora = new Date();
    const hace6Meses = new Date(ahora.getFullYear(), ahora.getMonth() - 5, 1).toISOString();

    const { data, error } = await supabase
      .schema('crm')
      .from('venta')
      .select('fecha_venta')
      .eq('estado', 'finalizada')
      .gte('fecha_venta', hace6Meses)
      .order('fecha_venta', { ascending: true });

    if (error) {
      console.error('Error obteniendo ventas mensuales:', error);
      return {};
    }

    // Keys MUST be zero-padded "YYYY-MM" — `_VentasMensualesChart`'s
    // `formatearMes()` splits the key on '-' to render month labels.
    // `toLocaleDateString('es-PE', ...)` (as `reportes/page.tsx` uses) would
    // break that split — verified at implementation time it renders "7/2026"
    // (slash-separated, unpadded), not "2026-07".
    const resultado: VentasMensuales = {};
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      resultado[key] = 0;
    }

    for (const venta of (data ?? []) as { fecha_venta: string }[]) {
      const fecha = new Date(venta.fecha_venta);
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      if (key in resultado) {
        resultado[key] += 1;
      }
    }

    return resultado;
  },
);
