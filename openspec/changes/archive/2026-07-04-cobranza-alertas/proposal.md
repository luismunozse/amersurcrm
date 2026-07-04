# Proactive collections alerts (cobranza-alertas) — Slice 1

Today mora and overdue-cuota state only update when a human clicks "Recalcular Mora", and the `crm.alerta_cobranza` table modeled in the schema is never written to by any app code — it is dead schema. This change turns collections from a manual, pull-based chore into a proactive, push-based workflow: a daily cron recomputes overdue/mora state, generates per-cuota alerts, notifies the people responsible in-app, and gives them a one-click way to reach the client and log the outcome. Slice 1 is intentionally in-app only (no email/WhatsApp automation, no auto-escalation) to ship a small, reviewable, verifiable first cut.

## Intent

| Question | Answer |
|----------|--------|
| What problem | Collections is reactive. `crm.actualizar_cuotas_vencidas()` (marks pendiente→vencida, computes mora) runs ONLY on manual button click, so `cuota.estado`/`monto_mora` drift stale until someone remembers to refresh. `crm.alerta_cobranza` is fully unused — no proactive nudge exists. Vendedores only see a live count badge, never a "this specific cuota needs action today, and here's why" signal. |
| Why now | The schema and infra to close this gap already exist (alert table, mora RPCs, 3 working Vercel Cron precedents, in-app notification table with realtime). The cost to activate is low and the operational payoff — fewer missed follow-ups, less silent mora accumulation — is immediate. |
| Success looks like | A vendedor opens the dashboard and sees, without clicking anything, which cuotas crossed a due/overdue threshold, can reach the client via a prefilled WhatsApp message, and logs what happened. Overdue/mora state is fresh daily, not "since the last time someone clicked the button." |

## Quick path (what slice 1 delivers)

1. A new **Vercel Cron route** runs daily: it FIRST invokes `crm.actualizar_cuotas_vencidas()` (closing the stale-state gap), then evaluates cuotas against due/overdue thresholds.
2. For each newly-crossed threshold it writes a deduplicated **`crm.alerta_cobranza`** row (`por_vencer_3d/7d/15d`, `vencida`, `mora`).
3. It inserts **in-app notifications** (`crm.notificacion`, canal `'sistema'`) — one row per recipient (vendedor owner + coordinador + admin/gerencia), because notification RLS is owner-only.
4. The existing cobranza dashboard gains an **actionable alerts view**: each alert shows why it fired, a **prefilled `wa.me` button**, and a **gestión record** (date, medium, outcome) so the follow-up is captured.

## Scope — Slice 1 (in scope)

| Area | What ships |
|------|------------|
| Cron generation | New daily Vercel Cron route (bearer `CRON_SECRET` + service-role client), invokes `actualizar_cuotas_vencidas()` first, then generates alerts. Mirrors `send-recordatorios/route.ts`. |
| Alert dedup | New UNIQUE constraint on `crm.alerta_cobranza (cuota_id, tipo_alerta)` (does not exist today) so a cuota lingering in the same tier does not re-alert daily. |
| In-app notifications | Insert `crm.notificacion` rows, canal `'sistema'`, one per recipient (vendedor owner + coordinador + admin/gerencia). Realtime already enabled. Mark `alerta_cobranza.enviada = true` after dispatch. |
| Recipients | Vendedor owner (resolved via cliente ownership), coordinador, admin/gerencia. Per-recipient rows because `crm.notificacion` RLS is `auth.uid() = usuario_id` (no broad-read). |
| Backfill cap | On first run, only alert on cuotas overdue within the **last 90 days**. Older mora stays visible in the existing Mora tab but does not trigger a notification flood. |
| Timezone | Day-window math ("days until due", "days overdue") pinned to **América/Lima**, not the DB/UTC default — avoids the off-by-one class of bug already fixed in reportes (`shared.ts::calcularFechas`). |
| Actionable UI | New "Alertas de cobranza" view inside the existing `_ControlPagosHub.tsx`: shows tipo_alerta + fecha_alerta + cuota context, a prefilled `wa.me` button, and a gestión record (date, medium, outcome). |
| Gestión record | Capture the follow-up (date, medium, outcome). Storage mechanism (candidate: reuse `cliente_interaccion` with a `cobranza` type vs. a dedicated table) is deferred to design. |

## Non-goals (explicitly out of slice 1)

