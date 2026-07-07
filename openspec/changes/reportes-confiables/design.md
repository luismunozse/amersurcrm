# Design — Trustworthy Management Reportes (`reportes-confiables`)

This design fixes the `admin/reportes` metrics that silently lie, adds one consolidated vendedor scorecard, and unifies cobranza reporting with the real collections system. The architecture is deliberately **conservative**: no new tables, no framework changes, no redesign of shipped UI. The whole change reduces to four moves — (1) single-source the client-state business vocabulary, (2) replace unbounded `.select().length` with the counting strategy that fits each fetcher, (3) replace hardcoded/heuristic comparisons with real queries against sources the dashboard already trusts, and (4) reuse `tiers.ts` for cobranza aging instead of a parallel rule.

## Architecture at a glance

| Concern | Decision | Pattern reused |
|---------|----------|----------------|
| Client-state vocabulary | One canonical module `estados.ts` with **named business groups** derived from `EstadoCliente`, plus an exhaustiveness type-test | `getEstadoClienteLabel` union in `types/clientes.ts` |
| Counting at 22k rows | **Two strategies**: exact `head:true` count when only a number is needed; bounded paginated fetch when rows must be aggregated | `getCachedFunnelClientes` (per-estado head counts) + `detalle-ventas-periodo.ts` (count-then-fetch) |
| Previous-period comparison | Shared `calcularVentanaAnterior()` in `shared.ts`, reusing `calcularFechas` normalization | dashboard `meta.ts` MoM helpers |
| Meta source | Read `meta_vendedor` via the existing metas action; **"sin meta asignada"** when absent, never a heuristic presented as a real target | dashboard `MetaDelMes`/`VentasVsMetaBlock` |
| Scorecard | New `obtenerScorecardVendedores` that **joins existing per-vendedor fetcher outputs** by `username` — parity by construction | `por-vendedor.ts`, `rendimiento.ts`, `interacciones.ts`, `comisiones.ts` |
| Cobranza aging | Import `computeTier` + `limaToday` from `tiers.ts`; surface `gestion_cobranza` | dashboard cobranza-alertas system |
| Caching | Wrap only fetchers already being restructured, auth outside cache | `buildCachedReportFetcher` (funnel/por-vendedor precedent) |

## Layering and boundaries

```
src/lib/reportes/estados.ts        ← NEW: canonical estado business groups (pure, no I/O, no server-only)
src/lib/reportes/pagination.ts     ← NEW (optional): fetchAllRows() bounded paginator (pure over a query builder)
        │
        ▼
admin/reportes/actions/*.ts        ← fetchers import estados.ts + pagination + shared metas/tiers
        │  (ventas, clientes, origen-lead, funnel, metricas-fetchers,
        │   cobranza, comisiones, interacciones, rendimiento, scorecard NEW)
        ▼
admin/reportes/components/*.tsx    ← ReporteFunnel labels, ScorecardVendedores NEW component
```

`estados.ts` lives under `src/lib/reportes/` (not inside `actions/`) so it is import-safe from client components — same reasoning that keeps `shared.ts` free of `server-only` imports. It must NOT import `next/cache` or `supabase.server`.

---

## ADR 1 — Canonical estado-cliente business vocabulary

**Decision.** Create `src/lib/reportes/estados.ts` as the single source of truth for *which of the 8 states means what for reporting*. It derives from the `EstadoCliente` union in `types/clientes.ts` and exposes **named business groups** plus predicates, so no fetcher ever hand-writes a state literal again.

