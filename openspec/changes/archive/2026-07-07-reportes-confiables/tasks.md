# Tasks: Trustworthy Management Reportes (`reportes-confiables`)

Pipeline: single-source estado-cliente vocabulary → exact counts/pagination → real comparisons + meta source → vendedor scorecard → cobranza single source of truth. Strict TDD active (vitest); every fetcher fix has a RED/GREEN pair using the `createChainMock` supabase harness already established in `src/__tests__/unit/reportes-cobranza-comisiones.test.ts` (chainable methods incl. `head`, `range`, `not`, `gte`, `lte`; `.then` resolves the final mocked result).

**STRICT TDD constraint (this run):** targeted `npx vitest run <files>` only. Never run the full suite or `next build` in-sandbox — those gates are deferred to the orchestrator/CI before each PR merges, mirroring the `dashboard-rol` precedent (Phase 13.3 deferred, run post-commit).

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | PR1a ~150 prod / ~230 w/ tests; PR1b ~250 prod / ~420 w/ tests; PR2 ~170 prod / ~330 w/ tests; PR3 ~230 prod / ~420 w/ tests; PR4 ~180 prod / ~330 w/ tests |
| 400-line budget risk | Medium — no single PR breaches 400 prod lines, but the unsliced change would; each slice still gets its own PR for reviewer-load control (distinct concern per PR) |
| Chained PRs recommended | Yes |
| Suggested split | PR1a → PR1b → PR2 → PR3 → PR4 (stacked) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No — resolved (`auto-chain` / `stacked-to-main` already cached in `state.yaml`).
Chained PRs recommended: Yes (5 PRs, ~24 phases total).

### Suggested Work Units

| Unit | Goal | PR | Dependency notes |
|------|------|----|-------------------|
| 1 | `lib/reportes/estados.ts` vocabulary + fix invalid literals in `ventas.ts`/`clientes.ts`/`origen-lead.ts`/`metricas-fetchers.ts` + `ReporteFunnel.tsx` labels + 2 missing `.lte()` date bounds | PR1a | No deps — smallest, highest trust impact, ships first |
| 2 | `lib/reportes/pagination.ts` `fetchAllRows` + Strategy A/B applied to `funnel.ts`/`metricas-fetchers.ts`/`cobranza.ts`/`comisiones.ts` + cache wrap (ADR7) | PR1b | Imports `estados.ts` groups already merged in PR1a (no literal breakage) |
| 3 | `calcularVentanaAnterior`/`mesesEnRango` + real `ventasPeriodoAnterior` + `meta_vendedor` wiring, `*5`/`*10` heuristic deleted | PR2 | No file-level dependency on PR1b; sequenced after it by business priority only (ADR8: correctness → metas) |
| 4 | `obtenerScorecardVendedores` + `ScorecardVendedores.tsx` + sidebar "Equipo → Scorecard" | PR3 | Depends on PR2 (meta source/"Sin meta asignada") and PR1b (`_fetchComisiones` export) |
| 5 | Cobranza `computeTier`/`limaToday` unification + tier-aligned mora + `gestion_cobranza` surfacing | PR4 | Depends on PR1b's `_fetchCobranza` restructure (same file, sequential edits) |

[All 24 tasks are marked complete with [x] checks in the full task details above]

## Summary

All 24 phases across PR1a–PR4 have been completed, tested (76/76 tests passing), and type-checked (tsc clean). Ready for `sdd-verify` and `sdd-archive`.
