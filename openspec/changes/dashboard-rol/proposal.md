# Role-composed dashboard home (`dashboard-rol`)

Rebuild `/dashboard` so it answers a single question in five seconds, tuned to who is looking: a salesperson sees **"¿qué hago hoy?"** (a cockpit of due/overdue actions, own collection alerts, uncontacted new leads), while management and coordinators see **"¿cómo va el negocio y dónde está el fuego?"** (a command center: funnel + aging leads, inventory by project, sales vs. goal, total overdue debt + unmanaged alerts). Today the home is a fixed, role-blind summary padded with decorative widgets, even though roughly 80% of the data each role needs is already computed in the reportes, cobranza, metas and pipeline modules and simply never surfaced here.

## Why now

- The current `/dashboard` composition is identical for every role; only copy and links change. Managers get a salesperson-shaped page and vice versa (see exploration `sdd/dashboard-rol/explore`).
- High-value data already exists and is cached, but the home ignores it: `ResumenKPIs` (leadsCaptados, tasaConversion, tiempoRespuesta, ventasPeriodo with deltas), the cobranza hub (`v_cobranza`, mora, the new Alertas management tab), metas (`meta_vendedor` + `v_kpi_vendedor`), the pipeline board totals, and the reportes funnel.
- Decorative widgets ("Estado del día", the hero tiles, `RecentActivities`, `RecentProjects`) consume prime above-the-fold space without driving any decision.
- A parallel legacy home at `/dashboard/vendedor` (reachable only after DNI login) duplicates salesperson KPIs with direct queries and drifts from the main home.

## What success looks like

- One route `/dashboard`, composed by role: a **vendedor cockpit** and a **gerencia/coordinador command center**, each answering its own five-second question above the fold.
- The legacy `/dashboard/vendedor` is deleted and the DNI login redirect points to the common home.
- Above-the-fold content matches the confirmed product decisions (`sdd/dashboard-rol/decisiones-producto`), reusing existing cached fetchers wherever they exist; new queries are added only where nothing exists.
- No new decorative widgets. Every surfaced block drives a decision or an action.

## Scope

### In scope

| Area | Change |
|------|--------|
| Route composition | `/dashboard` branches by role into two compositions sharing one shell |
| Vendedor cockpit (above the fold) | (a) today + overdue actions, (b) own collection alerts, (c) new uncontacted leads. Month goal allowed **below** the fold (design decides placement) |
| Gerencia/coordinador command center | Deliberate priority ranking: ① funnel + aging leads (>X days), ② lote inventory by project, ③ month sales vs. goal, ④ total overdue debt + unmanaged alerts |
| Legacy removal | Delete `/dashboard/vendedor`; update the DNI-login redirect (`_LoginForm.tsx`) to `/dashboard` |
| Reuse | Wire existing cached fetchers/actions rather than re-querying (see inventory below) |
| New fetchers | Only where nothing exists today: aging-leads query (leads envejeciendo >X days); total mora for privileged roles if not already exposed at home granularity |
| Aesthetics | Free redesign honoring the design system (tokens, dark mode, design-polish/Emil conventions) |

### Reuse inventory (confirmed to exist)

| Fetcher / action | Location | Use |
|------------------|----------|-----|
| `getCachedSeguimientosHoy` | `src/lib/cache.server.ts:991` | Vendedor today/overdue actions (role-scoped) |
| `obtenerAlertasCobranza` | `src/app/dashboard/cobranza/_actions-cobranza.ts:153` | Collection alerts (own vs. global by role) |
| `getCachedFunnelClientes` | `src/lib/cache.server.ts:930` | Funnel (command center ①) |
| `getCachedDashboardStats` | `src/lib/cache.server.ts:719` | Lote/inventory + headline KPIs |
| `getCachedClientesDashboardMetrics` | `src/lib/cache.server.ts:337` | Client counts / uncontacted leads base |
| `getCachedVentasMensuales` | `src/lib/cache.server.ts:888` | Sales vs. goal (command center ③) |
| `obtenerMetricasAgenda` | `src/app/dashboard/agenda/actions.ts:26` | Agenda metrics — **own-user only, no admin branch** (see risks) |
| Sidebar-badge queries / `getCachedNotificacionesNoLeidas` | `src/lib/cache.server.ts:845` | Counts already computed |
| metas (`meta_vendedor`, `v_kpi_vendedor`) | metas module | Month goal / progress |

