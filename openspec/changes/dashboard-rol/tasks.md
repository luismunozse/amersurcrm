# Tasks: Role-Composed Dashboard Home (`dashboard-rol`)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | PR1a ~730 logic / ~1400 raw (incl. ~700 low-risk deletions); PR1b ~700; PR2 ~1350–1450 |
| 400-line budget risk | High (every slice) |
| Chained PRs recommended | Yes |
| Suggested split | PR1a → PR1b → PR2 (stacked) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

**Note on design's headline numbers:** design.md's own PR1 (~760–860) and PR2 (~750+) totals undercount when the per-file table is re-summed line by line (PR1 combined ≈2100, PR2 ≈1350–1450 once `aging.ts` is counted in PR2 per this breakdown, not PR1). The PR1a/PR1b sub-split is treated as **required**, not optional. Within PR1a, the 7-file decorative-component deletion (~700 raw lines) is mechanically safe (grep-guarded, no logic) and reviews far faster than its line count implies — flag this to reviewers explicitly.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Grep-guard + delete 7 orphan decorative files | PR1a | mechanical; base = main |
| 2 | `resolveComposition` + `page.tsx` shell rewrite | PR1a | depends on 1; base = main |
| 3 | ADR-7 `getCachedSeguimientosHoy`/`SeguimientosHoy` fix | PR1b | independent; base = PR1a merge |
| 4 | Cockpit helpers + 4 vendedor blocks | PR1b | depends on 3; base = PR1a merge |
| 5 | ADR-2 coordinador fix (funnel + stats) | PR2 | independent; base = PR1b merge |
| 6 | Aging predicate + 3 new command-center fetchers | PR2 | independent of 5; base = PR1b merge |
| 7 | Command-center blocks + composition | PR2 | depends on 6 |
| 8 | Legacy `/dashboard/vendedor` removal + redirect + dead-link sweep | PR2 | ships last |

---

## PR1a — Shared shell (deletions + role-branch resolver)

