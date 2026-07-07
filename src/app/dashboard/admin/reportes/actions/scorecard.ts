"use server";

import { getAuthorizedClient, calcularFechas, mesesEnRango, safeAction } from "./shared";
import { buildCachedReportFetcher } from "./shared-cache";
import { _fetchPorVendedor } from "./por-vendedor";
import { _fetchInteracciones } from "./interacciones";
import { _fetchComisiones } from "./comisiones";
import { _fetchTiempoRespuesta } from "./tiempo-respuesta";
import { fetchMetricasVentas } from "./metricas-fetchers";
import { obtenerMetas } from "@/app/dashboard/admin/metas/_actions-metas";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ScorecardVendedorRow {
  username: string;
  nombre: string;
  leadsAsignados: number;
  contactados: number;
  conversionPct: number;
  /**
   * Average hours to first contact (`_fetchTiempoRespuesta`'s
   * `promedioHoras`), resolved from `cliente.vendedor_asignado` (UUID) to
   * this vendedor's `username` — see the `_fetchScorecard` doc comment
   * below for the join mechanics. `null` when the vendedor has zero
   * attended clients in the period (never a fabricated `0`); renders as an
   * explicit "Sin datos" state.
   */
  tiempoRespuestaHoras: number | null;
  interacciones: number;
  ventasMonto: number;
  ventasCantidad: number;
  /** `null` → render "Sin meta asignada" (ADR4), never a heuristic number. */
  metaMonto: number | null;
  metaCumplimientoPct: number | null;
  comisionGenerada: number;
  comisionPagada: number;
}

export interface ScorecardVendedoresData {
  filas: ScorecardVendedorRow[];
  periodo: { inicio: string; fin: string; dias: number };
}

/**
 * Pure fetcher (no auth) — mirrors `funnel.ts`'s `_fetchFunnel` shape so it
 * can run behind `buildCachedReportFetcher` on a service-role client.
 *
 * design.md ADR5: one row per active vendedor, composed by **joining the
 * already-computed outputs of existing per-vendedor fetchers** by
 * `username` — no metric is re-derived with a fresh query, so the
 * scorecard cannot drift from the tabs it reuses:
 *   - leadsAsignados/contactados/conversionPct  ← `_fetchPorVendedor` (per
 *     vendedor, called with that vendedor's username as filter — the exact
 *     same call "Por Vendedor" makes, which is what guarantees
 *     reconciliation for the reused fields)
 *   - interacciones                              ← `_fetchInteracciones.rankingVendedores`
 *   - ventasMonto/ventasCantidad                  ← `fetchMetricasVentas.ventasPorVendedor`
 *   - metaMonto/metaCumplimientoPct                ← `meta_vendedor` via `obtenerMetas`,
 *     summed per vendedor across every calendar month `mesesEnRango` returns
 *     (ADR4 pattern from PR2's `ventas.ts`/`rendimiento.ts`); `null` when no
 *     row exists for the period — never a heuristic dressed as a target.
 *   - comisionGenerada/comisionPagada              ← `_fetchComisiones.porVendedor`
 *
 * `proyecto` filter: intentionally NOT accepted here. None of the composed
 * per-vendedor fetchers (`_fetchPorVendedor`, `_fetchInteracciones`,
 * `_fetchComisiones`, `fetchMetricasVentas`) support project scoping today,
 * and no sibling "Equipo" tab exposes a project selector either — there is
 * no global project filter control on this page to wire up. Adding an
 * inert `proyecto` param here would be a filter that silently does
 * nothing, which is the exact kind of lie this change exists to remove.
 *
 * `tiempoRespuestaHoras` (WARNING 1 follow-up, verify-report.md of archived
 * reportes-confiables) ← `_fetchTiempoRespuesta.rankingVendedores`, joined
 * by **UUID, not username**: that ranking is keyed by
 * `cliente.vendedor_asignado` (a `usuario_perfil.id` UUID), not
 * `vendedor_username` like every other fetcher composed here. Comparing it
 * directly against `v.username` would silently mis-join every row, so this
 * function additionally fetches `usuario_perfil.id -> username` for active
 * vendedores and resolves each ranking entry's raw key through that map
 * before building the join — `tiempo-respuesta.ts`'s own grouping key is
 * left untouched (no behavior change to that already-shipped, live tab).
 * Entries with zero `clientesAtendidos` (no real response times computed)
 * are excluded from the join so the row renders an honest `null` ("Sin
 * datos") instead of a fabricated `0`.
 */
