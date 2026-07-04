# Tasks: Cobranza Alerts (cobranza-alertas)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | PR1 ~620 (prod ~350 / tests ~270); PR2 ~580 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 backend → PR2 UI |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | PR | Notes |
|------|------|----|-------|
| 1 | Migration: dedup index + gestion_cobranza + RLS | PR1 | manual apply; independent |
| 2 | `tiers.ts` pure logic (TDD) | PR1 | no deps |
| 3 | Cron route + vercel.json schedule | PR1 | depends on 1+2; ships end-to-end |
| 4 | Server actions (list/gestión) | PR2 | depends on PR1 tables |
| 5 | Alerts tab + gestión modal | PR2 | depends on 4 |

## PR1 — Backend

### Phase 1: Migration
- [x] 1.1 Write `supabase/migrations/20260704000000_cobranza_alertas.sql`: unique index `(cuota_id, tipo_alerta)`; add `gestionada`/`gestionada_at`; create `crm.gestion_cobranza` + indexes; RLS via `p1_puede_ver_cliente` (authenticated), `ALL` for `service_role`.
- [ ] 1.2 Apply manually in Supabase Studio (no `supabase db push` in this project). **Manual step — requires a human with Studio access; not performed by this apply batch.**
- [ ] 1.3 Verify with `pg_indexes`/`pg_policies` queries: unique index present on `alerta_cobranza(cuota_id, tipo_alerta)`; `gestion_cobranza` RLS enabled with expected policies. **Manual step — depends on 1.2 being applied first.**

### Phase 2: `tiers.ts` — TDD
- [x] 2.1 RED — `src/__tests__/unit/cobranza-tiers.test.ts`: `limaToday()` UTC-boundary; `computeTier()` at 15/7/3/0/overdue + `en_mora→mora`; 90-day cap; `buildReminderMessage()` placeholders (spec: Tier-based generation, 90-day cap).
- [x] 2.2 GREEN — implement `src/lib/cobranza/tiers.ts` (`limaToday`, `computeTier`, `buildReminderMessage`).
- [x] 2.3 REFACTOR — dedupe date-diff logic; `npm test` green.

### Phase 3: Cron route
- [x] 3.1 RED — `src/__tests__/unit/cobranza-alertas-route.test.ts`: 401 on missing/bad bearer; `actualizar_cuotas_vencidas` called before reads; upsert `onConflict:'cuota_id,tipo_alerta', ignoreDuplicates:true`; 90-day cap excludes day 91; fan-out = owner + active globals, de-duped; `enviada=true` set (spec: Notification fan-out, Cron auth/idempotency).
- [x] 3.2 GREEN — implement `src/app/api/cron/cobranza-alertas/route.ts` (GET+POST→`handleRequest`, `createServiceRoleClient`), mirroring `reportes-alertas/route.ts` auth pattern.
- [x] 3.3 Add `{ "path": "/api/cron/cobranza-alertas", "schedule": "0 13 * * *" }` to `vercel.json` crons array — schedule is load-bearing (Lima-day alignment per design D5), do not change without re-validating.
- [x] 3.4 `npx tsc --noEmit` clean; `npm test` full suite green.

## PR2 — UI

### Phase 4: Server actions — TDD
- [ ] 4.1 RED — `src/__tests__/unit/cobranza-gestion-action.test.ts`: `obtenerAlertasCobranza` scopes by `vendedor_username` unless `PERMISOS.PAGOS.VER_TODOS`; `registrarGestionCobranza` inserts, flips `alerta.gestionada=true`, revalidates; ownership gate rejects unauthorized writer (spec: Actionable alerts view, RLS invariants).
- [ ] 4.2 GREEN — implement both actions in `src/app/dashboard/cobranza/_actions-cobranza.ts` (pattern: existing `obtenerCobranza`).

### Phase 5: UI wiring
- [ ] 5.1 `_ControlPagosHub.tsx`: add `alertas` to `ControlPagosTab`/`tabs`, grid-cols-2→3, accept `initialTab` prop.
- [ ] 5.2 `page.tsx`: read `searchParams.tab`, pass as `initialTab`.
- [ ] 5.3 New `_AlertasCobranzaList.tsx`: list with `tipo_alerta`/`fecha_alerta`/cuota-cliente context, `wa.me` button (`buildWhatsAppUrl` + `tiers.ts::buildReminderMessage`), gestionada badge.
- [ ] 5.4 New `_GestionCobranzaModal.tsx`: form (fecha, medio, resultado, notas) → `registrarGestionCobranza`.
- [ ] 5.5 `npx tsc --noEmit` clean; `npm test` full suite green.

## Next Step
Ready for `sdd-apply` after chain strategy is chosen (stacked-to-main vs feature-branch-chain).
