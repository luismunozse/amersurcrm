# Archive Report: plano-interactivo

**Change Name**: plano-interactivo  
**Status**: ARCHIVED — Fully implemented, verified, and closed  
**Archive Date**: 2026-07-07  
**Artifact Store Mode**: openspec

---

## Change Summary

Delivered the complete interactive masterplan pipeline for live sales presentations: unified upload (image + PDF rasterization), polygon editor with zoom/pan and vertex operations (drag/delete/undo), and a price-free fullscreen presentation mode. Consolidated on the existing masterplan stack (`crm.proyecto.masterplan`, `crm.lote.data.masterplan_poly`, SVG `MasterplanViewer`/`MasterplanEditor`, `src/lib/masterplan/geometry.ts`). Froze legacy plano write paths (`planos_url`, `overlay_layers`) and deleted ~2,831 lines of dead/orphaned UI code.

---

## Implementation Artifacts

### Specification
**Main Spec Created**: `openspec/specs/masterplan/spec.md`
- 6 core requirements across 16 scenarios
- Covers unified upload (image+PDF rasterization), legacy path freeze, editor vertex/history ops, price-free presentation, whitelist DTO contract, and resolution-independent polygon coordinates
- First formal spec for the masterplan/plano domain

### Design Decisions (6 ADRs)
- **ADR-1**: Consolidate on masterplan stack — no Konva/Leaflet/Mapbox
- **ADR-2**: Client-side PDF rasterization (independent copy pattern, no shared import with frozen `BlueprintUploader`)
- **ADR-3**: Render-invariant coords, aspect-ratio guard (not migration) for re-uploads
- **ADR-4**: Price-free DTO (explicit-pick, structural guarantee)
- **ADR-5**: Navegar/Dibujar toggle, zoom-invariant click mapping, dynamic-import boundary one level up
- **ADR-6**: Freeze legacy writers, rename collision (`guardarPoligonoLote`), delete verified orphans (5 files, ~2,831 lines)

### Implementation Scope

**Files Committed to Main** (5 stacked PRs):

#### PR1 — Unified uploader + PDF rasterization
- Commits: `cedd2a7..02d627b`
- Extract `rasterizeFirstPageToPng` into `src/lib/masterplan/rasterize.client.ts` (independent from frozen `BlueprintUploader`)
- Wire `MasterplanEditorPanel.onFile` to accept PDF, cap + retry oversized rasters (max 2000px), guard aspect-ratio change via `ConfirmDialog`
- Pure helpers `scaleForMaxDimension`, `aspectRatioChanged` with unit tests
- Write path: only `uploadProyectoAsset` + `guardarMasterplanProyecto` (no `planos_url`/`overlay_layers` key)
- 9 unit tests (rasterize helpers), 187 changed lines (production code)

#### PR2 — Editor zoom/pan + vertex operations
- Commits: `f62c8f5..f0c26fc`
- Add pure geometry ops: `moverVertice`, `eliminarVertice` to `src/lib/masterplan/geometry.ts`
- Full rewrite of `MasterplanEditor`: wrap in `TransformWrapper` (`react-zoom-pan-pinch`), add Navegar/Dibujar mode toggle
- Drag-vertex handler, delete-vertex (blocked at 3), undo stack (history snapshots)
- Zoom-invariance lock (pixel→normalized coord invariant at any scale)
- Voseo copy normalization ("Hacé click..." → "Modo Dibujar: haga clic...")
- Dynamic-import boundary in `MasterplanEditorPanel` for `react-zoom-pan-pinch` (only when masterplan exists)
- 21 unit/integration tests (geometry + editor), 163–178 changed lines (production code)