```ts
// src/lib/reportes/estados.ts
import type { EstadoCliente } from "@/lib/types/clientes";

// Compile-time exhaustiveness: adding a 9th EstadoCliente forces an update here.
const ESTADO_META: Record<EstadoCliente, { activo: boolean; avanzado: boolean; convertido: boolean }> = {
  por_contactar: { activo: true,  avanzado: false, convertido: false },
  contactado:    { activo: true,  avanzado: true,  convertido: false },
  intermedio:    { activo: true,  avanzado: true,  convertido: false },
  potencial:     { activo: true,  avanzado: true,  convertido: false },
  en_proceso:    { activo: true,  avanzado: true,  convertido: false },
  propietario:   { activo: true,  avanzado: true,  convertido: true  },  // owns property → converted
  desestimado:   { activo: false, avanzado: false, convertido: false }, // terminal / dead
  transferido:   { activo: false, avanzado: false, convertido: false }, // terminal / handed off
};

export const ESTADOS_CLIENTE_VALIDOS = Object.keys(ESTADO_META) as EstadoCliente[];
export const ESTADOS_ACTIVOS      = ESTADOS_CLIENTE_VALIDOS.filter(e => ESTADO_META[e].activo);
export const ESTADOS_AVANZADOS    = ESTADOS_CLIENTE_VALIDOS.filter(e => ESTADO_META[e].avanzado);
export const ESTADOS_CONVERTIDOS  = ESTADOS_CLIENTE_VALIDOS.filter(e => ESTADO_META[e].convertido);

export const esEstadoActivo     = (e: string): e is EstadoCliente => (ESTADO_META as any)[e]?.activo === true;
export const esEstadoConvertido = (e: string): e is EstadoCliente => (ESTADO_META as any)[e]?.convertido === true;
```

**Business mapping (explicit, single-sourced):**

| Group | States | Reporting meaning | Consumers |
|-------|--------|-------------------|-----------|
| `ACTIVOS` | all except `desestimado`, `transferido` | client is still in the pipeline | `clientes.ts` "Clientes Activos" card (replaces `=== 'activo'`) |
| `AVANZADOS` | `contactado`, `intermedio`, `potencial`, `en_proceso`, `propietario` | engaged past first contact | `origen-lead.ts` effectiveness ("avanzados", replaces the dead `['activo','en_seguimiento',…]` list) |
| `CONVERTIDOS` | `propietario` | closed — owns a property | estado-based conversion numerators |

**Note on "Clientes Activos" vs metricas "activos".** `metricas-fetchers.ts` already defines `activos` **behaviorally** (client with an interaction or venta in the period). That is a different, legitimate concept ("active in period"). We keep both but name them clearly: `esEstadoActivo` = pipeline membership (used by the `clientes.ts` card); behavioral activity stays in metricas and is conceptually `activosEnPeriodo`. The design does NOT unify them — they answer different questions — but documents the distinction so neither is mistaken for the other.

**Conversion denominator (the importación gotcha).** `getCachedFunnelClientes` proved that ~22k bulk-imported contacts (`origen_lead = 'importacion'`, `fecha_alta` = import date) swamp any estado distribution. Any estado-based conversion denominator in reportes MUST apply the same exclusion, or "Tasa de Conversión" will read implausibly low even after the enum fix. `obtenerMetricasRendimiento` conversion is redefined to the **funnel cohort** semantics: `leads del período (excluyendo backlog importación)` as denominator, `leads del período que llegaron a venta` as numerator — single-sourcing the definition with `funnel.ts` so the two conversion numbers cannot disagree.

**Test.** A unit test iterates every state literal used across `actions/*.ts` and asserts membership in `ESTADOS_CLIENTE_VALIDOS` (spec: "Filter literals are unit-tested against the valid set"). The `Record<EstadoCliente, …>` gives a *compile-time* guarantee that the vocabulary stays complete.

**Alternatives rejected.**

| Option | Why rejected |
|--------|--------------|
| Inline the valid array in each fetcher | Reintroduces the exact drift that caused the bug (`ventas.ts` and `clientes.ts` diverged independently). |
| Put groups in `types/clientes.ts` | That file is a form-options catalog shared everywhere; adding reporting semantics there overloads its purpose and risks client-bundle bloat. A dedicated `lib/reportes/estados.ts` keeps the concern local. |
| Derive groups from `ESTADOS_CLIENTE_OPTIONS` order/index | Positional coupling is fragile; explicit boolean flags per state are self-documenting and survive reordering. |

---

## ADR 2 — Exact counts vs paginated fetch, per offender

**Decision.** Pick the counting strategy by **what the fetcher actually needs**, not a blanket rule:

