# Proposal: secure-authz-p1 — Authorization Hardening (P1)

## Intent

Two verified P1 authorization defects let any authenticated user read/write data
they should not. Both are confirmed against the real Supabase RLS (not assumed).
In a single-tenant CRM the blast radius is the entire customer base, so severity
ceiling is HIGH.

- **FIX A — Extension endpoints (privilege escalation / IDOR):** 5 Chrome-extension
  route handlers validate a Bearer token (identity only) then run every DB op
  through `createServiceRoleClient()` (bypasses RLS) with NO role check. Any
  logged-in user can call these admin-tool endpoints against any client.
- **FIX B — Lazy RLS (broken access control, horizontal):** 13 tables expose
  `SELECT USING(true)` to `authenticated`; `proceso_*` also have `UPDATE USING(true)`
  and `proceso_adquisicion` has `DELETE USING(true)`. Any vendor reads/writes any
  client's processes, deliveries, quotas, commissions, and goals.

## Scope

### In Scope
- Shared helper `src/lib/auth/extension-auth.ts` (`validateBearerAndEnsureGlobalRole`)
  enforcing a global-visibility role after Bearer validation; replace the 5
  copy-pasted auth blocks.
- SQL migration (`>= 20260601000000`) replacing `USING(true)` with ownership-scoped
  policies on the 13 tables; new helper `crm.es_visibilidad_global()`.
- Defense-in-depth guards in 6 server actions: `cancelarProceso`,
  `obtenerSolicitudesPostVenta`, `obtenerEntregas`, `obtenerCuotasCliente`,
  `obtenerMetas`, `obtenerKPIs`.

### Out of Scope
- Refactoring unrelated code or the already-good scoped policies (cliente, venta,
  reserva, pago, visita, evento).
- CORS hardening of the extension endpoints (follow-up).
- Dead anon policy on `usuario_perfil` — no GRANT, not exploitable (hygiene follow-up).

## Authorization Model (decided — encode as-is, do not re-open)
- **Global visibility** = `ROL_ADMIN` + `ROL_GERENTE` + `ROL_COORDINADOR_VENTAS`.
- Tables with a `cliente_id` FK → reuse `crm.usuario_puede_ver_cliente(cliente_id)`
  (already encodes global vs. assigned via `ver_todos`).
- Tables without `cliente_id` (`comision`, `meta_vendedor`) → add NEW helper
  `crm.es_visibilidad_global()`. Do NOT modify `crm.es_admin_o_gerente()` (would
  break existing policies); add new to avoid regressions.
- Vendor (`ROL_VENDEDOR`) sees only records tied to their own clients (vendor
  ownership via `cliente` / `vendedor_username`).
- Extension endpoints = admin tool → caller MUST have a global-visibility role.
- Sensitive writes: owner edits their clients' records; **cancel/delete
  (`cancelarProceso`, deletes) = Admin/Gerente ONLY**, with audit trail.

## Key Risk & Intentional Behavior Change
- `proceso_adquisicion UPDATE USING(true)` exists so vendors mark their OWN
  checklist items. The scoped UPDATE policy MUST still allow a vendor to update
  their OWN processes (vendor ownership) while blocking others — do NOT break the
  vendor checklist workflow. **All `proceso_adquisicion` policies (SELECT, the
  three UPDATEs, DELETE) must migrate together atomically.**
- **BEHAVIOR CHANGE (intentional):** vendors LOSE the ability to cancel their own
  processes; cancel becomes Admin/Gerente only. Document for support/training.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/auth/extension-auth.ts` | New | Bearer + global-role helper |
| `src/app/api/clientes/[id]/{notas,estado,interacciones,pendientes,proyecto-interes}/route.ts` | Modified | Use shared helper, drop ad-hoc auth |
| `supabase/migrations/20260601000000_secure_authz_p1.sql` | New | `es_visibilidad_global()` + scoped policies on 13 tables |
| `_actions-proceso.ts` (`cancelarProceso`) | Modified | Admin/Gerente guard + audit |
| `_actions-postventa.ts`, `_actions-entregas.ts`, `_actions-cuotas.ts`, `_actions-metas.ts` | Modified | Scope filters / role guards |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Scoped UPDATE breaks vendor checklist | Med | Migrate all `proceso_adquisicion` policies atomically; vendor-ownership branch in USING/WITH CHECK; integration test |
| Helper change cascades to other policies | Low | Add NEW `es_visibilidad_global()`, never touch `es_admin_o_gerente()` |
| Legit users over-restricted (false 403) | Med | Mirror proven cliente/venta policy; verify each role path |
| Migration not idempotent | Low | `DROP POLICY IF EXISTS` + `CREATE POLICY` |

## Testing Approach (Strict TDD active)
- Unit: `npm test` / vitest for `extension-auth.ts` (allow global roles, reject
  vendor/unknown) and the 6 server-action guards.
- Integration: RLS changes require per-role verification (admin/gerente/coordinador
  see all; vendor sees only own; vendor can update own checklist; vendor cannot
  cancel). RLS cannot be proven by unit tests alone.

## Rollback Plan
- FIX A: revert the 5 routes + delete helper (git revert).
- FIX B: ship a down-migration restoring prior policies via `DROP POLICY IF EXISTS`
  + recreate original `USING(true)` (kept for emergency only).

## Review Workload Forecast
- Touches 5 routes + 1 SQL migration + ~7 actions/helpers. Estimated ~350-450
  changed lines.
- **400-line budget risk: Medium**
- **Chained PRs recommended: Yes** — split as PR1 = FIX A (routes + helper),
  PR2 = FIX B (migration + server-action guards). Independent, separately verifiable.
- **Decision needed before apply: Yes**

## Success Criteria
- [ ] Non-global-role Bearer caller gets 403 on all 5 extension endpoints.
- [ ] Vendor reads only own-client rows across the 13 tables; admin/gerente/coordinador read all.
- [ ] Vendor can still update own `proceso_adquisicion` checklist; cannot cancel.
- [ ] `cancelarProceso` rejects non-Admin/Gerente with audit entry.
- [ ] `npm test` green; RLS integration checks pass per role.

## Capabilities

### New Capabilities
- None (security hardening of existing behavior; no new product capability).

### Modified Capabilities
- None at the product-requirement level — this enforces already-intended access
  rules. Spec deltas (if produced) document the access-control invariants and the
  intentional vendor cancel-permission removal.
