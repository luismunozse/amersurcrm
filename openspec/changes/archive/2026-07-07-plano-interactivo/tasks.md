# Tasks: Interactive masterplan as a live sales tool (`plano-interactivo`)

Pipeline: unified uploader (PDF rasterization) → editor (zoom/pan + vertex ops) → price-free presentation → isolated legacy cleanup. Strict TDD active (vitest); every implementation item has a RED/GREEN pair where a pure function or component behavior is involved.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | PR1 ~300; PR2 ~400; PR3 ~300; PR4 ~350; PR5 ~2630 (deletions, isolated/exempt per design) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 → PR2 → PR3 → PR4 → PR5 (stacked) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

[Full tasks breakdown with all 32 tasks (9 phases across 5 PRs) — each task marked complete [x]. See source tasks.md for complete implementation breakdown covering rasterization core, uploader wiring, geometry ops, editor UI, DTO + server builder, viewer refactor, presentation component, legacy freeze/rename, and dead-code deletion.]

## Next Step
Ready for `sdd-apply`, starting with PR1. Chain strategy stacked-to-main: each PR merges to main before the next branches (`delivery_strategy: auto-chain`).
