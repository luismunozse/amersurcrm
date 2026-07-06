# Role-Composed Dashboard Home — Delta Spec

Change: `dashboard-rol`. No prior spec covers `/dashboard` composition (today one layout for all roles). All requirements are additions except removing `/dashboard/vendedor`.

## ADDED Requirements

### Requirement: Single route branches composition by role

`/dashboard` (`src/app/dashboard/page.tsx`) MUST render one of two compositions from a single role resolution (`obtenerPermisosUsuario`): the **vendedor cockpit** when `rol === 'ROL_VENDEDOR'`; the **command center** when `crm.es_visibilidad_global()` is true (`ROL_ADMIN`/`ROL_GERENTE`/`ROL_COORDINADOR_VENTAS`). Both share one shell. Neither branch's fetch set MAY execute the other's queries.

#### Scenario: Vendedor session skips command-center queries
- GIVEN `rol = 'ROL_VENDEDOR'`
- WHEN `/dashboard` loads
- THEN the cockpit renders and no aging-leads/per-project-inventory/global-mora fetch runs

#### Scenario: Gerencia/coordinador session skips cockpit-only queries
- GIVEN `rol` in `{ROL_ADMIN, ROL_GERENTE, ROL_COORDINADOR_VENTAS}`
- WHEN `/dashboard` loads
- THEN the command center renders and no query filters by the caller's own `vendedor_username`

### Requirement: Vendedor cockpit above-the-fold blocks

Above the fold, scoped to the caller's own clients (`created_by`/`vendedor_username`): (a) due/overdue from `cliente_interaccion.fecha_proxima_accion` (NOT `cliente.proxima_accion`, a text label); (b) own `alerta_cobranza` rows (`canal='sistema'`, `gestionada=false`, RLS-readable); (c) `cliente` rows with `estado_cliente='por_contactar'`. Each links to its module (`/dashboard/pipeline`, `/dashboard/cobranza?tab=alertas`, `/dashboard/clientes`). Month goal MAY sit below the fold.

#### Scenario: Due/overdue sourced from the interaction date
- GIVEN the caller owns a cliente with `fecha_proxima_accion` today or past
- WHEN the cockpit loads
- THEN it appears in block (a), linked to `/dashboard/pipeline`

#### Scenario: Uncontacted-leads block excludes other vendedores
- GIVEN a `por_contactar` cliente owned by another vendedor
- WHEN the cockpit loads
- THEN block (c) excludes it

### Requirement: Gerencia/coordinador command center priority order

Four blocks in order: ① funnel (global) + aging leads; ② lote inventory per project (`lote.estado` grouped by `proyecto_id`: `disponible`/`reservado`/`vendido` — NOT `separado`); ③ month sales vs. goal (`venta` monto+unidades vs. `meta_vendedor.meta_ventas_monto`/`meta_ventas_cantidad`); ④ total mora (`v_cobranza`, GLOBAL) + `alerta_cobranza` count where `gestionada=false`. **Aging** = `ultimo_contacto` null or >3 days old AND no future `fecha_proxima_accion`.

#### Scenario: Aging boundary at exactly 3 days
- GIVEN `ultimo_contacto` 3 days ago, no future `fecha_proxima_accion`
- WHEN aging leads are computed
- THEN the cliente counts as aging

#### Scenario: Scheduled next action excludes a stale-contact lead
- GIVEN `ultimo_contacto` 10 days ago but a future `fecha_proxima_accion`
- WHEN aging leads are computed
- THEN the cliente is excluded

### Requirement: Legacy vendedor home removed, subroutes stay

`/dashboard/vendedor` (`src/app/dashboard/vendedor/page.tsx`) MUST be deleted; the DNI-login redirect (`src/app/auth/login/_LoginForm.tsx`) MUST target `/dashboard`. `/dashboard/vendedor/reportes` and its "Mis Reportes" sidebar entry stay unaffected.

#### Scenario: DNI login lands on the common home
- GIVEN a user authenticates via DNI login
- WHEN authentication succeeds
- THEN the browser redirects to `/dashboard`, not `/dashboard/vendedor`

#### Scenario: Mis Reportes still resolves
- GIVEN a `ROL_VENDEDOR` user clicks "Mis Reportes"
- WHEN followed
- THEN `/dashboard/vendedor/reportes` renders, no dead link

### Requirement: Every surfaced number reuses its module's source of truth

No home block MAY recompute a number its owning module already computes differently.

| Home block | Source of truth |
|---|---|
| Funnel | Same logic as `getCachedFunnelClientes` |
| Mora total | `v_cobranza`, same as `obtenerResumenCobranza` (cobranza hub) |
| Cobranza alerts | `alerta_cobranza` via `obtenerAlertasCobranza`/RLS |
| Sales vs. goal | `meta_vendedor`/`v_kpi_vendedor` (metas module) |
| Lote inventory | `lote.estado`, same states as `getCachedDashboardStats` |

#### Scenario: Mora total matches the cobranza hub
- GIVEN the cobranza hub shows `monto_mora_total = X` via `obtenerResumenCobranza`
- WHEN the command center renders block ④ in the same session
- THEN it shows the same X, not a separately recomputed value

### Requirement: Role-scope invariants hold across every block

Cockpit blocks show only the caller's own data; command-center blocks show global data. `ROL_COORDINADOR_VENTAS` MUST get global data wherever `crm.es_visibilidad_global()` is true, even though `getCachedFunnelClientes`/`getCachedSeguimientosHoy` today omit coordinador — close that gap for any command-center fetcher.

#### Scenario: Coordinador sees global funnel, not own-only
- GIVEN a `ROL_COORDINADOR_VENTAS` session
- WHEN the command center's funnel block loads
- THEN counts include all vendedores' clientes, not only the coordinador's own
