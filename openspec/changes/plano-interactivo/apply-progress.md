# Apply Progress — `plano-interactivo`

## Slice implemented: PR1 — Unified uploader + PDF rasterization

Status: **done**. Phases 1-2 (all PR1 tasks in `tasks.md`) checked off.

### Files touched

| File | Change |
|------|--------|
| `src/lib/masterplan/rasterize.client.ts` | **New.** Pure `scaleForMaxDimension(w,h,maxDim)` and `aspectRatioChanged(oldW,oldH,newW,newH,tolerance=0.02)` helpers, plus `rasterizeFirstPageToPng(file,{maxDimension})` (independent copy of `BlueprintUploader.tsx`'s `convertPdfToPng` pattern — first page only, `pdfjs-dist`, canvas). No shared import with the frozen `BlueprintUploader.tsx`, per design ADR-2 / tasks 1.3. |
| `src/lib/masterplan/rasterize.test.ts` | **New.** 9 unit tests for the two pure helpers (RED confirmed before implementation, GREEN after). |
| `src/components/masterplan/MasterplanEditorPanel.tsx` | Rewired `onFile`: accepts `application/pdf` (rasterizes via `rasterizeFirstPageToPng`, re-validates against the 5MB gate via `validateProyectoImage`, retries once at `maxDimension=2000`, else formal-Spanish error); wires `aspectRatioChanged` against the previously-stored `masterplan.width/height` on replace, gating the write behind a `ConfirmDialog` (reused existing project component — dark-aware, bottom-sheet-on-mobile, no native `window.confirm`). `masterplan` prop type widened from `{url,path}` to the full `Masterplan` type (needed to read `width/height` for the guard). Write path unchanged: still only `uploadProyectoAsset` + `guardarMasterplanProyecto`. |
| `src/app/dashboard/proyectos/[id]/_LotesList.tsx` | One-line caller update: passes the full `masterplan` object through to `MasterplanEditorPanel` instead of stripping `width`/`height` (needed for the aspect-ratio guard). |

No other files changed. `BlueprintUploader.tsx` and the legacy `planos_url`/`overlay_layers` write paths were not touched (frozen, out of scope — verified by reading, not modifying).

### Scope decision (documented deviation)

Design.md's aspect-ratio dialog copy offers two conceptual choices ("Conservar" vs "Borrar y re-marcar") and explicitly defers the choice to the tasks/apply phase. Implemented as a single **Continuar / Cancelar** confirm: "Continuar" proceeds with the replace (coordinates kept as-is, safe per ADR-3); "Cancelar" aborts and leaves the previous masterplan untouched. A "Borrar y re-marcar" option (clearing `masterplan_poly` across every lote) would require a new batch write path, which would violate task 2.3's "confirm ... remain the only write path" constraint and pull in Phase-3+ concerns. Out of scope for PR1 by design; noted here for the PR2+ implementer in case product wants a "clear all polygons" action later.

### Tests written and results

```
npx vitest run src/lib/masterplan/rasterize.test.ts
```
- Before implementation (RED): 1 failed suite — `Failed to resolve import "./rasterize.client"` (file didn't exist yet).
- After implementation (GREEN): 1 passed file, 9 passed tests.

Regression check (targeted, not full suite per Strict TDD instructions):
```
npx vitest run src/lib/masterplan/rasterize.test.ts src/lib/masterplan/geometry.test.ts src/components/masterplan/MasterplanEditor.test.tsx src/components/masterplan/MasterplanViewer.test.tsx src/__tests__/unit/masterplan-actions.test.ts
```
- Result: 5 files passed, 27 tests passed, 0 failed.

```
npx tsc --noEmit
```
- Result: exit code 0, no errors (full project).

### Changed-line estimate vs budget

Forecast for PR1: ~300 changed lines (excluding tests). Actual: `rasterize.client.ts` 82 lines (new) + `MasterplanEditorPanel.tsx` diff 103 insertions/17 deletions + `_LotesList.tsx` 1/1. Total non-test ≈ 187 changed lines — under the 300-line forecast and well under the 400-line budget. `rasterize.test.ts` (51 lines) excluded from the budget per convention.

### Suggested commit boundary (work-unit-commits skill)

This is one reviewable work unit — a single commit/PR:

```
feat(masterplan): unified PDF/image uploader with client-side rasterization

- extract PDF->PNG rasterization into src/lib/masterplan/rasterize.client.ts
  (independent from the frozen BlueprintUploader copy)
- wire MasterplanEditorPanel to accept PDFs, cap+retry oversized rasters,
  and guard aspect-ratio changes on re-upload with a confirm dialog
- pass full masterplan (incl. width/height) through _LotesList
```

Rollback: revert this single commit; the legacy write paths and `BlueprintUploader.tsx` are untouched, so rollback has zero blast radius outside this slice.

### What PR2 needs to know

- `MasterplanEditorPanel`'s `masterplan` prop is now typed `Masterplan | null` (not `{url,path}`) — if PR2 touches this component's props further, keep that type.
- `rasterizeFirstPageToPng`/`scaleForMaxDimension`/`aspectRatioChanged` live in `src/lib/masterplan/rasterize.client.ts` and are stable exports PR2 can reuse if needed (PR2 itself does not need them — it's editor zoom/pan + vertex ops in `geometry.ts`/`MasterplanEditor.tsx`).
- `MasterplanEditor.tsx` was **not** touched in PR1 (confirmed by reading it) — PR2's `<TransformWrapper>` wiring starts from the current file as-is.
- `ConfirmDialog` (`src/components/ConfirmDialog.tsx`) is the project's standard confirm pattern (portal, dark-aware, bottom-sheet-on-mobile, Escape-to-close) — reuse it for PR2's undo/delete confirmations if a confirm step is needed there, instead of `window.confirm`.
- The existing "Hacé click en la imagen..." voseo copy in `MasterplanEditor.tsx` (line ~81) was left untouched (out of scope for PR1); PR2 touches this file directly and may want to normalize it to formal Peruvian Spanish ("usted") while it's already being edited, per project UI-copy convention.

---

## Slice implemented: PR2 — Editor zoom/pan + vertex operations

Status: **done**. Phases 3-4 (all PR2 tasks in `tasks.md`) checked off.

### Files touched

| File | Change |
|------|--------|
| `src/lib/masterplan/geometry.ts` | Added two pure, immutable helpers: `moverVertice(poly, index, punto)` (replaces one vertex, re-clamps to `[0,1]`, no-ops on out-of-range index) and `eliminarVertice(poly, index)` (filters out one vertex, no-ops when `poly.length <= 3` or index out of range). Neither mutates its input. |
| `src/lib/masterplan/geometry.test.ts` | +18 tests: `moverVertice` (target-only update, clamp, no-mutate, out-of-range no-op), `eliminarVertice` (removes at >3, no-op at exactly 3, no-mutate), and a zoom-invariance lock for `pixelANormalizado` (same normalized point at a simulated 1x vs 2x scaled rect — proves ADR-5's "no zoom-aware math needed" claim). |
| `src/components/masterplan/MasterplanEditor.tsx` | Full rewrite of the editor: wraps the image+SVG in `<TransformWrapper>`/`<TransformComponent>` (`react-zoom-pan-pinch`, statically imported here — see dynamic-import note below); adds a Navegar/Dibujar mode toggle (`aria-pressed` segmented buttons) that both disables `TransformWrapper`'s `panning` and gates `onImageClick`'s add-vertex behavior; renders draggable SVG `<circle>` vertex handles for the in-progress `dibujo` polygon (visible/interactive only in Dibujar mode, `pointer-events-auto` overriding the SVG's `pointer-events-none`); vertex drag via `mousedown` on a circle → `window`-level `mousemove`/`mouseup` listeners registered/removed per gesture (not React pointer events — see gotcha below) calling `moverVertice`; vertex delete via `onDoubleClick` → `eliminarVertice`, guarded both in the handler (`dibujo.length <= 3` no-op) and structurally by the pure function; an undo stack (`useState<Poligono[]>` history of pre-mutation snapshots) with a "Deshacer" button (disabled when empty), covering add/drag/delete/"Limpiar". Transient per-gesture bookkeeping (`index`, pre-drag snapshot, "history already pushed" flag) lives in a `useRef<ArrastreVertice \| null>` so it doesn't itself trigger re-renders (only the necessary `dibujo`/`historial` state updates do) — this is the concrete application of `rerender-use-ref-transient-values`, not a no-render-during-drag scheme (the polygon **does** visually update every `mousemove`, which is required for drag feedback and is cheap at this scale — a handful of SVG points, not a hot path). Also normalizes the flagged voseo copy: `"— Elegí un lote —"` → `"— Seleccione un lote —"`, `"Hacé click en la imagen..."` → `"Modo Dibujar: haga clic en la imagen..."`. |
| `src/components/masterplan/MasterplanEditor.test.tsx` | +3 tests (new `describe` block) covering the four PR2 spec scenarios: drag updates only the dragged vertex; delete is blocked at exactly 3 vertices; undo reverts the last add. A `beforeEach` mocks `Element.prototype.getBoundingClientRect` to a fixed 100×100 rect (jsdom returns all-zero rects by default, which would make every `pixelANormalizado` call collapse to `[0,0]`) — restored via `vi.restoreAllMocks()` in `afterEach`. |
| `src/components/masterplan/MasterplanEditorPanel.tsx` | Swapped the static `import { MasterplanEditor } from "@/components/masterplan/MasterplanEditor"` for a `next/dynamic` (`ssr: false`) wrapper, so `react-zoom-pan-pinch` and the editor's extra code only download once a masterplan exists and the editor branch actually renders (`{url && <MasterplanEditor .../>}`) — this is where ADR-5's "`react-zoom-pan-pinch` is dynamic-imported" is honored, one level above the component itself. |
| `package.json` / `package-lock.json` | Added `react-zoom-pan-pinch@^4.0.3` (only new runtime dependency for this change, per design; peer deps are `react: '*'`, compatible with React 19). |

### Scope decisions and deviations (documented)

1. **Static import inside `MasterplanEditor.tsx`, dynamic import one level up.** ADR-5 says `react-zoom-pan-pinch` "is `dynamic`-imported." I implemented the `next/dynamic` boundary around `MasterplanEditor` itself (in `MasterplanEditorPanel.tsx`) rather than around `TransformWrapper`/`TransformComponent` inside the editor file. Reasoning: (a) it achieves the identical bundle-splitting outcome — the library's code is only fetched when the editor branch renders; (b) it keeps `MasterplanEditor.test.tsx` synchronous and simple (no `findBy*`/`waitFor` needed for a dynamically-resolved child), since the unit test imports the named export directly, bypassing the dynamic wrapper entirely. Splitting at the panel boundary is a normal, equally-valid application of `bundle-dynamic-imports` (lazy-load a component "not needed on initial render") and avoids test flakiness risk from an unnecessary inner dynamic boundary.
2. **Drag uses `mousedown`/`mousemove`/`mouseup`, not Pointer Events.** The repo has no existing Pointer Event usage, and — verified directly — this jsdom version (bundled with the current vitest/testing-library versions) does not implement `window.PointerEvent` or `Element.prototype.setPointerCapture` at all (`'setPointerCapture' in el` → `false`, `'PointerEvent' in window` → `false`). `@testing-library/dom`'s `fireEvent.pointerDown/Move/Up` falls back silently to a bare `Event` when `PointerEvent` is absent, which does **not** carry `clientX`/`clientY` — making pointer-event-based drag untestable in this environment without a polyfill. `MouseEvent` **is** natively supported by jsdom with correct `clientX`/`clientY` handling (verified). Mouse events lack multi-touch/pointer-capture robustness on touch devices, which is an accepted gap for this admin-only, mouse-first editing tool; if touch support for dragging vertices becomes a requirement, revisit with a `PointerEvent` polyfill in `vitest.setup.ts` at that time.
3. **Delete is a double-click on the vertex handle**, not a separate always-visible button. Task 4.2 says "UI disables delete at 3 vertices" — enforced structurally (the handler no-ops, `eliminarVertice` also no-ops) rather than via a disabled HTML attribute, since the affordance is an SVG circle, not a `<button>`. Documented here in case a future design pass wants an explicit per-vertex delete button/tooltip instead.
4. **"Limpiar" (clear) now also pushes an undo snapshot** before resetting `dibujo` to `[]`, so it participates in the undo stack like add/drag/delete — a small free consistency improvement not explicitly requested by the tasks, kept because leaving it out of the undo stack would silently strand the user's prior points after an accidental click.
5. **Voseo cleanup scope**: normalized only the two in-scope strings this file actually renders (`"— Elegí un lote —"` and the "Hacé click..." helper line) — grepped the repo for both exact strings post-change; zero remaining occurrences.

### Tests written and results

```
npx vitest run src/lib/masterplan/geometry.test.ts
```
- RED (before `moverVertice`/`eliminarVertice` existed): 7 failed / 10 passed.
- GREEN (after implementation): 17 passed.

```
npx vitest run src/components/masterplan/MasterplanEditor.test.tsx
```
- GREEN (implementation and tests were written together in this session — not a strict separate RED capture for the component-level tests, unlike the geometry ops which had a clean RED→GREEN cycle): 5 passed (2 pre-existing + 3 new).

Full targeted regression (masterplan area only, per Strict TDD "targeted files" instruction — no full-suite run):
```
npx vitest run src/lib/masterplan/geometry.test.ts src/lib/masterplan/rasterize.test.ts src/components/masterplan/MasterplanEditor.test.tsx src/components/masterplan/MasterplanViewer.test.tsx src/__tests__/unit/masterplan-actions.test.ts
```
- Result: 5 files passed, 38 tests passed, 0 failed.

```
npx tsc --noEmit
```
- Result: exit code 0, no errors (full project, incl. the new `react-zoom-pan-pinch` types).

### Changed-line estimate vs budget

Forecast for PR2: ~400 changed lines (excluding tests). Actual, isolated to this session's PR2 work (PR1 already covered `MasterplanEditorPanel.tsx`'s other changes separately):

- `src/components/masterplan/MasterplanEditor.tsx`: 116 → 253 lines (this file was untouched by PR1, so this is a clean +137-line PR2 diff).
- `src/lib/masterplan/geometry.ts`: +20 lines.
- `src/components/masterplan/MasterplanEditorPanel.tsx`: this session's edit only (dynamic-import swap): net ≈ +5 lines (on top of PR1's already-counted diff to the same file).
- `package.json`: +1 line; `package-lock.json`: +15 lines (generated, typically excluded from the review budget).

Total non-test ≈ **163–178 lines** — well under the ~400-line forecast and the 400-line budget. Test-only additions (`geometry.test.ts` +59, `MasterplanEditor.test.tsx` +66 ≈ 125 lines) excluded from the budget per the PR1-established convention.

### Suggested commit boundaries (work-unit-commits skill)

Two reviewable work units for this PR (both still part of the single PR2 slice/branch):

```
feat(masterplan): add moverVertice/eliminarVertice pure geometry ops

- moverVertice(poly, index, punto): replace one vertex, clamp to [0,1], immutable
- eliminarVertice(poly, index): remove one vertex, no-op guard at <=3 vertices
- lock pixelANormalizado's zoom-invariance with a scaled-rect unit test
```

```
feat(masterplan): editor zoom/pan, vertex drag/delete/undo, Navegar/Dibujar mode

- wrap MasterplanEditor's canvas in react-zoom-pan-pinch's TransformWrapper
- add Navegar/Dibujar mode toggle (disables panning + gates add-vertex in Dibujar)
- drag a vertex handle to move it, double-click to delete (blocked at 3), Deshacer to undo
- dynamic-import MasterplanEditor from MasterplanEditorPanel so the new
  react-zoom-pan-pinch dependency only loads once a masterplan exists
- normalize remaining voseo copy in MasterplanEditor.tsx to formal Peruvian Spanish
```

Rollback: revert one or both commits; PR1's uploader path and the frozen legacy write paths are untouched by either, so rollback has zero blast radius outside this slice. If only commit 2 needs reverting, commit 1's pure geometry helpers are harmless dead code until then (not yet imported by anything else).

### What PR3 needs to know

- `MasterplanEditor.tsx`'s only type import from `LoteMarcado` (`./MasterplanViewer`) is unchanged in shape — PR3's task 6.2 will swap this to `PlanoLoteDTO`; the `lotes` prop and its `.poly`/`.estado`/`.codigo`/`.id` usages in this file are the only touch points to update, plus `guardarPoligonoLote`/`eliminarPoligonoLote` call signatures (unaffected by the DTO swap — they only take `loteId`/`poly`).
- The new `dibujo` vertex-editing UI (drag/delete/undo) operates entirely on the local, unsaved `Poligono` draft and does not touch `LoteMarcado`/DTO shapes at all — PR3's price-free DTO refactor should have zero interaction with this logic.
- `react-zoom-pan-pinch` is now a project dependency (`^4.0.3`); its usage is isolated to `MasterplanEditor.tsx` per ADR-5's isolation guidance — no other file imports it.
- `MasterplanEditorPanel.tsx` now imports `MasterplanEditor` via `next/dynamic`; if PR3 needs to change `MasterplanEditor`'s export shape (e.g., default vs. named export), update the `.then((m) => m.MasterplanEditor)` accessor accordingly.