- **Strategy A — exact head count.** When the fetcher only needs a *number*, use `.select('id', { count: 'exact', head: true })`. Cost: one cheap query, zero row transfer, no 1000-cap. Mirror `getCachedFunnelClientes` (one head-count per estado, run in parallel).
- **Strategy B — bounded paginated fetch.** When the fetcher must *aggregate row values* (sum `precio_total`, sum `monto_programado - monto_pagado`, dedupe `cliente_id` sets, group by vendedor), a head count cannot help — you need the rows. Loop `.range(offset, offset + PAGE - 1)` (PAGE = 1000) until a page returns `< PAGE` rows. This is the generalization of the `detalle-ventas-periodo.ts` count-then-fetch precedent. Extract as `fetchAllRows(queryFactory)` in `src/lib/reportes/pagination.ts` so every offender uses the same tested loop.

**Per-offender assignment:**

| Fetcher | Needs | Strategy |
|---------|-------|----------|
| `funnel.ts` — `totalLeads`, contactados/visita/reserva/venta membership | counts + `cliente_id` sets for cross-referencing | Leads: A (per-nothing; but it also needs ids for set intersection) → **B for the id-bearing selects** (leads, interacciones, visitas, reservas, ventas), because membership requires the actual `cliente_id` rows. Distribution-by-estado can additionally use A per-estado. |
| `metricas-fetchers.ts` `fetchMetricasVentas` — sum `precio_total`, group by vendedor | row values | **B** |
| `metricas-fetchers.ts` `fetchMetricasClientes` — `nuevos`, `activos`, conversion | `totalHistorico` already uses A; `nuevos`/`activos` need ids | **A** for pure counts, **B** for the interaction/venta id sets |
| `metricas-fetchers.ts` `fetchMetricasInventario` — vendidas/disponibles counts by estado | counts | **A** per-estado head counts (replaces `.filter().length` over an unbounded fetch) |
| `cobranza.ts` — saldos, mora, top deudores | per-cuota `monto_*` rows | **B** (the `.from('cuota').select(...)` with no bound is the headline 1000-cap bug here) |
| `comisiones.ts` — sums by estado/vendedor/mes | per-comision rows | **B** |

**Rule of thumb encoded in the design:** *if the result is `x.length` or `x.reduce(...)` over an unbounded `.select()`, it is either a count (→ A) or an aggregation (→ B). Never leave it unbounded.*

**Alternatives rejected.**

| Option | Why rejected |
|--------|--------------|
| Force everything to `head:true` | Impossible for sums/dedupe — you cannot sum `precio_total` from a head count. |
| Raise PostgREST `Prefer: count` limit / server config | Out of scope, infra-wide blast radius, doesn't fix aggregation fetchers. |
| Move all aggregation into SQL RPCs / views | Larger change; RPCs `RETURNS TABLE` need the `::TEXT` cast gotcha and new migrations (out of scope). Paginated TS aggregation keeps the diff inside the touched fetchers. Flagged as a future P2. |

---

## ADR 3 — Real previous-period comparison

**Decision.** Add `calcularVentanaAnterior(startDate, endDate)` to `shared.ts`. It returns the window of the **same length immediately before `startDate`**: `prevEnd = startDate − 1ms`, `prevStart = prevEnd − (endDate − startDate)`, normalized to day boundaries the same way `calcularFechas` normalizes. `obtenerReporteVentas` runs a second `venta` sum over `[prevStart, prevEnd]` and puts the real value in `ventasPeriodoAnterior` (replacing the hardcoded `0`). The delta can reuse `calcularDeltaMensual` from `meta.ts`.

**Why here, not in `meta.ts`.** `meta.ts` `calcularPeriodoAnterior` is *calendar-month* based (for MoM). Reportes periods are arbitrary day ranges, so they need a length-based window. The two live side by side; the reportes one is placed in `shared.ts` because it is period-arithmetic, the natural neighbor of `calcularFechas`.

**Alternatives rejected.** Previous *calendar month* (mismatches custom ranges); previous *year* (not what "período anterior" means for a 30-day view). Length-matched immediately-prior window is the least surprising and comparable.