export async function _fetchScorecard(
  supabase: SupabaseClient<any, "crm">,
  startISO: string,
  endISO: string,
  days: number,
): Promise<ScorecardVendedoresData> {
  const startDate = new Date(startISO);
  const endDate = new Date(endISO);
  const meses = mesesEnRango(startDate, endDate);

  // Fase 1: piezas agregadas independientes entre sí, en paralelo
  // (async-parallel) — ninguna depende del resultado de otra.
  const [catalogo, interaccionesData, comisionesData, ventasData, metasPorMes, tiempoRespuestaData, perfilesConId] =
    await Promise.all([
      _fetchPorVendedor(supabase, startISO, endISO, days, null),
      _fetchInteracciones(supabase, startISO, endISO),
      _fetchComisiones(supabase, startISO, endISO),
      fetchMetricasVentas(supabase, startISO, endISO),
      Promise.all(meses.map((m) => obtenerMetas({ periodoAnio: m.anio, periodoMes: m.mes }))),
      _fetchTiempoRespuesta(supabase, startISO, endISO, days),
      supabase.schema("crm").from("usuario_perfil").select("id, username").eq("activo", true),
    ]);

  const vendedoresActivos = catalogo.vendedores;

  // `_fetchTiempoRespuesta`'s ranking is keyed by `cliente.vendedor_asignado`
  // (a `usuario_perfil.id` UUID) — resolve it to `username` here so the join
  // below is a genuine identity match, not a positional guess. Entries with
  // no attended clients are skipped, leaving those vendedores unmapped
  // (→ honest `null`, not a fabricated `0`).
  const idAUsername = new Map<string, string>(
    (perfilesConId.data ?? [])
      .filter((p: any) => p.id && p.username)
      .map((p: any) => [String(p.id), p.username as string]),
  );
  const tiempoRespuestaPorUsername = new Map<string, number>();
  tiempoRespuestaData.rankingVendedores.forEach((r) => {
    if (r.clientesAtendidos <= 0) return;
    const username = idAUsername.get(r.username);
    if (!username) return;
    tiempoRespuestaPorUsername.set(username, r.promedioHoras);
  });

  // Fase 2: desglose por vendedor individual. Un llamado a `_fetchPorVendedor`
  // POR vendedor activo, con ese vendedor como filtro — la misma llamada que
  // "Por Vendedor" hace, en paralelo entre vendedores (async-parallel).
  const porVendedorRows = await Promise.all(
    vendedoresActivos.map((v) => _fetchPorVendedor(supabase, startISO, endISO, days, v.username)),
  );

  const interaccionesMap = new Map(
    interaccionesData.rankingVendedores.map((r) => [r.username, r.totalInteracciones]),
  );
  const comisionesMap = new Map(comisionesData.porVendedor.map((c) => [c.username, c]));

  const metaRows = metasPorMes.flatMap((r) => (r.success ? r.data ?? [] : []));
  const metaPorVendedor = new Map<string, number>();
  const vendedoresConMeta = new Set<string>();
  metaRows.forEach((m: any) => {
    const username = m.vendedor_username as string;
    vendedoresConMeta.add(username);
    metaPorVendedor.set(username, (metaPorVendedor.get(username) || 0) + Number(m.meta_ventas_monto || 0));
  });

  const filas: ScorecardVendedorRow[] = vendedoresActivos.map((v, i) => {
    const resumen = porVendedorRows[i].resumen;
    const ventasVendedor = ventasData.ventasPorVendedor.get(v.username);
    const comision = comisionesMap.get(v.username);
    const ventasMonto = ventasVendedor?.ventas ?? 0;
    const metaMonto = vendedoresConMeta.has(v.username) ? metaPorVendedor.get(v.username)! : null;

    return {
      username: v.username,
      nombre: v.nombre,
      leadsAsignados: resumen.totalLeads,
      contactados: resumen.totalContactados,
      conversionPct: parseFloat(resumen.conversionGlobal) || 0,
      tiempoRespuestaHoras: tiempoRespuestaPorUsername.get(v.username) ?? null,
      interacciones: interaccionesMap.get(v.username) ?? 0,
      ventasMonto,
      ventasCantidad: ventasVendedor?.propiedades ?? 0,
      metaMonto,
      metaCumplimientoPct: metaMonto !== null && metaMonto > 0
        ? Math.round((ventasMonto / metaMonto) * 1000) / 10
        : null,
      comisionGenerada: comision?.total_generado ?? 0,
      comisionPagada: comision?.pagada_monto ?? 0,
    };
  });

  return {
    filas,
    periodo: { inicio: startISO, fin: endISO, dias: days },
  };
}

const fetchScorecardCached = buildCachedReportFetcher(
  _fetchScorecard,
  ["reporte-scorecard"],
  60,
);

export async function obtenerScorecardVendedores(
  periodo: string = "30",
  fechaInicio?: string,
  fechaFin?: string,
): Promise<{ data: ScorecardVendedoresData | null; error: string | null }> {
  return safeAction(async () => {
    // Auth check fuera de la cache (per-request, sin cookies adentro).
    await getAuthorizedClient();

    const { startDate, endDate, days } = calcularFechas(periodo, fechaInicio, fechaFin);
    return fetchScorecardCached(startDate.toISOString(), endDate.toISOString(), days);
  });
}
