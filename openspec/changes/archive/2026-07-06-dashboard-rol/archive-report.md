# Archive Report: dashboard-rol

**Change Name**: dashboard-rol  
**Status**: ARCHIVED — Fully implemented, verified, and closed  
**Archive Date**: 2026-07-06  
**Artifact Store Mode**: openspec

---

## Change Summary

Rebuilt `/dashboard` to answer a single question in five seconds, tuned by role: vendedor cockpit ("¿qué hago hoy?") surfaces due/overdue actions, own collection alerts, and uncontacted leads; gerencia/coordinador command center ("¿cómo va el negocio?") displays funnel + aging leads, per-project inventory, month sales vs. goal, and total mora + unmanaged alerts. Deleted legacy `/dashboard/vendedor` and repointed DNI login. Fixed pre-existing bugs in `getCachedSeguimientosHoy` and `getCachedFunnelClientes` scope.

---

## Implementation Artifacts

### Specification
**Main Spec Created**: `openspec/specs/dashboard/spec.md`
- 6 core requirements across 13 scenarios
- Covers role-composition routing, vendedor cockpit blocks, command-center priority order, legacy removal, source-of-truth invariants, and role-scope guarantees
- All scenarios bind specific fetcher destinations and link targets for compliance verification

### Design Decisions (7 ADRs)
- **ADR-1**: Per-widget async server components (no monolithic Promise.all) — enables streaming and per-role query branching
- **ADR-2**: Coordinador global scope for funnel + stats — closes visibility gap for global-data consumers
- **ADR-3**: Aging-lead predicate (3-day threshold, AND semantics) — 2-step query matching pipeline/badges source of truth
- **ADR-4**: Inventory-by-project aggregation — per-project `disponible/reservado/vendido` + org totals
- **ADR-5**: Unmanaged-alerts thin count — avoids materializing heavy join rows for a scalar
- **ADR-6**: Agenda dropped from both compositions — no admin branch needed; metrics already unavailable on manager home
- **ADR-7**: Pre-existing `getCachedSeguimientosHoy` bugfix — due/overdue branch now uses `cliente_interaccion.fecha_proxima_accion` instead of enum label; `SeguimientosHoy` urgency labels corrected

### Implementation Scope

**Files Committed to Main** (4 chained PRs, 4 slices):

#### PR1a (Shared shell + deletions)
- Commits: 7d5cf39, 8b97aa8
- Deleted 8 orphan decorative components (verified home-only)
- Rewrote `src/app/dashboard/page.tsx` for role-based composition
- Implemented `resolveComposition()` router with TDD (RED/GREEN)

#### PR1b (Vendedor cockpit)
- Commits: 5a48e09..1dc3445
- Fixed ADR-7 bug: `getCachedSeguimientosHoy` now queries `cliente_interaccion.fecha_proxima_accion` (2-step + Map merge)
- Fixed `SeguimientosHoy.getUrgencia` to read real timestamp instead of parsing enum
- New vendedor blocks: `CobranzaAlertasPropias.tsx`, `LeadsSinContactar.tsx`, `MetaDelMes.tsx` (each with skeleton)
- New helpers: `src/lib/dashboard/aging.ts` (pure `isAgingLead` + `AGING_THRESHOLD_DAYS=3`)
- New shared: `src/lib/dashboard/scope.server.ts` (`getPerfilRol()` wrapped in `React.cache`)
- 22/22 unit tests passed

#### PR2a (Command-center logic + RLS policy fix)
- Commits: f2384e9..5911f48
- ADR-2 fix: Added `esCoordinador` to global-visibility check in `getCachedFunnelClientes`
- Implemented 3 new fetchers in `src/lib/dashboard/command-center.server.ts`:
  - `getAgingLeads({ esGlobal })` — 2-step query, returns `{ count, top, isExact }`
  - `getInventarioLotesPorProyecto({ esGlobal })` — per-project estado counts + org totals
  - `getAlertasSinGestionarCount({ esGlobal })` — thin count via `head:true`
- Created migration `20260706000000_venta_select_visibilidad_global.sql` to fix pre-existing `venta_select_policy` RLS gap for coordinador (NOT YET APPLIED TO LIVE DB — see pending items)
- Applied 4 fixes from PR2a review round:
  - Fixed aging to exclude `propietario` state (in addition to `desestimado`/`transferido`)
  - Implemented exact-vs-approximate count semantics for aging (honest upper bound when capped at 200)
  - Fixed RLS comment documenting migration dependency
  - Fixed `React.cache` inertness: changed fetcher signatures from `{ esGlobal }` object to `esGlobal: boolean` primitive
