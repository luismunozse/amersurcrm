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

### Suggested Work Units

| Unit | Goal | PR | Notes |
|------|------|----|-------|
| 1 | Unified uploader + PDF rasterization + re-upload aspect guard | PR1 | independent; base for later slices |
| 2 | Editor zoom/pan + vertex drag/delete/undo | PR2 | depends on PR1 (needs a masterplan to draw on); adds `react-zoom-pan-pinch` |
| 3 | Price-free DTO + server builder + viewer refactor | PR3 | depends on PR2 merged (touches `MasterplanEditor.tsx` type import) |
| 4 | `PlanoPresentacion` component + entry point | PR4 | depends on PR3 (consumes the DTO) |
| 5 | Legacy freeze/rename + verified dead-code deletion | PR5 | isolated, ordered last, exempt from feature-slice budget per design |

## Corrected scope note (verified against current code, not just design.md)

Design ADR-6 lists `_MapeoLotes.tsx` as dead/unreferenced. **This is incorrect.** `_MapeoLotes.tsx` is live: rendered as the "Mapeo de Lotes" tab (`_ProjectTabs.tsx:68`, wired from `page.tsx:487`), a Google-Maps-based lote-pinning feature distinct from the masterplan overlay. PR5 does **not** touch it. Confirmed-orphaned (zero external importers): `_MapeoLotesMejorado.tsx` (1701 lines), `_MapeoLotesVisualizacion.tsx` (322), `_PlanosViewer.tsx` (249, only imported by `_PlanosUploader.tsx`), `_PlanosUploader.tsx` (183), `OverlayLayersPanel.tsx` (175) — ~2630 lines total. `_PlanosSection.tsx` (named in design.md) does not exist in the repo — dropped from scope.

## PR1 — Unified uploader + PDF rasterization
Maps to: Requirement "Unified masterplan upload path" (3 scenarios); ADR-2, ADR-3 (aspect-ratio guard)

### Phase 1: Rasterization core (TDD)
- [x] 1.1 RED — `src/lib/masterplan/rasterize.test.ts`: `scaleForMaxDimension(w,h,maxDim)` clamps to MAX_DIM preserving aspect ratio; `aspectRatioChanged(oldW,oldH,newW,newH,tolerance)` true/false around 0.02 tolerance
- [x] 1.2 GREEN — `src/lib/masterplan/rasterize.client.ts`: extract `rasterizeFirstPageToPng(file, {maxDimension})` from `BlueprintUploader.tsx:17` (`convertPdfToPng`, `pdfjs-dist`, `pdf.getPage(1)` only), plus `scaleForMaxDimension`/`aspectRatioChanged` pure helpers
- [x] 1.3 REFACTOR — leave `BlueprintUploader.tsx`'s own copy untouched (frozen legacy path); no shared import between frozen and new code

### Phase 2: Uploader wiring
- [x] 2.1 Extend `MasterplanEditorPanel.tsx` `onFile` (line 26): accept `application/pdf`, rasterize via `rasterizeFirstPageToPng` before `validateProyectoImage`, re-validate against the 5MB gate, retry once at lower scale, else show "El plano es demasiado pesado. Reduzca la resolución del PDF."
- [x] 2.2 Wire `aspectRatioChanged` in `onFile`: on replace, compare new PNG dims vs `masterplan.width/height`; beyond tolerance, confirm via "El nuevo plano tiene otra proporción..." dialog before `guardarMasterplanProyecto`
- [x] 2.3 Confirm `guardarMasterplanProyecto` (`_actions.ts:534`) + `uploadProyectoAsset` remain the only write path (Scenarios: image upload persists masterplan only / PDF rasterized before storage / unsupported type rejected)
- [x] 2.4 `npx vitest run src/lib/masterplan/rasterize.test.ts`; `npx tsc --noEmit`

## PR2 — Editor: zoom/pan + vertex operations
Maps to: Requirement "Polygon editor vertex and history operations" (4 scenarios); ADR-5

