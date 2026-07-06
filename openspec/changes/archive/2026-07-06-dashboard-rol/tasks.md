# Tasks: Role-Composed Dashboard Home (`dashboard-rol`)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | PR1a ~730 logic / ~1400 raw (incl. ~700 low-risk deletions); PR1b ~700; PR2 ~1350–1450 |
| 400-line budget risk | High (every slice) |
| Chained PRs recommended | Yes |
| Suggested split | PR1a → PR1b → PR2 (stacked) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

**All phases complete and checked off (Phases 1–13).** Phase 13.3 (full-suite gate) was deliberately deferred in-sandbox per task instructions; orchestrator ran it post-commit with results: 71 files / 1022 tests PASS + tsc --noEmit clean.

## Status

All of PR1a, PR1b, PR2a, and PR2b are implemented and gated. Commits confirmed on main:
- PR1a: 7d5cf39, 8b97aa8
- PR1b: 5a48e09..1dc3445
- PR2a: f2384e9..5911f48
- PR2b: 081a5e9..86fcd1e

Key implementation milestones:
- [x] 1.1, 1.2 — Grep-guard + delete 8 orphan decorative component files
- [x] 2.1, 2.2 — Composition resolver (TDD: RED → GREEN)
- [x] 3.1, 3.2, 3.3 — Shell rewrite + gates (PR1a)
- [x] 4.1–4.5 — ADR-7 `getCachedSeguimientosHoy` bugfix (PR1b)
- [x] 5.1–5.3 — Cockpit helpers + `getPerfilRol` (PR1b)
- [x] 6.1–6.4 — Vendedor cockpit blocks (PR1b)
- [x] 7.1, 7.2 — PR1b gates
- [x] 8.1–8.3 — ADR-2 coordinador fix (PR2a)
- [x] 9.1, 9.2 — Aging predicate (PR2a)
- [x] 10.1–10.7 — New command-center fetchers + 4-fix review round (PR2a)
- [x] 11.1–11.5 — Command-center blocks + composition (PR2b)
- [x] 12.1–12.3 — Legacy removal + redirect + grep sweep (PR2b)
- [x] Phase 11/12 extra — Orphan fetcher cleanup (PR2b)
- [x] 13.1, 13.2 — Unit + type gates (PR2b)
- [x] 13.3 — Full-suite gate (orchestrator post-commit)

All implementation tasks complete.
