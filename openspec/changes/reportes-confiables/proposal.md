# Trustworthy management reportes (`reportes-confiables`)

Give management a **real** view of the business, its clients, and vendedor performance in the `admin/reportes` module. Today several headline metrics silently lie — they filter `estado_cliente` against enum values that no longer exist, compare against hardcoded zeros, and truncate at PostgREST's 1000-row cap on a ~22k-client database. A dashboard that shows "0% conversión" or "0 clientes activos" while the business is clearly selling erodes management's trust in every other number on the screen. This change fixes the metrics that lie (P0), adds one consolidated vendedor **scorecard**, and unifies cobranza reporting with the real collections system so reportes and the dashboard agree.

## Why now

- The April-2026 UX priorities (KPI cards, sidebar, funnel drill-down) and the 2026-05-14 period/historical semantics fix are already shipped — the module *looks* finished, which makes the silent data lies more dangerous, not less.
- Verified live bugs: `ventas.ts:143` filters `estado_cliente IN ('lead','prospecto')` (neither exists) → "Tasa de Conversión" is always 0%. `clientes.ts:32` compares `=== 'activo'` (does not exist) → "Clientes Activos" card is always 0.
- The real collections system (`alerta_cobranza`/`gestion_cobranza`, shipped 2026-07-04) is invisible to reportes, which computes mora independently with different aging logic — two sources of truth that can disagree.

## Who this is for

| User | Situation | Need |
|------|-----------|------|
| Management / admin | Reviewing business health, deciding on strategy | Numbers they can trust: real conversion, real active clients, real mora |
| Coordinador | Evaluating and coaching the sales team | One vendedor scorecard instead of cross-referencing 6 fragmented tabs |
| Cobranza / finance | Chasing overdue cuotas | Reportes mora that matches the dashboard cobranza hub for the same cutoff |

## Scope

### In scope

**Pillar 1 — P0 data correctness (metrics that silently lie)**

| Fix | Where |
|-----|-------|
| Conversion uses valid `estado_cliente` model (`por_contactar`/`contactado`/`intermedio`/`potencial`/`en_proceso`/`propietario`/`desestimado`/`transferido`) | `ventas.ts`, `origen-lead.ts` |
| "Clientes Activos" stops comparing against nonexistent `'activo'` | `clientes.ts` |
| Funnel labels cover `en_proceso`/`propietario`, drop dead old-model labels | `ReporteFunnel.tsx` |
| Date filters add missing `.lte(fechaFin)` (custom past ranges) | `clientes.ts` (Gestión), `interacciones.ts` |
| Remove/replace hardcoded fakes: `ventasPeriodoAnterior:0`, `metas` `*5`/`*10` heuristic, dead `PerformanceStat.change` | `ventas.ts`, `objetivos`, `rendimiento.ts` |
| Exact server-side counts (`head:true`) instead of unbounded `.select()` at 1000-row cap | `funnel.ts`, `metricas-fetchers.ts`, `cobranza.ts`, `comisiones.ts` |

**Pillar 2 — Unified vendedor scorecard**
- One consolidated view, one row per vendedor: leads asignados, conversión, tiempo de respuesta, actividad (interacciones), ventas del período, meta vs real, comisiones.
- Real metas source (`obtenerKPIs` from `admin/metas/_actions-metas` + `calcularProgresoMeta`, the same source the dashboard `MetaDelMes`/`VentasVsMetaBlock` use) replaces the `*5`/`*10` heuristic where metas exist; heuristic fallback only when no meta is assigned.

**Pillar 3 — Cobranza single source of truth**
- Unify reportes aging semantics with the dashboard mora tiers (`src/lib` cobranza-alertas logic) so both agree for the same cutoff.
- Surface `gestion_cobranza` activity in the cobranza report.

### Out of scope (deferred, P2)

- Extending `buildCachedReportFetcher` to uncached fetchers beyond what touched code requires.
- Excel/`.xlsx` export; CSV expansion beyond current tabs.
- Any redesign of the already-shipped KPI cards / sidebar / funnel drill-down.
- Changing the `estado_cliente` model itself, or new collections tables.

## Capabilities

### New Capabilities
- `vendedor-scorecard`: consolidated one-row-per-vendedor performance view (leads, conversion, response time, activity, sales, meta vs real, commissions).

### Modified Capabilities
- `reportes-metrics-correctness`: conversion / active-clients / origen conversion / funnel labels / date-range filters compute against the valid `estado_cliente` model and real (non-hardcoded) comparisons, with exact server-side counts.
- `reportes-cobranza`: aging semantics unified with the dashboard mora system; `gestion_cobranza` activity surfaced.

