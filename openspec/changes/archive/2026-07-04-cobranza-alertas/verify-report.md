# Verification Report - cobranza-alertas

**Change**: cobranza-alertas | **Mode**: full artifacts (proposal/spec/design/tasks/apply-progress) | **Date**: 2026-07-04

## Completeness (tasks.md)

| Phase | Tasks | Status |
|---|---|---|
| 1. Migration | 1.1 done write; 1.2 pending manual apply; 1.3 pending manual verify | Consistent - 1.2/1.3 are intentionally unchecked manual steps |
| 2. tiers.ts TDD | 2.1-2.3 done | Complete, code matches |
| 3. Cron route | 3.1-3.4 done | Complete, code matches |
| 4. Server actions TDD | 4.1-4.2 done | Complete, code matches |
| 5. UI wiring | 5.1-5.5 done | Complete, code matches |
| 6. PR1 follow-ups (judgment-day) | 6.1-6.3 done | Migration file written (6.1); manual apply of 20260705000000 explicitly noted as a separate, not-yet-performed step in the task text itself |

No unchecked implementation task was found unaccounted for - the only unchecked boxes (1.2, 1.3) are the documented manual DB-apply/verify steps, consistent with this project's no-supabase-db-push convention.

## Test / Build Evidence

- Command: npx vitest run src/__tests__/unit/cobranza-tiers.test.ts src/__tests__/unit/cobranza-alertas-route.test.ts src/__tests__/unit/cobranza-gestion-action.test.ts
  Result: 3 files, 56/56 tests passed.
- Command: npx tsc --noEmit
  Result: clean, zero errors.
- Full npm test / next build were NOT run per explicit instruction (hang risk); apply-progress records 955/955 for the full suite at commit time.

## Spec Compliance Matrix

### R1 - Daily cron refreshes mora state before generating alerts
SATISFIED. route.ts:114 calls supabaseCrm.rpc("actualizar_cuotas_vencidas") before any cuota read; aborts 500 on failure (route.ts:115-118), never reaching the cuota query.
Test: cobranza-alertas-route.test.ts:268-274 (callOrder asserts ["rpc:actualizar_cuotas_vencidas","cuota:read"]); refresh-failure abort at :493-504.

### R2 - Tier-based alert generation with per-tier dedup
SATISFIED. tiers.ts:52-67 computeTier() maps en_mora to "mora" (:59) and thresholds 15/7/3/vencida 1:1; unique index idx_alerta_cobranza_cuota_tipo (cuota_id, tipo_alerta) (20260704000000_cobranza_alertas.sql:21-22) backs .upsert(rows, {onConflict:"cuota_id,tipo_alerta", ignoreDuplicates:true}) (route.ts:170-183).
Tests: new-tier-crossed via cobranza-tiers.test.ts:25-53; dedup upsert call-shape asserted in cobranza-alertas-route.test.ts:280-306. The DB-level "no new row on lingering tier" behavior is not directly exercised (no pgTAP) - pre-accepted gap from design.md, not a new finding.

### R3 - 90-day backfill cap
SATISFIED. tiers.ts:9,56-57 (OVERDUE_CAP_DAYS=90, checked before tier assignment, even overriding en_mora).
Tests: boundary at cobranza-tiers.test.ts:73-89 (90 -> mora, 91 -> null, en_mora+91 -> null); route-level equivalent at cobranza-alertas-route.test.ts:312-345 (90d included, 91d excluded from the upsert payload).