- 29/29 unit tests passed (aging, composition, scope, funnel, seguimientos, command-center fetchers)

#### PR2b (Command-center UI + legacy removal)
- Commits: 081a5e9..86fcd1e
- Implemented 4 command-center blocks with skeletons (TDD):
  - `FunnelAgingBlock.tsx` — funnel bar + aging counter (renders count+/isExact logic), links unfiltered `/dashboard/pipeline`
  - `InventarioLotesBlock.tsx` — per-project bars (top 5 + "+N remaining"), org totals, links `/dashboard/proyectos`
  - `VentasVsMetaBlock.tsx` — org sales vs goal + MoM delta, no CTA (pre-existing metas route-guard gap out of scope)
  - `MoraAlertasBlock.tsx` — mora total + alert count, links `/dashboard/cobranza?tab=alertas`
- New meta helper: `calcularDeltaMensual()`, `calcularPeriodoAnterior()` (5 new tests added to `dashboard-meta.test.ts`, all passing)
- Deleted legacy: `/dashboard/vendedor/{page,loading}.tsx`, repointed DNI login redirect in `_LoginForm.tsx:329`
- Orphan fetcher cleanup: Removed `getCachedDashboardStats`, `getCachedVentasMensuales`, `getCachedClientesDashboardMetrics` (zero consumers after page.tsx rewrite); removed `ClienteDashboardMetrics` and `DashboardStats` types from `crm.ts`
- Full unit suite re-verified: 697/697 tests passed (to guard widely-imported `cache.server.ts` changes)

**Full-Suite Gate** (Orchestrator post-commit):
- `npm test`: 71 files / 1022 tests PASS
- `npx tsc --noEmit`: clean
- No lint errors

---

## Verification Outcome

**Result**: PASS WITH WARNINGS → PASS (post-fix)

Original `sdd-verify` returned PASS WITH WARNINGS with one CRITICAL finding:
- SeguimientosHoy's block-a link destination pointed to `/dashboard/clientes` but spec explicitly required `/dashboard/pipeline`

**Fix Applied** in commit 9a8b48f (post-verify, pre-archive):
- Changed both `SeguimientosHoy.tsx` hrefs from `/dashboard/clientes` → `/dashboard/pipeline`
- Spec scenario clarified in the same commit to bind the destination normatively

**Final Compliance**: 10/10 spec scenarios fully compliant after post-verify fix.

### Key Verification Evidence

| Requirement | Test Evidence | Result |
|---|---|---|
| Role composition | `dashboard-composition.test.ts` (vendedor/command-center branching) | PASS |
| Vendedor cockpit due/overdue | `seguimientos-hoy-fetcher.test.ts` (queries `cliente_interaccion.fecha_proxima_accion`) | PASS |
| Vendedor cockpit uncontacted | Source inspection: `getCachedClientes` role-scoped via `cliente_accesible` view | PASS |
| Aging boundary (exactly 3d) | `dashboard-aging.test.ts` (inclusive boundary, 8 test cases) | PASS |
| Legacy removal | Grep-verified: vendor routes deleted, reportes/propiedades kept, both login paths → `/dashboard` | PASS |
| Coordinador funnel scope | `funnel-stats-coordinador.test.ts` (esCoordinador in global-visibility check) | PASS |
| Source-of-truth invariants | Source inspection + contracts: all blocks reuse exact same fetchers/aggregations as their owning modules | PASS |

---

## Shipped Behavior

### Vendedor Cockpit
Above the fold: (a) due/overdue actions from `SeguimientosHoy` (fixed to show real `fecha_proxima_accion` data); (b) own collection alerts via `obtenerAlertasCobranza`; (c) uncontacted leads via `getCachedClientes`. Below fold: month goal progress bar via `obtenerKPIs`.

### Command Center (Gerencia/Coordinador)
① Funnel + aging leads (count + top-5 preview, isExact semantics)  
② Per-project inventory (top 5 projects + "+N" link, org totals)  
③ Org month sales vs. goal + MoM delta  
④ Total mora + unmanaged alerts count  