### Phase 1: Grep-guard + delete decorative components
- [x] 1.1 Grep-guard each of `LazyDashboardStats.tsx`, `DashboardVentasChart.tsx`, `DashboardLotesDonut.tsx`, `MiniFunnelVentas.tsx`, `RecentActivities.tsx`, `RecentProjects.tsx`, `src/components/dashboard/SecondaryPanelDrawer.tsx` — confirm `page.tsx` is the only importer (design §3). Also grep-guarded and deleted `src/components/DashboardStats.tsx` (the component `LazyDashboardStats` wraps, per design §3's "(+ DashboardStats it wraps)" note) — it would otherwise become dead code.
- [x] 1.2 Delete each file confirmed orphaned in 1.1.

### Phase 2: Composition resolver (TDD)
- [x] 2.1 RED — `src/__tests__/unit/dashboard-composition.test.ts`: `resolveComposition('ROL_VENDEDOR')→'cockpit'`; `'ROL_ADMIN'|'ROL_GERENTE'|'ROL_COORDINADOR_VENTAS'→'command-center'` (spec: Single route branches composition by role).
- [x] 2.2 GREEN — implement `src/lib/dashboard/composition.ts` (`resolveComposition(rol: RolNombre)`).

### Phase 3: Shell rewrite
- [x] 3.1 Rewrite `src/app/dashboard/page.tsx`: call `obtenerPermisosUsuario()` once, `resolveComposition(rol)`, render `<VendedorCockpit/>` or `<CommandCenter/>` under one top-level `<Suspense>`; remove `loadDashboardMetrics`/`DashboardMetrics`/`initialMetrics`/`ClienteLite`/`ProyectoLite`, `obtenerMetricasAgenda`, hero/pulse/quick-actions/prioridades sections, `DashboardLoading` (spec scenarios: vendedor skips command-center queries; gerencia/coordinador skips cockpit-only queries). PR1a ships minimal `VendedorCockpit.tsx` (hosts only the surviving `SeguimientosHoy`) and `CommandCenter.tsx` (lean placeholder + module quick-links, no data widgets survive for this role per design §3) — both extended in PR1b/PR2 per the suggested work units.
- [x] 3.2 `npx vitest run src/__tests__/unit/dashboard-composition.test.ts`.
- [x] 3.3 `npx tsc --noEmit` clean for the PR1a diff.

## PR1b — Vendedor cockpit

### Phase 4: ADR-7 fetcher bugfix (TDD)
- [x] 4.1 RED — `src/__tests__/unit/seguimientos-hoy-fetcher.test.ts`: due/overdue branch queries `cliente_interaccion.fecha_proxima_accion <= endOfToday` (two-step + `Map` merge), not `cliente.proxima_accion`; `SeguimientoHoy` exposes `fecha_proxima_accion` (spec: due/overdue sourced from the interaction date).
- [x] 4.2 GREEN — fix `getCachedSeguimientosHoy` in `src/lib/cache.server.ts` (~line 1017); extend `SeguimientoHoy` type with `fecha_proxima_accion: string | null`.
- [x] 4.3 RED — extend the test: `getUrgencia` reads `fecha_proxima_accion`, never `new Date(proxima_accion)`.
- [x] 4.4 GREEN — update `getUrgencia` in `src/components/SeguimientosHoy.tsx` (also exported it, mirroring `_PipelineCard.tsx`'s `getUrgencia`, so it is directly unit-testable).
- [x] 4.5 PR description task: `SeguimientosHoy` now shows real due/overdue data — previously the due/overdue branch always resolved empty because it compared an ISO date string against `cliente.proxima_accion` (a `VARCHAR(50)` action-label enum) instead of `cliente_interaccion.fecha_proxima_accion`. This is a bugfix, not a behavior regression; vendedores may now see more items in "Seguimientos de hoy" than before.

### Phase 5: Cockpit helpers (TDD)
- [x] 5.1 RED — `src/__tests__/unit/dashboard-meta.test.ts`: month-goal progress-% helper (0%, mid-range, >100% clamp).
- [x] 5.2 GREEN — implement `src/lib/dashboard/meta.ts`.
- [x] 5.3 Implement `src/lib/dashboard/scope.server.ts` (`getPerfilRol()` wrapped in `React.cache`). Added `src/__tests__/unit/dashboard-scope.test.ts` (RED→GREEN) even though the task text didn't spell out a RED step, to keep Strict TDD evidence honest for this new shared helper — also verifies it closes the coordinador gap for future (PR2) consumers, per the spec's role-scope invariant. Not yet wired into any PR1b consumer (none of the reused cockpit fetchers need `esGlobal`); it is forward-looking infra for PR2's command-center fetchers per design ADR-1.

### Phase 6: Vendedor blocks
- [x] 6.1 `src/app/dashboard/_components/CobranzaAlertasPropias.tsx` + `.Skeleton.tsx`: wraps `obtenerAlertasCobranza()`, count + top overdue cuotas, empty state "Sin cobranzas vencidas", links `/dashboard/cobranza?tab=alertas`.
- [x] 6.2 `src/app/dashboard/_components/LeadsSinContactar.tsx` + `.Skeleton.tsx`: wraps `getCachedClientes({mode:'dashboard', estado:'por_contactar', pageSize:6, withTotal:true})`, empty state, links `/dashboard/clientes` (spec: uncontacted-leads block excludes other vendedores). Deviation: design's visual-hierarchy prose suggested a "Ver pipeline" CTA label for this block, which would mismatch its own `/dashboard/clientes` href (and the spec's explicit link table); used "Ver todos los leads" → `/dashboard/clientes` instead so label and destination agree.
- [x] 6.3 `src/app/dashboard/_components/MetaDelMes.tsx` + `.Skeleton.tsx`: wraps `obtenerKPIs({periodoAnio, periodoMes})` + `meta.ts` helper, below the fold. Links to `/dashboard/vendedor/reportes` ("Mis Reportes", the vendedor's own reports page that already surfaces `metaMensual`/`progreso`) rather than `/dashboard/admin/metas`, which sits under the Administración nav group and is not vendedor-accessible.
- [x] 6.4 `src/app/dashboard/_components/VendedorCockpit.tsx`: composes `<SeguimientosHoy/>` + the two above-fold blocks + `<MetaDelMes/>` below fold, each in its own `<Suspense>`. Widened the container to `max-w-5xl` with a 2-up `lg:grid-cols-[1.4fr_1fr]` row for above-the-fold content (was `max-w-2xl` single column in the PR1a placeholder, which only hosted one block).

### Phase 7: Gates
- [x] 7.1 `npx vitest run src/__tests__/unit/dashboard-meta.test.ts src/__tests__/unit/seguimientos-hoy-fetcher.test.ts` — also ran `dashboard-scope.test.ts` and `dashboard-composition.test.ts` (PR1a) together: 22/22 passed.
- [x] 7.2 `npx tsc --noEmit` clean for the PR1b diff.

---

## PR2 — Command center + legacy removal

### Phase 8: ADR-2 coordinador fix (TDD)
- [x] 8.1 Grep-guard: confirm `getCachedFunnelClientes`/`getCachedDashboardStats` are consumed only by the dashboard home; note `getCachedVentasMensuales` already has no per-role filter — no change needed there. **Finding (deviation from 8.3's literal text, see below):** grep at apply time shows `getCachedFunnelClientes` and `getCachedDashboardStats` both currently have **zero consumers anywhere in `src/`** except their own definitions — PR1a's `page.tsx` rewrite deleted every component that used to call them (`DashboardStats`/`LazyDashboardStats`, `DashboardVentasChart`, `DashboardLotesDonut`, `MiniFunnelVentas`). `getCachedFunnelClientes` will regain a real consumer once PR2b wires `FunnelAgingBlock` (command-center priority ①), so "home-only, soon-consumed" still holds for it. `getCachedDashboardStats` will NOT regain one: design.md §2's own data-sourcing table and ADR-4 both route the command center's inventory block to the NEW `getInventarioLotesPorProyecto` instead, not to `getCachedDashboardStats`. Design's ADR-2 decision text itself hedges this with "and, if consumed by the command center, `getCachedDashboardStats`" — the condition resolves false.
- [x] 8.2 RED — `src/__tests__/unit/funnel-stats-coordinador.test.ts`: `ROL_COORDINADOR_VENTAS` hits the unfiltered branch in `getCachedFunnelClientes` (spec: coordinador sees global funnel, not own-only). Scope narrowed to this one fetcher per the 8.1 finding above — `getCachedDashboardStats` is intentionally NOT touched (dead code, no command-center consumer per design's own reuse table).
- [x] 8.3 GREEN — added `esCoordinador` to the global-visibility check in `getCachedFunnelClientes` (`cache.server.ts` — `.or(created_by...)` branch now also excludes `esCoordinador`). Left `getCachedDashboardStats` unchanged; added an explanatory comment above it recording the grep evidence and the design-table reasoning so a future reader doesn't reintroduce the fix for a fetcher nothing calls.

### Phase 9: Aging predicate (TDD, ADR-3)
- [x] 9.1 RED — `src/__tests__/unit/dashboard-aging.test.ts`: exactly-3-day-old contact with no future action → aging; stale contact with a future `fecha_proxima_accion` → excluded (AND semantics; spec's two aging scenarios). Also covers: null `ultimo_contacto` → aging, <3-day contact → not aging, `desestimado`/`transferido` → never aging, custom threshold override.
- [x] 9.2 GREEN — implemented `src/lib/dashboard/aging.ts` (`isAgingLead`, `AGING_THRESHOLD_DAYS = 3`). Boundary is inclusive (`elapsed >= thresholdDays`) to match the spec's explicit "exactly 3 days ago → aging" scenario; documented in code that design.md's SQL sketch (`ultimo_contacto < now() - interval '3 days'`, strict) is illustrative, not the literal boundary contract.

### Phase 10: New command-center fetchers (TDD, ADR-3/4/5)
- [x] 10.1 RED — `src/__tests__/unit/command-center-fetchers.test.ts`: `getAgingLeads` two-step query (candidate clientes, then future-action `cliente_interaccion` set, JS set-difference); empty when `!esGlobal`.
- [x] 10.2 GREEN — implemented `getAgingLeads({esGlobal})` in new `src/lib/dashboard/command-center.server.ts`. Candidate scan capped at 200 (mirrors the `getCachedSeguimientosHoy` crowd-out guard); preview list capped at 5 oldest, `count` reports the full aging total.
- [x] 10.3 RED — extended the test: `getInventarioLotesPorProyecto` aggregates `lote(proyecto_id,estado)` + `proyecto(nombre)` into per-project counts and org totals.
- [x] 10.4 GREEN — implemented `getInventarioLotesPorProyecto({esGlobal})`.
- [x] 10.5 RED — extended the test: `getAlertasSinGestionarCount` — `head:true` count of `alerta_cobranza` where `gestionada=false`, scoped by `esGlobal`.
- [x] 10.6 GREEN — implemented `getAlertasSinGestionarCount({esGlobal})`, reusing the same `!inner` join filters as `obtenerAlertasCobranza`.
- [x] 10.7 **PR2a review round 1 — 4 fixes applied to the Phase 10 work above:**
  - **Fix 1 (aging exclusion gap):** the candidate filter in `getAgingLeads` only excluded `desestimado`/`transferido`; `20260512000000_estado_propietario.sql` had since added a third terminal state, `propietario` (client already bought), which was missing from both the SQL `.not('estado_cliente','in',...)` filter and `aging.ts`'s `ESTADOS_EXCLUIDOS`. A `propietario` client with a stale `ultimo_contacto` was incorrectly counted as aging. Fixed in both places; `en_proceso` stays included (a mid-sale client can still go stale). Tests: `dashboard-aging.test.ts` (`it.each` now covers `propietario`, plus a dedicated stale-contact case), `command-center-fetchers.test.ts` (query-shape assertion + defense-in-depth predicate case).
  - **Fix 2 (count/preview coupling — design.md ADR-3 "count from a count query"):** `count` was previously just `aging.length` from the LIMIT-200 preview scan, silently capping the reported count at 200 regardless of the true total. **Decision:** exact-when-possible, not a blanket approximation. When the capped candidate scan returns fewer rows than `AGING_CANDIDATE_LIMIT` (200), that scan necessarily captured the entire matching population, so `aging.length` (after the future-action exclusion, itself computed over that same complete set) IS the exact count — zero extra queries, `isExact: true`. Only when the scan hits the 200-row cap does a genuine gap exist (the future-action exclusion can't cheaply be extended past the visible window without either an unbounded id fetch or a join-based head-count that risks over/undercounting on `cliente_interaccion` row fan-out); in that case ONE extra head-count query (same WHERE, no order/limit) reports the total matching population as an honest **upper bound**, flagged `isExact: false`. `AgingLeadsResult` gained an `isExact: boolean` field for PR2b's UI to render as e.g. "200+" when not exact. Tests pin both branches plus the head-count-error fallback (conservative floor = `AGING_CANDIDATE_LIMIT`).
  - **Fix 3 (RLS — embedded-join undercount for coordinador, migration-only):** `getAlertasSinGestionarCount`'s embedded `venta:venta!venta_id!inner(id,estado)` join is subject to `crm.venta`'s OWN `venta_select_policy` regardless of how permissive `alerta_cobranza_select`/`cuota_select` are — RLS applies per table to embedded joins. `venta_select_policy` (20260224100000) predates `es_visibilidad_global()` and never granted coordinador-wide visibility, silently undercounting this fetcher (and the pre-existing `obtenerAlertasCobranza`) for `ROL_COORDINADOR_VENTAS`. New migration `supabase/migrations/20260706000000_venta_select_visibilidad_global.sql` recreates the policy with its original conditions plus `OR crm.es_visibilidad_global()`. No TS change to the fetcher itself; a comment above `ALERTA_SIN_GESTIONAR_SELECT` documents the dependency on that migration being applied (manual Studio apply — this project does not use `supabase db push`). Grepped for an explicit `authenticated` GRANT on `crm.venta`: none found anywhere in migration history, same as `crm.cliente`/`crm.lote`/`crm.proyecto` — all apparently rely on an ambient/schema-level grant outside migrations; not added speculatively.
  - **Fix 4 (`React.cache` inert):** all three new fetchers took `{ esGlobal }` as a single destructured object — a fresh object literal on every call site is a new reference, so `React.cache`'s `Object.is`-based memoization never matched and the cache wrapper was a no-op. Changed all three signatures to a primitive `esGlobal: boolean` argument. Grepped `src/` for call sites: none outside the test file (Phase 11/12 wiring hasn't landed yet), so this is a signature-only change with no caller migration needed; the test file's call sites were updated.
  - Gates re-run after all four fixes: `npx vitest run src/__tests__/unit/command-center-fetchers.test.ts src/__tests__/unit/dashboard-aging.test.ts src/__tests__/unit/funnel-stats-coordinador.test.ts` — 29/29 passed; `npx tsc --noEmit` clean.

### PR2a gates (ran as part of this slice; PR2b will re-run alongside Phase 11/12 work)
- [x] `npx vitest run src/__tests__/unit/funnel-stats-coordinador.test.ts src/__tests__/unit/dashboard-aging.test.ts src/__tests__/unit/command-center-fetchers.test.ts` — 23/23 passed. Also re-ran `dashboard-composition`/`dashboard-scope`/`dashboard-meta`/`seguimientos-hoy-fetcher` (PR1a/PR1b) alongside for regression: 49/49 passed total.
- [x] `npx tsc --noEmit` clean for the PR2a diff.

Note: Phase 13's `13.1`/`13.2` below re-run against the same three test files once PR2b's Phase 11/12 land alongside them; `13.3` (full-suite) is deliberately deferred to that point — this slice ships no UI, so a full-suite run is more meaningful once the command-center blocks exist.

### Phase 11: Command-center blocks
- [ ] 11.1 `FunnelAgingBlock.tsx` + `.Skeleton.tsx` — funnel bar + aging counter, links filtered pipeline (priority ①).
- [ ] 11.2 `InventarioLotesBlock.tsx` + `.Skeleton.tsx` — per-project table + org totals (priority ②).
- [ ] 11.3 `VentasVsMetaBlock.tsx` + `.Skeleton.tsx` — org `obtenerKPIs` sum vs. goal + MoM delta (priority ③).
- [ ] 11.4 `MoraAlertasBlock.tsx` + `.Skeleton.tsx` — `obtenerResumenCobranza().monto_mora_total` + `getAlertasSinGestionarCount`, links `/dashboard/cobranza?tab=alertas` (priority ④).
- [ ] 11.5 `src/app/dashboard/_components/CommandCenter.tsx`: composes the four blocks ①→④, each its own `<Suspense>`.

### Phase 12: Legacy removal
- [ ] 12.1 Delete `src/app/dashboard/vendedor/page.tsx` and `src/app/dashboard/vendedor/loading.tsx`.
- [ ] 12.2 Edit `src/app/auth/login/_LoginForm.tsx:329` — `router.replace("/dashboard/vendedor")` → `"/dashboard"` (spec: DNI login lands on the common home).
- [ ] 12.3 Grep sweep for remaining `/dashboard/vendedor` references outside `reportes`/`propiedades`; confirm "Mis Reportes" in `navigation.tsx`/`SidebarShadcn.tsx` still resolves.

### Phase 13: Gates
- [ ] 13.1 `npx vitest run src/__tests__/unit/funnel-stats-coordinador.test.ts src/__tests__/unit/dashboard-aging.test.ts src/__tests__/unit/command-center-fetchers.test.ts`.
- [ ] 13.2 `npx tsc --noEmit` clean for the PR2 diff.
- [ ] 13.3 Full-suite gate (potentially-hanging in agent sandboxes — run with care): `npm test`.

## Next Step
Confirm the stacked PR1a → PR1b → PR2 split with the user (delivery strategy `ask-on-risk` requires this before `sdd-apply`), then run `sdd-apply`.
