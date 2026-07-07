## Verification Report

**Change**: plano-interactivo
**Version**: spec.md (6 ADDED requirements, 16 scenarios)
**Mode**: Strict TDD

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 32 |
| Tasks complete | 32 |
| Tasks incomplete | 0 |

### Build & Tests Execution

**Type check**: PASSED
```text
npx tsc --noEmit
(exit 0, no output -- 0 errors, full project)
```

**Tests**: 52 passed / 0 failed (8 files)
```text
npx vitest run src/lib/masterplan/dto.test.ts src/lib/masterplan/presentacion.server.test.ts
Test Files  8 passed (8)
     Tests  52 passed (52)
```

**Lint** (touched files only, informational): PASSED, no errors/warnings.

**Coverage**: not run -- Strict TDD instructions for this run restricted execution to the targeted file list only (no --coverage flag). Not treated as a failure.

### Spec Compliance Matrix

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Unified masterplan upload path | Image upload persists masterplan only | masterplan-actions.test.ts guardarMasterplanProyecto (asserts update called with exactly masterplan-only payload) -- action layer only | PARTIAL |
| Unified masterplan upload path | PDF upload is rasterized before storage | rasterize.test.ts covers only the pure scaleForMaxDimension/aspectRatioChanged helpers; rasterizeFirstPageToPng and MasterplanEditorPanel.onFile PDF branch have no runtime test | UNTESTED |
| Unified masterplan upload path | Unsupported file type is rejected | No test drives MasterplanEditorPanel.onFile with a non-image/non-PDF file; validateProyectoImage itself has zero test references in the repo | UNTESTED |
| Legacy plano write paths are frozen | New uploader never touches legacy fields | masterplan-actions.test.ts guardarMasterplanProyecto (update payload is exactly masterplan field, no planos_url/overlay_layers key) | COMPLIANT |
| Legacy plano write paths are frozen | Existing proyecto detail screen still renders | No runtime test (no test harness for page.tsx full render in this repo); verified only by static inspection that planosUrl/overlayLayers derivation is byte-for-byte unchanged | PARTIAL (manual/static only) |
| Polygon editor vertex/history ops | Dragging a vertex updates its coordinates | MasterplanEditor.test.tsx: arrastrar un vertice actualiza solo sus coordenadas | COMPLIANT |
| Polygon editor vertex/history ops | Deleting the 3rd-to-last vertex is blocked | MasterplanEditor.test.tsx delete-blocked test + geometry.test.ts eliminarVertice no-op-at-3 test | COMPLIANT |
| Polygon editor vertex/history ops | Undo reverts the last action | MasterplanEditor.test.tsx: deshacer revierte la ultima accion | COMPLIANT |
| Polygon editor vertex/history ops | Zoom does not distort new vertex placement | geometry.test.ts pixelANormalizado zoom-invariance test (scale-1x vs scale-2x identical output) | COMPLIANT |
| Presentation mode shows no price | Tapping a lote reveals area/manzana/etapa only | PlanoPresentacion.test.tsx detail-panel test (asserts panel content + absence of precio/moneda) | COMPLIANT |
| Presentation mode shows no price | Legend reflects estado colors without price | PlanoPresentacion.test.tsx legend test | COMPLIANT |
| Price-free whitelist DTO | DTO omits price at type/shape level | dto.test.ts safe-whitelist-keys test (Object.keys equality + forbidden-key check + serialized-value check) | COMPLIANT |
| Price-free whitelist DTO | Presentation component renders from DTO alone | Structural: PlanoPresentacion.tsx props typed PlanoPresentacionDTO or null only; zero DB/session import in the file (grep-verified); tsc --noEmit clean | COMPLIANT (static/compile-time evidence) |
| Polygon coords resolution-independent | Existing polygons render after masterplan replacement | MasterplanViewer/MasterplanEditor never receive width/height as render inputs; viewBox="0 0 1 1" structural; pixelANormalizado zoom-invariance test | COMPLIANT |

Compliance summary: 12/16 scenarios COMPLIANT, 2/16 PARTIAL, 2/16 UNTESTED.