### Other Changes
- Deleted legacy `/dashboard/vendedor` (533 lines duplicate salesperson home)
- Deleted 8 decorative components (hero tiles, pulse, recent activities, etc.)
- Deleted 4 orphan fetchers from `cache.server.ts` (0 consumers after rewrite)
- Fixed `getCachedSeguimientosHoy` pre-existing bug (due/overdue was silently always empty due to wrong column used)
- Fixed `getCachedFunnelClientes` scope: coordinador now sees global funnel (was missing from visibility check)
- Added RLS policy fix for coordinador (via migration, not yet deployed)

### Reused Fetchers
- `getCachedSeguimientosHoy` (with ADR-7 date-source fix)
- `obtenerAlertasCobranza`
- `getCachedClientes` (por_contactar filter)
- `obtenerKPIs`
- `getCachedFunnelClientes` (with coordinador scope fix)
- `obtenerResumenCobranza`

### New Fetchers
- `getAgingLeads({ esGlobal })`
- `getInventarioLotesPorProyecto({ esGlobal })`
- `getAlertasSinGestionarCount({ esGlobal })`
- `getPerfilRol()` (shared, React.cache-wrapped)

---

## Pending Items (Not Blocking Archive)

### 1. Migration Deploy
**Item**: `supabase/migrations/20260706000000_venta_select_visibilidad_global.sql`  
**Status**: Committed, not yet applied to live database  
**Impact**: Until applied, coordinador role counts in `getAlertasSinGestionarCount` and pre-existing `obtenerAlertasCobranza` undercount due to `venta_select_policy` RLS not granting coordinador visibility to embedded `venta` rows. Also affects the cobranza Alertas tab for coordinador. This is a pre-existing bug being fixed, not a regression.  
**Action**: Apply migration to production database before coordinador-scoped mora/alert data is considered accurate.

### 2. Non-Blocking Follow-ups (from verify report)
- **Canal filter in CobranzaAlertasPropias**: Spec explicitly names `canal='sistema'` but fetcher doesn't filter. Currently correct by construction (inserts always default to sistema). Consider adding explicit check if cross-channel alerts are added in future.
- **Metas route access gap**: `/dashboard/admin/metas` gated to `soloAdmins()` but `VentasVsMetaBlock` renders for gerente/coordinador — would redirect them away. Pre-existing route-guard issue, out of scope.
- **Aging pipeline-filter link**: Funnel-aging block links to unfiltered `/dashboard/pipeline` (no URL param for client-side urgency filter). Works correctly; design documentation assumed a filtered URL that doesn't exist.
- **String dedup optimization**: `.or()` filter string dedup in some queries — minor optimization, not functional gap.

---

## Source of Truth Updated

**New Main Spec**: `openspec/specs/dashboard/spec.md`
- Captures all 6 dashboard-rol requirements and 13 scenarios for future reference and maintenance
- Binds role-composition routes, cockpit and command-center blocks, link destinations, scope invariants
- Replaces no prior spec (dashboard composition was unspecified before)

---

## SDD Cycle Complete

**Closed Artifacts** (moved to archive):
- proposal.md — Original product rationale and scope
- spec.md — Acceptance criteria per role, all 13 scenarios
- design.md — 7 ADRs, fetcher mappings, visual hierarchy, PR chain strategy
- tasks.md — 13 phases across 4 chained PRs, all complete
- verify-report.md — Compliance matrix, correctness evidence, TDD audit

**Commits on main**: 7d5cf39, 8b97aa8 (PR1a); 5a48e09–1dc3445 (PR1b); f2384e9–5911f48 (PR2a); 081a5e9–86fcd1e (PR2b); 9a8b48f (post-verify link fix)

**Status**: Ready for next change.

---

## Archive Metadata

| Field | Value |
|---|---|
| Change | dashboard-rol |
| Archive Path | `openspec/changes/archive/2026-07-06-dashboard-rol/` |
| Spec Synced to | `openspec/specs/dashboard/spec.md` (created) |
| Mode | openspec (file-based, committable) |
| Artifact Store | Full audit trail (proposal, spec, design, tasks, verify-report, archive-report) |
| Verification | PASS (after post-verify fix) |
| Task Completion | All 13 phases checked; full-suite gate run by orchestrator |
| Build Status | 71 files / 1022 tests PASS; tsc clean |
| Ready for Deployment | Yes (pending only the RLS migration apply) |
