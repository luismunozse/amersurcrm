# Tasks: Authorization Hardening P1 (secure-authz-p1)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines — PR1 | ~205 (new helper + test + 5 route edits) |
| Estimated changed lines — PR2 | ~440 (migration + 6 guards + test additions) |
| 400-line budget risk — PR1 | Low |
| 400-line budget risk — PR2 | Medium (slight overage; test additions dominate) |
| Chained PRs recommended | Yes |
| Suggested split | PR1 = FIX A (extension-auth) → PR2 = FIX B+C (migration + guards) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Shared Bearer+role helper + 5 route updates | PR1 | Base = main; independently verifiable |
| 2 | SQL migration + 6 action guards + manual RLS check | PR2 | Base = PR1 merged to main |

---

## SLICE 1 / PR1 — FIX A: Extension Auth Helper + 5 Routes

### Phase 1: RED — Write Failing Tests (extension-auth)

- [x] 1.1 Create `src/__tests__/unit/extension-auth.test.ts` — 5 failing tests: null token → 401; bad/expired token → 401; valid token + ROL_VENDEDOR → 403; valid token + no perfil/no role → 403; valid token + each GLOBAL_ROLE → `ok: true`. Mock `createServiceRoleClient` and `usuario_perfil` query chain.

### Phase 2: GREEN — Implement extension-auth Helper

- [x] 2.1 Create `src/lib/auth/extension-auth.ts` with `validateBearerAndEnsureGlobalRole(token)` — `GLOBAL_ROLES` constant, `ExtensionAuthError | ExtensionAuthOk` discriminated union, uses service-role client, queries `crm.usuario_perfil` joined to `rol`. No throws.
- [x] 2.2 Run `npm test -- extension-auth` — all 5 tests must be green before continuing.

### Phase 3: Integrate Helper into 5 Routes

- [x] 3.1 Update `src/app/api/clientes/[id]/notas/route.ts` — remove ad-hoc Bearer block; call `validateBearerAndEnsureGlobalRole`; map `auth.status` → `NextResponse` with existing `corsHeaders`.
- [x] 3.2 Update `src/app/api/clientes/[id]/estado/route.ts` — same pattern.
- [x] 3.3 Update `src/app/api/clientes/[id]/interacciones/route.ts` — same pattern.
- [x] 3.4 Update `src/app/api/clientes/[id]/pendientes/route.ts` — same pattern.
- [x] 3.5 Update `src/app/api/clientes/[id]/proyecto-interes/route.ts` — same pattern.
- [x] 3.6 Run `npm test` — no regressions in any existing test.

### Phase 3b: PR1 Extension — search/route.ts + create-lead/route.ts hardening
_(Added to PR1 scope per user decision after adversarial review.)_

- [x] 3b.1 Export `GLOBAL_ROLES` from `src/lib/auth/extension-auth.ts` (was `const`, now `export const`) — single source of truth for role names.
- [x] 3b.2 RED tests: `extension-auth.test.ts` — 2 tests for `GLOBAL_ROLES` export (array values + excludes ROL_VENDEDOR). `clientes-search-route.test.ts` (new file) — 4 tests: null profile → 403, null role → 403, ROL_GERENTE → no vendedor_asignado filter, ROL_COORDINADOR_VENTAS → no vendedor_asignado filter. `clientes-create-lead-route.test.ts` (new file) — 2 tests: Bearer + null profile → 403, web-session + null profile → 403. All 8 tests RED before fixes.
- [x] 3b.3 `src/app/api/clientes/search/route.ts` — import `GLOBAL_ROLES`; replace ad-hoc `esAdmin = rolNombre === "admin" || rolNombre === "ROL_ADMIN"` with `esGlobalRole = GLOBAL_ROLES.includes(rolNombre)`; add null-profile guard (returns 403 "Permiso insuficiente" if profile or role unresolvable); add vendor-without-username guard. Three `esGlobalRole` usages replace three `esAdmin` usages in query filtering.
- [x] 3b.4 `src/app/api/clientes/create-lead/route.ts` — add CRM profile gate immediately after auth block: fetches `usuario_perfil` via per-path `supabase` client, returns 403 "Permiso insuficiente" if no profile/role. Service-role retained for all subsequent DB ops (dedup cross-vendor phone lookup + create_whatsapp_lead round-robin RPC); documented in code comment. Gate applies to both Bearer and web-session paths.
- [x] 3b.5 All 8 new tests GREEN; full suite: 56 files, 860 tests, 0 regressions (`npm test`).

### Phase 4: Slice 1 Verification (Spec: Extension Endpoint Role Gate)

- [ ] 4.1 Manual: send vendor Bearer to all 5 endpoints → each returns HTTP 403.
- [ ] 4.2 Manual: send admin/gerente/coordinador Bearer to each endpoint → returns 2xx.
- [ ] 4.3 Manual: send no header or expired token → returns 401 (behavior unchanged).
- [ ] 4.4 Manual: send Bearer for Supabase user with no CRM profile to search + create-lead → returns 403.
- [ ] 4.5 Manual: send Bearer for ROL_GERENTE to search → verify response includes clients not assigned to that user (global visibility).

---

## SLICE 2 / PR2 — FIX B + FIX C: Migration + Server-Action Guards

### Phase 5: SQL Migration