### New fetchers (only if nothing exists)

- **Aging leads**: leads with no contact for more than X days, scoped globally for privileged roles (command center ①). Confirm no equivalent exists in reportes before adding.
- **Total mora at home granularity**: if `v_cobranza`/`obtenerAlertasCobranza` do not already yield the aggregate needed for the command center ④, add a thin aggregate — reusing the view, not a new schema.

### Out of scope (non-goals)

- No new DB schema is expected. If design finds a schema change is unavoidable, it must flag it explicitly — do not proceed silently.
- No changes to the reportes, cobranza, pipeline, or metas modules themselves; this change only *consumes* their fetchers.
- No mobile app work.
- Decorative widgets ("Estado del día", hero tiles, `RecentActivities`, `RecentProjects`) are candidates for **removal, not preservation**; keeping any of them is a design decision, not a default.

## Approach

1. **Introduce a role split at `/dashboard`**: resolve permissions once (`obtenerPermisosUsuario` / `PERMISOS`), then render either the vendedor cockpit or the gerencia command center. Both share one shell (header, layout grid, empty/error states) so there is no duplicated chrome.
2. **Data first, one pass**: extend the existing single `Promise.all` in `loadDashboardMetrics` into two role-specific fetch sets that never overlap — the vendedor branch must not fetch command-center queries and vice versa, to avoid double-fetching and keep the query budget flat.
3. **Compose above-the-fold blocks per the decisions**: vendedor = actions + own alerts + uncontacted leads; gerencia = the four-block priority ranking in the confirmed order.
4. **Delete legacy**: remove `/dashboard/vendedor` and repoint the DNI-login redirect to `/dashboard`.
5. **Redesign within the design system**: no `transition-all`, easing tokens, dark-aware skeletons, empty states with a CTA (per the design-polish convention).

## Risks and open questions

| Risk | Mitigation / note |
|------|-------------------|
| `obtenerMetricasAgenda` has no admin branch (always filters to the calling user) | If agenda data appears on the gerencia home, it needs an admin/global branch — otherwise managers see only their own agenda. Design must decide whether agenda belongs on the command center at all. |
| Double-fetching on a single route with two branches | Branch the fetch sets, not just the render. Never run both branches' queries. |
| Query-count / perf budget | The home already runs a large `Promise.all`. Budget the total queries per role; reuse cached fetchers (they dedupe within a request) and avoid adding uncached queries in the hot path. |
| "X days" threshold for aging leads is unspecified | Needs a product-confirmed default (spec to define; suggest a sane constant, e.g. 3–5 days, and make it easy to tune). |
| Aging-leads / total-mora fetchers may already exist under another name | Spec/design must confirm before adding new queries, to avoid duplicating logic already in reportes/cobranza. |
| Redesign scope creep | Aesthetics are free but must stay inside the design system; do not invent new tokens or break dark mode. |

## Impact estimate and Review Workload

- **Files touched (estimate)**: `src/app/dashboard/page.tsx` (major), new cockpit + command-center composition components (several), 1–2 new fetchers in `src/lib/cache.server.ts` (or a sibling), `_LoginForm.tsx` redirect, deletion of the `/dashboard/vendedor` route and its now-dead components.
- **Lines**: UI-heavy; very likely **> 400 lines** changed.
- **Review Workload flag**: **Chained PRs recommended — Yes.** Suggested split:
  - **PR1** — Shared shell + **vendedor cockpit** (actions/overdue, own collection alerts, uncontacted leads) reusing existing fetchers; keep legacy route untouched so nothing breaks mid-chain.
  - **PR2** — **Gerencia/coordinador command center** (four-block ranking + aging-leads/mora fetchers) and **legacy removal** (`/dashboard/vendedor` delete + DNI redirect repoint).
- **Decision needed before apply: Yes** — confirm the PR split (or record a `size:exception`) under the cached `ask-on-risk` delivery strategy.

## Next step

Run `sdd-spec` (acceptance criteria per role composition, aging-leads threshold, empty/error states) and `sdd-design` (role-branch data-fetch architecture, agenda admin-branch decision, component shape) — they can run in parallel from this proposal.