#### PR3 — Price-free DTO + server builder + viewer refactor
- Commits: `7db8d71..7c07667`
- Create `src/lib/masterplan/dto.ts`: `PlanoLoteDTO`, `PlanoPresentacionDTO` (explicit-pick, never spreads raw row)
- Create `src/lib/masterplan/presentacion.server.ts`: `buildPlanoPresentacion(proyectoId)`, server-only, session-scoped read
- Refactor `MasterplanViewer`: drop `formatPrecio`, tooltip shows `codigo + estado` only (no price field in prop type)
- Update callers: `_LotesList.tsx` drops price from `lotesMarcados` (admin price columns elsewhere untouched)
- Assertion: DTO never contains `precio`/`moneda` at the type/shape level + no price text/attribute in rendered output
- 12 unit/integration tests (DTO, server builder, viewer), ~135 changed lines (production code)

#### PR4 — Presentation mode entry point
- Commits: `5a9b0fa..8c04e0e`
- New `PlanoPresentacion.tsx`: fullscreen, mobile-first (pinch-zoom/pan), dark-aware, formal Spanish
- Estado legend (disponible/reservado/vendido), tap-to-detail panel (área + manzana/etapa only, no price)
- Props typed `{ dto: PlanoPresentacionDTO | null; onClose?: () => void }` only (no DB import, reusable for Phase 2 public route)
- Wire entry point: proyecto detail page calls `buildPlanoPresentacion` server-side in parallel with existing queries
- `_LotesList.tsx`: next/dynamic(ssr:false)-imports `PlanoPresentacion`; adds "Modo presentación" button
- Empty state + close button when no masterplan uploaded
- 5 component tests (legend, tap-to-detail, empty state), 212 changed lines (production code)

#### PR5 — Legacy freeze/rename + verified dead-code deletion (size:exception)
- Commits: `9ffdacf..cedd2a7`
- Rename `src/app/dashboard/proyectos/[id]/_actions.ts` export: `guardarPoligonoLote` → `guardarPoligonoLoteLegacy` (collision with masterplan writer at `proyectos/_actions.ts:578`)
- Update the one live caller: `_MapeoLotes.tsx` (Google Maps lote pinning, pre-existing, not new from PR1-4) — import + 3 call sites
- Pre-deletion grep-guard: confirm zero external importers for the 5 target files (re-verified immediately before deletion)
- Delete verified orphans (zero external importers, only internal `_PlanosUploader` → `_PlanosViewer` cross-ref):
  - `_MapeoLotesMejorado.tsx` (1,828 lines)
  - `_MapeoLotesVisualizacion.tsx` (348 lines)
  - `_PlanosViewer.tsx` (270 lines)
  - `_PlanosUploader.tsx` (202 lines)
  - `OverlayLayersPanel.tsx` (183 lines)
- Total deletion: 2,831 lines. Modification: 12 lines (rename + caller update)
- Verified: `_MapeoLotes.tsx` (live tab) **untouched** beyond the required import rename
- Frozen (no new callers verified): legacy `upload-plano/route.ts` (planos_url), `subirPlanos`/`guardarOverlayBounds`/`guardarOverlayLayers` (overlay_layers)
- 0 targeted tests changed (masterplan suite remains 52 green before/after deletion; no test file tested only dead code)

#### Remediation (post-verify, commit d26f142)
- Added `src/components/masterplan/MasterplanEditorPanel.test.tsx` (5 tests): valid image upload, PDF rasterize-then-upload, unsupported-type rejection with real `validateProyectoImage` message, aspect-ratio dialog cancel/confirm
- Closes the verify-phase CRITICAL (MasterplanEditorPanel.onFile component behavior previously untested)
- No production code changed — confirms coverage gap, not a functional defect
- Mocks: `guardarMasterplanProyecto`/`uploadProyectoAsset` (network/DB edges); `validateProyectoImage`, `aspectRatioChanged` kept real; jsdom gaps (Image/URL.createObjectURL) worked around

**Full-Suite Gate** (Orchestrator post-commit):
- `npm test`: 57 targeted masterplan tests PASS (after remediation: 52 pre-existing + 5 new)
- `npx tsc --noEmit`: clean (full project)
- No lint errors

