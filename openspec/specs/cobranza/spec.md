# Cobranza Alerts — Specification (Slice 1)

Change: `cobranza-alertas`. Scope: daily proactive alert generation on `crm.alerta_cobranza`, in-app notification fan-out, and an actionable alerts view in the cobranza dashboard. No email/WhatsApp automation, no auto-escalation (proposal Non-goals). `crm.alerta_cobranza` has no prior spec (dead schema today), so all requirements below are additions.

## ADDED Requirements

### Requirement: Daily cron refreshes mora state before generating alerts

The daily cron MUST invoke `crm.actualizar_cuotas_vencidas()` before evaluating any cuota, so alerts reflect just-refreshed `cuota.estado`/`monto_mora`, not values stale since the last manual "Recalcular Mora" click.

#### Scenario: Refresh precedes evaluation
- GIVEN a cuota crossed `fecha_vencimiento` since the last mora refresh
- WHEN the daily cron executes
- THEN `crm.actualizar_cuotas_vencidas()` completes first
- AND alert evaluation for that cuota uses the refreshed `cuota.estado`

### Requirement: Tier-based alert generation with per-tier dedup

The cron MUST evaluate each open cuota (`estado != 'pagada'`) against the same tiers as `crm.v_cobranza.estado_cobranza`, using the calendar date in América/Lima as "today" (not the DB session's `CURRENT_DATE`). Tier `en_mora` maps to `tipo_alerta = 'mora'`; `por_vencer_3d`/`7d`/`15d`/`vencida` map 1:1 by name. The cron MUST NOT insert more than one `crm.alerta_cobranza` row per `(cuota_id, tipo_alerta)` pair, ever (UNIQUE constraint, on-conflict-do-nothing).

#### Scenario: New tier crossed
- GIVEN a cuota's Lima-local days-to-due first drops to 3
- WHEN the cron runs
- THEN a row is inserted with `tipo_alerta = 'por_vencer_3d'`

#### Scenario: Cuota lingers in the same tier
- GIVEN a cuota already has a `tipo_alerta = 'vencida'` row
- WHEN the cron runs again next day and the cuota is still `vencida`
- THEN no new row is inserted for that pair

### Requirement: 90-day backfill cap

The cron MUST NOT generate an alert for a cuota whose Lima-local overdue days exceed 90, on any run (first or later). Older overdue cuotas stay visible only in the existing Mora tab.

#### Scenario: 90 vs. 91-day boundary
- GIVEN cuota A is 90 days overdue and cuota B is 91 days overdue, neither alerted yet
- WHEN the cron runs
- THEN a row is inserted for A
- AND no row is inserted for B

### Requirement: Notification fan-out per recipient

For each newly-inserted alert, the cron MUST insert one `crm.notificacion` row addressed to the current owner of the cuota's cliente — resolved as `crm.p1_puede_ver_cliente` does (`cliente.vendedor_username`/`vendedor_asignado`/`created_by`), NOT `venta.vendedor_username` — plus one row per active (`usuario_perfil.activo = true`) user holding `ROL_COORDINADOR_VENTAS`, `ROL_ADMIN`, or `ROL_GERENTE`. A recipient qualifying both ways MUST receive only one row. `alerta_cobranza.enviada` MUST be set `true` after dispatch.

#### Scenario: Reassignment and role broadcast
- GIVEN a venta's `vendedor_username` differs from the cliente's current owner, and 2 active coordinadores plus 1 active admin exist
- WHEN an alert fires for that cuota
- THEN the owner notification targets the current cliente owner, not the original `venta.vendedor_username`
- AND 3 additional rows are inserted, one per active role holder

### Requirement: Cron authorization and idempotency

The cron endpoint MUST require `Authorization: Bearer ${CRON_SECRET}`; a missing/wrong token MUST return `401` with no rows written. Re-invoking the endpoint within the same Lima calendar day MUST NOT create duplicate `crm.alerta_cobranza` or `crm.notificacion` rows.

#### Scenario: Missing/invalid bearer
- GIVEN a request without a valid `CRON_SECRET` bearer token
- WHEN it hits the cron endpoint
- THEN the response is `401` and no rows are written

#### Scenario: Same-day re-run
- GIVEN the cron already ran today and generated alerts
- WHEN it is invoked again the same day
- THEN no additional alert or notification rows are created

### Requirement: Actionable alerts view in the cobranza dashboard

The cobranza dashboard MUST list `crm.alerta_cobranza` rows scoped by the existing RLS policy, showing `tipo_alerta`, `fecha_alerta`, and cuota/cliente context, with a pre-filled `wa.me` link using the cliente's WhatsApp/phone. Each alert MUST support attaching a gestión record (fecha, medio, resultado); once one exists, the alert MUST visibly show a "gestionada" state.

#### Scenario: Vendedor sees only owned alerts
- GIVEN a vendedor without `PERMISOS.PAGOS.VER_TODOS`
- WHEN they open the alerts view
- THEN they see only alerts for cuotas whose cliente they own

#### Scenario: Gestión recorded
- GIVEN an alert with no gestión record yet
- WHEN the user records one (fecha, medio, resultado)
- THEN the alert shows the gestionada state and the recorded details

### Requirement: RLS invariants

`crm.alerta_cobranza` SELECT MUST stay scoped via `crm.p1_puede_ver_cliente` (policy `alerta_cobranza_select`, `20260703000000_secure_authz_p2.sql`) — no `USING (true)` regression. Writes to the gestión record MUST be restricted to the cuota's cliente owner or a user with `crm.es_visibilidad_global()` (admin/gerencia/coordinador).

#### Scenario: Unauthorized gestión write blocked
- GIVEN a vendedor who does not own the cuota's cliente and lacks global visibility
- WHEN they attempt to write a gestión record for that alert
- THEN the write is rejected