- [x] 5.1 Confirm `supabase/migrations/20260412000000_proceso_adquisicion.sql` lacks `cancelado_por`, `fecha_cancelacion`, `motivo_cancelacion` columns (already verified absent — proceed to migration).
- [x] 5.2 Create `supabase/migrations/20260629000000_secure_authz_p1.sql`:
  - `ALTER TABLE crm.proceso_adquisicion ADD COLUMN IF NOT EXISTS cancelado_por uuid, ADD COLUMN IF NOT EXISTS fecha_cancelacion timestamptz, ADD COLUMN IF NOT EXISTS motivo_cancelacion text`.
  - `CREATE OR REPLACE FUNCTION crm.es_visibilidad_global()` (SECURITY DEFINER STABLE, joins `usuario_perfil → rol`, checks GLOBAL_ROLES).
  - `DROP POLICY IF EXISTS` + `CREATE POLICY` for SELECT on all 13 tables per scoping map in `design.md §FIX B` (tables 1–13). Tables with `cliente_id`: use `crm.usuario_puede_ver_cliente(cliente_id)`. Tables without (`comision`, `meta_vendedor`): `crm.es_visibilidad_global() OR {username_col} = crm.get_current_username()`. Indirect FK tables: EXISTS subquery via parent.
  - Atomic `proceso_adquisicion` write policies: `proceso_update` (vendor-own OR global), `proceso_delete` (global only). `proceso_etapa` UPDATE and `proceso_checklist_item` UPDATE (scoped via parent proceso ownership).
  - Drop legacy policy names from `20260420000000` and `20260507010000`.
- [ ] 5.3 Apply locally: `supabase db push` (or `npx supabase migration up`) — migration must apply without errors.
- [ ] 5.4 Smoke: `SELECT crm.es_visibilidad_global()` as an admin user → `true`; as a vendor user → `false`.

### Phase 6: RED — Write Failing Tests (6 guards)

- [x] 6.1 `src/__tests__/unit/proceso-actions.test.ts` — add: `cancelarProceso` with non-admin role → returns `{ error }`, no DB write; with admin role → writes `cancelado_por`/`fecha_cancelacion`/`motivo_cancelacion` on `proceso_adquisicion`.
- [x] 6.2 `src/__tests__/unit/postventa-actions.test.ts` — add: `obtenerSolicitudesPostVenta` global role → no `.eq` scope filter applied; vendor role → `.eq` own-username filter applied.
- [x] 6.3 `src/__tests__/unit/entregas-actions.test.ts` — add: `obtenerEntregas` global role → full set; vendor → scoped to own clients.
- [x] 6.4 `src/__tests__/unit/cuotas-actions.test.ts` — add: `obtenerCuotasCliente` caller cannot see target client → returns auth error; authorized caller → returns data.
- [x] 6.5 `src/__tests__/unit/metas-actions.test.ts` — add: `obtenerMetas` global → all rows; vendor → own `vendedor_username` only. `obtenerKPIs` same pattern.

### Phase 7: GREEN — Implement 6 Server-Action Guards

- [x] 7.1 `src/app/dashboard/adquisicion/_actions-proceso.ts` — `cancelarProceso`: add `if (!await esAdminOGerente()) return { error: 'Permiso insuficiente' }`. On authorized cancel: update `cancelado_por = user.id`, `fecha_cancelacion = now()`, `motivo_cancelacion = motivo`.
- [x] 7.2 `src/app/dashboard/postventa/_actions-postventa.ts` — `obtenerSolicitudesPostVenta`: `tienePermiso(VER_TODAS)` → no extra filter; else apply vendor-username scope on `cliente_id IN (own clients)`.
- [x] 7.3 `src/app/dashboard/entregas/_actions-entregas.ts` — `obtenerEntregas`: same scope guard pattern.
- [x] 7.4 `src/app/dashboard/clientes/_actions-cuotas.ts` — `obtenerCuotasCliente`: verify caller can access the target `cliente` (RPC ownership check or `tienePermiso`) before returning; return auth error if not.
- [x] 7.5 `src/app/dashboard/admin/metas/_actions-metas.ts` — `obtenerMetas`: global role → no extra filter; vendor → `.eq('vendedor_username', ownUsername)`.
- [x] 7.6 `src/app/dashboard/admin/metas/_actions-metas.ts` — `obtenerKPIs`: same scope guard.
- [x] 7.7 Run `npm test` — all new guard tests green; no regressions across full suite. (892/892 passed)

### Phase 8: Manual Per-Role RLS Verification

- [ ] 8.1 Use local Supabase with seeded users (admin, gerente, coordinador, vendedor-A, vendedor-B). For each of 13 hardened tables, run SELECT with each role JWT:
  - Global roles → full row count.
  - `vendedor-A` on tables with `cliente_id` → only own-client rows.
  - `vendedor-A` on `comision` → only `beneficiario_username = vendedor-A`.
  - `vendedor-A` on `meta_vendedor` → only `vendedor_username = vendedor-A`.
- [ ] 8.2 Write tests: `vendedor-A` UPDATE on own `proceso_adquisicion` → succeeds; UPDATE on `vendedor-B`'s → 0 rows; DELETE on any → 0 rows.
- [ ] 8.3 Write test: `vendedor-A` UPDATE own `proceso_checklist_item` via etapa chain → succeeds (vendor checklist workflow regression check).

### Phase 9: Slice 2 Verification (Spec scenarios + non-goals guard)

- [ ] 9.1 Confirm spec scenarios satisfied: global roles see all 13 tables; vendor sees only own; vendor can update own checklist; vendor cannot cancel; admin/gerente cancel writes audit trail.
- [ ] 9.2 Confirm non-goals NOT touched: no CORS change, no `usuario_perfil` anon policy, no changes to `cliente`/`venta`/`reserva`/`pago`/`visita`/`evento` policies.
- [ ] 9.3 Add a comment in `_actions-proceso.ts` near `cancelarProceso` documenting intentional behavior change: vendors can no longer cancel their own processes; admin/gerente only.
- [ ] 9.4 Run final `npm test` — clean suite.
