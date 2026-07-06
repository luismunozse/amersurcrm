# Design — Role-composed dashboard home (`dashboard-rol`)

Technical design for rebuilding `/dashboard` into two role compositions that share one route and one shell. The salesperson gets a **cockpit** ("¿qué hago hoy?"); management/coordination gets a **command center** ("¿cómo va el negocio y dónde está el fuego?"). This document decides the composition architecture, the concrete fetcher wired to each widget, what is deleted, the visual hierarchy, and the test/PR strategy. All decisions are verified against the real codebase.

## Quick path (the decisions in one screen)

1. `page.tsx` resolves permissions **once**, then renders `<VendedorCockpit/>` **or** `<CommandCenter/>` — never both. No shared data pass; each block is an independent async server component.
2. Streaming via **per-widget `<Suspense>`** with dark-aware skeletons (keep the existing `SeguimientosHoy` pattern). No single `await` blocking the whole page.
3. **Reuse first.** Only three genuinely new fetchers are added; everything else already exists.
4. **Agenda numbers are dropped** from both compositions — no admin branch needed, closing the `obtenerMetricasAgenda` risk.
5. Aging-lead threshold = **3 days** (user-decided), pure and unit-tested.
6. **No new DB schema.** One optional index is flagged as a non-blocking follow-up.

---

## 1. Composition architecture

### Decision: role branch at the page, per-widget async server components (not one `Promise.all`)

`src/app/dashboard/page.tsx` becomes a thin server component:

```
DashboardPage (server)
  └─ obtenerPermisosUsuario()  → esVisibilidadGlobal (admin | gerente | coordinador)
     ├─ esVisibilidadGlobal → <CommandCenter />
     └─ else                → <VendedorCockpit />
```

Each composition renders its blocks as **sibling async server components**, each wrapped in its own `<Suspense>`:

```
VendedorCockpit (server, no fetch of its own)
  ├─ <Suspense><SeguimientosHoy/></Suspense>              (existing component, reused as-is)
  ├─ <Suspense><CobranzaAlertasPropias/></Suspense>       (new)
  ├─ <Suspense><LeadsSinContactar/></Suspense>            (new)
  └─ <Suspense><MetaDelMes/></Suspense>                   (new, below the fold)

CommandCenter (server, no fetch of its own)
  ├─ <Suspense><FunnelAgingBlock/></Suspense>             (new)   ← priority ①
  ├─ <Suspense><InventarioLotesBlock/></Suspense>         (new)   ← priority ②
  ├─ <Suspense><VentasVsMetaBlock/></Suspense>            (new)   ← priority ③
  └─ <Suspense><MoraAlertasBlock/></Suspense>             (new)   ← priority ④
```

### Rationale (ADR-1)

- **Why not the current single `loadDashboardMetrics` Promise.all?** A monolithic fetch forces the whole page to wait for the slowest query before painting anything, and it couples unrelated widgets into one giant object. Per-widget async components let React render siblings concurrently (the promises still run in parallel) **and** stream each block as it resolves, so the above-the-fold answer paints as soon as its own query returns. This matches `async-suspense-boundaries` (Vercel) and the pattern already proven by `SeguimientosHoy` on this page.
- **No cross-branch double fetch.** Because only one branch is rendered, the command-center queries never run for a vendedor and vice versa. This satisfies the proposal's "branch the fetch sets, not just the render" constraint by construction — the fetch *is* the branch.
- **Redundant profile lookups.** Every existing `getCached*` fetcher runs its own `usuario_perfil` role query. `getCachedUserId()` is React-cached, but the role query is not. To keep the query budget flat under the per-widget model:
  - `page.tsx` resolves role/scope **once** via `obtenerPermisosUsuario()` and passes `esGlobal` down as a prop to the **new** command-center fetchers, which accept `{ esGlobal }` and skip their own profile lookup.
  - Reused existing fetchers keep their internal lookup (minor cost, unchanged behavior).
  - Wrap the shared profile read in a `React.cache` helper `getPerfilRol()` in `src/lib/dashboard/scope.server.ts` so new code dedupes within the request.

### Query budget per role (target: ≤ current ~6)