---

## Verification Outcome

**Result**: PASS WITH WARNINGS (2 WARNING, 2 SUGGESTION remain; 0 CRITICAL after remediation)

Initial `sdd-verify` reported 1 CRITICAL:
- `MasterplanEditorPanel.onFile` (PR1 uploader wiring) shipped without a runtime test covering the component behavior

**Fix Applied** (commit d26f142, post-verify):
- Added `MasterplanEditorPanel.test.tsx` (5 tests covering PDF rasterization, unsupported-file rejection, aspect-ratio guard)
- Mocking strategy audit: boundaries are appropriate (network/DB edges mocked; validation + ratio math kept real)
- No production code changed
- Re-verified fresh: all assertions are real, non-hollow; both previously-flagged scenarios now COMPLIANT

**Remaining Warnings** (non-blocking):
1. "Legacy plano write paths frozen" — scenario "existing proyecto detail screen still renders" verified only by static inspection (no runtime render test for page.tsx in this repo). Low risk, unchanged code path.
2. ADR-5's dynamic-import boundary placed one level up (around `MasterplanEditor`/`PlanoPresentacion`, not `TransformWrapper` directly). Documented, functionally equivalent, no action required.

**Key Verification Evidence**

| Requirement | Test Evidence | Result |
|---|---|---|
| Unified masterplan upload path | rasterize.test.ts (pure helpers); MasterplanEditorPanel.test.tsx (component: image/PDF/unsupported-file branches, aspect-ratio guard) | COMPLIANT |
| Legacy plano write paths frozen | Grep-verified: zero new callers of `upload-plano/route.ts` or `subirPlanos`/`guardarOverlayBounds`/`guardarOverlayLayers`; masterplan-actions.test.ts asserts payload contains exactly `{url,path,width,height}`, no legacy keys | COMPLIANT |
| Polygon editor vertex/history ops | geometry.test.ts + MasterplanEditor.test.tsx (drag updates one vertex, delete blocked at 3, undo reverts, zoom-invariance lock) | COMPLIANT |
| Presentation mode shows no price | PlanoPresentacion.test.tsx + MasterplanViewer.test.tsx (legend/detail panel rendered without price text/attribute; DTO type has no price field) | COMPLIANT |
| Price-free whitelist DTO | dto.test.ts + presentacion.server.test.ts (explicit-pick mapper, DTO keys never contain precio/moneda even when raw row carries those fields) | COMPLIANT |
| Resolution-independent coords | geometry.test.ts pixelANormalizado zoom-invariance (scale-1x vs scale-2x identical output) + structural (viewBox="0 0 1 1", render path never reads width/height) | COMPLIANT |

**Updated Compliance Summary**: 14/16 scenarios COMPLIANT, 2/16 PARTIAL (both non-blocking WARNING-level, not CRITICAL).

---

## Shipped Behavior

### Admin/Coordinador Setup
- **Upload masterplan**: Image (JPEG/PNG/WEBP) or PDF (first page only, rasterized to PNG, max 4000px capped, 5MB gate with retry). Intrinsic dimensions captured. Aspect-ratio guard for re-uploads (`ConfirmDialog`).
- **Edit polygon lotes**: Drag vertices to new positions (normalized `[0,1]` coords). Delete vertex (blocked at 3). Undo last action. Zoom+pan canvas (Navegar/Dibujar mode toggle disables panning when editing).
- **Legacy paths frozen**: New uploads never write to `planos_url` or `overlay_layers`. Existing proyecto detail screens still render legacy plano data if present (unchanged code path).

### Vendedor Sales Presentation
- **Modo presentación entry point**: New button on proyecto detail screen. Opens fullscreen view.
- **Display**: Base masterplan image + lote polygons colored by estado (disponible/green, reservado/yellow, vendido/red). Always-visible estado legend.
- **Interaction**: Tap a lote to open bottom-sheet detail panel (mobile) or centered modal (desktop). Panel shows área + manzana + etapa only. **No price anywhere on screen.**
- **Empty state**: Formal Spanish message + close button when no masterplan uploaded yet.

