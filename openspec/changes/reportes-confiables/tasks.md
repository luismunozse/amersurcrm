# Tasks: Trustworthy Management Reportes (`reportes-confiables`)

Pipeline: single-source estado-cliente vocabulary → exact counts/pagination → real comparisons + meta source → vendedor scorecard → cobranza single source of truth. Strict TDD active (vitest); every fetcher fix has a RED/GREEN pair using the `createChainMock` supabase harness already established in `src/__tests__/unit/reportes-cobranza-comisiones.test.ts` (chainable methods incl. `head`, `range`, `not`, `gte`, `lte`; `.then` resolves the final mocked result).

**STRICT TDD constraint (this run):** targeted `npx vitest run <files>` only. Never run the full suite or `next build` in-sandbox — those gates are deferred to the orchestrator/CI before each PR merges, mirroring the `dashboard-rol` precedent (Phase 13.3 deferred, run post-commit).

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | PR1a ~150 prod / ~230 w/ tests; PR1b ~250 prod / ~420 w/ tests; PR2 ~170 prod / ~330 w/ tests; PR3 ~230 prod / ~420 w/ tests; PR4 ~180 prod / ~330 w/ tests |
| 400-line budget risk | Medium — no single PR breaches 400 prod lines, but the unsliced change would; each slice still gets its own PR for reviewer-load control (distinct concern per PR) |
| Chained PRs recommended | Yes |
| Suggested split | PR1a → PR1b → PR2 → PR3 → PR4 (stacked) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No — resolved (`auto-chain` / `stacked-to-main` already cached in `state.yaml`).
Chained PRs recommended: Yes (5 PRs, ~24 phases total).

### Suggested Work Units

| Unit | Goal | PR | Dependency notes |
|------|------|----|-------------------|
| 1 | `lib/reportes/estados.ts` vocabulary + fix invalid literals in `ventas.ts`/`clientes.ts`/`origen-lead.ts`/`metricas-fetchers.ts` + `ReporteFunnel.tsx` labels + 2 missing `.lte()` date bounds | PR1a | No deps — smallest, highest trust impact, ships first |
| 2 | `lib/reportes/pagination.ts` `fetchAllRows` + Strategy A/B applied to `funnel.ts`/`metricas-fetchers.ts`/`cobranza.ts`/`comisiones.ts` + cache wrap (ADR7) | PR1b | Imports `estados.ts` groups already merged in PR1a (no literal breakage) |
| 3 | `calcularVentanaAnterior`/`mesesEnRango` + real `ventasPeriodoAnterior` + `meta_vendedor` wiring, `*5`/`*10` heuristic deleted | PR2 | No file-level dependency on PR1b; sequenced after it by business priority only (ADR8: correctness → metas) |
| 4 | `obtenerScorecardVendedores` + `ScorecardVendedores.tsx` + sidebar "Equipo → Scorecard" | PR3 | Depends on PR2 (meta source/"Sin meta asignada") and PR1b (`_fetchComisiones` export) |
| 5 | Cobranza `computeTier`/`limaToday` unification + tier-aligned mora + `gestion_cobranza` surfacing | PR4 | Depends on PR1b's `_fetchCobranza` restructure (same file, sequential edits) |

---

## PR1a — Vocabulary + enum fixes + funnel labels

### Phase 1: `estados.ts` — canonical vocabulary (TDD)
- [ ] 1.1 RED — `src/__tests__/unit/reportes-estados.test.ts`: `ESTADOS_CLIENTE_VALIDOS` has exactly the 8 values from `ESTADOS_CLIENTE_OPTIONS` (`src/lib/types/clientes.ts`); `ESTADOS_ACTIVOS` excludes only `desestimado`/`transferido`; `ESTADOS_AVANZADOS` = `[contactado, intermedio, potencial, en_proceso, propietario]`; `ESTADOS_CONVERTIDOS` = `[propietario]`; negative assertions that dead legacy literals (`lead`, `prospecto`, `activo`, `cliente`, `en_seguimiento`, `interesado`, `reserva`, `comprador`) are absent from every exported group (spec: "Client-state filters use only the valid EstadoCliente model", both scenarios).
- [ ] 1.2 GREEN — implement `src/lib/reportes/estados.ts` per design ADR1: `ESTADO_META: Record<EstadoCliente, {activo, avanzado, convertido}>`, derived `ESTADOS_CLIENTE_VALIDOS`/`ESTADOS_ACTIVOS`/`ESTADOS_AVANZADOS`/`ESTADOS_CONVERTIDOS`, predicates `esEstadoActivo`/`esEstadoConvertido`. No `server-only`/`next/cache` import — must stay import-safe from client bundles (design "Layering and boundaries"; mirrors why `shared.ts` avoids those imports).
- [ ] 1.3 Compile-time guard: confirm removing/adding a key from `ESTADO_META` breaks the TS build (exhaustiveness by construction of the `Record<EstadoCliente, …>` type) — no extra code needed, just verify via a deliberate temporary edit + revert, or note in a code comment.