| Role | Independent queries above/below fold | Notes |
|------|--------------------------------------|-------|
| Vendedor | `getCachedSeguimientosHoy` (1) + `obtenerAlertasCobranza` (1) + `getCachedClientes` por_contactar (1) + `obtenerKPIs` current period (1) = **4** | Under budget. Each is a scoped aggregate/list. |
| Gerencia/Coordinador | funnel (1) + aging (1) + inventario (1) + `obtenerKPIs` global (1) + `obtenerResumenCobranza` (1) + alertas-sin-gestionar count (1) = **6** | At budget. All aggregates/counts; `esGlobal` passed down avoids extra profile reads. |

### Streaming strategy

Per-widget `<Suspense>` with **dark-aware skeletons** (extract the existing inline skeletons into small `*.Skeleton.tsx` siblings; reuse `bg-crm-border` tokens already used on the page). No page-level `DashboardLoading` monolith — it is deleted. `page.tsx` keeps a lightweight top-level `<Suspense>` only around the permission resolve so the shell chrome paints instantly.

---

## 2. Data sourcing per widget (verified signatures)

### Vendedor cockpit

| Block | Fetcher | Location / signature | Status | Notes |
|-------|---------|----------------------|--------|-------|
| (a) Today + overdue actions | `getCachedSeguimientosHoy()` → `SeguimientoHoy[]` | `src/lib/cache.server.ts:991` | **REUSE + fix** | Role-scoped, but its date branch is built on the wrong column (pre-existing bug — see ADR-7). Must be fixed to be pipeline-consistent before the cockpit reuses it; `SeguimientosHoy` component's urgency label is fixed alongside. |
| (b) Own collection alerts | `obtenerAlertasCobranza()` → `{success,data}` | `.../cobranza/_actions-cobranza.ts:153` | **REUSE** | Server action, callable from a server component. Auto-scopes to own clients when the caller lacks `PAGOS.VER_TODOS`. Render `gestionada=false` items; count = `data.length`. |
| (d) New uncontacted leads | `getCachedClientes({ mode:'dashboard', estado:'por_contactar', pageSize:6, withTotal:true })` → `{data,total}` | `src/lib/cache.server.ts:75` | **REUSE** | Already role-scoped. One call yields both the short list and the `total` count. Avoids a bespoke query. |
| (below fold) Month goal vs sales | `obtenerKPIs({ periodoAnio, periodoMes })` → `{success,data:v_kpi_vendedor[]}` | `.../admin/metas/_actions-metas.ts:99` | **REUSE** | Vendors auto-scope to own `vendedor_username`. `v_kpi_vendedor` exposes `meta_ventas_monto/cantidad` and `real_ventas_monto/cantidad` for the current period. Progress % computed by a pure helper. |

### Gerencia / coordinador command center

| # | Block | Fetcher | Status | Notes |
|---|-------|---------|--------|-------|
| ① | Funnel by stage | `getCachedFunnelClientes()` → `Record<estado,number>` (`cache.server.ts:930`) | **REUSE + fix** | See ADR-2: extend its global branch to include `ROL_COORDINADOR_VENTAS`. |
| ① | Aging leads (>3d) | `getAgingLeads({ esGlobal })` → `{ count, top: AgingLead[] }` | **NEW** | See ADR-3. Global count + small oldest-N list. |
| ② | Inventory by project | `getInventarioLotesPorProyecto({ esGlobal })` → `ProyectoInventario[]` + derived totals | **NEW** | See ADR-4. Replaces the global-only `DashboardLotesDonut`. |
| ③ | Month sales vs goal (org) | `obtenerKPIs({ periodoAnio, periodoMes })` global (`_actions-metas.ts:99`) | **REUSE** | Global roles (`METAS.ASIGNAR`) get **all** vendor rows. Sum `real_ventas_monto` vs `meta_ventas_monto` for the org total. |
| ④ | Total mora | `obtenerResumenCobranza()` → `{ monto_mora_total, en_mora, ... }` (`_actions-cobranza.ts:74`) | **REUSE** | Global via `PAGOS.VER_TODOS`. **No new mora fetcher needed** — this already aggregates `v_cobranza`. |
| ④ | Unmanaged alerts count | `getAlertasSinGestionarCount({ esGlobal })` → `number` | **NEW** | See ADR-5. Thin count; avoids pulling `obtenerAlertasCobranza`'s heavy nested joins just for a number. |

### New fetchers — explicit flags

