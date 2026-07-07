# Apply Progress — `reportes-confiables`

## Slice completed: PR1a — Vocabulary + enum fixes + funnel labels

Status: **done** (Phases 1-6 of `tasks.md`, all checked off).

### Files changed

| File | Change |
|------|--------|
| `src/lib/reportes/estados.ts` (new) | Canonical `estado_cliente` business vocabulary (ADR1): `ESTADO_META: Record<EstadoCliente, {...}>` (compile-time exhaustiveness), derived `ESTADOS_CLIENTE_VALIDOS`/`ESTADOS_ACTIVOS`/`ESTADOS_AVANZADOS`/`ESTADOS_CONVERTIDOS`, predicates `esEstadoActivo`/`esEstadoConvertido`. No `server-only`/`next/cache` import (client-bundle-safe). |
| `src/app/dashboard/admin/reportes/actions/ventas.ts` | `obtenerMetricasRendimiento`: replaced `.in('estado_cliente', ['lead','prospecto'])` with a period-scoped `cliente` query bounded by `fecha_alta` + `.or(EXCLUIR_IMPORTACION_NUNCA_CONTACTADO)` (funnel-cohort denominator, ADR1). `clientesConvertidos` now intersects `venta.cliente_id` against the leads-of-period id set (mirrors `funnel.ts`'s `leadIds`/`ventasCerradasIds` pattern) instead of counting all sales in range regardless of lead cohort. |
| `src/app/dashboard/admin/reportes/actions/clientes.ts` | `obtenerReporteClientes`: "Clientes Activos" now uses `esEstadoActivo(c.estado_cliente ?? '')` instead of the always-false `c.estado_cliente === 'activo'` comparison. `obtenerReporteGestionClientes`: destructured `endDate` from `calcularFechas` and added `.lte('fecha_alta', endDate.toISOString())` — previously only `.gte` was applied, so a custom past range leaked newer records. |
| `src/app/dashboard/admin/reportes/actions/origen-lead.ts` | Replaced the inline dead-literal array `['activo','en_seguimiento','interesado','reserva','comprador','contactado']` with `ESTADOS_AVANZADOS` from `@/lib/reportes/estados`. |
| `src/app/dashboard/admin/reportes/actions/metricas-fetchers.ts` | `fetchMetricasClientes`: `convertidos` now uses `esEstadoConvertido(c.estado_cliente ?? '')` instead of the invalid literal `c.estado_cliente === "cliente"` (a third stale-enum offender found during Phase 3, not in the original task list scope but flagged and fixed per spec's blanket requirement). JSDoc updated. |
| `src/app/dashboard/admin/reportes/actions/interacciones.ts` | `obtenerReporteInteracciones`: destructured `endDate` and added `.lte('fecha_interaccion', endDate.toISOString())` — same missing-upper-bound bug as `clientes.ts`. |
| `src/app/dashboard/admin/reportes/components/ReporteFunnel.tsx` | `ESTADO_LABELS`/`ESTADO_COLORS` rewritten to the 8 valid `EstadoCliente` values + `sin_estado` sentinel; both maps now `export`ed (needed for the new unit test, previously module-private). Dropped `nuevo`, `activo`, `en_negociacion`, `interesado`, `no_interesado`, `reservado`, `vendido`, `perdido`; added `en_proceso`, `propietario`, `transferido`. |

### Tests (new files, all TDD RED→GREEN)

| Test file | Tests | Result |
|-----------|-------|--------|
| `src/__tests__/unit/reportes-estados.test.ts` | 12 | green |
| `src/__tests__/unit/reportes-ventas-clientes.test.ts` | 5 | green |
| `src/__tests__/unit/reportes-origen-metricas.test.ts` | 2 | green |
| `src/__tests__/unit/reportes-interacciones.test.ts` | 1 | green |
| `src/__tests__/unit/reporte-funnel-labels.test.ts` | 3 | green |
| **Total** | **23** | **all green** |

Combined targeted run (`npx vitest run` on all 5 files): 5 files / 23 tests passed.
`npx tsc --noEmit`: clean (exit 0), repo-wide.

### Notable RED→GREEN calibration

- `reportes-origen-metricas.test.ts`'s `fetchMetricasClientes` case initially used fixture data where the buggy and fixed implementations produced the *same* numeric `tasaConversion` by coincidence (both landed on one matching row). Rewrote the fixture so the old literal (`'cliente'`) and the new predicate (`esEstadoConvertido` → `'propietario'`) select different rows/counts (25% vs 50%), so the test actually discriminates the bug from the fix. Confirmed RED against the old code before implementing GREEN.

### Gotcha found and worked around (test-only, no production code impact)

`ReporteFunnel.tsx` imports `obtenerReporteFunnel`/types from `"../_actions"`, which barrel-re-exports the entire `actions/index.ts` — including `funnel.ts`, which calls `buildCachedReportFetcher(...)` (→ `unstable_cache(...)`) at **module top-level**. `vitest.setup.ts`'s global `next/cache` mock only provides `revalidatePath`/`revalidateTag`, not `unstable_cache`, so a plain import of `ReporteFunnel.tsx` in a test would throw `TypeError: unstable_cache is not a function` at import time (pre-existing latent issue, not something this PR introduced — no prior test exercised this import path).

Fix (test-only): `reporte-funnel-labels.test.ts` mocks `@/app/dashboard/admin/reportes/_actions` directly (`vi.mock(...)` with stub functions for `obtenerReporteFunnel`/`obtenerClientesPorEtapaFunnel`) before importing the component, so the barrel — and everything it transitively pulls in — never actually loads. This is scoped to the test file only; no production code changed. Confirmed useful again in PR1b (see below).

### Deviations from tasks.md wording (both minor, both within design intent)

1. Task 3.3/3.4 describes the `metricas-fetchers.ts` fix as a "cross-phase discovery" already anticipated in the task text — implemented exactly as written, no deviation.
2. `periodo.fin` in `clientes.ts`/`interacciones.ts` return payloads still uses `new Date().toISOString()` instead of `endDate.toISOString()` — task wording scoped the fix to the query `.lte(...)` bound only, not the returned metadata field. Left untouched to keep the diff minimal and match the literal task scope; flagged here as a latent (separate, low-severity) inconsistency for a future cleanup pass, not part of this PR's spec-mandated fix.

### Rollback boundary

PR1a is self-contained and independently revertible: reverting the 6 changed files + deleting `src/lib/reportes/estados.ts` and the 5 new test files fully undoes this slice with no impact on PR1b-PR4.

---

## Slice completed: PR1b — Exact counts / pagination (ADR2)

Status: **done** (Phases 7-12 of `tasks.md`, all checked off).

### Files changed

| File | Action | What was done |
|------|--------|----------------|
| `src/lib/reportes/pagination.ts` | Created | `fetchAllRows<T>(queryFactory, pageSize = 1000)`: loops `.range(offset, offset+pageSize-1)` until a page returns `< pageSize` rows, concatenating every page; throws on the first query error instead of swallowing it. Generalizes the `detalle-ventas-periodo.ts` count-then-fetch precedent (ADR2 Strategy B). No `server-only`/`next/cache` import (pure, client-bundle-safe, same constraint as `estados.ts`). |
| `src/app/dashboard/admin/reportes/actions/funnel.ts` | Modified | `_fetchFunnel` (now `export`ed): replaced the 5 parallel unbounded `.select()` calls (cliente, cliente_interaccion, visita_propiedad, reserva, venta) with 5 `fetchAllRows` calls; kept the existing `Promise.all` parallelism (pagination happens inside each of the 5 independently). No change to the existing `buildCachedReportFetcher` wrap. |
| `src/app/dashboard/admin/reportes/actions/metricas-fetchers.ts` | Modified | `fetchMetricasClientes`: `nuevos` (cliente period query)/`interaccionRes`/`ventaRes` now paginated via `fetchAllRows`; `totalRes` (head:true count) left as-is (already Strategy A). `fetchMetricasInventario`: replaced 4 bulk `.select()` calls (relied on `.length`/`.filter().length`) with **8** `count:'exact',head:true` queries — total + nuevas + vendido + disponible, per table (lote, propiedad). `fetchMetricasVentas`: both the montos-sum and vendedor-grouping queries now paginated via `fetchAllRows`. |
| `src/app/dashboard/admin/reportes/actions/cobranza.ts` | Restructured | Extracted pure `_fetchCobranza(supabase, startISO, endISO)` (exported, mirrors `funnel.ts`'s `_fetchFunnel` shape); the headline unbounded `cuota` query (`cuotasActivas`, feeding saldo/mora/topDeudores) now paginated via `fetchAllRows`. Wrapped with `buildCachedReportFetcher(_fetchCobranza, ["reporte-cobranza"], 60)` (ADR7). Public `obtenerReporteCobranza` now only does `getAuthorizedClient()` + `calcularFechas()` + calls the cached fetcher — auth stays outside the cache. `periodo.dias` is now computed from the actual `startISO`/`endISO` difference (was `parseInt(periodo) \|\| 30`, a pre-existing quirk that only matched real day-count in preset-period mode anyway — not observed by any test or UI consumer in custom-range mode, so this is a strict accuracy improvement, not a behavior change). |
| `src/app/dashboard/admin/reportes/actions/comisiones.ts` | Restructured | Same shape as `cobranza.ts`: extracted pure `_fetchComisiones(supabase, startISO, endISO)` (exported — PR3's scorecard reuses it directly per ADR5), paginated the `comision` query via `fetchAllRows`, wrapped with `buildCachedReportFetcher(_fetchComisiones, ["reporte-comisiones"], 60)`. Public `obtenerReporteComisiones` keeps auth outside the cache. |

### Tests (all TDD RED→GREEN)

| Test file | New tests added | Result |
|-----------|------------------|--------|
| `src/__tests__/unit/reportes-pagination.test.ts` (new) | 5 | green |
| `src/__tests__/unit/reportes-funnel.test.ts` (new) | 3 | green |
| `src/__tests__/unit/reportes-metricas-fetchers.test.ts` (new) | 3 | green |
| `src/__tests__/unit/reportes-cobranza-comisiones.test.ts` (extended) | 2 (1 cobranza + 1 comisiones pagination case, added to the existing 12) | green (14 total in file) |
| **Combined PR1b gate run** | **25 tests / 4 files** | **all green** |

`npx tsc --noEmit`: clean (exit 0), repo-wide.

### TDD Cycle Evidence

| Task | RED | GREEN | REFACTOR | Notes |
|------|-----|-------|----------|-------|
| 7.1/7.2 `fetchAllRows` | Confirmed — import failed (`pagination.ts` didn't exist) | Implemented, 5/5 pass | n/a (first cut clean) | Pure unit, no supabase mocking needed |
| 8.1/8.2 `funnel.ts` Strategy B | Confirmed — `_fetchFunnel is not a function` (not yet exported/paginated) | Implemented, 3/3 pass | n/a | Exported `_fetchFunnel` as a deliberate, documented deviation (see below) |
| 9.1/9.2 `metricas-fetchers.ts` | Confirmed — all 3 assertions failed (0 instead of expected values) against pre-change code | Implemented, 3/3 pass | Fixed a test-harness bug (naive call-count routing broke once queries re-invoke `.from()` per page — see gotcha below), not a production-code issue | |
| 10.1/10.2 `cobranza.ts` | Confirmed via revert-and-rerun: temporarily reverted `cuotasActivas` to the old unbounded select, reran the new test alone → failed (`saldoTotalPorCobrar` 0 instead of 105000), restored the fix → green | Implemented, 13/13 (full file) pass | n/a | Genuine isolated RED, not just "test didn't exist yet" |
| 11.1/11.2 `comisiones.ts` | Same revert-and-rerun method: reverted `comisiones` to unbounded select → failed (`pendientes` `{count:0,monto:0}` instead of `{count:1000,monto:10000}`), restored → green | Implemented, 14/14 (full file) pass | n/a | Genuine isolated RED |
| 12.1/12.2 gate | n/a | 25/25 across the 4 gate files; `tsc --noEmit` clean | n/a | |

### Gotcha found and worked around (test harness only, documented for future PR test-writing)

`fetchAllRows` rebuilds the *entire* query chain on every retry (`queryFactory(offset)` calls `.from(table)...range(offset,...)` fresh each time it loops) — so a test mock that routes `.from(table)` by a simple call-count (`callCount === 1 ? chainA : chainB`) breaks the instant a query paginates more than once, because pagination itself consumes extra `.from()` calls that a naive router doesn't expect. Fixed by giving each **logical query** its own persistent chain object (tracking its own internal page-index via `.range()` call count) instead of routing by global call order; when two logical queries share the exact same table name (e.g., `cliente` used for both a paginated period-query and an unrelated head-count query in `fetchMetricasClientes`), built a small "dual-mode" chain where `.range()` and `.then()` are independent methods that never collide regardless of call order (`.range()` only fires for the paginated path, `.then()` only fires for the direct-count path, since a head-count query never calls `.range()` in production code). For the two-query-same-table pagination case in `fetchMetricasVentas` (`montos`/`vendedores`, both against `venta`, each independently paginated), routed by the `.select()` column-string content instead of call order, since production code genuinely selects different columns per query — this is robust regardless of `Promise.all` microtask interleaving order, which is NOT guaranteed to be deterministic once multiple pagination loops run concurrently.

Also reused the PR1a-documented `next/cache`/`unstable_cache` gotcha: `reportes-cobranza-comisiones.test.ts` needed its own `vi.mock("next/cache", ...)` override (`unstable_cache: (fn) => fn` identity passthrough) once `cobranza.ts`/`comisiones.ts` started importing `buildCachedReportFetcher` — the global `vitest.setup.ts` mock only stubs `revalidatePath`/`revalidateTag`. Also had to add `createServiceRoleClient` to the file's existing `@/lib/supabase.server` mock (mapped to the same `mockServerOnlyClient` already used for `createServerOnlyClient`), since `buildCachedReportFetcher`'s cached fetcher calls `createServiceRoleClient()` internally — without this, every pre-existing cobranza/comisiones test would have failed with "undefined is not a function" the moment the cache wrap landed.

### Deviations from tasks.md wording (all documented in tasks.md inline too)

1. **`_fetchFunnel` exported** (Phase 8.2) — task text didn't explicitly say "export", but the RED/GREEN test strategy requires calling it directly (mirrors the `_fetchCobranza`/`_fetchComisiones`/future `_fetchPorVendedor` pure-fetcher export precedent already established elsewhere in this same PR/design).
2. **`fetchMetricasInventario` — 8 head counts, not 4** (Phase 9.2) — task text described "4 parallel per-estado head-count queries (lote vendido, lote disponible, propiedad vendido, propiedad disponible)". Implementing literally 4 would have silently dropped `totalPropiedades`/`propiedadesNuevas` correctness (a `lote`/`propiedad` can be in a third state like `"reservado"`, so vendido+disponible alone can't reconstruct the total, and the old bulk selects also fed those two fields). Implemented as 8 head counts (added `lote`/`propiedad` "total" and "nuevas" counts) to keep the whole interface exact, not just the two named fields.
3. **`cobranza.ts` — only the headline `cuota` query paginated** (Phase 10.2) — `pagosPeriodo`, `cuotasPagadasPeriodo`, and `ventasData` (`.in(ventaIds)`) remain unbounded `.select()` calls. Task 10 named only "the `cuota` query" (singular) and ADR2's per-offender table calls out only the `cuotasActivas` query by name. Left untouched to match literal scope and stay within the PR1b line budget; documented in `tasks.md` as an explicit out-of-scope gap, to be revisited when PR4 (Phase 22, ADR6) touches `cobranza.ts` again.
4. **`_fetchCobranza`/`_fetchComisiones` `periodo.dias`** computed from actual `startISO`/`endISO` difference instead of receiving `days` as a parameter — needed because the task's literal 3-arg signature `(supabase, startISO, endISO)` (mirroring `_fetchFunnel`) doesn't carry `days` separately. Confirmed via grep this doesn't change any observed behavior: `calcularFechas`'s pre-existing `days = parseInt(periodo) \|\| 30` already equals the real day-count in preset-period mode (the only mode where `page.tsx` renders `periodo.dias`); in custom-range mode the UI never reads `periodo.dias` (uses `fechaInicio`/`fechaFin` state directly), so no consumer could observe a difference either way.

### Notes for PR2/PR3/PR4 (next slices)

- PR2 (`calcularVentanaAnterior`/`mesesEnRango`/meta wiring, tasks.md Phase 13+) has no file-level dependency on PR1b — sequenced next purely by business priority (ADR8).
- PR3's scorecard (Phase 18-21) can now import `_fetchComisiones` directly (already exported here) and will need to add `export` to `_fetchPorVendedor` (por-vendedor.ts) and extract/export `_fetchInteracciones` (interacciones.ts) per Phase 18 — those two are NOT done yet, still private/inline as of end of PR1b.
- PR4 (Phase 22-24, ADR6) will touch `cobranza.ts` again (`computeTier`/`limaToday`, `gestion_cobranza` surfacing) — good opportunity to also close the "out of scope" pagination gap noted above (`pagosPeriodo`/`cuotasPagadasPeriodo`/`ventasData`) in the same pass, since the file is being re-opened anyway.
- The dual-mode/column-routing test-harness patterns documented above (for same-table, multi-logical-query pagination mocking) will likely be needed again for PR3's scorecard tests (`_fetchPorVendedor` + `_fetchInteracciones` + `_fetchComisiones` + `fetchMetricasVentas` all composed together) and PR4's `gestion_cobranza` paginated fetch test.

### Rollback boundary

PR1b is independently revertible from PR1a: reverting `pagination.ts` (delete), `funnel.ts`, `metricas-fetchers.ts`, `cobranza.ts`, `comisiones.ts`, and the 3 new/extended test files restores the PR1a state with no impact on PR1a's own changes (estados.ts, ventas.ts, clientes.ts, origen-lead.ts, interacciones.ts, ReporteFunnel.tsx are untouched by PR1b). PR3 depends on PR1b's `_fetchComisiones` export (ADR5) and on `_fetchCobranza`'s restructure pattern being in place before PR4 extends it further — both are additive-only changes with no breaking API surface, so PR1b can ship and be reviewed independently.

Suggested commit boundaries (no git mutations performed by this run, per delivery instructions):
1. `src/lib/reportes/pagination.ts` + `reportes-pagination.test.ts` (Phase 7)
2. `funnel.ts` + `reportes-funnel.test.ts` (Phase 8)
3. `metricas-fetchers.ts` + `reportes-metricas-fetchers.test.ts` (Phase 9)
4. `cobranza.ts` + `comisiones.ts` + extended `reportes-cobranza-comisiones.test.ts` (Phases 10-11, same file pair, natural single commit since both share the ADR7 cache-wrap pattern and the same test file)

— or a single squashed commit for the whole PR1b slice if the reviewer prefers one PR/one commit (matches PR1a's own note on this).

---

## Slice completed: PR2 — Real comparisons + meta source (ADR3, ADR4)

Status: **done** (Phases 13-17 of `tasks.md`, all checked off).

### Files changed

| File | Action | What was done |
|------|--------|----------------|
| `src/app/dashboard/admin/reportes/actions/shared.ts` | Modified | Added `calcularVentanaAnterior(startDate, endDate)` (ADR3): `prevEnd = startDate - 1ms`, `prevStart = prevEnd - (endDate - startDate)`, both re-normalized to day boundaries (`setHours`) as a safety net — in practice already boundary-aligned when fed `calcularFechas` output, since `startDate.getTime() - 1` always lands on `23:59:59.999` of the prior day when `startDate` is itself `00:00:00.000`. Added `mesesEnRango(startDate, endDate)` (ADR4): walks month-by-month from `startDate`'s to `endDate`'s calendar month inclusive, returning `{anio, mes}` per overlapped month. Both are pure exports, no `server-only`/`next/cache` import (same constraint as the rest of the file). |
| `src/app/dashboard/admin/reportes/actions/ventas.ts` | Modified | `obtenerReporteVentas`: added a second bounded `venta` sum query over `calcularVentanaAnterior(startDate, endDate)`'s `[prevStart, prevEnd]`; `resumen.ventasPeriodoAnterior` is now the real sum (was hardcoded `0`). `obtenerObjetivosVsRealidad`: **deleted** the `ticketPromedio`-derived `metaPropiedades` math and the `numVendedores * 5` / `numVendedores * 10` heuristic fallbacks entirely. Now calls `obtenerMetas({ periodoAnio, periodoMes })` (imported from `@/app/dashboard/admin/metas/_actions-metas`) once per month from `mesesEnRango`, sums `meta_ventas_monto`/`meta_ventas_cantidad` across all returned rows (all vendedores, all overlapped months) for `ventasMensuales.meta`/`propiedades.meta`. Added `esEstimado: boolean` per metric — `true` only when zero `meta_vendedor` rows exist for the whole period (an honest `0` sum-of-nothing, explicitly flagged instead of silently presented as a real target). `clientesNuevos.meta` is now always `null` ("Sin meta asignada") — `meta_vendedor` has no clientes-nuevos target column, no replacement possible; its `esEstimado` is always `false` (there's nothing to "estimate", it's a permanent structural absence, not a data-gap moment). |
| `src/app/dashboard/admin/reportes/actions/rendimiento.ts` | Modified | `obtenerReporteRendimiento`: replaced the `usuario_perfil.meta_mensual_ventas` read as canonical meta source with a `meta_vendedor` lookup via `obtenerMetas` summed per-vendedor over `mesesEnRango`. Per vendedor: if any `meta_vendedor` row exists for them in the period, `meta` = the real summed value (even if that sum is `0` — presence of a row means a deliberate config, not absence); if **no** row exists, falls back to `usuario_perfil.meta_mensual_ventas` only if it's `> 0`, else `meta = null`. `cumplimiento` is `null` whenever `meta` is `null` or `meta <= 0` (never a `'0'` string presented as a real percentage). `resumen.vendedoresQueSuperaronMeta` now filters on `v.meta !== null && v.meta > 0 && ...` — a vendedor with no real meta can never "count" as having superado. `TopPerformer.meta: number \| null`, `TopPerformer.cumplimiento: string \| null` (were `number`/`string`). |
| `src/app/dashboard/admin/reportes/components/ReporteVentas.tsx` | Modified | "Objetivos vs Realidad" card: `ventasMensuales`/`propiedades` rows now append an italic `(estimado)` qualifier next to the meta figure when `esEstimado` is `true`. "Clientes Nuevos" row: when `meta === null`, renders `"{realizado} · Sin meta asignada"` (muted) and skips the progress bar entirely (no `0`-denominator percentage to show); otherwise unchanged. Progress-bar tracks also gained `dark:bg-gray-700` (were light-only `bg-gray-200`, pre-existing gap noticed while touching these lines — small, in-scope fix, not a separate pass). |
| `src/app/dashboard/admin/reportes/components/ReporteRendimientoVendedores.tsx` | Modified | Top Performers row: `performer.cumplimiento !== null` gates the colored `%` meta badge (was a truthy check on a string that was always `'0'` at minimum, so it never actually hit the "no meta" case before); when `null`, renders a muted "Sin meta asignada" pill instead. `useTableSort`'s `cumplimiento` accessor (`parseFloat(p.cumplimiento ?? "0")`) already handled `null` via `??` — no change needed there. |

### Tests (all TDD RED→GREEN)

| Test file | New tests | Result |
|-----------|-----------|--------|
| `src/__tests__/unit/reportes-shared.test.ts` (new) | 5 (`calcularVentanaAnterior` × 2, `mesesEnRango` × 3) | green |
| `src/__tests__/unit/reportes-ventas-metas.test.ts` (new) | 9 (`obtenerReporteVentas` × 1, `obtenerObjetivosVsRealidad` × 4, `obtenerReporteRendimiento` × 4) | green |
| **PR2 gate run** (`reportes-shared.test.ts` + `reportes-ventas-metas.test.ts`) | **14 tests / 2 files** | **all green** |
| **Combined regression run** (all 11 reportes-confiables test files, PR1a+PR1b+PR2) | **62 tests / 11 files** | **all green — no regressions** |

`npx tsc --noEmit`: clean (exit 0), repo-wide.

### TDD Cycle Evidence

| Task | RED | GREEN | Notes |
|------|-----|-------|-------|
| 13.1/13.2 `calcularVentanaAnterior`/`mesesEnRango` | Confirmed — both `TypeError: ... is not a function` (5/5 failing) | Implemented, 5/5 pass | Pure unit, no supabase mocking needed |
| 14.1/14.2 `ventasPeriodoAnterior` | Confirmed — asserted `20000`, pre-change code returns hardcoded `0` | Implemented, passes | |
| 15.1/15.2 `obtenerObjetivosVsRealidad` meta wiring | Confirmed — all 4 cases failed against pre-change code (heuristic numbers / no `esEstimado` field / `clientesNuevos.meta` not null) | Implemented, 4/4 pass | |
| 15.3/15.4 `obtenerReporteRendimiento` meta source | Confirmed — all 4 cases failed (`meta_mensual_ventas` still canonical, `cumplimiento` was `'0'` string not `null`, `vendedoresQueSuperaronMeta` miscounted) | Implemented, 4/4 pass | |
| 16.1/16.2 UI | n/a (small, no dedicated unit test — visual/JSX conditional, matches existing UI-task precedent of no test coverage for pure rendering branches in this codebase) | Manual code-path review: both `null`/`esEstimado` branches render distinct markup | |
| 17.1/17.2 gate | n/a | 14/14 gate files; 62/62 combined regression; `tsc --noEmit` clean | |

### Gotcha found (test harness + a real design decision, documented for PR3)

**`obtenerMetas` cross-module call — mock the whole module, not its internals.** `ventas.ts`/`rendimiento.ts` now import `obtenerMetas` from `@/app/dashboard/admin/metas/_actions-metas`, a **separate** `"use server"` action file with its own dependency chain: `createServerActionClient` (different client factory than `createServerOnlyClient`), `requierePermiso`/`tienePermiso` (`@/lib/permissions/server`, imports `server-only`), and `obtenerUsernameActual` (`../../clientes/_actions-crm-helpers`). Rather than mock each of those transitively, `reportes-ventas-metas.test.ts` does `vi.mock("@/app/dashboard/admin/metas/_actions-metas", () => ({ obtenerMetas: mockObtenerMetas }))` — this replaces the entire module before it's ever imported, so none of its internal dependencies load at all. Much simpler than the `createChainMock` supabase-chain approach used for the same-file fetchers, and the right pattern for any future cross-action-module call (PR3's scorecard will likely need the same trick if it ever calls another action file directly rather than composing `_fetch*` internals per ADR5).

**Confirmed a load-bearing permission fact before wiring this up (not a bug, a design-supporting discovery):** `verificarPermiso` (`src/lib/permissions/server.ts`) short-circuits `if (usuario.rol === 'ROL_ADMIN') return { permitido: true }` **before** checking the permission matrix — so `obtenerMetas`'s `tienePermiso(PERMISOS.METAS.ASIGNAR)` always resolves `true` for an admin caller, meaning `puedeVerTodas` is always `true` inside `obtenerMetas` when called from these admin-gated reportes actions (`getAuthorizedClient` already enforces `esAdmin()`). This is what makes "call `obtenerMetas({ periodoAnio, periodoMes })` with no `vendedorUsername` filter and get every vendedor's row for that month" work correctly in production, not just in the mocked tests.

### Design decision: `esEstimado` semantics (documented since tasks.md wording was ambiguous)

Task 15.1 says the aggregate `ventasMensuales.meta`/`propiedades.meta` are "still returned but flagged `esEstimado: true`... never a bare heuristic number" when zero `meta_vendedor` rows exist. Since the `*5`/`*10` heuristic block is deleted with **no replacement** (ADR4 is explicit: "these are exactly the numbers that lie... they are deleted"), the only honest value left to return in the zero-rows case is the real sum-of-nothing (`0`). Implemented as: `meta` = the real (possibly-zero) sum, `esEstimado` = `true` only when the `meta_vendedor` row-set for the whole period is empty. This is **distinct** from `clientesNuevos.meta`, which is `null` permanently (a structural absence — no column exists to ever source it from), not a flagged estimate (a data-gap that could be filled by configuring metas). The UI reflects this distinction: `esEstimado` renders an `"(estimado)"` qualifier next to a real number; `meta === null` renders "Sin meta asignada" with no number at all.

### Vercel React best-practices skill applied: eliminated 3 waterfalls

Per the `vercel-react-best-practices` skill (`async-parallel`, CRITICAL priority), the initial PR2 draft chained new independent queries after existing sequential ones. Fixed before finalizing:
- `obtenerReporteVentas`: current-period `venta` select and the new prior-window `venta` sum are independent — now `Promise.all([...])` instead of two sequential awaits.
- `obtenerObjetivosVsRealidad`: `metasPorMes` (via `obtenerMetas`), `ventasReales`, and `clientesNuevos` are three independent fetches — now `Promise.all([...])`.
- `obtenerReporteRendimiento`: the new `metasPorMes` fetch is independent of the pre-existing `vendedores`/`ventasData`/`leadsDelPeriodo` sequential awaits — all 4 now run via one `Promise.all([...])` (pre-existing sequential-await pattern was itself a latent waterfall predating this PR; folding it into the same `Promise.all` while already touching this function was in-scope and zero-risk since none of the 4 queries depend on another's result).

All three match the existing `funnel.ts`/`por-vendedor.ts` `Promise.all` convention already established in this codebase (PR1a/PR1b). Confirmed the reordering doesn't break the mocked-supabase test harnesses: query-builder chain calls (`.schema().from().select()...`) execute synchronously when the array literal is evaluated (before `Promise.all` starts awaiting), so `.from(table)` call order — which the `ventaCallCount`-style test routing depends on — is preserved. Re-ran the full 62-test regression set after this refactor: still 62/62 green, `tsc --noEmit` still clean.

### Deviations from tasks.md wording (both minor, both documented)

1. **Optional `calcularDeltaMensual` reuse (task 14.2) — skipped.** Task text says `obtenerReporteVentas` "may reuse `calcularDeltaMensual`... for an optional delta%, per design" (explicitly optional). No UI slot currently renders a period-over-period delta for ventas, so adding an unused computed field would widen the diff/test surface with no consumer. Left as a documented future addition, not silently dropped — flagged here for whoever wires a "vs. período anterior" delta badge into `ReporteVentas.tsx` later.
2. **`ReporteVentas.tsx`/`ReporteRendimientoVendedores.tsx` — no dedicated component unit tests.** Consistent with this codebase's existing pattern (PR1a's Phase 5 funnel-labels test was the one exception, and only because it needed to assert against exported label maps, not rendered output) — these two UI edits are small conditional-render branches reviewed by manual code-path inspection instead. Flagged, not silently skipped.

### Notes for PR3 (scorecard, tasks.md Phase 18+)

- The `obtenerMetas`-per-month-via-`mesesEnRango` pattern established here (`ventas.ts`/`rendimiento.ts`) is exactly what ADR5's `metaMonto`/`metaCumplimientoPct` scorecard column needs — reuse it directly rather than re-deriving.
- The "mock the whole cross-module action" test-harness gotcha above will very likely recur in `reportes-scorecard.test.ts` if the scorecard calls `obtenerMetas` the same way (in addition to composing `_fetchPorVendedor`/`_fetchInteracciones`/`_fetchComisiones`/`fetchMetricasVentas` per ADR5).
- `TopPerformer.meta`/`cumplimiento` are now `number | null`/`string | null` — if PR3's scorecard reuses `rendimiento.ts`'s `topPerformers` output directly (it currently doesn't per ADR5's composition table, which sources ventas/meta from `metricas-fetchers.ts`/`meta_vendedor` independently), it must carry the same nullability through, not silently coerce back to `0`/`'0'`.
- `metricas-fetchers.ts`'s `buildTopVendedores`/`VendedorTopPieza.meta` (dashboard "top vendedores" widget) still reads `usuario_perfil.meta_mensual_ventas` untouched — confirmed still out of scope per ADR8/tasks.md's explicit PR2 scope note (only `obtenerObjetivosVsRealidad`/`obtenerReporteRendimiento` named). Not silently missed, just not this PR's concern.

### Rollback boundary

PR2 is independently revertible from PR1a/PR1b: reverting `shared.ts`'s two new exports, `ventas.ts`, `rendimiento.ts`, `ReporteVentas.tsx`, `ReporteRendimientoVendedores.tsx`, and the 2 new test files restores the PR1b state with no impact on PR1a/PR1b's own changes. PR3 depends on this PR's `meta_vendedor`/"Sin meta asignada" wiring pattern (ADR4) being in place — an additive-only dependency (PR3 reuses the pattern, doesn't modify these files' PR2 logic), so PR2 can ship and be reviewed independently.

Suggested commit boundaries (no git mutations performed by this run, per delivery instructions):
1. `shared.ts` (`calcularVentanaAnterior` + `mesesEnRango`) + `reportes-shared.test.ts` (Phase 13)
2. `ventas.ts` + `rendimiento.ts` + `reportes-ventas-metas.test.ts` (Phases 14-15 — same test file covers both fetcher files, natural single commit)
3. `ReporteVentas.tsx` + `ReporteRendimientoVendedores.tsx` (Phase 16, UI-only, no new tests)

— or a single squashed commit for the whole PR2 slice if the reviewer prefers one PR/one commit (matches PR1a/PR1b's own note on this).