### Correctness (Static Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| Unified masterplan upload path | Implemented | MasterplanEditorPanel.onFile branches PDF-then-rasterize-then-retry-once-at-2000px-then-formal-error, else validateProyectoImage; only write is uploadProyectoAsset + guardarMasterplanProyecto. Logic correct on reading; not exercised by a test (see Spec Compliance Matrix). |
| Legacy plano write paths are frozen | Implemented | Grep confirms zero new callers of upload-plano/route.ts (planos_url) and subirPlanos/guardarOverlayBounds/guardarOverlayLayers (overlay_layers) outside the pre-existing, untouched _MapeoLotes.tsx. |
| Polygon editor vertex/history ops | Implemented | moverVertice/eliminarVertice pure and immutable in geometry.ts; MasterplanEditor.tsx wires drag (mousedown/mousemove/mouseup), delete (dblclick, guarded both in handler and pure fn), undo stack, Navegar/Dibujar toggle disabling TransformWrapper panning. |
| Presentation mode shows no price | Implemented | PlanoPresentacion.tsx detail panel shows only area/manzana/etapa; legend uses estadoColor; no price string/attribute anywhere in the component. |
| Price-free whitelist DTO | Implemented | toPlanoLoteDTO is an explicit-pick object literal (never spreads row); PlanoLoteDTO/PlanoPresentacionDTO types have no price field; buildPlanoPresentacion only ever returns the DTO shape. |
| Polygon coords resolution-independent | Implemented | Both viewer/editor SVGs use viewBox="0 0 1 1"; render path never reads masterplan.width/height; those fields are used only by the aspect-ratio re-upload guard. |

### Contract Checks (task-specified, verified fresh)

| Contract | Result | Evidence |
|----------|--------|----------|
| NO-PRICE guarantee (DTO + component tree) | Verified | dto.ts explicit-pick mapper; MasterplanViewer.tsx title tooltip is codigo-estado only; grep for precio/moneda across src/lib/masterplan/ and src/components/masterplan/ returns matches only inside comments/tests (no production leak) |
| Single write path | Verified | guardarMasterplanProyecto (proyectos/_actions.ts:534-548) updates only the masterplan field; masterplan-actions.test.ts asserts this at runtime; guardarPoligonoLote (correct, proyectos/_actions.ts:578) unchanged; legacy guardarPoligonoLoteLegacy (renamed, [id]/_actions.ts:368) has exactly one live caller (_MapeoLotes.tsx, pre-existing, updated mechanically) |
| Normalized [0,1] coords preserved | Verified | clampUnidad/moverVertice clamp; viewBox="0 0 1 1" in both SVG renderers; zoom-invariance test locks pixelANormalizado |
| Editor ops match scenarios | Verified | Drag/delete-guard/undo/toggle all present and test-covered with real coordinate-value assertions |
| 5 deleted files have zero remaining references | Verified | rg across src/ for all 5 filenames returns zero matches (only openspec .md docs mention them historically) |
| Presentation tree has no session/user/DB imports | Verified | PlanoPresentacion.tsx and MasterplanViewer.tsx import only geometry.ts/dto.ts types and UI libs; no supabase/session import in either file |

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| ADR-1 (consolidate on masterplan stack) | Yes | No Konva/Leaflet/Mapbox added |
| ADR-2 (client-side PDF rasterization, independent copy) | Yes | rasterize.client.ts has zero shared import with BlueprintUploader.tsx; BlueprintUploader.tsx confirmed untouched (git diff --stat over the change range is empty for that file) |
| ADR-3 (render-invariant coords, aspect-ratio guard not migration) | Yes | aspectRatioChanged + ConfirmDialog; no data migration added. Minor deviation: implemented as a single Continuar/Cancelar confirm rather than the two-choice sketch -- explicitly deferred to tasks/apply by design.md itself, so not a violation |
| ADR-4 (price-free DTO, shared builder) | Yes | Exact match to design's type shape and mapper contract |
| ADR-5 (Navegar/Dibujar toggle, transform-invariant click mapping, dynamic-imported dependency) | Mostly | Toggle + click-mapping match design exactly. Deviation: react-zoom-pan-pinch/TransformWrapper is statically imported inside MasterplanEditor.tsx/PlanoPresentacion.tsx; the next/dynamic boundary is placed one level up (around the whole editor/presentation component in MasterplanEditorPanel.tsx/_LotesList.tsx). Documented deviation; achieves equivalent bundle-splitting outcome -- WARNING, not a functional gap |
| ADR-6 (freeze + rename + delete dead code in isolated slice) | Yes | Corrected scope (_MapeoLotes.tsx live) re-verified independently at verify time -- grep confirms it is still imported/rendered at page.tsx (via ProjectTabs) and is the only live caller of the renamed guardarPoligonoLoteLegacy |

### TDD Compliance
| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | Yes | Present in tasks.md/apply-progress.md for PR2/PR3/PR4/PR5; absent for PR1 tasks 2.1-2.3 (uploader wiring) -- task 2.4 only re-runs the pure-helper test file |
| All tasks have tests | Partial | 29/32 tasks have a verifiable RED/GREEN test file; tasks 2.1, 2.2, 2.3 (uploader component wiring) have no corresponding test file |
| RED confirmed (tests exist) | Yes | All 8 test files exist and were confirmed to exist at verify time |
| GREEN confirmed (tests pass) | Yes | 52/52 tests pass on execution at verify time |
| Triangulation adequate | Yes | Each behavior has 3+ differently-valued test cases, not single-case |
| Safety Net for modified files | Yes | MasterplanViewer.test.tsx/MasterplanEditor.test.tsx pre-existing tests still pass unmodified after each refactor, cross-checked by re-running the full targeted set now |