Three new fetchers only, all in a new file `src/lib/dashboard/command-center.server.ts` (except the vendedor path reuses existing fetchers). Each accepts `{ esGlobal }` resolved once at the page and, when `esGlobal` is false, returns empty (defense-in-depth; the command center is already role-gated and DB RLS is the real backstop — privileged roles are permitted to read all `cliente`/`lote`/`v_cobranza`, confirmed by the existing coordinador-global behavior in `getCachedPipelineClientes` and `sidebar-badges`).

1. **`getAgingLeads`** — NEW. Aging count + oldest list. (ADR-3)
2. **`getInventarioLotesPorProyecto`** — NEW. Per-project `disponible/reservado/vendido` counts + org totals. (ADR-4)
3. **`getAlertasSinGestionarCount`** — NEW. `alerta_cobranza` where `gestionada=false`, still-open cuota/venta, global scope. (ADR-5)

---

## 3. What dies vs what stays

### Deleted from `page.tsx` (the file is largely rewritten)

| Element | Lines (approx.) | Reason |
|---------|-----------------|--------|
| Hero "Panel general" Card + `buildHeroHighlights` | 144–171, 366–425 | Decorative, drives no decision. |
| "Estado del día" Card + `pulseItems` | 315–340, 427–452 | Decorative pulse. |
| "Acciones rápidas" + `buildQuickActions` | 173–217, 478–507 | Copy-linked shortcuts, not decisions. |
| "Prioridades del equipo" + `buildFocusAreas` | 219–242, 556–576 | Copy-only. |
| `RecentActivities` / `RecentProjects` (drawer + desktop) | 579–669 | Decorative; not in either role's decisions. |
| `SecondaryPanelDrawer` usage | 579–625 | Mobile duplication of the decorative panel. |
| `DashboardLoading` monolith | 245–297 | Replaced by per-widget skeletons. |
| `loadDashboardMetrics` + `DashboardMetrics`/`initialMetrics`/`ClienteLite`/`ProyectoLite` | 21–142 | The single-object fetch model is retired. |
| `obtenerMetricasAgenda` import/usage | 18, 83, 115–117 | Agenda dropped from home (ADR-6). |

### Deleted component files (verified: imported **only** by `page.tsx`)

- `src/components/LazyDashboardStats.tsx` (+ `DashboardStats` it wraps) — the 4-KPI row is not in either role's above-fold decisions.
- `src/components/DashboardVentasChart.tsx` — 6-month global trend; command center ③ is "month vs goal", not a trend.
- `src/components/DashboardLotesDonut.tsx` — replaced by per-project inventory block.
- `src/components/MiniFunnelVentas.tsx` — replaced by the new `FunnelAgingBlock`.
- `src/components/RecentActivities.tsx`, `src/components/RecentProjects.tsx` — decorative.
- `src/components/dashboard/SecondaryPanelDrawer.tsx` — decorative mobile drawer.

> Apply-time guard: re-run the usage grep before deleting each file; if any gained an importer since this design, keep the file and only remove it from the home.

### Legacy route removal

- `src/app/dashboard/vendedor/page.tsx` — **DELETE** (533 lines; duplicate salesperson home with direct queries).
- `src/app/dashboard/vendedor/loading.tsx` — **DELETE** (orphaned once page is gone).
- `src/app/auth/login/_LoginForm.tsx:329` — **EDIT** `router.replace("/dashboard/vendedor")` → `"/dashboard"`.
- **KEEP** `src/app/dashboard/vendedor/reportes/**` and `src/app/dashboard/vendedor/propiedades/**` — still linked from `navigation.tsx` ("Mis Reportes") and `SidebarShadcn.tsx`; out of scope.

### Kept / reused

- `SeguimientosHoy` component and `getCachedSeguimientosHoy` fetcher — reused in the cockpit.
- `getCachedFunnelClientes`, `getCachedClientes`, `obtenerAlertasCobranza`, `obtenerResumenCobranza`, `obtenerKPIs` — reused as-is (funnel gets the coordinador fix).
- `obtenerPermisosUsuario` / `PERMISOS` — the single role gate.

---

## 4. Visual hierarchy (redesign within the design system)

Principle: **the first thing seen answers the role's question.** Numbers carry intent (big number + delta/context + a link to act), never decoration.

### Vendedor cockpit — "¿qué hago hoy?"

