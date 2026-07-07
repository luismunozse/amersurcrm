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

---

## Slice completed: PR3 — Vendedor scorecard (ADR5)

Status: **done** (Phases 18-21 of `tasks.md`, all checked off).

### Files changed

| File | Action | What was done |
|------|--------|----------------|
| `src/app/dashboard/admin/reportes/actions/por-vendedor.ts` | Modified | Added `export` to `_fetchPorVendedor` (Phase 18.1). Its supporting types (`ReportePorVendedorDia`/`Vendedor`/`Resumen`/`Data`) were already exported — no change needed there. Doc comment extended to explain why the scorecard calls this same function once per vendedor (reconciliation by construction, not a parallel formula). |
| `src/app/dashboard/admin/reportes/actions/interacciones.ts` | Restructured | Extracted the existing inline aggregation out of `obtenerReporteInteracciones` into an exported pure `_fetchInteracciones(supabase, startISO, endISO)` (Phase 18.2), mirroring `_fetchComisiones`'s 3-arg shape. `obtenerReporteInteracciones` is now a thin `getAuthorizedClient()` + `calcularFechas()` + `_fetchInteracciones(...)` wrapper. **No behavior change**: query construction, aggregation logic, and the pre-existing `periodo.fin: new Date().toISOString()` quirk (PR1a deviation #2) are all preserved verbatim — only `days` is now derived from `startISO`/`endISO` inside the fetcher instead of being threaded in from `calcularFechas`'s `days` return value (same deviation pattern as `_fetchCobranza`/`_fetchComisiones` in PR1b). NOT wrapped in `buildCachedReportFetcher` — ADR7 scopes the cache wrap to fetchers being restructured for pagination/exact-counts; this extraction alone doesn't touch that concern. Regression-guarded by the pre-existing `reportes-interacciones.test.ts` (PR1a Phase 4) — reran green with zero test changes. |
| `src/app/dashboard/admin/reportes/actions/comisiones.ts` | Unchanged | `_fetchComisiones` already exported in PR1b Phase 11 — reused directly (Phase 18.3, no-op). |
| `src/app/dashboard/admin/reportes/actions/scorecard.ts` (new) | Created | `_fetchScorecard(supabase, startISO, endISO, days)`: pure fetcher (ADR5) composing 5 independent pieces in `Promise.all` (async-parallel) — `_fetchPorVendedor(..., null)` for the active-vendedor catalog, `_fetchInteracciones`, `_fetchComisiones`, `fetchMetricasVentas`, and `Promise.all(meses.map(m => obtenerMetas(...)))` for `meta_vendedor` summed per vendedor across every `mesesEnRango`-overlapped month (ADR4 pattern, reused verbatim from PR2's `ventas.ts`/`rendimiento.ts`). A second `Promise.all` (Fase 2) then calls `_fetchPorVendedor(supabase, startISO, endISO, days, v.username)` **once per active vendedor** — the exact same function, same filter shape "Por Vendedor" uses — which is what makes `leadsAsignados`/`contactados`/`conversionPct` reconcile by construction rather than by a parallel formula. Composed into `ScorecardVendedorRow[]` by `username`; wrapped with `buildCachedReportFetcher(_fetchScorecard, ["reporte-scorecard"], 60)` (ADR7); public `obtenerScorecardVendedores(periodo, fechaInicio?, fechaFin?)` keeps `getAuthorizedClient()` outside the cache. |
| `src/app/dashboard/admin/reportes/actions/index.ts` | Modified | Barrel now exports `obtenerScorecardVendedores` + `ScorecardVendedorRow`/`ScorecardVendedoresData` types (Phase 19.3). |
| `src/app/dashboard/admin/reportes/components/ScorecardVendedores.tsx` (new) | Created | Client table component: header + `Card` with a sortable table (`useTableSort`/`SortableHeader`, same hook already used by `ReportePorVendedor.tsx`/`ReporteRendimientoVendedores.tsx`) — columns: Vendedor, Leads, Contactados, Conversión, T. Respuesta, Interacciones, Ventas (monto + cantidad), Meta vs. Real, Comisiones (generada + pagada). "Sin meta asignada" pill (muted) when `metaMonto` is `null` (reuses the color-tier badge pattern from `ReporteRendimientoVendedores.tsx`'s `cumplimiento` badge: green ≥100%, yellow ≥80%, red otherwise). Tiempo de respuesta renders "Sin datos" (a distinct string from "Sin meta asignada" — different kind of absence, see scorecard.ts's deviation note) when `tiempoRespuestaHoras` is `null`. Empty state (no active vendedores) with a CTA `Link` to `/dashboard/admin/usuarios` ("Gestionar vendedores"). Dark-mode-aware (`crm-*` tokens, `dark:` variants on badges), no `transition-all` anywhere in the new file. Peruvian formal Spanish headers throughout. |
| `src/app/dashboard/admin/reportes/page.tsx` | Modified | Added `ClipboardList` to the `lucide-react` import list; added `{ id: "scorecard", title: "Scorecard", icon: ClipboardList }` as the first entry of the `"equipo"` group in `GRUPOS_TABS`; added a new `<section data-seccion="scorecard">` (same `visitedTabs`/`activeTab` lazy-mount pattern as every sibling section) rendering `<ScorecardVendedores periodo fechaInicio fechaFin />`, placed immediately before the `"rendimiento"` section. |

### Tests (all TDD RED→GREEN)

| Test file | Tests | Result |
|-----------|-------|--------|
| `src/__tests__/unit/reportes-scorecard.test.ts` (new) | 8 (2 auth guard + 6 composition/reconciliation) | green |
| `src/__tests__/unit/reportes-interacciones.test.ts` (re-run, unchanged) | 1 | green (confirms Phase 18.2 extraction is behavior-preserving) |
| **PR3 gate run** | **9 tests / 2 files** | **all green** |
| **Combined regression** (all 12 reportes-confiables test files, PR1a+PR1b+PR2+PR3) | **70 tests / 12 files** | **all green — no regressions** |

`npx tsc --noEmit`: clean (exit 0), repo-wide.

### TDD Cycle Evidence

| Task | RED | GREEN | Notes |
|------|-----|-------|-------|
| 18.1 export `_fetchPorVendedor` | n/a (mechanical, no dedicated test — used transitively by 19.1's import) | Added `export` keyword; `tsc` clean | |
| 18.2 extract `_fetchInteracciones` | Confirmed no regression via re-run of pre-existing `reportes-interacciones.test.ts` before/after the extraction (1/1 green both times — behavior-preserving refactor, not a new-behavior RED/GREEN pair) | Extraction implemented; test still green | |
| 19.1/19.2 `_fetchScorecard`/`obtenerScorecardVendedores` | Confirmed — `Failed to resolve import ".../actions/scorecard"` (file didn't exist yet) | Implemented `scorecard.ts`; first run was 8/8 green (no iteration needed — composition logic mirrored the already-proven `rendimiento.ts`/PR2 meta-wiring pattern closely enough that no calibration pass was required) | |
| 21.1/21.2 gate | n/a | 9/9 gate files; 70/70 combined regression; `tsc --noEmit` clean | |

### Design decision: `tiempoRespuestaHoras` is `null` in this slice (documented, not silently dropped)

`design.md` ADR5's row DTO includes `tiempoRespuestaHoras: number | null` and the spec's "Vendedor scorecard consolidates seven dimensions" requirement names "tiempo de respuesta" as one of the seven columns that MUST be shown. `tasks.md` Phase 18 ("Export internal per-vendedor pieces") lists exactly three extractions — `por-vendedor`, `interacciones`, `comisiones` — and does NOT list `tiempo-respuesta.ts`. Task 19.1's RED-test composition list also does not mention a tiempo-de-respuesta source. Investigated why: `tiempo-respuesta.ts` buckets its per-vendedor ranking by `cliente.vendedor_asignado`, which the `sync-vendedor-fields` admin tool's own UI copy documents as a UUID (`usuario_perfil.id`), NOT `vendedor_username` (a separate string column) — every other fetcher composed into the scorecard (`por-vendedor`, `interacciones`, `comisiones`, `metricas-fetchers`) keys its per-vendedor maps by `vendedor_username`. Extracting `_fetchTiempoRespuesta` and joining its ranking by `username` as-is would silently mis-join every row (comparing a UUID against a username, so `Map.get(username)` would never hit). The alternative — changing that file's internal grouping key from `vendedor_asignado` to `vendedor_username` — would be a live behavior change to an already-shipped, currently-untested report tab (no existing unit test for `tiempo-respuesta.ts`), well outside PR3's declared scope and its own line budget.

Decision: kept `tiempoRespuestaHoras: number | null` in the DTO (forward-compatible with the design), always `null` in this slice, rendered as "Sin datos" (a string distinct from "Sin meta asignada" — a different kind of absence: "no data wired yet" vs. "no target configured"). This is the same "explicit absence over invented number" philosophy the whole change is built on (ADR4), applied to a column this PR doesn't yet have a trustworthy, correctly-joined source for. Flagged here as a concrete, scoped follow-up (not folded into PR4, which is cobranza-only per ADR6) — a future small PR should either fix `tiempo-respuesta.ts`'s grouping key to `vendedor_username` (with its own dedicated test, since none exists today) or add a lookup table (`usuario_perfil.id` → `username`) to bridge the two keys without touching that file's live behavior.

### Design decision: no `proyecto` parameter on `obtenerScorecardVendedores`

`design.md` ADR5's signature sketch includes an optional `proyecto?` parameter. None of the four composed pieces (`_fetchPorVendedor`, `_fetchInteracciones`, `_fetchComisiones`, `fetchMetricasVentas`) accept or honor a project filter today, and no other "Equipo" group sibling tab (`rendimiento`, `por-vendedor`, `interacciones`) exposes a project selector on `page.tsx` either — there is no global project filter control on this page at all currently. Wiring an inert `proyecto` parameter into the scorecard's public signature would be a filter that silently does nothing, which is the exact class of lie ADR1-ADR6 exist to remove. Omitted; documented here instead of silently dropped. A future PR wiring project-scoping across the whole reportes page (a larger, cross-cutting change well beyond PR3's diff) would be the right place to add it everywhere at once, including here.

### Reconciliation guarantee — how it's structurally enforced (not just tested)

The scorecard's Fase 2 calls `_fetchPorVendedor(supabase, startISO, endISO, days, v.username)` — the identical function, identical argument shape, that `ReportePorVendedor.tsx` calls (via `obtenerReportePorVendedor`) when a user picks a specific vendedor from that tab's dropdown. Because it's the same function reading the same tables with the same filter, `leadsAsignados`/`contactados`/`conversionPct` cannot drift from "Por Vendedor" by construction — there is no parallel formula to fall out of sync. The `reportes-scorecard.test.ts` reconciliation test (Phase 19.1) makes this explicit by calling `_fetchPorVendedor` a second time directly, against the identical mocked data, and asserting equality — but the actual guarantee lives in the production code path reusing the function, not in the test alone.

### Rollback boundary

PR3 is independently revertible from PR1a/PR1b/PR2: reverting `scorecard.ts` (delete), `ScorecardVendedores.tsx` (delete), the `index.ts` barrel addition, `page.tsx`'s three additions (icon import, `GRUPOS_TABS` entry, `<section>` block), the `export` keyword on `_fetchPorVendedor`, the `_fetchInteracciones` extraction in `interacciones.ts` (collapsing back to the original inline `obtenerReporteInteracciones` body), and the new test file restores the PR2 state with no impact on PR1a/PR1b/PR2's own changes. PR4 (cobranza unification, ADR6) has no file-level dependency on PR3 — it re-touches `cobranza.ts` only, sequenced next purely by ADR8's slice ordering.

Suggested commit boundaries (no git mutations performed by this run, per delivery instructions):
1. `por-vendedor.ts` (export) + `interacciones.ts` (extraction) — Phase 18, mechanical, low-risk, natural single commit (both are "make an existing computation directly callable" changes with no new behavior)
2. `scorecard.ts` + `reportes-scorecard.test.ts` + `index.ts` barrel export — Phase 19, the new composed action
3. `ScorecardVendedores.tsx` + `page.tsx` (icon import + `GRUPOS_TABS` entry + `<section>` block) — Phase 20, UI-only, no new tests

— or a single squashed commit for the whole PR3 slice if the reviewer prefers one PR/one commit (matches PR1a/PR1b/PR2's own note on this).

### Notes for PR4 (final slice — cobranza single source of truth, ADR6)

- PR4 re-opens `cobranza.ts` (already restructured in PR1b into `_fetchCobranza` + `buildCachedReportFetcher`). Per PR1b's own note: `pagosPeriodo`/`cuotasPagadasPeriodo`/`ventasData` are still unbounded `.select()` calls (out-of-scope gap flagged in PR1b) — good opportunity to close that gap in the same pass since the file is being re-opened anyway for `computeTier`/`limaToday` wiring, though it's not strictly required by ADR6's own task list (Phase 22-24) — flag to the apply-progress author of that slice to decide scope explicitly rather than silently bundling or silently skipping.
- `computeTier`/`limaToday` come from `src/lib/cobranza/tiers.ts` — pass `cuota.fecha_vencimiento` through unchanged (date-only `"YYYY-MM-DD"`, no `.toISOString()` re-stringify) per ADR6's documented date-contract gotcha.
- The single-shared-mock-chain-per-table test pattern (no call-count routing) used in `reportes-scorecard.test.ts` works because this PR's fixtures used exactly one vendedor. PR4's `computeTier` parity test will likely need the `createPagedChainMock`/call-count routing pattern again (PR1b precedent) since it re-touches the same `cuota` table PR1b already paginated — check `reportes-cobranza-comisiones.test.ts`'s existing `setupCuotasYPagos` helper before adding new mock infrastructure.

---

## Slice completed: PR4 — Cobranza single source of truth (ADR6) — FINAL SLICE

Status: **done** (Phases 22-24 of `tasks.md`, all checked off). This is the last planned slice — `state.yaml` phases.apply is now `done`, `next_recommended: verify`.

### Files changed

| File | Action | What was done |
|------|--------|----------------|
| `src/app/dashboard/admin/reportes/actions/cobranza.ts` | Modified | Imported `computeTier`/`limaToday` from `@/lib/cobranza/tiers`. Computed `const today = limaToday()` once per `_fetchCobranza` call. In the existing `cuotasActivas.forEach` loop, classified each non-`pagada` cuota via `computeTier({ fechaVencimiento: c.fecha_vencimiento, estado: c.estado, today })` — `fecha_vencimiento` passed through unchanged (no `.toISOString()` re-stringify, per ADR6's date-contract gotcha) — and accumulated `cuotasEnMoraTier`/`moraTierTotal` (count + saldo of tier-`'mora'` cuotas) as NEW, separate fields alongside the pre-existing `cuotasEnMora`/`moraTotal` (legacy/accrued, unchanged). Both `ReporteCobranzaResumen` fields' JSDoc now explicitly distinguishes "legacy/accrued" vs. "tier-aligned — prefer for parity checks". Added a paginated `gestion_cobranza` fetch (`fetchAllRows`, Strategy B — rows are displayed, not just counted) bounded by `fecha_gestion` within `[startISO, endISO]`, joined to `cliente:cliente!cliente_id(nombre)` and `cuota:cuota!cuota_id(numero_cuota)`; aggregated into `gestionPorResultado` (count grouped by `resultado`, sorted desc) and `gestionesRecientes` (capped at `GESTIONES_RECIENTES_LIMIT = 20`, mirrors `topDeudores`'s `.slice(0, 10)` precedent — query already orders `fecha_gestion desc`, so no redundant client-side re-sort). **In-scope bundling decision** (see "Scope decision" below): also closed PR1b's documented pagination gap — `pagosPeriodo`, `cuotasPagadasPeriodo`, and `ventasData` now use `fetchAllRows` instead of unbounded `.select()`, and all four independent period-scoped fetches (pagos, cuotas-pagadas, ventas, gestiones) now run via a single `Promise.all` instead of three sequential awaits (vercel-react-best-practices skill, `async-parallel`). New exported interfaces: `GestionCobranzaPorResultado`, `GestionCobranzaReciente`. `ReporteCobranza` gained `gestionPorResultado`/`gestionesRecientes` fields. |
| `src/app/dashboard/admin/reportes/components/ReporteCobranza.tsx` | Modified | "Mora total" KPI card relabeled to "Mora (sistema)": primary figure is now `r.moraTierTotal` (tier-aligned, parity with the dashboard) with a `{cuotasEnMoraTier} cuotas · mismo criterio del panel de cobranza` subtitle, and a secondary muted line "Mora acumulada (histórico): {moraTotal}" for the legacy accrued figure — both visible and distinctly labeled, neither silently swapped for the other (ADR6). Added a new "Gestión de cobranza" `Card` (placed between "Por estado de cobranza" and "Top deudores"): a `resultado`-breakdown grid (count + Spanish label per outcome, reusing the same label set as `_GestionCobranzaModal.tsx`'s `RESULTADOS` — kept as a local `RESULTADO_LABEL`/`MEDIO_LABEL` const map here since the modal's array-of-objects shape isn't directly reusable as a lookup) and a recent-gestiones table (fecha, cliente link, cuota número, medio, resultado, notas truncated). Empty state: "Sin gestiones registradas en el período". Dark-mode classes added to `ESTADO_COLOR` (`dark:bg-*/30 dark:text-*-400` — pre-existing gap noticed while touching this file, small in-scope fix) and to the new mora card's icon/value. No `transition-all` anywhere in the new markup. |
| `src/__tests__/unit/reportes-cobranza-comisiones.test.ts` | Modified | Hoisted `setupCuotasYPagos` out of the `"obtenerReporteCobranza: agregaciones"` describe block to module scope (was describe-local, needed by the two new sibling describe blocks) — extended its `opts` with `gestiones?: any[]` and its table router with a `gestion_cobranza` branch (falls through to the existing `createChainMock()` default for every pre-existing test that doesn't pass `gestiones`, so no regression). Added `import { computeTier } from "@/lib/cobranza/tiers"` (real, unmocked — pure function, used by the test itself to compute the expected tier-aligned figure for the parity assertion). New describe `"obtenerReporteCobranza: mora alineada a computeTier (ADR6)"` (3 tests, using `vi.useFakeTimers()`/`vi.setSystemTime(new Date("2026-07-07T15:00:00Z"))` scoped to this block's own `beforeEach`/`afterEach` — not the file's shared `beforeEach` — so `limaToday()` is deterministic without needing to partial-mock the `tiers` module): parity test (computed tier-mora count/saldo equals `computeTier` run directly against the same fixture), 90-day-cap-excludes-`en_mora` test, and legacy-fields-survive test. New describe `"obtenerReporteCobranza: gestión de cobranza (ADR6)"` (3 tests): resultado-breakdown grouping, recent-gestiones join shape (cliente nombre + cuota número), and the 20-item display cap. |

### Tests (all TDD RED→GREEN)

| Test file | New tests | Result |
|-----------|-----------|--------|
| `src/__tests__/unit/reportes-cobranza-comisiones.test.ts` (extended) | 6 (3 mora-tier + 3 gestión) | green |
| **PR4 gate run** (`reportes-cobranza-comisiones.test.ts`) | **20 tests / 1 file** | **all green** |
| **Combined regression** (all 12 reportes-confiables test files, PR1a+PR1b+PR2+PR3+PR4) | **76 tests / 12 files** | **all green — no regressions** |

`npx tsc --noEmit`: clean (exit 0), repo-wide.

### TDD Cycle Evidence

| Task | RED | GREEN | Notes |
|------|-----|-------|-------|
| 22.1/22.2 tier-aligned mora | Confirmed — `cuotasEnMoraTier`/`moraTierTotal` both `undefined` against pre-change code (5 failing assertions across the 2 new-field tests) | Implemented; first GREEN attempt passed all 3 mora-tier tests, no calibration needed | Fixture deliberately includes a cuota 187 days overdue with `estado: 'en_mora'` to exercise the 90-day-cap-excludes-even-`en_mora` branch |
| 22.3/22.4 gestión de cobranza | Confirmed — `gestionPorResultado`/`gestionesRecientes` both `undefined`/threw on `.toHaveLength` against pre-change code (3 failing) | Implemented; first GREEN attempt passed all 3 gestión tests | Initial RED run also surfaced a test-file structural bug (`setupCuotasYPagos` was describe-scoped, not visible to the new sibling describes) — fixed by hoisting it to module scope before writing the real RED; not a production-code issue |
| 24.1/24.2 gate | n/a | 20/20 gate file; 76/76 combined regression; `tsc --noEmit` clean | |

### Scope decision: closing PR1b's pagination gap in PR4 (documented, not silently bundled)

`tasks.md` Phase 22's literal task text (22.2/22.4) only calls for adding the tier-aligned mora fields and the `gestion_cobranza` fetch — it does NOT explicitly list re-paginating `pagosPeriodo`/`cuotasPagadasPeriodo`/`ventasData`. However: (1) PR1b's own apply-progress explicitly flagged these three as an out-of-scope gap "to be revisited when PR4 ... touches `cobranza.ts` again"; (2) PR3's apply-progress repeated the same forward-note; (3) the orchestrator's PR4 launch prompt explicitly asked to "close that gap if tasks call for it"; (4) spec.md's "Large-table counts are exact, not 1000-row-truncated" requirement names `cobranza.ts` by name in its scenario, and design.md's ADR2 rule-of-thumb ("if the result is `x.length` or `x.reduce(...)` over an unbounded `.select()`, ... never leave it unbounded") applies to these three queries exactly as it did to the headline `cuotasActivas` query PR1b already fixed; and (5) **PR4 is the final planned slice** — there is no PR5 to revisit this in, so leaving it unbounded would ship the whole `reportes-confiables` change with a known, previously-flagged violation of its own blanket spec requirement, with no future PR positioned to close it.

Decision: closed the gap in this same pass, since the file was already being re-opened for ADR6 and `fetchAllRows` already exists and is already proven against exactly this call-count-routing test pattern (PR1b precedent). Verified low regression risk before implementing: the existing `createChainMock` mock (used by every pre-existing `pagosChain`/`cuotasPagadasChain`/`ventaChain` test fixture) already supports `.range()` as a no-op passthrough (same mechanism that let `cuotasActivas`'s own Strategy B conversion in PR1b pass all pre-existing tests unchanged) — so converting these three queries to `fetchAllRows` required zero test-fixture changes for any PR1a/PR1b/PR2/PR3 test, confirmed by the 76/76 combined regression run staying green with no test file other than `reportes-cobranza-comisiones.test.ts` touched.

If a future reviewer considers this bundling too broad for one PR/commit, the pagination-gap-closure lines (the `Promise.all` restructure + `fetchAllRows` wrapping of `pago`/`cuota`(pagada)/`venta`) are cleanly separable from the ADR6 lines (tier classification + `gestion_cobranza` fetch/aggregation) — see "Rollback boundary" below for the exact split.

### Design decision: `moraTierTotal` is a saldo sum, not a `monto_mora` sum (documented, matches design.md literally)

`design.md` ADR6 says the tier-aligned figure is "count + saldo of `mora`-tier cuotas within the cap" — i.e., `moraTierTotal` sums `(monto_programado - monto_pagado)` (the same `saldo` variable already computed per-cuota for `saldoTotalPorCobrar`), NOT the `monto_mora` column. This is intentional and matches the literal ADR6 wording precisely — `moraTierTotal` and `moraTotal` are answering different questions (tier-aligned outstanding balance of mora-tier cuotas vs. accrued mora-charge column sum) and are not meant to be numerically comparable to each other by coincidence. Confirmed via the new "legacy fields survive" test that both fields report different values from the same fixture without one silently overwriting the other.

### Deviations from tasks.md wording (all documented)

1. **Pagination-gap closure bundled in** (task 22.2/22.4) — see "Scope decision" above; not in the literal task text, added deliberately with rationale documented rather than silently expanded or silently left broken in the final slice.
2. **`Promise.all` restructure of steps 2-5** — not mentioned in tasks.md at all; applied per the `vercel-react-best-practices` skill (`async-parallel`, CRITICAL priority) since converting three sequential unbounded `.select()` awaits into three (now four, with `gestion_cobranza`) independent `fetchAllRows` calls was the natural point to also stop awaiting them sequentially — same pattern PR2's apply-progress documented for `ventas.ts`/`rendimiento.ts`.
3. **No re-sort of `gestionesRecientes` before `.slice(0, 20)`** — relies on the query's own `.order('fecha_gestion', { ascending: false })` being preserved across paginated pages by Postgres (standard `ORDER BY` + `LIMIT/OFFSET` semantics), matching how `_fetchFunnel`/`_fetchCobranza`'s other Strategy B fetches don't client-side re-sort either. Documented here in case a future reviewer expects an explicit client-side sort as a defensive measure.
4. **`ESTADO_COLOR` dark-mode classes added** (`ReporteCobranza.tsx`) — pre-existing gap (light-only classes) noticed while already editing this exact section for the mora relabel; same "small, in-scope fix while already touching these lines" precedent PR2's apply-progress used for `ReporteVentas.tsx`'s progress-bar tracks.

### Known remaining gaps across the WHOLE `reportes-confiables` change (for `sdd-verify`'s attention — no further apply slice is planned)

Since PR4 is the last slice, these previously-flagged, deliberately-scoped-out items from earlier slices are NOT re-opened here and remain as-is going into `sdd-verify`:

1. **`tiempoRespuestaHoras` is always `null`** in the PR3 scorecard (`scorecard.ts`) — `tiempo-respuesta.ts` groups by `cliente.vendedor_asignado` (a UUID), not `vendedor_username` like every other composed fetcher; joining by username would mis-join every row. Flagged in PR3's own apply-progress as a scoped follow-up, explicitly NOT folded into PR4 (ADR6 is cobranza-only).
2. **`esEstimado` semantics** (PR2, `obtenerObjetivosVsRealidad`) — `esEstimado: true` means "the real (possibly-zero) sum, but zero `meta_vendedor` rows exist for the period" (an honest zero, flagged), distinct from `clientesNuevos.meta === null` (a permanent structural absence — no column exists). Both are intentional, documented in PR2's apply-progress; not a defect.
3. **`metricas-fetchers.ts`'s `buildTopVendedores`/`VendedorTopPieza.meta`** (the dashboard "top vendedores" widget) still reads `usuario_perfil.meta_mensual_ventas` — confirmed out of scope per ADR8/tasks.md's explicit PR2 scope note (only `obtenerObjetivosVsRealidad`/`obtenerReporteRendimiento` named).
4. **`cobranza.ts`'s `topDeudores.dias_max_atraso` and `recaudacionMensual`'s "vencido" bucket** still use the pre-existing ad-hoc `hoy`/`new Date()` local-time comparison, NOT `computeTier`/`limaToday`. `tasks.md` Phase 22 only asked for the `cuotasEnMoraTier`/`moraTierTotal` fields to use tier logic (additive, not a full replacement of every date comparison in the file) — confirmed by the task's literal "add ... fields ... keep the existing ... fields" wording. `design.md`'s ADR6 prose ("replaces" the ad-hoc aging) reads more broadly than `tasks.md`'s literal scope; followed `tasks.md` as the operative breakdown for this apply run, per this codebase's own established precedent (design intent vs. literal task scope are called out separately in every prior PR's apply-progress). Flagged here explicitly for `sdd-verify` to weigh against the spec's parity scenario, since `dias_max_atraso`/`vencido` are not named in the spec's "Same cutoff, same mora total" scenario (that scenario targets the mora total, which this PR does align).

### Rollback boundary

PR4 is independently revertible from PR1a/PR1b/PR2/PR3: reverting `cobranza.ts`, `ReporteCobranza.tsx`, and the extended `reportes-cobranza-comisiones.test.ts` (both the new describe blocks and the `setupCuotasYPagos` hoist/extension) fully restores the PR1b/PR2/PR3 state, since no other file was touched and no other PR imports anything new from `cobranza.ts` (PR3's scorecard does not consume `_fetchCobranza`). Since this is the final planned slice, rollback here means reverting to "PR1a+PR1b+PR2+PR3 shipped, cobranza still on the pre-ADR6 aging rule" — a safe, complete state on its own.

Within PR4 itself, if a reviewer wants a narrower split:
1. `computeTier`/`limaToday` import + `cuotasEnMoraTier`/`moraTierTotal` fields + the 3 mora-tier tests — smallest, highest-trust-impact unit (Phase 22.1-22.2).
2. `gestion_cobranza` fetch + `gestionPorResultado`/`gestionesRecientes` + the 3 gestión tests — Phase 22.3-22.4 (depends on nothing from unit 1, could ship independently or in either order).
3. `pagosPeriodo`/`cuotasPagadasPeriodo`/`ventasData` → `fetchAllRows` + `Promise.all` restructure — the "scope decision" bundle; independently revertible (falls back to the three sequential unbounded awaits) without touching units 1 or 2's field additions, since it's a pure internal-implementation change with no external interface difference.
4. `ReporteCobranza.tsx` UI (relabeled mora card + "Gestión de cobranza" panel) — Phase 23, UI-only, no new tests, depends on units 1+2's new fields existing.

— or a single squashed commit for the whole PR4 slice if the reviewer prefers one PR/one commit (matches every prior slice's own note on this).

### Next step

All 5 planned PRs (PR1a, PR1b, PR2, PR3, PR4) are now done — `tasks.md` Phases 1-24 all checked off, `state.yaml` `phases.apply: done`, `next_recommended: verify`. Run `sdd-verify` against `spec.md`'s 7 requirements / 14 scenarios (pay particular attention to the "Known remaining gaps" section above — items 1 and 4 are the most likely candidates for a WARNING/SUGGESTION rather than a CRITICAL, since neither is named explicitly in the spec's scenarios), then `sdd-archive`. A full-suite `npm test` + `npx tsc --noEmit` (repo-wide) + `next build` gate should still run once per PR before merge, outside this sandboxed targeted-test loop.