---

## ADR 4 — Meta source and absence rule

**Decision.** The canonical meta source is the `meta_vendedor` table, the same one `MetaDelMes`/`VentasVsMetaBlock` read (via `admin/metas/_actions-metas` → `obtenerMetas`/`obtenerKPIs`). Reportes reads it through the **existing metas action** (`obtenerMetas({ periodoAnio, periodoMes })`) rather than re-querying, so the parity with the dashboard is structural. When a vendedor/period has no `meta_vendedor` row, reportes shows the literal **"Sin meta asignada"** (a null/absent sentinel), never a computed number dressed as a target.

**The `*5`/`*10` heuristic is removed.** `obtenerObjetivosVsRealidad` currently invents `metaPropiedades = numVendedores * 5` and `metaClientesNuevos = numVendedores * 10`. These are exactly the "numbers that lie" this change exists to kill. They are deleted. Per-vendedor and per-metric meta displays use the real meta or "Sin meta asignada". If an *aggregate* org target must still render when zero metas are configured, it is shown as an explicitly-labeled estimate ("estimado — sin metas configuradas"), never as a real target — matching the spec scenario "Missing meta shows explicit absence".

**Period-vs-month reconciliation (important gotcha).** `meta_vendedor` is *monthly* (`periodo_anio`, `periodo_mes`); reportes filters are *arbitrary day ranges*. Rule: the meta figure for a report period is the **sum of monthly metas for every calendar month the period overlaps** (a single-month period → that month's meta; a 45-day span → two months summed). The scorecard documents this so "meta vs real" is comparing comparable windows.

**Alternatives rejected.**

| Option | Why rejected |
|--------|--------------|
| Keep `usuario_perfil.meta_mensual_ventas` as canonical | Diverges from the dashboard (breaks the parity requirement); it is a static per-user number, not the period-scoped `meta_vendedor` the business maintains. May remain as a *last-resort* fallback before "Sin meta", but not canonical. |
| Keep heuristic as silent fallback (proposal's softer wording) | Contradicts the spec's explicit-absence scenario; a heuristic shown as a target is the original lie. Allowed only when clearly labeled as an estimate. |

---

## ADR 5 — Scorecard architecture: join existing per-vendedor outputs

**Decision.** New server action `obtenerScorecardVendedores(periodo, fechaInicio?, fechaFin?, proyecto?)` produces one row per active vendedor by **left-joining the already-computed per-vendedor outputs of the existing fetchers**, keyed by `username`. It does NOT re-derive any metric with a fresh query. Single-source-of-truth is achieved by *reusing the computations*, so the scorecard cannot drift from the tabs (spec: "Scorecard reconciles with single-metric tabs").

**Composition (per dimension → source fetcher):**

| Scorecard column | Source |
|------------------|--------|
| leads asignados, contactados, conversión | `por-vendedor.ts` `_fetchPorVendedor` resumen/diario (per vendedor) |
| tiempo de respuesta | `tiempo-respuesta.ts` per-vendedor output |
| interacciones (actividad) | `interacciones.ts` `rankingVendedores` |
| ventas del período | `metricas-fetchers.ts` `fetchMetricasVentas.ventasPorVendedor` / `rendimiento.ts` |
| meta vs real | `meta_vendedor` via ADR 4 (real or "Sin meta asignada") |
| comisiones | `comisiones.ts` `porVendedor` |

**Row DTO:**

```ts
export interface ScorecardVendedorRow {
  username: string;
  nombre: string;
  leadsAsignados: number;
  contactados: number;
  conversionPct: number;           // reuses por-vendedor conversion (no re-derivation)
  tiempoRespuestaHoras: number | null;
  interacciones: number;
  ventasMonto: number;
  ventasCantidad: number;
  metaMonto: number | null;        // null → render "Sin meta asignada"
  metaCumplimientoPct: number | null;  // null when metaMonto is null
  comisionGenerada: number;
  comisionPagada: number;
}
export interface ScorecardVendedoresData {
  filas: ScorecardVendedorRow[];
  periodo: { inicio: string; fin: string; dias: number };
}
```

**Performance on 22k clients.** Composing the *public actions* wholesale would trigger several full report assemblies. Instead the action calls the **internal `_fetch*` pieces** (the per-vendedor aggregations already run one bounded set of period-scoped queries each) and reuses `buildCachedReportFetcher` so repeated scorecard renders inside the 60s TTL are free. To enable this, the internal per-vendedor helpers that are currently private (`por-vendedor`, `interacciones`, `comisiones`) may need to be exported as pure functions from their modules; the public actions keep wrapping them. This is a small, mechanical extraction, not a rewrite.

**UI.** New sidebar section under "Equipo" → "Scorecard". New `ScorecardVendedores.tsx` table component: dark-mode-aware, no `transition-all`, "Sin meta asignada" rendered as muted text, Peruvian formal Spanish headers. One row per vendedor, sortable columns.

**Alternatives rejected.**

| Option | Why rejected |
|--------|--------------|
| One new consolidated SQL/TS query computing all 7 dims fresh | Double computation → guaranteed drift from the tabs; the exact risk the proposal calls out. |
| Call the 6 public report actions and merge their full outputs | Wasteful (each returns heavy trend/detail payloads); pulls unrelated computation and multiplies DB load. Compose the internal per-vendedor pieces instead. |

---

## ADR 6 — Cobranza single source of truth

**Decision.** `obtenerReporteCobranza` imports `computeTier` and `limaToday` from `src/lib/cobranza/tiers.ts` and classifies each active cuota with the **same tier logic and the same Lima calendar date** the dashboard uses. The reportes-local aging (`new Date()` local time, ad-hoc `diasAtraso`, raw `estado` buckets) is replaced. The 90-day overdue cap in `computeTier` applies here too, so a cuota past the cap stops counting as mora in reportes exactly as it does on the dashboard — this is what makes "same cutoff → same mora total" hold (spec parity scenario).

**Mora definition alignment.** Today reportes `moraTotal` sums the `monto_mora` column across non-`pagada` cuotas — a *different quantity* from the dashboard's tier-based mora (cuotas whose `computeTier === 'mora'`). To satisfy parity, reportes exposes a tier-aligned mora figure (count + saldo of `mora`-tier cuotas within the cap) computed via `computeTier`, and keeps the accrued `monto_mora` as a **separately labeled** field so no information is lost. Parity assertions target the tier-aligned figure.

**Gestión activity.** Surface `gestion_cobranza` in the report: (a) summary counts of gestiones in the period grouped by `resultado`, and (b) a recent-gestiones list joined to cliente/cuota. `gestion_cobranza` rows are fetched with Strategy B (paginated) since we display rows, filtered to the period by gestión date.

**Gotcha — `tiers.ts` date contract.** `computeTier` expects `fechaVencimiento` as `"YYYY-MM-DD"` (date-only, no time). `cuota.fecha_vencimiento` is a `date` column, so pass it through unchanged — do NOT `new Date().toISOString()` it (that would introduce a UTC time component and shift the tier at day boundaries). `today` comes from `limaToday()`.

**Alternatives rejected.** Copying the tier thresholds into `cobranza.ts` (the parallel-rule anti-pattern that created the divergence); keeping the SQL view `v_cobranza.estado_cobranza` as the source for reportes (it lacks the 90-day cap and isn't unit-testable with injected dates — `tiers.ts` exists precisely because the view couldn't be tested).

---

## ADR 7 — Caching boundary

**Decision.** Wrap in `buildCachedReportFetcher` **only** the fetchers we are already restructuring for pagination/exact-counts, following the `funnel.ts`/`por-vendedor.ts` split (auth via `getAuthorizedClient` in the public wrapper, the pure `_fetch*` behind `unstable_cache` on a service-role client). Concretely: `cobranza.ts`, `comisiones.ts`, and the `metricas-fetchers` aggregations become cached as part of their refactor; the new `obtenerScorecardVendedores` is cached from the start. Fetchers touched only for a one-line date fix (`interacciones.ts`, `clientes.ts` Gestión) are **not** wrapped — that would exceed the touched-code scope and add service-role surface for no benefit.

**Constraint.** `buildCachedReportFetcher` uses a service-role client (bypasses RLS) and is admin-only — valid here because all reportes are already admin-gated by `getAuthorizedClient`. Auth MUST stay outside the cached function (per-request), never inside.

**Alternative rejected.** Wrapping every reportes fetcher now (proposal marks broad cache expansion as out-of-scope P2).

---

## ADR 8 — Slice boundaries (suggested; tasks phase decides)

Auto-chain, stacked-to-main, ~400-line feature budget per PR. Correctness first (highest trust impact, smallest diffs), then metas, then scorecard, then cobranza.

| Slice | Scope | Rough size |
|-------|-------|-----------|
| **1a — vocabulary + enum fixes** | `lib/reportes/estados.ts` + exhaustiveness/type test; fix `ventas.ts` conversion, `clientes.ts` `activos` + Gestión `.lte`, `origen-lead.ts` avanzados, `metricas-fetchers` `=== 'cliente'`, `interacciones.ts` `.lte`, `ReporteFunnel.tsx` labels | small |
| **1b — exact counts / pagination** | `lib/reportes/pagination.ts` `fetchAllRows`; apply Strategy A/B to `funnel.ts`, `metricas-fetchers.ts`, `cobranza.ts`, `comisiones.ts` (+ cache wrap where restructured) | medium |
| **2 — real comparisons** | `calcularVentanaAnterior` + `ventasPeriodoAnterior`; remove `*5`/`*10` heuristic; wire `meta_vendedor` into objetivos/rendimiento with "Sin meta asignada" | small–medium |
| **3 — scorecard** | export internal per-vendedor pieces; `obtenerScorecardVendedores` + `ScorecardVendedores.tsx` + sidebar "Equipo → Scorecard" | medium |
| **4 — cobranza unification** | `computeTier`/`limaToday` in `cobranza.ts`; tier-aligned mora; surface `gestion_cobranza` | medium |

Slices 1a and 2 can share a PR if both stay small; 1b, 3, 4 are each their own PR. Each slice is independently revertible (proposal rollback plan).

---

## Cross-cutting constraints

- **Strict TDD (vitest).** Every fetcher fix is test-first. Reuse the `createChainMock` supabase mock pattern from `reportes-cobranza-comisiones.test.ts` (chainable methods incl. `head`, `range`, `not`, `gte`, `lte`; `.then` resolves the final result). Pagination tests must exercise the `> 1000` path (mock two pages).
- **`PostgrestError` is not `instanceof Error`.** `safeAction` already coerces to `error.message`; keep throwing raw PostgrestErrors inside fetchers and let `safeAction` stringify — do not rely on `instanceof Error` for control flow.
- **RPC `RETURNS TABLE` varchar → `::TEXT`.** Not expected in this change (all TS-side aggregation), but if any helper touches an RPC, cast `varchar(N)` columns to `::TEXT` to avoid the `42804` gotcha.
- **UI:** Peruvian formal Spanish ("usted"), dark-mode-aware, no `transition-all`, empty states with copy.

## Checklist for the tasks/apply phases

- [ ] `lib/reportes/estados.ts` exists with `Record<EstadoCliente, …>` exhaustiveness and named groups.
- [ ] No `actions/*.ts` compares `estado_cliente` to a value outside the 8-state set (unit-tested).
- [ ] Every unbounded `.select().length`/`.reduce()` replaced by Strategy A (count) or B (paginate).
- [ ] `ventasPeriodoAnterior` comes from a real prior-window query.
- [ ] `*5`/`*10` heuristic deleted; meta reads `meta_vendedor`; absence renders "Sin meta asignada".
- [ ] `obtenerScorecardVendedores` reconciles with per-tab numbers (test).
- [ ] `cobranza.ts` mora uses `computeTier`+`limaToday`; parity test vs dashboard cutoff; `gestion_cobranza` surfaced.
- [ ] Cache wraps only restructured fetchers; auth stays outside the cache.

## Next step

Run `sdd-tasks` to break these ADRs into test-first work items and finalize slice boundaries against the ~400-line budget.