- **Row 1 (above the fold), 2-up on desktop, stacked on mobile:**
  - **Seguimientos de hoy** (left, tallest) — the action list, reused. This is the answer to the question, so it leads.
  - **Right column, two stacked cards:** *Alertas de cobranza propias* (count + top overdue cuotas) and *Leads sin contactar* (big `por_contactar` count + 3–4 names, link "Ver pipeline").
- **Row 2 (below the fold):** *Meta del mes* — a single progress bar (real vs goal), amount + `%`, subtle. Placement honors the decision that the goal is not first-screen.
- **Empty states as good news:** when `SeguimientosHoy` is empty it already shows "Todo al día ✓". Mirror it: no uncontacted leads → "Sin leads sin contactar ✓ Todos tienen seguimiento"; no own alerts → "Sin cobranzas vencidas ✓". These are *positive* confirmations for a vendedor, styled with `crm-success`, not empty voids.

### Command center — "¿cómo va el negocio y dónde está el fuego?"

Blocks in the confirmed priority order ①→④, top-left reading path:

- **① Funnel + aging leads** (widest, top): horizontal funnel bar per stage + a prominent **aging counter** ("N leads sin gestionar >3d") in `crm-danger/warning`, linking to the filtered pipeline. Aging is the "fire", so it gets the strongest color weight.
- **② Inventory by project:** compact table/bars — per project `disponible / reservado / vendido` with a `% vendido`. Org totals summarized on top.
- **③ Sales vs goal:** big month sales number + progress vs summed org goal + MoM delta from `obtenerKPIs`/stats.
- **④ Total mora + unmanaged alerts:** `monto_mora_total` (big, `crm-danger`) + `en_mora` count + "N alertas sin gestionar", linking to the cobranza Alertas tab.

### Polish conventions (design-polish / Emil)

- No `transition-all`; animate only `transform`/`opacity` with explicit properties.
- Easing tokens (`--ease-out: cubic-bezier(0.23,1,0.32,1)`), durations ≤ 200ms for card/hover feedback; `active:scale-[0.98]` on pressable cards/links.
- Dark-mode aware throughout (`crm-*` tokens, `dark:` variants already in the palette); skeletons use `bg-crm-border` and animate opacity only.
- Stagger card entrance 30–80ms max, decorative only, never blocking.
- No new tokens, no gradients-for-decoration (the hero radial-gradient dies with the hero).

---

## 5. Agenda metrics on the command center (ADR-6)

**Decision: drop agenda numbers from both compositions. Do not add an admin branch to `obtenerMetricasAgenda`.**

Rationale: `obtenerMetricasAgenda` (`agenda/actions.ts:26`) hard-filters `vendedor_id = user.id` on every query, so on a manager's home it would show only the manager's own agenda — misleading. The confirmed gerencia priorities (funnel, inventory, sales-vs-goal, mora) **do not include agenda**, and the vendedor above-the-fold decisions (a/b/d) exclude it too. Since agenda appears on neither composition, no privileged branch is required and the proposal's `obtenerMetricasAgenda` risk is closed rather than mitigated. Agenda remains fully available in its own module.

Rejected alternative: add an `esGlobal`/`vendedorId?` branch to `obtenerMetricasAgenda`. Rejected because it adds surface area (and a query) for data no confirmed decision surfaces on the home.

---

## Architecture Decision Records

### ADR-2 — Coordinador global scope for the funnel

**Context:** `getCachedFunnelClientes`, `getCachedDashboardStats`, `getCachedVentasMensuales` bypass the per-user filter only for `ROL_ADMIN`/`ROL_GERENTE`. `ROL_COORDINADOR_VENTAS` falls through to the *own-clients* filter — but `getCachedPipelineClientes` and `sidebar-badges` already treat coordinador as global, and coordinador holds `reportes.globales` (seed `20250326000008`). The command center renders for coordinador, so a funnel scoped to their own clients would be wrong.

**Decision:** Add `esCoordinador` to the global-visibility check in `getCachedFunnelClientes` (and, if consumed by the command center, `getCachedDashboardStats`). These three fetchers are consumed **only** by the dashboard home being rebuilt, so the behavior change is contained.

**Alternatives rejected:**
- Use `getCachedPipelineClientes().totalesPorEstado` for the funnel — rejected: it fetches up to 300 rows/stage (7 queries) just to derive counts the funnel already computes in one query.
- New parallel funnel fetcher — rejected: duplicates logic; the one-line scope fix is cleaner and consistent with siblings.

