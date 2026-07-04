# Archive Report: cobranza-alertas

**Date**: 2026-07-04  
**Change**: cobranza-alertas (Slice 1: Proactive collections alerts)  
**Artifact Store**: openspec  
**Status**: CLOSED (SDD cycle complete)

## What Shipped

### Feature Summary
Daily proactive alert generation for overdue and upcoming-due cuotas, with in-app notifications and an actionable alerts view. Extends `crm.alerta_cobranza` from dead schema into a push-based collections workflow with tier-based, deduplicated alerts and gestión record tracking.

### Commits (both merged to main)
- **PR1** (backend: migration + cron + notifications)
  - Range: `593bba8..1bfd773`
  - Files: migration (dedup index + gestion_cobranza table + RLS), `tiers.ts`, cron route, vercel.json, unit tests
- **PR2** (UI: alerts view + gestión capture)
  - Range: `f9afd3d..e70b896`
  - Files: alerts tab, gestión modal, server actions, UI tests
- **Reconciliation** (fix stale checkbox state in tasks.md)
  - Commit: `a196464`
  - Note: Manual database apply/verify steps (1.2, 1.3) documented as complete in task text but checkboxes not marked; reconciliation commit updated tasks.md to reflect orchestrator briefing

### Database Migrations Applied (Production)
1. **`20260704000000_cobranza_alertas.sql`** (applied 2026-07-04)
   - Created unique index `idx_alerta_cobranza_cuota_tipo (cuota_id, tipo_alerta)`
   - Altered `crm.alerta_cobranza`: added `gestionada BOOLEAN DEFAULT FALSE`, `gestionada_at TIMESTAMPTZ`
   - Created table `crm.gestion_cobranza(alerta_id, cuota_id, cliente_id, vendedor_username, medio, resultado, notas, ...)`
   - Enabled RLS: `gestion_cobranza_insert`, `gestion_cobranza_select`, service-role access

2. **`20260705000000_cobranza_alertas_p2.sql`** (applied 2026-07-04)
   - Hardened `crm.gestion_cobranza_insert` RLS: vendedor_username must match, alerta↔cuota consistency checked
   - Added authenticated `UPDATE` policy `alerta_cobranza_update_gestion` (gestionada flag)
   - Created SECURITY DEFINER helpers: `p1_puede_ver_cuota()`, `registrar_gestion_cobranza(...)` 
   - Verified live: `pg_proc` contains `registrar_gestion_cobranza`; `pg_policies` show updated cuota/alerta/gestion policies

### Verification Outcome
**SDD-Verify**: PASSED (7/7 requirements satisfied)
- R1 ✅ Daily cron refreshes mora state before generating alerts (RPC call order verified)
- R2 ✅ Tier-based alert generation with per-tier dedup (unique index + upsert semantics)
- R3 ✅ 90-day backfill cap (enforced in `tiers.ts`, tested at boundary 90/91 days)
- R4 ✅ Notification fan-out per recipient (owner + role broadcast, de-duped)
- R5 ✅ Cron authorization (Bearer token check) and idempotency (dedup + enviada flag)
- R6 ✅ Actionable alerts view in cobranza dashboard (lista + wa.me + gestión modal)
- R7 ✅ RLS invariants (alerta_cobranza SELECT scoped, gestion_cobranza INSERT/UPDATE restricted)

Test evidence:
- Unit tests: 56/56 passing (tiers, alertas-route, gestion-action)
- Type check: `npx tsc --noEmit` clean
- Full suite: 955/955 passing at PR2 merge time

## Specs Synced

| Domain | Action | Reason |
|--------|--------|--------|
| `cobranza` | Created | Main spec did not exist (`openspec/specs/` empty before this change). Delta spec treated as full spec per SDD archive rules. Seeded `openspec/specs/cobranza/spec.md` from the delta requirements. |

**Path**: `openspec/specs/cobranza/spec.md` (7 requirements, all ADDED)

## Archive Contents

All artifacts moved to: `openspec/changes/archive/2026-07-04-cobranza-alertas/`

- ✅ `proposal.md` — high-level intent, scope, non-goals, approach
- ✅ `spec.md` — behavioral requirements (tier-based alerts, 90-day cap, fan-out, RLS)
- ✅ `design.md` — architecture decisions, tech stack, file-touch list, test strategy
- ✅ `tasks.md` — work breakdown (6 phases, 17 items), review workload forecast
- ✅ `verify-report.md` — verification evidence, 7/7 requirements satisfied, accepted gaps

**Total implementation**: ~1,200 LOC (production + tests). Chained PRs (2-PR stacked-to-main) as recommended in workload forecast.

## Source of Truth Updated

The following spec now reflects the new cobranza-alertas behavior:
- **`openspec/specs/cobranza/spec.md`** — primary source for alert requirements, tier definitions, recipient routing, RLS scope

This is the first entry in the cobranza domain spec. Future cobranza features (slice 2: email delivery, auto-escalation, per-coordinator mapping) will extend this spec via delta merges.

## Notes on Archive & Reconciliation

### Migration Application Verification
Both migrations were applied and verified in production (2026-07-04):
- Migration 1 applied via Supabase Studio; pre-flight duplicate check = 0 rows
- Migration 2 applied via Supabase Studio; confirmed via pg_proc/pg_policies/has_table_privilege queries
- Evidence recorded in tasks.md task descriptions (1.2, 1.3)

The verify-report noted a discrepancy: the apply-progress artifact was found to be stale (had not been updated after manual apply). Per the orchestrator's briefing ("both DB migrations applied and verified in production") and the task text conclusions, the work is complete. The apply-progress artifact inconsistency is a procedural gap (artifact not updated) rather than a production-state issue. This does not block archive.

### Open Follow-Ups (Minor, Non-Blocking)
Listed in design/verify as accepted or optional refinements for future slices:

1. **Fallback `fechaGestion` direct test** — design noted that `gestion_cobranza.created_by` captures the operator's auth.uid() from the session; the action tests mock this, but a direct test of the fallback-to-now behavior was not added (design gap, accepted).
2. **Router.replace on manual tab click** — the UI's tab change currently uses React state; a future refinement could add `router.replace(...)` to update the URL for deep-linking consistency (design decision: deferred).
3. **Optional `next build` smoke test** — design noted that new Suspense boundaries in the alerts view were tested at the action layer but not end-to-end via `next build`; a full build smoke was not run (accepted due to hang risk).
4. **Humanized enum coverage** — already completed in PR2 phase 6.1 via `tipoAlertaLabel()` in tiers.ts, used in _AlertasCobranzaList.tsx.

None of these block production readiness.

## SDD Cycle Complete

The change has been fully planned (proposal), specified (spec + design + tasks), implemented (2-PR chain committed to main), verified (7/7 requirements passed), and archived. All artifacts are now in the historical archive directory with a date prefix for future reference.

**Next**: No further work required for `cobranza-alertas`. Future work on collections workflow (slice 2+) will start a new SDD change and extend the cobranza spec via delta merges.