## Approach

1. **Correctness first (Pillar 1).** Replace stale enum filters with the valid model, add missing `.lte`, delete hardcoded fakes, and swap unbounded `.select()` for exact `head:true` counts (the pattern already proven in `src/lib/cache.server.ts getCachedFunnelClientes`). Each fix is test-first (strict TDD).
2. **Reuse, don't reinvent (Pillars 2 & 3).** The scorecard aggregates existing fetchers plus the real metas source; cobranza reuses the dashboard's mora tier logic rather than its own. No new aging math, no new metas heuristic.
3. **Slice by pillar.** P0 correctness ships first (highest trust impact, smallest per-fix diff), then scorecard, then cobranza unification — auto-chain stacked-to-main, boundaries decided by the tasks phase.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `admin/reportes/actions/ventas.ts`, `clientes.ts`, `origen-lead.ts`, `rendimiento.ts`, `objetivos` | Modified | Valid enum filters, real comparisons, drop fakes |
| `admin/reportes/actions/funnel.ts`, `metricas-fetchers.ts`, `cobranza.ts`, `comisiones.ts` | Modified | Exact server-side counts, no 1000-row truncation |
| `admin/reportes/actions/interacciones.ts` | Modified | Add missing `.lte(fechaFin)` |
| `admin/reportes/components/ReporteFunnel.tsx` | Modified | Correct/complete `ESTADO_LABELS` |
| `admin/reportes` (new scorecard action + component) | New | Unified vendedor scorecard |
| `admin/reportes/actions/cobranza.ts` + `src/lib` mora tiers | Modified | Unified aging, `gestion_cobranza` surfaced |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| A "fixed" metric now shows a large nonzero where stakeholders were used to 0 — read as a regression | Med | Success criteria assert nonzero-and-plausible; note the fix in release comms; verify against known sales |
| Exact-count refactor changes query shape and perf on 22k rows | Med | Use the proven `head:true` count pattern; targeted tests; no bulk-row fetch for counting |
| Scorecard aggregation double-counts or mismatches per-tab numbers | Med | Reuse existing fetchers as the single computation source; reconcile against current tabs in tests |
| Cobranza unification shifts reportes mora vs. current numbers | Med | Treat dashboard mora as canonical; assert reportes mora == dashboard mora for same cutoff |
| RPC `RETURNS TABLE` varchar without `::TEXT` cast (project gotcha) | Low | Cast to `::TEXT`; covered by targeted tests |

## Rollback Plan

Each pillar ships as its own stacked PR against main; revert the offending PR to restore prior behavior. P0 correctness fixes are self-contained per fetcher — a single fetcher can be reverted without touching the scorecard or cobranza work. No schema migrations are required for Pillar 1; Pillars 2–3 read existing tables only.

## Dependencies

- Existing real metas source (`admin/metas/_actions-metas`, `src/lib/dashboard/meta.ts`).
- Existing dashboard mora tier logic (`src/lib`, cobranza-alertas change) and `alerta_cobranza`/`gestion_cobranza` tables (2026-07-04).
- Valid `estado_cliente` model (`src/lib/types/clientes.ts`, migration `20260512000000_estado_propietario.sql`).

## Success Criteria

- [ ] "Tasa de Conversión" shows a real nonzero, plausible value driven by valid `estado_cliente` states.
- [ ] "Clientes Activos" card reflects real active clients, not 0.
- [ ] Origen-lead "mejor conversión" uses valid advanced states.
- [ ] Funnel labels render human copy for every current state (incl. `en_proceso`/`propietario`), no raw enum.
- [ ] Custom past date ranges are bounded by `.lte(fechaFin)` in Gestión and Interacciones.
- [ ] No report metric relies on a hardcoded zero or the `*5`/`*10` heuristic where a real meta exists.
- [ ] Counts are exact server-side; no metric is truncated by the 1000-row cap at ~22k clients.
- [ ] One vendedor scorecard shows all seven dimensions per vendedor in a single view.
- [ ] Reportes mora equals dashboard mora for the same cutoff date.
- [ ] `gestion_cobranza` activity is visible in the cobranza report.

## Next step

Run `sdd-spec` (acceptance criteria per metric fix, scorecard columns, cobranza parity assertions) and `sdd-design` (exact-count refactor pattern, scorecard aggregation source, mora-tier reuse boundary) — both can run in parallel from this proposal.