### Phase 3: Geometry ops (TDD)
- [x] 3.1 RED — extend `geometry.test.ts`: `moverVertice(poly, index, punto)` updates only the target vertex + clamps `[0,1]`; `eliminarVertice(poly, index)` no-ops when `poly.length <= 3`; `pixelANormalizado` ratio identical for a 2x-scaled rect (zoom-invariance lock)
- [x] 3.2 GREEN — implement `moverVertice`/`eliminarVertice` in `geometry.ts` (pure, immutable)
- [x] 3.3 `npm install react-zoom-pan-pinch` (only new runtime dependency, ~7KB)

### Phase 4: Editor UI wiring
- [x] 4.1 `MasterplanEditor.tsx`: wrap image+SVG in `<TransformWrapper>`/`<TransformComponent>`; add Navegar/Dibujar mode toggle; disable panning + enable click-to-add-vertex only in Dibujar mode
- [x] 4.2 Drag-vertex pointer handler → `moverVertice`; delete-vertex handler → `eliminarVertice` (UI disables delete at 3 vertices)
- [x] 4.3 Undo stack (`useState<Poligono[]>` history) for add/drag/delete; transient drag position in a `useRef`
- [x] 4.4 RED→GREEN — extend `MasterplanEditor.test.tsx`: drag updates one vertex, delete blocked at 3, undo reverts last action
- [x] 4.5 `npx vitest run src/lib/masterplan/geometry.test.ts src/components/masterplan/MasterplanEditor.test.tsx`; `npx tsc --noEmit`

## PR3 — Price-free DTO + server builder + viewer refactor
Maps to: Requirement "Presentation component consumes a price-free whitelist DTO" (2 scenarios), "Polygon coordinates remain resolution-independent" (1 scenario); ADR-4, ADR-3

### Phase 5: DTO + server builder (TDD)
- [ ] 5.1 RED — `src/lib/masterplan/dto.test.ts`: `toPlanoLoteDTO(rowWithPrice)` keys are exactly `[id, codigo, estado, area, manzana, etapa, poly]`, never `precio`/`moneda`/`descuento`/`precio_m2`/`condiciones`; `buildPlanoPresentacion` never leaks those keys
- [ ] 5.2 GREEN — `src/lib/masterplan/dto.ts` (`PlanoLoteDTO`, `PlanoPresentacionDTO`, explicit-pick `toPlanoLoteDTO`, never spreads the raw row) + `src/lib/masterplan/presentacion.server.ts` (`buildPlanoPresentacion(proyectoId)`: reads `proyecto.masterplan` + `lote` rows, `null` when `masterplan.url` absent)
- [ ] 5.3 RED/GREEN — `presentacion.server.test.ts`: `null` without masterplan; maps `sup_m2→area`, `data.manzana`, `data.etapa`

### Phase 6: Viewer refactor (price-free, global guarantee)
- [ ] 6.1 Refactor `MasterplanViewer.tsx`: replace `LoteMarcado` props with `PlanoLoteDTO`; tooltip drops `formatPrecio`, shows `codigo` + `estado` only
- [ ] 6.2 Update callers: `_LotesList.tsx` `lotesMarcados` (line 450) drops `precio`/`moneda` for `MasterplanViewer`/`MasterplanEditorPanel` props (admin price columns elsewhere in the list are untouched); `MasterplanEditor.tsx`/`MasterplanEditorPanel.tsx` type imports updated to `PlanoLoteDTO`
- [ ] 6.3 RED→GREEN — update `MasterplanViewer.test.tsx`: no price text/attribute in rendered output; existing polygon/color assertions still pass
- [ ] 6.4 `npx vitest run src/lib/masterplan/dto.test.ts src/lib/masterplan/presentacion.server.test.ts src/components/masterplan/MasterplanViewer.test.tsx`; `npx tsc --noEmit`