**Risk:** grep confirms these fetchers are home-only; apply must re-verify before merging.

### ADR-3 — Aging-leads query (NEW, no schema) — CORRECTED

**Column correction (verified against `20250205000010_flujo_crm_completo.sql`):** `cliente.proxima_accion` is a **`VARCHAR(50)` action-label enum** (`llamar` / `enviar_propuesta` / `reunion` / `visita` / `seguimiento` / `cierre` / `ninguna`, line 19), **not a date**. The authoritative next-action *date* is **`cliente_interaccion.fecha_proxima_accion TIMESTAMPTZ`** (line 20), which is exactly what `getCachedPipelineClientes` (`cache.server.ts:544-549`) and `sidebar-badges.ts:59-62` query. The earlier v1 draft built the aging predicate on the wrong column; this ADR replaces it and the "two competing sources" open item is **resolved** in favor of `cliente_interaccion.fecha_proxima_accion` per the spec's source-of-truth invariant.

**Definition (user-decided threshold = 3 days; AND semantics, user-ratified):** a lead is *aging* when it is an active client whose last contact is stale **and** that has no upcoming scheduled action:

```
estado_cliente NOT IN ('desestimado','transferido')
AND (ultimo_contacto IS NULL OR ultimo_contacto < now() - interval '3 days')
AND NOT EXISTS (                                    -- no FUTURE next action scheduled
      SELECT 1 FROM crm.cliente_interaccion ci
      WHERE ci.cliente_id = cliente.id
        AND ci.fecha_proxima_accion > now()
    )
```

Both conditions must hold (AND). "No scheduled next action" = no `cliente_interaccion` row with a `fecha_proxima_accion` in the future — mirroring the pipeline/badges source of truth, not the enum label on `cliente`.

Scope: **global** (privileged roles only; no per-user filter, RLS-backed). Returns `{ count, top: AgingLead[] }` — `count` from a count query, `top` = oldest 5 by `ultimo_contacto NULLS FIRST` for the preview list. Pure predicate `isAgingLead(cliente, futureActionExists, now, thresholdDays)` extracted to `src/lib/dashboard/aging.ts` and unit-tested; threshold is a single exported constant `AGING_THRESHOLD_DAYS = 3`.

**Implementation note (PostgREST):** Supabase/PostgREST has no direct `NOT EXISTS`. Implement as two steps in the fetcher: (1) select candidate `cliente` rows by state + stale/null `ultimo_contacto`; (2) fetch the set of `cliente_id` that have a future `fecha_proxima_accion` (`cliente_interaccion` filtered `fecha_proxima_accion > now()`, `.in('cliente_id', candidateIds)`), then exclude those in JS — the same two-step + `Set`/`Map` merge pattern already used by `getCachedPipelineClientes` and `sidebar-badges`. This keeps it consistent with existing code and testable.

**Performance:** heavier than the discarded single-table draft (two queries + a set-difference), but bounded: step 2 is index-backed by `idx_cliente_interaccion_proxima_accion` (partial index on `fecha_proxima_accion WHERE NOT NULL`, migration line 29). **No new schema.** If step 1 is slow at scale, the non-blocking follow-up is an index `idx_cliente_aging (estado_cliente, ultimo_contacto)` — index-only, not part of this change.

### ADR-4 — Inventory by project (NEW)

**Decision:** `getInventarioLotesPorProyecto({ esGlobal })` runs one query — `lote(proyecto_id, estado)` joined to `proyecto(nombre)` — and aggregates in JS to `{ proyectoId, nombre, disponible, reservado, vendido, total, pctVendido }[]`, deriving org totals from the same rows. This replaces `DashboardLotesDonut`'s global-only aggregate and satisfies the "por proyecto" decision without a second query.

**Alternative rejected:** reuse `getCachedDashboardStats` (global lote counts only, no per-project breakdown) plus N per-project `getCachedLotes` calls — rejected: N+1.

**Schema:** none. All lotes scanned once; acceptable at current scale.

### ADR-5 — Unmanaged alerts count (NEW, thin)