TDD Compliance: 5/6 checks passed -- the uploader component (MasterplanEditorPanel.onFile) is the one implementation item in this change with "component behavior" (per tasks.md's own stated TDD scope) that shipped without a RED/GREEN test pair.

---

### Test Layer Distribution
| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 39 | 5 (dto.test.ts, geometry.test.ts, rasterize.test.ts, presentacion.server.test.ts, masterplan-actions.test.ts) | vitest |
| Integration | 13 | 3 (MasterplanViewer.test.tsx, MasterplanEditor.test.tsx, PlanoPresentacion.test.tsx) | vitest + testing-library/react |
| E2E | 0 | 0 | not installed |
| Total | 52 | 8 | |

Gap note: MasterplanEditorPanel.tsx (the uploader entry point) has zero tests at any layer.

---

### Assertion Quality
Assertion quality: All assertions verify real behavior -- no tautologies, no assertion-without-production-call, no ghost loops over possibly-empty collections (the one forEach in PlanoPresentacion.test.tsx iterates a fixed 3-element literal fixture, not a query result). One implementation-adjacent assertion (fill.toContain color-value check in MasterplanViewer.test.tsx) checks a style-attribute value, but it directly encodes the spec's own estado-based-color business rule rather than incidental styling -- not flagged.

### Quality Metrics
Linter: No errors, no warnings (all touched masterplan source + test files)
Type Checker: No errors (full project, npx tsc --noEmit)

---

### Issues Found

CRITICAL:
1. Requirement "Unified masterplan upload path" -- 2 of 3 scenarios have no runtime-executed covering test. MasterplanEditorPanel.onFile (the actual PDF/image branching, rasterize-then-retry-then-error flow, and unsupported-file rejection) has zero test file. Only the two pure numeric helpers it calls (scaleForMaxDimension, aspectRatioChanged) are unit-tested; the write-path guarantee is tested only indirectly at the guardarMasterplanProyecto action layer, not from the component that decides whether to call it. tasks.md itself scopes Strict TDD as covering every implementation item where a pure function or component behavior is involved -- this component's behavior falls in scope but tasks 2.1-2.3 shipped without a RED/GREEN pair (task 2.4 re-runs only the pre-existing pure-helper test). Recommend before archive: add MasterplanEditorPanel.test.tsx covering (a) valid image upload calls guardarMasterplanProyecto with the correct shape and no planos_url/overlay_layers key, (b) PDF file triggers rasterizeFirstPageToPng before persist, (c) unsupported file (e.g. .docx) never calls guardarMasterplanProyecto, renders an error, and leaves the previous masterplan state unchanged.

WARNING:
1. Requirement "Legacy plano write paths are frozen" -- scenario "Existing proyecto detail screen still renders" was verified only by static code inspection (no runtime render test for page.tsx in this repo). Low risk (the relevant code path, planosUrl/overlayLayers derivation, is byte-for-byte unchanged per diff), but it is not a passing test at runtime per the strict verification bar.
2. ADR-5's dynamic-imported wording for react-zoom-pan-pinch is honored one level up (around MasterplanEditor/PlanoPresentacion themselves in MasterplanEditorPanel.tsx/_LotesList.tsx) rather than around TransformWrapper inside those files directly. Functionally equivalent bundle-splitting outcome; documented in apply-progress as a deliberate choice to keep component tests synchronous. No action required, noted for design-doc accuracy only.

SUGGESTION:
1. PlanoPresentacionDTO.width/height are populated by buildPlanoPresentacion but never consumed by MasterplanViewer or PlanoPresentacion (both take only imageUrl + lotes). Harmless but currently dead data on the presentation path -- fine to keep for future consumers, no change needed now.
2. The aspect-ratio re-upload guard was implemented as a single Continuar/Cancelar confirm rather than design.md's originally sketched Conservar/Borrar-y-re-marcar two-option dialog. This was explicitly left open by design.md, and the tasks/apply phases documented the simplification reasoning. No spec scenario requires the second option -- informational only.

### Verdict
FAIL -- one CRITICAL: the "Unified masterplan upload path" requirement (the foundational PR1 slice) has 2 of its 3 acceptance scenarios with zero runtime test coverage of the actual uploader component behavior, despite Strict TDD Mode being active for this change and tasks.md's own stated TDD scope. Everything else -- the price-free guarantee, single-write-path enforcement, normalized-coordinate invariance, editor vertex/history ops, presentation-mode price-free rendering, and the PR5 legacy-freeze/dead-code deletion -- is correctly implemented, test-covered (52/52 passing), type-clean, and lint-clean. This is a coverage gap in one component, not a functional defect; recommend a small follow-up task (add MasterplanEditorPanel.test.tsx) before archiving.
