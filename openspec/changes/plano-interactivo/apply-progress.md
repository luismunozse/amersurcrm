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

---

## Slice implemented: PR3 — Price-free DTO + server builder + viewer refactor

Status: **done**. Phases 5-6 (all PR3 tasks in `tasks.md`) checked off.

### Files touched

| File | Change |
|------|--------|
| `src/lib/masterplan/dto.ts` | **New.** `PlanoLoteDTO` (`id, codigo, estado, area, manzana, etapa, poly` — matches design.md's ADR-4 shape exactly), `PlanoPresentacionDTO` (`imageUrl, width, height, lotes`), `LoteRowParaDTO` (loose raw-row input type, no index signature — kept narrow on purpose, see gotcha below), and `toPlanoLoteDTO(row)`: an explicit-pick object literal (never spreads `row`) that maps `sup_m2→area`, `data.manzana→manzana`, `data.etapa→etapa`, `data.masterplan_poly→poly` (validated via a private `esPoligonoValido` guard, falls back to `null` on any malformed shape). No `precio`/`moneda`/`descuento`/`precio_m2`/`condiciones` field is read or producible. |
| `src/lib/masterplan/dto.test.ts` | **New.** 4 tests: exact key list (`Object.keys(dto)` order-sensitive) even when the row carries price fields (`JSON.stringify` never contains the price value either); field mapping; all-defaults-to-null when `sup_m2`/`data` absent; invalid `masterplan_poly` shape falls back to `null`. RED confirmed (`./dto` unresolved) before implementation. |
| `src/lib/masterplan/presentacion.server.ts` | **New.** `buildPlanoPresentacion(proyectoId)`: `import "server-only"`; uses `createServerOnlyClient()` (session-scoped, schema `crm` — same client factory `page.tsx` already uses for proyecto/lote reads, per the "service-role vs session client" project convention). Reads `proyecto.masterplan`, returns `null` if the proyecto row or `masterplan.url` is absent; reads `lote` rows (`id,codigo,estado,sup_m2,data`) filtered by `proyecto_id`, maps each through `toPlanoLoteDTO`. Throws on a Postgrest error from either query (caller/route decides on error handling — no swallowing). |
| `src/lib/masterplan/presentacion.server.test.ts` | **New.** 4 tests using the same hand-rolled thenable-chain mock pattern as `masterplan-actions.test.ts` (`vi.mock("@/lib/supabase.server", ...)` since this file calls `createServerOnlyClient`, not `createServerActionClient`): null on missing masterplan.url, null on missing proyecto row, throws on proyecto query error, and a full mapping test whose raw `lote` row carries `precio: 99999`/`moneda: "USD"` — asserts the returned DTO's `JSON.stringify` never contains `"99999"`, `"precio"`, or `"moneda"` (the leak-proof structural test design.md calls for, executed against the actual server builder rather than only the pure mapper). RED confirmed (`./presentacion.server` unresolved) before implementation. |
| `src/components/masterplan/MasterplanViewer.tsx` | Replaced the local `LoteMarcado` interface + `formatPrecio` helper with `PlanoLoteDTO` (imported from `@/lib/masterplan/dto`). The SVG `<title>` tooltip now renders `${codigo} — ${estado}` instead of `${codigo} — ${formatPrecio(precio, moneda)}` — price is no longer read, computed, or renderable (the prop type has no price field, so this is a compile-time guarantee, not just a UI change). |
| `src/components/masterplan/MasterplanViewer.test.tsx` | Fixture rewritten to `PlanoLoteDTO[]` shape (`area`/`manzana`/`etapa` instead of `precio`/`moneda`). Added a 3rd test: renders the viewer and asserts `container.innerHTML` (case-insensitive) never contains `"precio"`/`"moneda"`, and never contains the numeric `area` value (`"120"`) either — locks in task 6.3's "no price text/attribute in rendered output" requirement globally, not just for the tooltip. RED confirmed pre-refactor (old `formatPrecio(null, null)` produced literal text `"Sin precio"`, which itself contains the substring `"precio"` — a nice accidental proof the leak was real). |
| `src/components/masterplan/MasterplanEditor.tsx` | Type-only change: `import type { LoteMarcado } from "./MasterplanViewer"` → `import type { PlanoLoteDTO } from "@/lib/masterplan/dto"`; `lotes: LoteMarcado[]` → `lotes: PlanoLoteDTO[]`. No runtime logic touched (confirmed by reading — the file only reads `.id`/`.codigo`/`.estado`/`.poly` off each lote, all of which exist unchanged on `PlanoLoteDTO`). |
| `src/components/masterplan/MasterplanEditor.test.tsx` | Fixture updated to `PlanoLoteDTO` shape (added `area`/`manzana`/`etapa` with `as const` on `estado` so the literal narrows to the union type instead of widening to `string`) — this was a compile-fix, not a behavior test change; all 5 existing assertions (list rendering, borrar-poly action, drag/delete/undo) still pass unmodified. |
| `src/components/masterplan/MasterplanEditorPanel.tsx` | Type-only change: same `LoteMarcado` → `PlanoLoteDTO` swap for the `lotes` prop type and its import. |
| `src/app/dashboard/proyectos/[id]/_LotesList.tsx` | `lotesMarcados` construction replaced: the previous 11-line inline object-literal map (which explicitly copied `precio`/`moneda` and reached into `l.data as any` for `masterplan_poly`) is now `lotesAMostrar.map(toPlanoLoteDTO)` — a single call into the same shared, tested mapper `presentacion.server.ts` uses, so the admin editor path and the (future PR4) presentation path are guaranteed to derive the DTO identically. Import swapped from `type { LoteMarcado } from "@/components/masterplan/MasterplanViewer"` to `{ toPlanoLoteDTO, type PlanoLoteDTO } from "@/lib/masterplan/dto"`. **Admin price columns elsewhere in this file are untouched** — they read `precio`/`moneda` directly off `lotesAMostrar`/`lotesState` (the full `Lote` type, unaffected by this change), not off `lotesMarcados`. |

No other files changed. `_actions.ts` (`guardarMasterplanProyecto`, `guardarPoligonoLote`, `eliminarPoligonoLote`), `geometry.ts`, `rasterize.client.ts`, and the legacy `planos_url`/`overlay_layers` write paths were not touched — verified by reading, not modifying.

### Scope decisions and deviations (documented)

1. **`toPlanoLoteDTO` is reused directly in `_LotesList.tsx`**, not re-implemented. Task 6.2 only asked to "drop `precio`/`moneda`"; reusing the exact pure mapper that `presentacion.server.ts` also calls was a deliberate choice beyond the letter of the task, because it makes the admin editor's DTO and the future presentation DTO provably identical (same function, same tests) rather than two hand-maintained mappings that could drift. This directly serves ADR-4's "global guarantee" intent.
2. **`LoteRowParaDTO` has no index signature.** An initial draft included `[extra: string]: unknown` to make the "tolerates extra raw columns" intent explicit in the type itself, but TypeScript's index-signature assignability rule would then have required the local `Lote` type in `_LotesList.tsx` (and any other caller) to also declare a matching index signature to be assignable — which would have forced an unrelated, unnecessary type change on that file's existing `Lote` type. Dropped the index signature; the "tolerates extra fields" guarantee is enforced by `toPlanoLoteDTO`'s explicit-pick implementation and the dto test suite, not by the input type's shape. Documented here as the one non-obvious TS gotcha from this slice.
3. **`buildPlanoPresentacion` throws on a Postgrest error** rather than swallowing it into a `{ok:false}`-style result, matching `page.tsx`'s existing pattern of `if (error) throw error;` for read paths (as opposed to the mutation actions in `_actions.ts`, which return `{ok:false,error}`). Since this is a read-only server function called from a server component (not a form action), letting the error propagate to Next's error boundary is the existing convention for this kind of read, not a new one.
4. **Client choice: session-scoped `createServerOnlyClient()`, not service-role.** Per the gotcha in the task brief ("service-role vs session client choice must follow how existing proyecto/lote server code does it"), `page.tsx`'s proyecto/lote reads use `createServerOnlyClient()` (schema `crm`, cookie-based session, RLS-enforced). `buildPlanoPresentacion` follows that exact precedent. **Flagged for PR4/Phase-2 attention**: the deferred public `/p/[token]` route (out of scope here) is unauthenticated by definition, so it cannot reuse a cookie-session client as-is — whoever builds that route will need either an RLS policy that allows anonymous reads scoped by a valid token-resolved `proyectoId`, or a service-role variant of this same builder. Not a PR3 concern (no public route exists yet), but noted so it isn't rediscovered from scratch later.

### Tests written and results

```
npx vitest run src/lib/masterplan/dto.test.ts
```
- RED (before `dto.ts` existed): 1 failed suite — `Failed to resolve import "./dto"`.
- GREEN (after implementation): 1 file passed, 4 tests passed.

```
npx vitest run src/lib/masterplan/presentacion.server.test.ts
```
- RED (before `presentacion.server.ts` existed): 1 failed suite — `Failed to resolve import "./presentacion.server"`.
- GREEN (after implementation): 1 file passed, 4 tests passed.

```
npx vitest run src/components/masterplan/MasterplanViewer.test.tsx
```
- RED (before the viewer refactor, new price-free assertion only): 1 failed test — tooltip rendered literal text `"Sin precio"`, which contains the substring `"precio"`, failing the `not.toContain("precio")` assertion. The two pre-existing tests already passed.
- GREEN (after refactor): 1 file passed, 3 tests passed.

Full targeted regression for this slice (per Strict TDD "targeted files" instruction — no full-suite run):
```
npx vitest run src/lib/masterplan/dto.test.ts src/lib/masterplan/presentacion.server.test.ts src/components/masterplan/MasterplanViewer.test.tsx src/components/masterplan/MasterplanEditor.test.tsx src/lib/masterplan/geometry.test.ts src/lib/masterplan/rasterize.test.ts src/__tests__/unit/masterplan-actions.test.ts
```
- Result: 7 files passed, 47 tests passed, 0 failed.

```
npx tsc --noEmit
```
- Result: exit code 0, no errors (full project). One pre-existing-pattern fix needed along the way: `MasterplanEditor.test.tsx`'s lote fixture had to gain `area`/`manzana`/`etapa` (now required, non-optional fields on `PlanoLoteDTO`) and an `as const` on `estado` — this was necessary for the fixture to satisfy the new prop type, not a behavior change; all its assertions still pass.

### Changed-line estimate vs budget

Forecast for PR3: ~300 changed lines (excluding tests). Actual, non-test files only:

- `src/lib/masterplan/dto.ts`: 79 lines (new).
- `src/lib/masterplan/presentacion.server.ts`: 48 lines (new).
- `src/components/masterplan/MasterplanViewer.tsx`: 39 → 25 lines net (refactor removes `formatPrecio` + the wider `LoteMarcado` interface).
- `src/components/masterplan/MasterplanEditor.tsx`: 2-line import/type swap only.
- `src/components/masterplan/MasterplanEditorPanel.tsx`: 2-line import/type swap only.
- `src/app/dashboard/proyectos/[id]/_LotesList.tsx`: net −8 lines (import line change + 11-line inline map collapsed to 1 line + comment).

Total non-test ≈ **~135 lines** — well under the ~300-line forecast and the 400-line budget. Test-only additions (`dto.test.ts` 75 lines, `presentacion.server.test.ts` 96 lines, `MasterplanViewer.test.tsx` net +9 lines, `MasterplanEditor.test.tsx` fixture-only diff) excluded from the budget per the PR1/PR2-established convention.

### Suggested commit boundaries (work-unit-commits skill)

Two reviewable work units for this PR (both still part of the single PR3 slice/branch, stacked after PR2 merges):

```
feat(masterplan): add price-free PlanoPresentacionDTO + server builder

- dto.ts: PlanoLoteDTO/PlanoPresentacionDTO types + explicit-pick
  toPlanoLoteDTO(row) mapper — never spreads the raw row, so precio/
  moneda/descuento/precio_m2/condiciones cannot reach the DTO
- presentacion.server.ts: buildPlanoPresentacion(proyectoId), server-only,
  reads proyecto.masterplan + lote rows, null when no masterplan uploaded
- structural + integration tests lock the no-price guarantee at both the
  pure-mapper and the server-builder level
```

```
refactor(masterplan): make MasterplanViewer and its callers price-agnostic

- MasterplanViewer: LoteMarcado -> PlanoLoteDTO, tooltip drops formatPrecio,
  shows codigo + estado only
- MasterplanEditor/MasterplanEditorPanel: type import swapped to PlanoLoteDTO
  (no runtime change — same fields already used)
- _LotesList.tsx: lotesMarcados now built via the shared toPlanoLoteDTO
  mapper instead of a hand-rolled inline object literal; admin price
  columns elsewhere in the list are untouched (they read lotesAMostrar
  directly)
- MasterplanViewer.test.tsx: new assertion that no price text/attribute
  ever appears in the rendered output
```

Rollback: revert one or both commits; PR1's uploader and PR2's editor zoom/pan/vertex-op logic are untouched by either (verified — `MasterplanEditor.tsx`'s only PR3 edit is the type import line), so rollback has zero blast radius outside this slice. If only commit 2 needs reverting, commit 1's DTO/builder are harmless additions unused by anything else yet (PR4 is their first real consumer).

### What PR4 needs to know

- **DTO shape (exact, stable)**: `PlanoPresentacionDTO = { imageUrl: string; width: number; height: number; lotes: PlanoLoteDTO[] }`, `PlanoLoteDTO = { id: string; codigo: string; estado: "disponible"|"reservado"|"vendido"; area: number|null; manzana: string|null; etapa: string|null; poly: Poligono|null }`. Both exported from `src/lib/masterplan/dto.ts`.
- **Builder entry point**: `buildPlanoPresentacion(proyectoId: string): Promise<PlanoPresentacionDTO | null>` in `src/lib/masterplan/presentacion.server.ts`. Call it from a server component (it's `import "server-only"`-guarded and uses the session-scoped `createServerOnlyClient()`, so it must run in an authenticated request context — the proyecto detail screen, where PR4 wires the "Modo presentación" entry point, already has that context). Returns `null` when no masterplan is uploaded yet — task 7.1/7.2 already anticipate this as `PlanoPresentacion`'s empty-state trigger.
- `PlanoPresentacion.tsx` (PR4) should type its props as `PlanoPresentacionDTO | null` directly — no new DTO needed, no additional mapping. It can compose the already-refactored `MasterplanViewer` (`PlanoLoteDTO[]` prop, price-agnostic) as its base rendering layer per design.md section 7.
- The public `/p/[token]` route (deferred, out of this change entirely) will need a service-role or RLS-anonymous variant of `buildPlanoPresentacion`'s Supabase client — see deviation #4 above. Not a PR4 blocker (PR4 is the dashboard-only presentation mode), but worth remembering before that later change starts.

---

## Slice implemented: PR4 — Presentation mode

Status: **done**. Phase 7 (all PR4 tasks in `tasks.md`) checked off.

### Files touched

| File | Change |
|------|--------|
| `src/components/masterplan/PlanoPresentacion.tsx` | **New.** Fullscreen (`fixed inset-0 z-50`, portal-free — rendered directly, consistent with the page-level modal pattern already used for `ConfirmDialog`/`LoteDetailModal`) presentation view. Props: `{ dto: PlanoPresentacionDTO | null; onClose?: () => void }` — structurally price-free (no `precio`/`moneda` reachable, no DB/session import anywhere in the file). Composes the already-refactored `MasterplanViewer` inside `react-zoom-pan-pinch`'s `TransformWrapper`/`TransformComponent` (pinch-zoom/pan for mobile, statically imported here — dynamic-imported one level up, mirroring PR2's `MasterplanEditor` boundary placement). Always-visible estado legend (disponible/reservado/vendido, colors from `estadoColor` in `geometry.ts` — single source of truth, no duplicated palette). Tap on a lote polygon opens a bottom-sheet-on-mobile/centered-on-desktop detail panel showing área + manzana + etapa only (never price). Empty state (formal Spanish copy) when `dto` is `null`, with a "Cerrar modo presentación" CTA. Dark-aware via existing `crm-*` CSS variables; buttons use `active:scale` + `ease-out-strong` per the design-polish convention; safe-area insets (`env(safe-area-inset-top/bottom)`) on the header and both sheets for notched/gesture-bar phones. |
| `src/components/masterplan/PlanoPresentacion.test.tsx` | **New.** 5 tests: DTO structural no-price contract (`Object.keys` on each fixture lote); legend renders all 3 estado labels with no monetary text anywhere in `innerHTML`; tapping a lote polygon opens the detail panel with área/manzana/etapa and no price text; closing the detail panel removes it; `dto={null}` renders the formal-Spanish empty state and never attempts to render a lote polygon. RED confirmed (`./PlanoPresentacion` unresolved) before implementation. |
| `src/app/dashboard/proyectos/[id]/page.tsx` | Added `buildPlanoPresentacion(id)` call. Started early as an unawaited promise right after `id` is known (parallel with the proyecto/lotes queries already in this file, per `async-parallel`/`async-defer-await`), with a no-op `.catch(() => {})` attached to the same promise handle purely to avoid a Node "unhandled rejection" warning if an earlier guard (`notFound()`, `throw eProyecto`) returns before the real `await` is reached — the real `await presentacionDtoPromise` later still throws normally on error, preserving `presentacion.server.ts`'s existing "throw, don't swallow" convention. Awaited once, right before use, and passed as a new `presentacionDto` prop to `<LotesList>`. |
| `src/app/dashboard/proyectos/[id]/_LotesList.tsx` | Added `presentacionDto?: PlanoPresentacionDTO | null` prop; `next/dynamic(ssr:false)`-imports `PlanoPresentacion` (same lazy-load pattern as `MasterplanEditor` in `MasterplanEditorPanel.tsx` — `react-zoom-pan-pinch` only downloads when the vendedor actually opens the view); added a `modoPresentacion` boolean state; restructured the Masterplan `CardHeader` from a single full-width toggle `<button>` into a flex row containing the existing collapse-toggle button (unchanged behavior) plus a new sibling "Modo presentación" button (icon-only on narrow screens, icon+label from `sm:` up) — avoided nesting a second `<button>` inside the existing one, which would have been invalid HTML. Renders `<PlanoPresentacion dto={presentacionDto ?? null} onClose={...} />` at the bottom of the component tree (next to the other modals: `LoteEditModal`, `LoteDetailModal`, etc.) when `modoPresentacion` is true. The button is unconditionally visible (not gated behind `masterplan?.url` or any permission check) — clicking it with no masterplan uploaded yet simply shows `PlanoPresentacion`'s own empty state, which is the intended UX per design.md section 7 ("Empty state ... with formal-Spanish copy") rather than hiding the entry point entirely. |

No other files changed. `MasterplanViewer.tsx`, `MasterplanEditor.tsx`, `dto.ts`, `presentacion.server.ts`, and the legacy write paths were not touched in this slice (verified by reading, not modifying) — PR4 only *consumes* PR3's DTO/builder and PR2's editor patterns (dynamic-import boundary, `TransformWrapper` usage).

### Scope decisions and deviations (documented)

1. **`buildPlanoPresentacion` is called unconditionally on every proyecto-detail page load**, not lazily on-demand via a server action when the vendedor clicks "Modo presentación". This duplicates two lightweight reads (`proyecto.masterplan`, unfiltered `lote` rows) against queries the page already runs elsewhere (paginated/filtered). This is a deliberate tradeoff, not an oversight: task 7.3 explicitly says the proyecto detail screen "server-calls `buildPlanoPresentacion`" as part of the entry-point wiring (i.e., eagerly, at page-render time), and the sales-floor use case (a vendedor standing in front of a client, tapping "Modo presentación") wants zero added latency at the moment of the tap — an on-demand server action would add a network round-trip exactly when instant feedback matters most. The extra queries are cheap (two indexed reads, no joins) and are started in parallel with the page's existing queries, not appended to a serial waterfall.
2. **Fullscreen implemented as a `fixed inset-0 z-50` full-viewport `<div>`, not the browser Fullscreen API** (`element.requestFullscreen()`). The only precedent in this codebase (`_PlanosViewer.tsx`) uses the native Fullscreen API, but that file is dead code slated for deletion in PR5 and was not reused. The native API is unreliable on iOS Safari (no `requestFullscreen` support on non-video elements in most iOS versions), which matters directly here since design.md notes "Phase 2 opens on phones via WhatsApp" — overwhelmingly iOS Safari in this market. A `position: fixed` overlay (the same pattern already used by `ConfirmDialog.tsx` and `LoteDetailModal.tsx`) works identically across all mobile browsers and needed no new browser-API surface.
3. **No `createPortal` for `PlanoPresentacion`'s root**, unlike `ConfirmDialog`/`LoteDetailModal`. Since `PlanoPresentacion` is already the outermost, single, most-nested-inside-nothing-else element rendered by `_LotesList` (not stacked under another dialog/modal), a portal to `document.body` was not structurally necessary for z-index/overflow-clipping correctness the way it is for `ConfirmDialog` (which can be triggered from inside scrollable table rows). Kept simple; if a future consumer renders `PlanoPresentacion` from inside a scrollable/overflow-clipped ancestor, adding a `createPortal(..., document.body)` wrapper at the call site (not inside the component) is the safe fix — the component's DTO-only props contract is unaffected either way.
4. **"Modo presentación" button has no permission gate**, unlike "Editar masterplan" (`puedeEditarMasterplan`-gated). This matches the spec's framing of presentation mode as a vendedor-facing view (anyone who can reach the proyecto detail screen should be able to show the plano to a client) — no ADR or task in this change calls for restricting it, so no gate was added rather than inventing one.

### Tests written and results

```
npx vitest run src/components/masterplan/PlanoPresentacion.test.tsx
```
- RED (before `PlanoPresentacion.tsx` existed): 1 failed suite — `Failed to resolve import "./PlanoPresentacion"`.
- GREEN (after implementation): 1 file passed, 5 tests passed.

Full targeted regression for the masterplan area (per Strict TDD "targeted files" instruction — no full-suite run):
```
npx vitest run src/components/masterplan/PlanoPresentacion.test.tsx src/lib/masterplan/dto.test.ts src/lib/masterplan/presentacion.server.test.ts src/components/masterplan/MasterplanViewer.test.tsx src/components/masterplan/MasterplanEditor.test.tsx src/lib/masterplan/geometry.test.ts src/lib/masterplan/rasterize.test.ts src/__tests__/unit/masterplan-actions.test.ts
```
- Result: 8 files passed, 52 tests passed, 0 failed.

```
npx tsc --noEmit
```
- Result: exit code 0, no errors (full project).

```
npx eslint src/components/masterplan/PlanoPresentacion.tsx src/app/dashboard/proyectos/[id]/_LotesList.tsx src/app/dashboard/proyectos/[id]/page.tsx
```
- Result: no errors, no warnings.

### Changed-line estimate vs budget

Forecast for PR4: ~350 changed lines (excluding tests). Actual, non-test files only:

- `src/components/masterplan/PlanoPresentacion.tsx`: 166 lines (new).
- `src/app/dashboard/proyectos/[id]/page.tsx`: +11 lines (net; a new import, an early-started+guarded promise, one `await`, one prop pass-through).
- `src/app/dashboard/proyectos/[id]/_LotesList.tsx`: +56/-21 lines (net +35; new import + dynamic import, one new prop, one new state var, CardHeader restructure to add the sibling button, one new conditional render block at the bottom).

Total non-test ≈ **212 changed lines** — well under the ~350-line forecast and the 400-line budget. `PlanoPresentacion.test.tsx` (85 lines) excluded from the budget per the PR1/PR2/PR3-established convention.

### Suggested commit boundaries (work-unit-commits skill)

Two reviewable work units for this PR (both still part of the single PR4 slice/branch, stacked after PR3 merges):

```
feat(masterplan): add PlanoPresentacion fullscreen price-free component

- PlanoPresentacion.tsx: fullscreen, mobile-first (pinch-zoom/pan via
  react-zoom-pan-pinch), dark-aware presentation view; composes the
  already price-agnostic MasterplanViewer
- always-visible estado legend (disponible/reservado/vendido); tap a lote
  to open a bottom-sheet detail panel with área + manzana/etapa only,
  never price
- formal-Spanish empty state with a close CTA when no masterplan exists
- props typed { dto: PlanoPresentacionDTO | null; onClose?: () => void }
  only — no DB/session import anywhere in the component tree, so it is
  reusable verbatim by the deferred public /p/[token] route
- structural + rendered-output tests lock the no-price guarantee at this
  layer too (mirrors dto.test.ts's key-list assertion)
```

```
feat(masterplan): wire "Modo presentación" entry point on proyecto detail

- page.tsx: server-calls buildPlanoPresentacion(id) in parallel with the
  existing proyecto/lotes queries, passes the DTO down as a new prop
- _LotesList.tsx: next/dynamic(ssr:false)-imports PlanoPresentacion so
  react-zoom-pan-pinch only loads when opened; adds a "Modo presentación"
  button in the Masterplan card header (sibling to the existing
  collapse-toggle button, not nested); renders the fullscreen view on
  demand
```

Rollback: revert one or both commits; PR1-PR3's uploader/editor/DTO work is untouched by either (verified — no edits to `dto.ts`, `presentacion.server.ts`, `MasterplanViewer.tsx`, or `MasterplanEditor.tsx` in this slice), so rollback has zero blast radius outside this slice. If only commit 2 needs reverting, commit 1's `PlanoPresentacion.tsx` is a harmless, unused-but-correct component until then (no other file imports it).

### What PR5 needs to know

- PR4 does **not** touch any of the 5 confirmed-orphaned dead files (`_MapeoLotesMejorado.tsx`, `_MapeoLotesVisualizacion.tsx`, `_PlanosViewer.tsx`, `_PlanosUploader.tsx`, `OverlayLayersPanel.tsx`) or the live `_MapeoLotes.tsx` — PR5's dead-code deletion scope is unaffected by anything added here.
- PR4 does not import or reference the legacy `guardarPoligonoLote` (`[id]/_actions.ts:363`, `lote.plano_poligono`) — PR5's rename/freeze of that export has zero interaction with PR4's files.
- The new "Modo presentación" button lives in `_LotesList.tsx`'s `CardHeader`, which PR5 does not need to touch — no conflict expected when PR5 branches after PR4 merges.
- `PlanoPresentacion.tsx` is the component the deferred Phase 2 public route (`/p/[token]`, out of this entire change) is designed to reuse verbatim, per design.md section 7 — when that future work starts, it should import `PlanoPresentacion` directly and call `buildPlanoPresentacion` from its own server-side token-resolution logic (see PR3's note on needing a service-role/RLS-anonymous client variant for that unauthenticated context).