**Decision:** `getAlertasSinGestionarCount({ esGlobal })` counts `alerta_cobranza` where `gestionada=false`, excluding resolved cuotas/ventas (same `!inner` join filters as `obtenerAlertasCobranza`), scoped by `esGlobal`. A `head:true` count avoids materializing the heavy nested join rows that `obtenerAlertasCobranza` returns just to produce a number.

**Alternative rejected:** call `obtenerAlertasCobranza` and count `data.filter(!gestionada)` — rejected: pulls full joined cuota/venta/cliente rows for a scalar; the block only needs the count and a link.

### ADR-7 — Pre-existing bug in `getCachedSeguimientosHoy` (fix before cockpit reuse)

**Finding:** `getCachedSeguimientosHoy` (`cache.server.ts:1017-1023`) builds its "due/overdue" branch as `.lte('proxima_accion', hoyFin.toISOString())` against the `cliente.proxima_accion` **`VARCHAR(50)`** enum. That is a lexicographic text comparison of an ISO timestamp string against enum labels (`llamar`, `reunion`, …). Because digit-leading strings sort before letter-leading enum values, the predicate matches essentially nothing — **that branch always resolves empty**, so today's list is populated only by the fallback "stale `ultimo_contacto`" branch. The "acciones de hoy + vencidas" semantic has never actually worked. The bug also propagates to the component: `SeguimientosHoy.tsx` `getUrgencia` does `new Date(cliente.proxima_accion)` on the enum → `Invalid Date` → `NaN` day diffs, so "Vencido hace Nd" / "Para hoy" labels are wrong.

**Decision: fix the fetcher (not a parallel query).** The cockpit's due/overdue block reuses `getCachedSeguimientosHoy`, so the fix lands once and benefits every consumer. Consumers verified by grep = exactly two: `cache.server.ts` (definition) and `SeguimientosHoy.tsx` (the reused component). Concretely:
- Replace the `cliente.proxima_accion` date branch with a **`cliente_interaccion.fecha_proxima_accion <= endOfToday`** query (the pipeline/badges source of truth), resolving the earliest future/overdue action per client via the same two-step + `Map` merge used by `getCachedPipelineClientes`.
- Extend the `SeguimientoHoy` type with `fecha_proxima_accion: string | null` (the real timestamp) and update `getUrgencia` to read it instead of the enum. Keep `proxima_accion` available if the enum label is still shown, but never parse it as a date.

**Alternative rejected:** leave `getCachedSeguimientosHoy` as-is and write a new pipeline-consistent fetcher only for the cockpit — rejected: it would leave the existing home component silently broken and duplicate logic; fixing the shared fetcher is smaller and corrects the bug everywhere.

**Scope impact:** this pulls a pre-existing bugfix into PR1 (the cockpit PR). Bounded: one fetcher + one component + one contract test. It is the correct place because the cockpit's headline block depends on it.

---

## 6. File-touch list, PR chain, and tests

### Test strategy per layer (Strict TDD active)

| Layer | What | How | TDD? |
|-------|------|-----|------|
| Pure logic | `isAgingLead(cliente, futureActionExists, now, threshold)`, `AGING_THRESHOLD_DAYS`, meta progress `%`, `resolveComposition(rol)`, `getUrgencia` (now date-correct) | Vitest unit tests (`src/lib/dashboard/*.test.ts`) | **Yes — test first.** |
| Fetchers | `getAgingLeads`, `getInventarioLotesPorProyecto`, `getAlertasSinGestionarCount`, **`getCachedSeguimientosHoy` (ADR-7 fix)** | Contract tests mocking the Supabase client, mirroring `src/__tests__/unit/sidebar-badges.test.ts` and `metas-actions.test.ts` (assert scope filter, empty-on-not-global, aggregation shape). For the seguimientos fix: assert the due/overdue branch queries `cliente_interaccion.fecha_proxima_accion`, not the `cliente` enum. | **Yes where the mock harness reaches** — assert query construction + mapping. |
| Server components / blocks | `VendedorCockpit`, `CommandCenter`, the 8 blocks | Not unit-tested (RSC + streaming); rely on fetcher tests + manual visual/dark-mode/empty-state verification | Manual. |

### PR chain (2 PRs, per proposal; both > 400 lines)

**PR1 — Shared shell + vendedor cockpit** (legacy route untouched, nothing breaks mid-chain)