| Deferred item | Why |
|---------------|-----|
| Email delivery | Resend is already wired (`src/lib/services/email.ts`), so this is low-effort — but "who gets email vs. in-app only" is a distinct product decision. Ships in **slice 2**. |
| WhatsApp automated send | No WhatsApp Business/Cloud API infra exists. Only click-to-chat (`wa.me`) is available; the prefilled button stays human-initiated. |
| Automatic escalation | No auto-escalation logic (e.g. "N days in mora → force-notify a higher tier") in this slice, per product decision. Recipients are notified once per alert tier; no time-based re-routing. |
| New cobranza role | No new role/permission model. Reuse existing `ROL_COORDINADOR_VENTAS`, `ROL_ADMIN`/`ROL_GERENTE`, and `PERMISOS.PAGOS.VER_TODOS` / `PERMISOS.MORA.CALCULAR` gates. |
| Removing the manual button | The manual "Recalcular Mora" button stays as a force-refresh affordance alongside the cron. |

## Approach summary

**Chosen: Vercel Cron route in TypeScript** (Approach B from exploration). Rejected pg_cron (A) and hybrid (C) because pg_cron has zero precedent in this repo and would be introduced solely for this feature; the Vercel Cron pattern has 3 working precedents and keeps ops (secrets, monitoring, logs) unified.

| Decision | Detail |
|----------|--------|
| Trigger | New entry in `vercel.json` crons; daily cadence (sub-hourly crons already proven on this plan). |
| Auth | `Authorization: Bearer ${CRON_SECRET}` → 401 otherwise; `createServiceRoleClient()`. Same pattern as `reportes-alertas` and `send-recordatorios` (GET+POST → shared handler). |
| Order of operations | Invoke `crm.actualizar_cuotas_vencidas()` FIRST so alerts reflect just-updated state, not the last manual click. |
| Dedup | New UNIQUE `(cuota_id, tipo_alerta)` index; insert alerts idempotently (on-conflict-do-nothing). |
| Recipient routing | Vendedor resolved through **cliente ownership** (`p1_puede_ver_cliente` chain — alerts follow the client relationship, not the raw sale record). Coordinador/admin/gerencia resolved by role, since no per-vendedor `coordinador_username` mapping exists in the schema (broadcast-to-role, like `reportes-alertas` `destinatarios_roles`). One `crm.notificacion` row per resolved recipient. |
| Timezone | América/Lima-aware date math for tier thresholds. |
| First-run guard | 90-day backfill cap on overdue cuotas to prevent a notification flood. |
| UI reuse | Extend `_ControlPagosHub.tsx`; sidebar `pagos` badge already live (no change). Spanish formal peruano copy ("usted", "comuníquese", "puede") — never voseo. |

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Coordinador routing is not modeled (no `coordinador_username` on cliente/venta/usuario_perfil). "Notify the coordinador" is ambiguous. | Slice 1 resolves coordinador/admin/gerencia by **role broadcast** (all `ROL_COORDINADOR_VENTAS` + admin/gerencia), matching the existing `reportes-alertas` pattern. Per-vendedor coordinador mapping is a future refinement, not a slice-1 blocker. Flag for design confirmation. |
| First-run notification flood from the existing overdue backlog. | 90-day backfill cap + dedup constraint. Older mora stays in the Mora tab, uncalled. |
| Timezone off-by-one near Peru midnight (DB likely UTC). | Pin América/Lima explicitly in the cron's date math; reuse the reportes fix precedent. |
| Alert visibility follows the CLIENTE owner, not `venta.vendedor_username`. On reassignment, alerts route to the current client owner. | Consistent with every `p1_puede_ver_cliente`-scoped table; call out explicitly in spec so it is intentional, not surprising. |
| Gestión record storage undecided (reuse `cliente_interaccion` vs. new table). | Deferred to design phase; does not block proposal. Candidate flagged. |
| `alerta_cobranza.tipo_alerta`/`canal` are VARCHAR(N); any new RETURNS TABLE RPC exposing them errors 42804. | Cast to `::TEXT` per the established RPC convention if a table-returning RPC is introduced. |

## Rough impact estimate

| Component | Approx. surface |
|-----------|-----------------|
| Migration | UNIQUE constraint on `(cuota_id, tipo_alerta)`; possibly a helper RPC / gestión storage change (design-dependent). Small–medium. |
| Cron route | One new route cloning `send-recordatorios` shape + `vercel.json` entry. Small–medium. |
| UI | New alerts view in `_ControlPagosHub.tsx` + gestión capture form + prefilled wa.me action. Medium. |
| Tests | Vitest unit tests for tier/dedup/timezone logic (project convention). Small–medium. |

**Review-load flag:** the combined migration + cron + notification fan-out + actionable UI + gestión record realistically exceeds a ~400-line single-PR budget. **Chained PRs are likely** — a natural split is (1) migration + cron generation + in-app notifications, then (2) actionable UI + gestión record. Confirm delivery strategy before apply.

## Next step

Proceed to `sdd-spec` (behavioral requirements: tier thresholds, dedup semantics, recipient fan-out, backfill/timezone rules) and `sdd-design` (cron route structure, gestión-record storage decision, coordinador routing) — these can run in parallel.