## PR4 — Presentation mode
Maps to: Requirement "Presentation mode shows no price anywhere on screen" (2 scenarios); ADR-4 (shared component/DTO seam)

### Phase 7: `PlanoPresentacion` component (TDD)
- [ ] 7.1 RED — `src/components/masterplan/PlanoPresentacion.test.tsx`: legend shows 3 estado colors, no monetary text; tap on a lote polygon opens a detail panel with área + manzana/etapa only; empty state renders when `dto` is `null`
- [ ] 7.2 GREEN — `PlanoPresentacion.tsx`: fullscreen wrapper over the refactored `MasterplanViewer`, `estadoColor` legend, tap→detail panel (bottom sheet on small screens, dark-aware), formal-Spanish empty-state copy, props typed `PlanoPresentacionDTO | null` only (no DB access)
- [ ] 7.3 Wire entry point: proyecto detail screen resolves `proyectoId`, server-calls `buildPlanoPresentacion`, `next/dynamic`-imports `PlanoPresentacion` behind a "Modo presentación" action
- [ ] 7.4 `npx vitest run src/components/masterplan/PlanoPresentacion.test.tsx`; `npx tsc --noEmit`

## PR5 — Legacy freeze + verified dead-code cleanup (isolated, last; exempt from feature budget per design)
Maps to: Requirement "Legacy plano write paths are frozen" (2 scenarios); ADR-6

### Phase 8: Freeze + collision rename
- [ ] 8.1 Rename `src/app/dashboard/proyectos/[id]/_actions.ts:363 guardarPoligonoLote` → `guardarPoligonoLoteLegacy` (writes `lote.plano_poligono`); grep-guard confirms no new caller from PR1–PR4
- [ ] 8.2 Grep-guard: `src/app/api/proyectos/upload-plano/route.ts` (`planos_url`) and `overlay_layers` writers have zero new callers from this change
- [ ] 8.3 Manual check: proyecto detail screen still renders for a proyecto with legacy `planos_url` data and no `masterplan` (no code change expected)

### Phase 9: Delete verified-orphaned files only
- [ ] 9.1 Re-run the grep-guard immediately before deletion (repo may have moved since design): zero external importers for `_MapeoLotesMejorado.tsx`, `_MapeoLotesVisualizacion.tsx`, `_PlanosViewer.tsx`, `_PlanosUploader.tsx`, `OverlayLayersPanel.tsx`
- [ ] 9.2 Delete the 5 confirmed-orphaned files (~2630 lines). Do **not** delete/modify `_MapeoLotes.tsx`, `_ProjectTabs.tsx`, or `page.tsx:487` — the "Mapeo de Lotes" tab is live and out of scope
- [ ] 9.3 `npx tsc --noEmit`; `npx vitest run` (full unit suite — confirm nothing references the deleted files)

## Risks

- Design ADR-6's dead-code claim was wrong for `_MapeoLotes.tsx` (verified live) — corrected in PR5's scope; whether to eventually deprecate the "Mapeo de Lotes" tab in favor of "Modo presentación" is a product decision, out of scope here.
- PR5 is deletion-heavy (~2630 lines); even though the design exempts it from the feature 400-line budget, its single-diff size likely still warrants an explicit `size:exception` sign-off at apply/review time.
- PR2 and PR3 both touch `MasterplanEditor.tsx`'s type import for `lotes` — stacked-to-main ordering (PR3 branches after PR2 merges) avoids conflict but PR3 must rebase on PR2's merged state.
- Re-crop misalignment (same aspect ratio, different framing) is not auto-detectable; `aspectRatioChanged` (PR1) only catches ratio changes — accepted per design.
- Client-side PDF rasterization of very large PDFs: capped + single retry, no server fallback in scope (PR1).

## Next Step
Ready for `sdd-apply`, starting with PR1. Chain strategy stacked-to-main: each PR merges to main before the next branches (`delivery_strategy: auto-chain`).
