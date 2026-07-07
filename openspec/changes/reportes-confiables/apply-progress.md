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

Fix (test-only): `reporte-funnel-labels.test.ts` mocks `@/app/dashboard/admin/reportes/_actions` directly (`vi.mock(...)` with stub functions for `obtenerReporteFunnel`/`obtenerClientesPorEtapaFunnel`) before importing the component, so the barrel — and everything it transitively pulls in — never actually loads. This is scoped to the test file only; no production code changed. Worth keeping in mind for PR1b/PR3 tests that might also import components pulling the full barrel.

### Deviations from tasks.md wording (both minor, both within design intent)

1. Task 3.3/3.4 describes the `metricas-fetchers.ts` fix as a "cross-phase discovery" already anticipated in the task text — implemented exactly as written, no deviation.
2. `periodo.fin` in `clientes.ts`/`interacciones.ts` return payloads still uses `new Date().toISOString()` instead of `endDate.toISOString()` — task wording scoped the fix to the query `.lte(...)` bound only, not the returned metadata field. Left untouched to keep the diff minimal and match the literal task scope; flagged here as a latent (separate, low-severity) inconsistency for a future cleanup pass, not part of this PR's spec-mandated fix.

### Notes for PR1b (next slice)

- `fetchAllRows` paginator (`src/lib/reportes/pagination.ts`) and Strategy A/B application to `funnel.ts`/`metricas-fetchers.ts`/`cobranza.ts`/`comisiones.ts` are next (tasks.md Phase 7-12).
- `metricas-fetchers.ts` already has the `esEstadoConvertido` import from PR1a — PR1b's pagination changes to `fetchMetricasClientes`/`fetchMetricasVentas`/`fetchMetricasInventario` should not touch that logic, only the row-fetching strategy.
- The `next/cache`/`unstable_cache` test-import gotcha above will resurface for PR1b's `cobranza.ts`/`comisiones.ts` cache-wrap work if any new test tries to import a component/barrel that transitively pulls those modules — plan to mock `next/cache`'s `unstable_cache` as an identity passthrough (`(fn) => fn`) in any such test file, following the existing per-file override pattern already used elsewhere in this codebase (e.g. `cobranza-gestion-action.test.ts` overrides the global `next/cache` mock).

### Rollback boundary

PR1a is self-contained and independently revertible: reverting the 6 changed files + deleting `src/lib/reportes/estados.ts` and the 5 new test files fully undoes this slice with no impact on PR1b-PR4 (none of which exist yet). Suggested commit boundary: one commit for `estados.ts` + its test (Phase 1), one commit for the four fetcher fixes + their tests (Phases 2-4), one commit for the funnel labels fix + its test (Phase 5) — or a single squashed commit if the reviewer prefers one PR/one commit. No git mutations were performed by this run (per delivery instructions); the working tree is left staged-but-uncommitted for the user/orchestrator to commit.