### Phase 2: Fix invalid literal comparisons — `ventas.ts` + `clientes.ts` (TDD)
- [ ] 2.1 RED — `src/__tests__/unit/reportes-ventas-clientes.test.ts` (new, `createChainMock` harness): `obtenerMetricasRendimiento` — `totalLeads` counts clientes created in the period excluding the importación-never-contacted backlog (reuse `EXCLUIR_IMPORTACION_NUNCA_CONTACTADO` from `@/lib/dashboard/aging`, the exact predicate `getCachedFunnelClientes` uses); `clientesConvertidos` only counts ventas whose `cliente_id` is in that leads-of-period id set (ADR1 "Conversion denominator" — funnel-cohort semantics); conversion is nonzero when in-period sales exist (spec: "Conversion rate reflects real sales").
- [ ] 2.2 GREEN — `src/app/dashboard/admin/reportes/actions/ventas.ts` `obtenerMetricasRendimiento`: replace `.in('estado_cliente', ['lead','prospecto'])` totalLeads query with a period-scoped `cliente` query (`.gte('fecha_alta',...).lte('fecha_alta',...).or(EXCLUIR_IMPORTACION_NUNCA_CONTACTADO)`); intersect `clientesConVentas` ids against the leads-of-period id set (mirror `funnel.ts`'s `leadIds`/`ventasCerradasIds` set-intersection pattern) before computing `clientesUnicos.size`/`tasaConversion`.
- [ ] 2.3 RED (same test file) — `obtenerReporteClientes`: "Clientes Activos" stat uses pipeline-membership (`esEstadoActivo`), not the invalid `=== 'activo'` comparison.
- [ ] 2.4 GREEN — `clientes.ts` `obtenerReporteClientes`: `clientesActivos = todosClientes?.filter(c => esEstadoActivo(c.estado_cliente ?? '')).length || 0` (import from `@/lib/reportes/estados`).
- [ ] 2.5 RED (same test file) — `obtenerReporteGestionClientes` excludes clientes whose `fecha_alta` is after `fechaFin` for a custom past range (spec: "Custom past range excludes newer records", `obtenerReporteGestionClientes` named explicitly).
- [ ] 2.6 GREEN — `clientes.ts` `obtenerReporteGestionClientes`: destructure `endDate` from `calcularFechas(...)` (currently only `startDate, days`) and add `.lte('fecha_alta', endDate.toISOString())` to the clientes query.

### Phase 3: `origen-lead.ts` avanzados + `metricas-fetchers.ts` convertidos (TDD)
- [ ] 3.1 RED — `src/__tests__/unit/reportes-origen-metricas.test.ts` (new): `obtenerReporteOrigenLead`'s "avanzados" count only credits clients whose `estado_cliente` is in `ESTADOS_AVANZADOS` — a lone `contactado` still counts, but `activo`/`en_seguimiento`/`interesado`/`reserva`/`comprador` (none valid) do not inflate the rate.
- [ ] 3.2 GREEN — `origen-lead.ts`: replace the inline `estadosAvanzados = ['activo','en_seguimiento','interesado','reserva','comprador','contactado']` array with `ESTADOS_AVANZADOS` imported from `@/lib/reportes/estados`.
- [ ] 3.3 RED (same test file) — `fetchMetricasClientes` (`metricas-fetchers.ts`) conversion numerator (`convertidos`) only counts `estado_cliente === 'propietario'` (`ESTADOS_CONVERTIDOS`), not the invalid `'cliente'` (cross-phase discovery: third stale-enum offender).
- [ ] 3.4 GREEN — `metricas-fetchers.ts`: replace `leadsRaw.filter((c) => c.estado_cliente === "cliente")` with `leadsRaw.filter((c) => esEstadoConvertido(c.estado_cliente ?? ''))`; update the JSDoc comment on `MetricasClientesPiezas.tasaConversion` accordingly.

### Phase 4: `interacciones.ts` — missing date bound (TDD)
- [ ] 4.1 RED — `src/__tests__/unit/reportes-interacciones.test.ts` (new): `obtenerReporteInteracciones` excludes interacciones dated after `fechaFin` for a custom past range (spec: "Custom past range excludes newer records", `obtenerReporteInteracciones` named explicitly as one of the two offenders).
- [ ] 4.2 GREEN — `interacciones.ts`: destructure `endDate` from `calcularFechas(...)` (currently only `startDate, days`) and add `.lte('fecha_interaccion', endDate.toISOString())` to the interacciones query.

### Phase 5: Funnel labels — no dead entries (TDD)
- [ ] 5.1 RED — `src/__tests__/unit/reporte-funnel-labels.test.ts` (new, imports the exported `ESTADO_LABELS`/`ESTADO_COLORS` maps from `ReporteFunnel.tsx` — no rendering needed): every value in `ESTADOS_CLIENTE_VALIDOS` plus the `sin_estado` sentinel (funnel.ts's fallback bucket for a null `estado_cliente`) has a label/color entry; no key outside that set + sentinel exists (spec: "en_proceso and propietario render human labels", "Dead legacy labels are gone").
- [ ] 5.2 GREEN — `ReporteFunnel.tsx`: rewrite `ESTADO_LABELS`/`ESTADO_COLORS` to the 8 valid states + `sin_estado`; drop `nuevo`, `activo`, `en_negociacion`, `interesado`, `no_interesado`, `reservado`, `vendido`, `perdido`; add `en_proceso`, `propietario`, `transferido`.

### Phase 6: PR1a gate
- [ ] 6.1 `npx vitest run src/__tests__/unit/reportes-estados.test.ts src/__tests__/unit/reportes-ventas-clientes.test.ts src/__tests__/unit/reportes-origen-metricas.test.ts src/__tests__/unit/reportes-interacciones.test.ts src/__tests__/unit/reporte-funnel-labels.test.ts` — all green.
- [ ] 6.2 `npx tsc --noEmit` clean (targeted scope; full-suite/build gate deferred to orchestrator).

**Out of scope for PR1a** (documented, not silently dropped): `nivel-interes.ts`, `tiempo-respuesta.ts`, `clientes-etapa-funnel.ts` pass `estado_cliente` through as display data without comparing it to an invalid literal — no functional bug there, left untouched.

---

## PR1b — Exact counts / pagination (ADR2)

### Phase 7: `fetchAllRows` paginator (TDD)
- [ ] 7.1 RED — `src/__tests__/unit/reportes-pagination.test.ts` (new): `fetchAllRows(queryFactory)` loops `.range(offset, offset+pageSize-1)` until a page returns fewer than `pageSize` rows; concatenates correctly across a mocked 2-page response totaling >1000 rows; stops on the first empty/undersized page; propagates the first query's error instead of swallowing it.
- [ ] 7.2 GREEN — implement `src/lib/reportes/pagination.ts`: `fetchAllRows<T>(queryFactory: (offset: number) => PromiseLike<{ data: T[] | null; error: unknown }>, pageSize = 1000): Promise<T[]>` — generalizes the `detalle-ventas-periodo.ts` count-then-fetch precedent into a single tested loop (ADR2 Strategy B).

### Phase 8: `funnel.ts` — Strategy B for id-bearing selects
- [ ] 8.1 RED — extend `src/__tests__/unit/reportes-pagination.test.ts` or new `src/__tests__/unit/reportes-funnel.test.ts`: `_fetchFunnel` still counts `totalLeads`/etapas/conversiones correctly when the `cliente` (and interacciones/visitas/reservas/ventas) result spans >1000 rows across 2 mocked pages (spec: "funnel.ts... reports a total", Requirement 4).
- [ ] 8.2 GREEN — `funnel.ts`: replace the 5 parallel unbounded `.select()` calls (leads, interacciones, visitas, reservas, ventas) with `fetchAllRows` calls; keep the existing `Promise.all` parallelism across the 5 now-paginated fetches; no change to the existing `buildCachedReportFetcher` wrap (already present).

### Phase 9: `metricas-fetchers.ts` — Strategy A + B per sub-fetcher
- [ ] 9.1 RED — `src/__tests__/unit/reportes-metricas-fetchers.test.ts` (new): `fetchMetricasClientes`'s `nuevos`/`activos` id-sets are correct across >1000 rows (paginated `nuevos`/`interaccionRes`/`ventaRes` queries; `totalRes` stays a Strategy A head count, already correct); `fetchMetricasInventario`'s vendidas/disponibles counts come from per-estado head counts, not `.filter().length` over a bulk unbounded select; `fetchMetricasVentas`'s sum/vendedor-grouping is correct across >1000 rows (paginated).
- [ ] 9.2 GREEN — `metricas-fetchers.ts`: `fetchMetricasClientes` paginates `nuevos`/`interaccionRes`/`ventaRes` via `fetchAllRows`; `fetchMetricasInventario` replaces its 4 bulk selects with 4 parallel per-estado head-count queries (lote vendido, lote disponible, propiedad vendido, propiedad disponible), mirroring `getCachedFunnelClientes`'s per-estado pattern; `fetchMetricasVentas` paginates both its montos and vendedores queries via `fetchAllRows`.

### Phase 10: `cobranza.ts` — Strategy B + cache wrap (ADR7)
- [ ] 10.1 RED — extend `src/__tests__/unit/reportes-cobranza-comisiones.test.ts`: `obtenerReporteCobranza` sums saldo/mora correctly when `cuota` spans >1000 rows across 2 mocked pages (the current unbounded `.from('cuota').select(...)` is the headline 1000-cap offender per ADR2's per-offender table).
- [ ] 10.2 GREEN — `cobranza.ts`: extract a pure `_fetchCobranza(supabase, startISO, endISO)` (mirrors `funnel.ts`'s `_fetchFunnel` shape), paginate the `cuota` query via `fetchAllRows`, wrap with `buildCachedReportFetcher(_fetchCobranza, ["reporte-cobranza"], 60)` (ADR7). Public `obtenerReporteCobranza` keeps `getAuthorizedClient()` outside the cached call — auth stays per-request, never inside `unstable_cache`.

### Phase 11: `comisiones.ts` — Strategy B + cache wrap (ADR7)
- [ ] 11.1 RED — extend `src/__tests__/unit/reportes-cobranza-comisiones.test.ts`: `obtenerReporteComisiones` aggregates resumen/porVendedor/porMes correctly when `comision` spans >1000 rows across 2 mocked pages.
- [ ] 11.2 GREEN — `comisiones.ts`: extract a pure `_fetchComisiones(supabase, startISO, endISO)`, paginate the `comision` query via `fetchAllRows`, wrap with `buildCachedReportFetcher(_fetchComisiones, ["reporte-comisiones"], 60)`. Export `_fetchComisiones` (not just the public action) — PR3's scorecard reuses it directly per ADR5.

### Phase 12: PR1b gate
- [ ] 12.1 `npx vitest run src/__tests__/unit/reportes-pagination.test.ts src/__tests__/unit/reportes-funnel.test.ts src/__tests__/unit/reportes-metricas-fetchers.test.ts src/__tests__/unit/reportes-cobranza-comisiones.test.ts` — all green.
- [ ] 12.2 `npx tsc --noEmit` clean.

---

## PR2 — Real comparisons + meta source (ADR3, ADR4)

### Phase 13: `calcularVentanaAnterior` + `mesesEnRango` (TDD)
- [ ] 13.1 RED — `src/__tests__/unit/reportes-shared.test.ts` (new): `calcularVentanaAnterior(startDate, endDate)` returns a window of equal length immediately before `startDate` (`prevEnd = startDate - 1ms`, `prevStart = prevEnd - (endDate - startDate)`), normalized to day boundaries like `calcularFechas`; `mesesEnRango(startDate, endDate)` returns every `{anio, mes}` pair the range overlaps (a single-month period → 1 entry; a 45-day span crossing a month boundary → 2 entries).
- [ ] 13.2 GREEN — `shared.ts`: add `calcularVentanaAnterior` (ADR3) and `mesesEnRango` (ADR4 period-vs-month reconciliation) as pure exports — no `server-only`/`next/cache` import, same constraint as the rest of the file.

### Phase 14: Real `ventasPeriodoAnterior` (TDD)
- [ ] 14.1 RED — `src/__tests__/unit/reportes-ventas-metas.test.ts` (new): `obtenerReporteVentas().resumen.ventasPeriodoAnterior` equals the real prior-window `venta.precio_total` sum, not the hardcoded `0` (spec: "Previous period is computed").
- [ ] 14.2 GREEN — `ventas.ts` `obtenerReporteVentas`: call `calcularVentanaAnterior(startDate, endDate)`, run a second bounded `venta` sum query over `[prevStart, prevEnd]`, set `resumen.ventasPeriodoAnterior` to the real sum (may reuse `calcularDeltaMensual` from `src/lib/dashboard/meta.ts` for an optional delta%, per design).

### Phase 15: Remove `*5`/`*10` heuristic, wire `meta_vendedor` (TDD)
- [ ] 15.1 RED (same test file) — `obtenerObjetivosVsRealidad`: `ventasMensuales.meta` = sum of `meta_vendedor.meta_ventas_monto` for all vendedores across every month `mesesEnRango` returns for the period (via the existing `obtenerMetas` action, `admin/metas/_actions-metas.ts`); `propiedades.meta` = sum of `meta_vendedor.meta_ventas_cantidad` (replaces both the ticketPromedio-derived math and the `numVendedores * 5` fallback); `clientesNuevos.meta` is always `null` ("Sin meta asignada") because `meta_vendedor` has no clientes-nuevos target column — `numVendedores * 10` is deleted with no replacement; when zero `meta_vendedor` rows exist for the period, `ventasMensuales.meta`/`propiedades.meta` are still returned but flagged `esEstimado: true` for an explicitly-labeled aggregate estimate, never a bare heuristic number (spec: "Missing meta shows explicit absence").
- [ ] 15.2 GREEN — `ventas.ts` `obtenerObjetivosVsRealidad`: delete the `metaPropiedades`/`metaClientesNuevos` heuristic block entirely; call `obtenerMetas({ periodoAnio, periodoMes })` per overlapped month from `mesesEnRango`, sum `meta_ventas_monto`/`meta_ventas_cantidad` across vendedores/months; return `meta: number | null` + `esEstimado: boolean` per metric (`clientesNuevos.meta` always `null`, `esEstimado` always `false` for it).
- [ ] 15.3 RED (same test file) — `obtenerReporteRendimiento`: `topPerformers[].meta`/`cumplimiento` read `meta_vendedor.meta_ventas_monto` for the vendedor across `mesesEnRango` (real source, replacing `usuario_perfil.meta_mensual_ventas`); when no `meta_vendedor` row exists, `meta`/`cumplimiento` are `null` (never `0` presented as a real target); `usuario_perfil.meta_mensual_ventas` may be read only as a last-resort fallback before `null` (ADR4 alternatives table).
- [ ] 15.4 GREEN — `rendimiento.ts`: replace the `usuario_perfil.meta_mensual_ventas` read with a `meta_vendedor` lookup (via `obtenerMetas` or a direct scoped query), summed over `mesesEnRango`; fallback to `usuario_perfil.meta_mensual_ventas` only when no `meta_vendedor` row exists, else `null`; `resumen.vendedoresQueSuperaronMeta` only counts vendedores with a non-null meta.
- [ ] 15.5 GREEN (types) — `TopPerformer.meta: number | null`, `TopPerformer.cumplimiento: string | null`; `obtenerObjetivosVsRealidad`'s per-metric shape gains `meta: number | null` + `esEstimado: boolean`.

**Out of scope for PR2** (documented): `metricas-fetchers.ts`'s `buildTopVendedores`/`VendedorTopPieza.meta` (the dashboard-analysis "top vendedores" widget, reads `usuario_perfil.meta_mensual_ventas` via `fetchVendedoresActivos`) is untouched — design's ADR8 PR2 scope names only `obtenerObjetivosVsRealidad` and `obtenerReporteRendimiento`; flagged as a follow-up, not silently dropped.

### Phase 16: UI — "Sin meta asignada" (small)
- [ ] 16.1 `ReporteVentas.tsx` (~lines 270/285/300): render "Sin meta asignada" (muted text) when `objetivos.*.meta` is `null`; render an "(estimado)" qualifier when `esEstimado` is `true`.
- [ ] 16.2 `ReporteRendimientoVendedores.tsx` (~line 186): render "Sin meta asignada" when `performer.cumplimiento` is `null` instead of unconditionally rendering a `%` string.

### Phase 17: PR2 gate
- [ ] 17.1 `npx vitest run src/__tests__/unit/reportes-shared.test.ts src/__tests__/unit/reportes-ventas-metas.test.ts` — all green.
- [ ] 17.2 `npx tsc --noEmit` clean.

---

## PR3 — Vendedor scorecard (ADR5)

### Phase 18: Export internal per-vendedor pieces
- [ ] 18.1 `por-vendedor.ts`: add `export` to `_fetchPorVendedor` (already shaped as an internal helper) and its supporting types, so the scorecard calls it directly instead of duplicating logic (ADR5: "join existing per-vendedor outputs", parity by construction).
- [ ] 18.2 `interacciones.ts`: extract the existing inline aggregation in `obtenerReporteInteracciones` into an exported pure `_fetchInteracciones(supabase, startISO, endISO)` (mirrors the `_fetch*` shape used elsewhere); `obtenerReporteInteracciones` becomes a thin wrapper calling it — no behavior change, regression-guarded by the existing `reportes-interacciones.test.ts` from PR1a Phase 4.
- [ ] 18.3 `comisiones.ts`: `_fetchComisiones` already exported in PR1b Phase 11 — reuse directly, no further change.

### Phase 19: `obtenerScorecardVendedores` (TDD)
- [ ] 19.1 RED — `src/__tests__/unit/reportes-scorecard.test.ts` (new): one row per active vendedor composed from `leadsAsignados`/`contactados`/`conversionPct` (`_fetchPorVendedor`), `interacciones` (`_fetchInteracciones`), `ventasMonto`/`ventasCantidad` (`metricas-fetchers.ts` `fetchMetricasVentas`), `metaMonto`/`metaCumplimientoPct` (ADR4 meta source, `null` → "Sin meta asignada"), `comisionGenerada`/`comisionPagada` (`_fetchComisiones`); **reconciliation assertion**: for a fixed vendedor + filter fixture, the scorecard row's `conversionPct` equals `_fetchPorVendedor`'s own `resumen.conversionGlobal` computed from the identical mock data (spec: "Scorecard reconciles with single-metric tabs").
- [ ] 19.2 GREEN — new `src/app/dashboard/admin/reportes/actions/scorecard.ts`: `obtenerScorecardVendedores(periodo, fechaInicio?, fechaFin?, proyecto?)` composes the 4 `_fetch*` outputs by `username` (left join; no fresh query re-derives a metric per ADR5); wrap the composition with `buildCachedReportFetcher(_fetchScorecard, ["reporte-scorecard"], 60)`; public wrapper keeps `getAuthorizedClient()` outside the cache. Define `ScorecardVendedorRow`/`ScorecardVendedoresData` per the design DTO.
- [ ] 19.3 `index.ts` barrel: export `obtenerScorecardVendedores` + `ScorecardVendedorRow`/`ScorecardVendedoresData` types.

### Phase 20: `ScorecardVendedores.tsx` + sidebar wiring
- [ ] 20.1 New `src/app/dashboard/admin/reportes/components/ScorecardVendedores.tsx`: one row per vendedor across the 7 dimensions (leads, conversión, tiempo de respuesta, interacciones, ventas, meta vs. real, comisiones); "Sin meta asignada" as muted text; dark-mode-aware; no `transition-all`; sortable columns (reuse the `sortPerformers`-style hook pattern from `ReporteRendimientoVendedores.tsx`); Peruvian formal Spanish headers.
- [ ] 20.2 `page.tsx`: add `{ id: "scorecard", title: "Scorecard", icon: ... }` to the `"equipo"` group in `GRUPOS_TABS`; add a new `<section data-seccion="scorecard">` wired through `visitedTabs`/`activeTab` (same pattern as the `funnel` section).

### Phase 21: PR3 gate
- [ ] 21.1 `npx vitest run src/__tests__/unit/reportes-scorecard.test.ts src/__tests__/unit/reportes-interacciones.test.ts` — all green (interacciones re-run to confirm the Phase 18.2 extraction is behavior-preserving).
- [ ] 21.2 `npx tsc --noEmit` clean.

---

## PR4 — Cobranza single source of truth (ADR6)

### Phase 22: Tier-aligned mora + gestión activity (TDD)
- [ ] 22.1 RED — extend `src/__tests__/unit/reportes-cobranza-comisiones.test.ts`: for a fixed `today` (mocked `limaToday`), `obtenerReporteCobranza`'s tier-aligned mora figure (count + saldo of `computeTier === 'mora'` cuotas within the 90-day cap) equals the same computation run directly against `computeTier` over identical cuota fixtures (spec: "Same cutoff, same mora total"); a cuota past the 90-day cap does not count as tier-aligned mora even when `estado === 'en_mora'`; the legacy `monto_mora`-sum field survives under a distinct, separately-labeled key (no information lost, ADR6 "Mora definition alignment").
- [ ] 22.2 GREEN — `cobranza.ts`: import `computeTier`/`limaToday` from `src/lib/cobranza/tiers.ts`; classify each non-`pagada` cuota via `computeTier({ fechaVencimiento: c.fecha_vencimiento, estado: c.estado, today: limaToday() })` — pass `fecha_vencimiento` unchanged, do NOT re-stringify through `new Date().toISOString()` (ADR6 date-contract gotcha: that would shift the tier at day boundaries); add `cuotasEnMoraTier`/`moraTierTotal` fields from the tier classification; keep the existing `cuotasEnMora`/`moraTotal` (accrued `monto_mora`) fields, documented in the interface JSDoc as the legacy/accrued figures.
- [ ] 22.3 RED (same test file) — `gestion_cobranza` entries within the period are surfaced: summary counts grouped by `resultado`, plus a recent-gestiones list joined to cliente/cuota (spec: "Gestión activity is visible").
- [ ] 22.4 GREEN — `cobranza.ts`: add a paginated `gestion_cobranza` fetch (period-bounded by gestión date, via `fetchAllRows` since rows are displayed — Strategy B), aggregate by `resultado`, build a recent-gestiones list (cliente nombre + cuota reference) capped at a display limit (e.g. 20, matching `topDeudores`'s `.slice(0, 10)` precedent).

### Phase 23: UI — gestión activity + relabeled mora
- [ ] 23.1 `ReporteCobranza.tsx`: add a "Gestión de cobranza" panel showing the `resultado` breakdown + recent-gestiones list; relabel the two mora figures so accrued (`monto_mora`) vs. tier-aligned (`computeTier`) are visually distinct (ADR6: never silently swap one number for the other).

### Phase 24: PR4 gate
- [ ] 24.1 `npx vitest run src/__tests__/unit/reportes-cobranza-comisiones.test.ts` — all green.
- [ ] 24.2 `npx tsc --noEmit` clean.

---

## Next Step

After PR4 merges, all 8 design checklist items (`design.md` "Checklist for the tasks/apply phases") are satisfied. Run `sdd-verify` against `spec.md`'s 7 requirements / 14 scenarios, then `sdd-archive`. A full-suite `npm test` + `npx tsc --noEmit` (repo-wide) + `next build` gate should run once per PR before merge, outside the sandboxed targeted-test loop used during `sdd-apply`.