### Dead Code Removal
- Deleted 5 orphaned files (~2,831 lines): `_MapeoLotesMejorado.tsx`, `_MapeoLotesVisualizacion.tsx`, `_PlanosViewer.tsx`, `_PlanosUploader.tsx`, `OverlayLayersPanel.tsx`
- Live "Mapeo de Lotes" tab (`_MapeoLotes.tsx`, Google Maps pinning) explicitly **untouched** beyond mechanical import rename
- Frozen legacy write paths explicitly documented (not deleted)

### New Abstractions
- `PlanoLoteDTO`/`PlanoPresentacionDTO` — structural price-free boundary for server builder + component reuse
- `buildPlanoPresentacion(proyectoId)` — server-only builder; called from proyecto detail page + (deferred) public `/p/[token]` route
- `moverVertice`/`eliminarVertice` pure geometry ops — immutable, zoom-invariant
- Navegar/Dibujar mode toggle — clean editor state machine

---

## Deferred: Phase 2 Public Route

**Out of scope** (design constraint, not implementation): `/p/[token]` public tokenized link (WhatsApp, no login). Design proves the leak-proof boundary via the structural price-free DTO + component-only props contract. Whoever builds the public route will need an RLS policy allowing anonymous reads scoped by a valid token-resolved `proyectoId`, or a service-role variant of `buildPlanoPresentacion`. The presentation component is ready to reuse verbatim.

---

## Source of Truth Updated

**New Main Spec**: `openspec/specs/masterplan/spec.md`
- Captures all 6 masterplan requirements and 16 scenarios for future reference and maintenance
- Replaces no prior spec (masterplan domain was unspecified before)
- First formal spec for `crm.proyecto.masterplan` + `crm.lote.data.masterplan_poly`

---

## SDD Cycle Complete

**Closed Artifacts** (moved to archive):
- proposal.md — Original product rationale, scope, approach, risks
- spec.md — Acceptance criteria per requirement, all 16 scenarios
- design.md — 6 ADRs, architecture overview, file-touch list, PR chain strategy
- tasks.md — 32 tasks across 5 chained PRs (+ remediation), all complete, delivery strategy documented
- apply-progress.md — Full implementation record for all 5 PRs, deviations documented
- verify-report.md — Compliance matrix, correctness evidence, TDD audit, CRITICAL remediation record
- state.yaml — DAG state, phase tracking, delivery/constraint metadata

**Commits on main**: 
- PR1: `cedd2a7..02d627b` (uploader + PDF rasterization)
- PR2: `f62c8f5..f0c26fc` (editor zoom/pan + vertex ops)
- PR3: `7db8d71..7c07667` (price-free DTO + viewer refactor)
- PR4: `5a9b0fa..8c04e0e` (presentation mode entry point)
- PR5: `9ffdacf..cedd2a7` (legacy freeze/rename + dead-code deletion)
- Remediation: `d26f142` (add MasterplanEditorPanel.test.tsx, close CRITICAL)

**Status**: Ready for next change.

---

## Archive Metadata

| Field | Value |
|---|---|
| Change | plano-interactivo |
| Archive Path | `openspec/changes/archive/2026-07-07-plano-interactivo/` |
| Spec Synced to | `openspec/specs/masterplan/spec.md` (created) |
| Mode | openspec (file-based, committable) |
| Artifact Store | Full audit trail (proposal, spec, design, tasks, apply-progress, verify-report, state.yaml, archive-report) |
| Verification | PASS WITH WARNINGS (2 non-blocking, 0 CRITICAL after remediation) |
| Task Completion | All 32 tasks checked; targeted masterplan test suite 57/57 passing |
| Build Status | 57 targeted tests PASS; tsc clean; no lint errors |
| Ready for Next Feature | Yes |