### R4 - Notification fan-out per recipient
SATISFIED, with one documented deviation. route.ts:286-335 resolves owner via cliente.vendedor_username OR cliente.vendedor_asignado, adds created_by as an independent signal validated against fetched active usuario_perfil rows, unions with active GLOBAL_ROLES holders (ROL_ADMIN, ROL_GERENTE, ROL_COORDINADOR_VENTAS - confirmed identical set in src/lib/auth/extension-auth.ts:9-13), de-duplicated via Set. enviada=true set only after a successful dispatch with at least 1 recipient (route.ts:351-369).
The route only ever reads cliente.vendedor_username, never venta.vendedor_username - so the "reassignment" scenario is satisfied by construction (the field is never queried).
Tests: fan-out + dedup at :352-433; enviada flag at :440-467; created_by fallback + orphan-rejection at :598-690.
Deviation (documented in design D2 and in the route's own comment, route.ts:296-300): the spec's "resolved as p1_puede_ver_cliente does" wording implies three independent OR'd signals; the implementation instead treats vendedor_username/vendedor_asignado as a first-match fallback pair plus created_by as an always-checked third signal. Functionally equivalent for the required scenario and explicitly justified - WARNING, accepted per design, not a new finding.

### R5 - Cron authorization and idempotency
SATISFIED. 401 on missing/wrong/absent-secret bearer with zero mockFrom calls (cobranza-alertas-route.test.ts:243-262). Same-day re-invocation safety is achieved compositionally: ignoreDuplicates blocks a second alert-row insert, and the retry sweep only rereads enviada=false rows, which a successful first run has already flipped to true - so a second same-day call finds nothing to (re)dispatch.
SUGGESTION: no single test performs two sequential same-day GET calls against unchanged mocks to assert zero duplicate notificacion inserts end-to-end; current coverage is correct-by-composition from the dedup and enviada-flag tests rather than one integration-style test. Non-blocking.

### R6 - Actionable alerts view in the cobranza dashboard
SATISFIED. _AlertasCobranzaList.tsx renders tipoAlertaLabel(tipo_alerta) (never the raw slug), fecha_alerta, cuota/cliente context, and a prefilled wa.me link (buildReminderMessage + buildWhatsAppUrl, :104-118,171-181); gestionada/pendiente badges (:146-154); "Registrar gestion" opens _GestionCobranzaModal.tsx -> registrarGestionCobranza. obtenerAlertasCobranza scopes by vendedor_username unless PERMISOS.PAGOS.VER_TODOS (_actions-cobranza.ts:153-193).
Tests: scoping at cobranza-gestion-action.test.ts:67-92; gestion insert + revalidate at :150-286. No component-level (React Testing Library) tests exist for the two new UI files - consistent with this repo's established test-strategy convention (business logic tested at the server-action layer, not component layer); SUGGESTION, not a gap introduced by this change.

### R7 - RLS invariants
SATISFIED, with one documented refinement. alerta_cobranza_select was re-scoped in 20260705000000_cobranza_alertas_p2.sql:305-308 from a direct/inline reference to a new SECURITY DEFINER helper p1_puede_ver_cuota(), which internally still calls crm.p1_puede_ver_cliente() (:149-165) - same authorization scope (owner-or-global), different mechanism, fixing a real coordinador-visibility bug the inline EXISTS had (documented at length in the migration's own comments). No USING (true) regression exists anywhere in either migration.
Gestion-write authorization: gestion_cobranza_insert WITH CHECK chains p1_puede_ver_cliente(cliente_id) + created_by=auth.uid() + p1_cuota_pertenece_a_cliente(...) + vendedor_username=get_current_username() + alerta/cuota linkage (20260704000000:121-128, hardened 20260705000000:104-113).
Test: cobranza-gestion-action.test.ts:262-273 asserts a 42501 RPC rejection surfaces as a friendly Spanish message. Direct RLS enforcement has no pgTAP test (accepted gap, design.md).

## Accepted Gaps (per design.md / migration comments - not findings)

- No pgTAP: DB-level UNIQUE/RLS enforcement is validated indirectly via route/action call-shape tests, not directly against a live Postgres.
- alerta_cobranza_update_gestion does not column-restrict UPDATE (documented in 20260705000000 inline comment, lines 137-144) - blast radius bounded to rows the caller can already see.
- Batch notification insert is all-or-nothing per run; retried via the enviada=false sweep on a subsequent run, not chunked/retried within the same run.
- Pending alerts on cancelada/suspendida ventas or now-pagada cuotas are permanently parked enviada=false by design (intentional "dead weight", not a bug).

## CRITICAL Findings

1. Production migration-application status cannot be confirmed from the artifacts I am required to check, and appears to contradict the orchestrator's briefing. The task briefing states both migrations (20260704000000, 20260705000000) "are applied and verified in production." However:
   - The persisted sdd/cobranza-alertas/apply-progress Engram observation (topic's latest/merged revision, 6 revisions, saved 2026-07-04 01:57:29) explicitly states: "PENDIENTE usuario: aplicar migracion 20260705000000_cobranza_alertas_p2.sql en Studio... Hasta el apply, registrar gestion falla en prod."
   - tasks.md itself still shows 1.2/1.3 (PR1 manual apply/verify) unchecked, and task 6.1's own text says the P2 migration file is "Manual Studio apply - not performed by this apply batch."
   - I have no DB/Supabase CLI access in this environment (supabase migration list fails with LegacyProjectNotLinkedError - no project linked) to independently confirm either migration's live status.
   - If the migrations have in fact since been applied and verified out-of-band, this is a stale-artifact issue only: update sdd/cobranza-alertas/apply-progress (and check off 1.2/1.3 in tasks.md) to reflect it before archiving, so the SDD trail is trustworthy.
   - If they have NOT been applied, this blocks archive: per the migration's own commentary, without 20260705000000 the "Registrar gestion" flow fails in production (alerta_cobranza had zero authenticated GRANTs and no UPDATE policy until that migration), and without 20260704000000 the whole feature (dedup index, gestion_cobranza table) does not exist at all.
   - Recommendation: before archive, have a human explicitly confirm via Supabase Studio (or paste the pg_policies/pg_proc/has_table_privilege verification queries' output) that both migrations are live, and update the apply-progress artifact accordingly.

No other CRITICAL findings. All code, tests, and type-checking evidence I could independently verify are clean.

## WARNING Findings

None beyond the two documented-and-accepted design deviations noted inline in R4 and R7 above (owner-resolution combination logic; alerta_cobranza_select/cuota_select re-scoping via a SECURITY DEFINER indirection). Both are pre-existing, reviewed decisions with inline rationale in code/migrations, not newly discovered gaps.

## SUGGESTION Findings

1. Add one integration-style test that invokes the cron route's GET twice in succession against the same mock state (simulating a same-Lima-day re-run) to directly prove zero duplicate notificacion inserts, rather than relying on the correctness composition of the dedup-upsert and enviada-flag tests. (R5)
2. Consider a lightweight component-level test for _AlertasCobranzaList.tsx / _GestionCobranzaModal.tsx if this repo starts adopting React Testing Library elsewhere - not required now, matches current convention. (R6)

## Final Verdict

PASS WITH WARNINGS - code, tests, and type-checking are clean and every spec requirement maps to real, passing test evidence or a pre-accepted documented gap. Archive readiness is gated on ONE item: independently reconcile/confirm the production migration-application status, since the orchestrator's briefing and the persisted apply-progress artifact disagree on whether 20260705000000_cobranza_alertas_p2.sql has been applied. Do not archive until that is confirmed and (if needed) the apply-progress/tasks artifacts are updated to match reality.