| File | Change | ~lines |
|------|--------|--------|
| `src/app/dashboard/page.tsx` | Rewrite: role branch + shell; delete decorative sections/helpers | −540 / +120 |
| `src/app/dashboard/_components/VendedorCockpit.tsx` | New | +110 |
| `src/app/dashboard/_components/CobranzaAlertasPropias.tsx` (+skeleton) | New | +110 |
| `src/app/dashboard/_components/LeadsSinContactar.tsx` (+skeleton) | New | +100 |
| `src/app/dashboard/_components/MetaDelMes.tsx` (+skeleton) | New | +100 |
| `src/lib/dashboard/aging.ts`, `meta.ts`, `scope.server.ts` | New pure/shared helpers | +110 |
| `src/lib/cache.server.ts` — **`getCachedSeguimientosHoy` fix (ADR-7)**: date branch → `cliente_interaccion.fecha_proxima_accion`; `SeguimientoHoy` type gains `fecha_proxima_accion` | Edit (bugfix) | +45 / −15 |
| `src/components/SeguimientosHoy.tsx` — `getUrgencia` reads real timestamp (ADR-7) | Edit (bugfix) | +10 / −5 |
| `src/lib/dashboard/*.test.ts` (aging, meta, resolveComposition, getUrgencia) + seguimientos fetcher contract test | New tests | +180 |
| Delete `LazyDashboardStats`, `DashboardVentasChart`, `DashboardLotesDonut`, `RecentActivities`, `RecentProjects`, `SecondaryPanelDrawer` | Delete (home-only) | −700 |

**PR1 estimate:** ~760–860 changed lines (dominated by the `page.tsx` rewrite + deletions; +~55 net for the ADR-7 bugfix and its test). If reviewer budget is strict, split into PR1a (page rewrite + shell + deletions) and PR1b (vendedor blocks + seguimientos fix).

**PR2 — Command center + legacy removal**

| File | Change | ~lines |
|------|--------|--------|
| `src/app/dashboard/_components/CommandCenter.tsx` | New | +100 |
| `FunnelAgingBlock`, `InventarioLotesBlock`, `VentasVsMetaBlock`, `MoraAlertasBlock` (+skeletons) | New | +380 |
| `src/lib/dashboard/command-center.server.ts` (3 new fetchers) | New | +150 |
| `getCachedFunnelClientes` (+ stats) coordinador scope fix (ADR-2) | Edit | +12 |
| `src/__tests__/unit/command-center-fetchers.test.ts` | New tests | +140 |
| `src/app/dashboard/vendedor/page.tsx` | Delete | −533 |
| `src/app/dashboard/vendedor/loading.tsx` | Delete | −small |
| `src/app/auth/login/_LoginForm.tsx` | Edit redirect line 329 | +1 |

**PR2 estimate:** ~750+ changed lines.

### Review Workload Forecast

- **Chained PRs recommended: Yes** (matches proposal).
- **400-line budget risk: High** — both PRs exceed 400 lined changed.
- **Decision needed before apply: Yes** — confirm the 2-PR split (or PR1a/PR1b sub-split), or record a `size:exception` per PR under the cached `ask-on-risk` strategy.
- Chain: PR1 leaves the legacy route intact; PR2 removes it — safe ordering.

## Checklist (design is complete when a reader can confirm)

- [ ] Only one branch's queries run per request (no cross-branch double fetch).
- [ ] Every widget maps to a named fetcher; the 3 new ones are flagged and isolated in `command-center.server.ts`.
- [ ] Agenda dropped from both compositions; `obtenerMetricasAgenda` untouched.
- [ ] Aging threshold = 3 days, pure + unit-tested; next-action signal = `cliente_interaccion.fecha_proxima_accion` (pipeline/badges source of truth), AND semantics. `cliente.proxima_accion` (VARCHAR enum) is never used as a date.
- [ ] `getCachedSeguimientosHoy` due/overdue branch fixed to `cliente_interaccion.fecha_proxima_accion` (ADR-7); `SeguimientosHoy` urgency label reads the real timestamp.
- [ ] No new DB schema; the aging index is an explicit non-blocking follow-up.
- [ ] Deleted component files verified home-only before removal.
- [ ] Legacy `/dashboard/vendedor` (page+loading) deleted; DNI redirect repointed; `reportes`/`propiedades` kept.

## Next step

Run `sdd-tasks` (needs spec + this design) to break PR1/PR2 into ordered, test-first work units.
