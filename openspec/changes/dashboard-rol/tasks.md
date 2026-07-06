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
- [ ] 8.1 Grep-guard: confirm `getCachedFunnelClientes`/`getCachedDashboardStats` are consumed only by the dashboard home; note `getCachedVentasMensuales` already has no per-role filter — no change needed there.
- [ ] 8.2 RED — `src/__tests__/unit/funnel-stats-coordinador.test.ts`: `ROL_COORDINADOR_VENTAS` hits the unfiltered branch in both fetchers (spec: coordinador sees global funnel, not own-only).
- [ ] 8.3 GREEN — add `esCoordinador` to the global-visibility check in `getCachedFunnelClientes` (`cache.server.ts:944-951`) and `getCachedDashboardStats` (`cache.server.ts:738-772`).

### Phase 9: Aging predicate (TDD, ADR-3)
- [ ] 9.1 RED — `src/__tests__/unit/dashboard-aging.test.ts`: exactly-3-day-old contact with no future action → aging; stale contact with a future `fecha_proxima_accion` → excluded (AND semantics; spec's two aging scenarios).
- [ ] 9.2 GREEN — implement `src/lib/dashboard/aging.ts` (`isAgingLead`, `AGING_THRESHOLD_DAYS = 3`).

### Phase 10: New command-center fetchers (TDD, ADR-3/4/5)
- [ ] 10.1 RED — `src/__tests__/unit/command-center-fetchers.test.ts`: `getAgingLeads` two-step query (candidate clientes, then future-action `cliente_interaccion` set, JS set-difference); empty when `!esGlobal`.
- [ ] 10.2 GREEN — implement `getAgingLeads({esGlobal})` in new `src/lib/dashboard/command-center.server.ts`.
- [ ] 10.3 RED — extend the test: `getInventarioLotesPorProyecto` aggregates `lote(proyecto_id,estado)` + `proyecto(nombre)` into per-project counts and org totals.
- [ ] 10.4 GREEN — implement `getInventarioLotesPorProyecto({esGlobal})`.
- [ ] 10.5 RED — extend the test: `getAlertasSinGestionarCount` — `head:true` count of `alerta_cobranza` where `gestionada=false`, scoped by `esGlobal`.
- [ ] 10.6 GREEN — implement `getAlertasSinGestionarCount({esGlobal})`.

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
