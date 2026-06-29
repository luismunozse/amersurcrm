# Authorization Hardening (P1) — Access Control Specification

## Purpose

Defines the access-control invariants enforced by `secure-authz-p1`. Covers
extension endpoint role gates, row-level visibility on 13 hardened tables, and
write restrictions for `proceso_adquisicion`. This is a new spec (no existing
spec to delta against); all requirements below are ADDED.

---

## Requirements

### Requirement: Extension Endpoint Role Gate

The 5 Chrome-extension routes
(`/api/clientes/[id]/{notas,estado,interacciones,pendientes,proyecto-interes}`)
MUST reject any caller whose Bearer token does not map to a global-visibility
role (`ROL_ADMIN`, `ROL_GERENTE`, `ROL_COORDINADOR_VENTAS`).

A shared helper (`validateBearerAndEnsureGlobalRole`) MUST be used by all 5
routes; per-route ad-hoc auth blocks MUST be removed.

#### Scenario: Global-role caller proceeds

- GIVEN a valid Bearer token for a user with `ROL_ADMIN`, `ROL_GERENTE`, or `ROL_COORDINADOR_VENTAS`
- WHEN the request reaches any of the 5 extension endpoints
- THEN the handler processes the request and returns 2xx

#### Scenario: Vendor-role caller is rejected

- GIVEN a valid Bearer token for a user with `ROL_VENDEDOR`
- WHEN the request reaches any of the 5 extension endpoints
- THEN the response is HTTP 403 Forbidden

#### Scenario: No-role / unrecognized-role caller is rejected

- GIVEN a valid Bearer token for a user with no recognized CRM role
- WHEN the request reaches any of the 5 extension endpoints
- THEN the response is HTTP 403 Forbidden

#### Scenario: Missing or invalid Bearer is rejected

- GIVEN a request with no Authorization header, an expired token, or a malformed Bearer
- WHEN the request reaches any of the 5 extension endpoints
- THEN the response is HTTP 401 Unauthorized (behavior unchanged from current)

---

### Requirement: Row-Level Visibility — Global vs. Scoped Roles

The 13 hardened tables (`solicitud_postventa`, `entrega`, `detalle_entrega`,
`observacion_entrega`, `proceso_adquisicion`, `checklist_proceso`,
`observacion_proceso`, `cuota`, `comision`, `calificacion_bancaria`,
`calificacion_documento`, `contrato`, `meta_vendedor`) MUST enforce per-role
row visibility at the database layer via Supabase RLS policies.

- Tables with a `cliente_id` FK MUST use `crm.usuario_puede_ver_cliente(cliente_id)`.
- Tables without `cliente_id` (`comision`, `meta_vendedor`) MUST use a new helper `crm.es_visibilidad_global()`.
- `USING(true)` policies scoped to `authenticated` MUST NOT remain on any of the 13 tables after migration.
- The existing `crm.es_admin_o_gerente()` helper MUST NOT be modified; only the new helper is added.

#### Scenario: Global-role user sees all rows

- GIVEN an authenticated user with `ROL_ADMIN`, `ROL_GERENTE`, or `ROL_COORDINADOR_VENTAS`
- WHEN they query any of the 13 hardened tables
- THEN all rows are returned regardless of client or vendor assignment

#### Scenario: Vendor sees only own-client rows (tables with cliente_id)

- GIVEN an authenticated user with `ROL_VENDEDOR`
- WHEN they query a hardened table that has a `cliente_id` FK (e.g., `solicitud_postventa`, `cuota`, `contrato`)
- THEN only rows where the associated `cliente` is assigned to that vendor are returned

#### Scenario: Vendor sees only own records on comision and meta_vendedor

- GIVEN an authenticated user with `ROL_VENDEDOR`
- WHEN they query `comision` or `meta_vendedor`
- THEN only rows tied to their own `vendedor_username` are returned

---

### Requirement: proceso_adquisicion Write Restrictions

A `ROL_VENDEDOR` user MUST still be able to update `proceso_adquisicion` and
`checklist_proceso` records tied to their own clients (vendor checklist
workflow MUST NOT regress). Cancel/delete operations on `proceso_adquisicion`
MUST be restricted to `ROL_ADMIN` / `ROL_GERENTE` only.

**Intentional behavior change:** vendors lose the ability to cancel their own
processes; cancel is now Admin/Gerente only. This MUST be documented for
support and training.

#### Scenario: Vendor updates own checklist item

- GIVEN an authenticated `ROL_VENDEDOR` user
- WHEN they update a `proceso_adquisicion` or `checklist_proceso` record tied to a client assigned to them
- THEN the update succeeds

#### Scenario: Vendor blocked from updating another vendor's process

- GIVEN an authenticated `ROL_VENDEDOR` user
- WHEN they attempt to update a `proceso_adquisicion` record tied to a client assigned to a different vendor
- THEN the update is blocked (RLS returns 0 rows affected)

#### Scenario: Vendor cannot cancel a process

- GIVEN an authenticated `ROL_VENDEDOR` user
- WHEN they call `cancelarProceso` for any process (own or otherwise)
- THEN the action returns an authorization error and the process remains unchanged

#### Scenario: Admin/Gerente can cancel a process with audit trail

- GIVEN an authenticated user with `ROL_ADMIN` or `ROL_GERENTE`
- WHEN they call `cancelarProceso` for any `proceso_adquisicion`
- THEN the process status is updated to cancelled AND an audit entry is written recording the actor identity and timestamp

---

## Non-Goals (Explicitly Excluded — MUST NOT be verified in sdd-verify)

| Item | Reason |
|------|--------|
| CORS hardening on extension endpoints | Scheduled follow-up, not in this change |
| Dead anon policy on `usuario_perfil` | No GRANT exists; not exploitable; hygiene follow-up |
| Changes to already-scoped policies (`cliente`, `venta`, `reserva`, `pago`, `visita`, `evento`) | Not affected; MUST NOT regress |
