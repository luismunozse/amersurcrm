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

## 2. Data sourcing per widget (verified signatures)

### Vendedor cockpit

| Block | Fetcher | Status | Notes |
|-------|---------|--------|-------|
| (a) Today + overdue actions | `getCachedSeguimientosHoy()` | **REUSE + fix** | Fixed ADR-7: date branch now uses `cliente_interaccion.fecha_proxima_accion` instead of the enum. |
| (b) Own collection alerts | `obtenerAlertasCobranza()` | **REUSE** | Auto-scoped to own clients per role. |
| (c) New uncontacted leads | `getCachedClientes({mode:'dashboard', estado:'por_contactar'})` | **REUSE** | Already role-scoped. |
| (below fold) Month goal | `obtenerKPIs({ periodoAnio, periodoMes })` | **REUSE** | Auto-scoped to own vendor. |

### Gerencia / coordinador command center

| # | Block | Fetcher | Status | Notes |
|---|-------|---------|--------|-------|
| ① | Funnel by stage | `getCachedFunnelClientes()` | **REUSE + fix** | Extended to include `ROL_COORDINADOR_VENTAS` (ADR-2). |
| ① | Aging leads (>3d) | `getAgingLeads({ esGlobal })` | **NEW** | Global count + oldest-N list (ADR-3). |
| ② | Inventory by project | `getInventarioLotesPorProyecto({ esGlobal })` | **NEW** | Per-project estado counts + org totals (ADR-4). |
| ③ | Month sales vs goal | `obtenerKPIs()` global | **REUSE** | Sum vendor rows for org total. |
| ④ | Total mora | `obtenerResumenCobranza()` | **REUSE** | Global via `PAGOS.VER_TODOS`. |
| ④ | Unmanaged alerts | `getAlertasSinGestionarCount({ esGlobal })` | **NEW** | Thin count (ADR-5). |

## 3. What dies vs what stays

### Deleted from `page.tsx` and component files
- Hero "Panel general" Card + helpers (decorative)
- "Estado del día" Card + pulse items
- "Acciones rápidas" and quick-actions helpers
- "Prioridades del equipo"
- RecentActivities and RecentProjects
- DashboardLoading monolith
- `loadDashboardMetrics` + related types
- `obtenerMetricasAgenda` (agenda dropped per ADR-6)

### Deleted component files
- `LazyDashboardStats.tsx`, `DashboardStats.tsx`
- `DashboardVentasChart.tsx`
- `DashboardLotesDonut.tsx`
- `MiniFunnelVentas.tsx`
- `RecentActivities.tsx`, `RecentProjects.tsx`
- `SecondaryPanelDrawer.tsx`

### Legacy route removal
- `src/app/dashboard/vendedor/page.tsx` and `loading.tsx` — DELETE
- `src/app/auth/login/_LoginForm.tsx:329` — Repoint to `/dashboard`
- **KEEP** `/dashboard/vendedor/reportes/**` and `propiedades/**`

## 4. Architecture Decision Records

### ADR-2 — Coordinador global scope for the funnel
Extended `getCachedFunnelClientes` to treat `ROL_COORDINADOR_VENTAS` as global-visible per the command center's scope invariant.

### ADR-3 — Aging-leads query (NEW, no schema)
Definition: a lead is *aging* when **last contact is stale (null or >3 days)** **AND** **no upcoming scheduled action** (AND semantics, spec-ratified). Two-step implementation (candidate scan + future-action exclusion via Set) mirrors `getCachedPipelineClientes` pattern. Threshold: 3 days inclusive.

### ADR-4 — Inventory by project (NEW)
Single query `lote(proyecto_id, estado)` + JS aggregation → per-project `disponible/reservado/vendido` + org totals. Replaced `DashboardLotesDonut` (global-only aggregate).

### ADR-5 — Unmanaged alerts count (NEW, thin)
`getAlertasSinGestionarCount` uses `head:true` count to avoid materializing heavy nested-join rows that only a scalar is needed for.

### ADR-6 — Agenda dropped from both compositions
`obtenerMetricasAgenda` lacks an admin branch and would show only the caller's own agenda (misleading on manager home). Neither role's confirmed above-fold decisions include agenda, so no branch is added.

### ADR-7 — Pre-existing bug in `getCachedSeguimientosHoy` (fix before cockpit reuse)
Fixed: the due/overdue branch now queries `cliente_interaccion.fecha_proxima_accion` (the real date) instead of comparing a date string against `cliente.proxima_accion` (an enum). Also fixed `SeguimientosHoy` component's `getUrgencia` to read the real timestamp.

## 5. Status

All decisions implemented. No new DB schema. One optional performance index flagged as non-blocking follow-up. Design permits per-widget streaming and maintains query budget per role. All ADRs resolved with code proof.
