# Design — Interactive masterplan as a live sales tool (`plano-interactivo`)

Technical design for the full pipeline **upload plano → draw/edit polygons → presentation mode**, consolidated on the existing masterplan stack (`crm.proyecto.masterplan`, `crm.lote.data.masterplan_poly`, SVG `MasterplanViewer`/`MasterplanEditor`, `src/lib/masterplan/geometry.ts`). Every decision below is verified against the current codebase and is designed so the deferred Phase 2 public route (`/p/[token]`) can reuse the presentation component and its DTO with zero rewrite. This document does not enumerate task steps — that is the tasks phase.

## Quick path (the decisions in one screen)

1. **One upload path, one field.** New uploads write only to `crm.proyecto.masterplan` `{ url, path, width, height }` via the already-working `MasterplanEditorPanel` flow. The three legacy write paths are **frozen** (no new writes) and their dead files are deleted in a bounded cleanup slice.
2. **PDF → PNG runs client-side**, reusing the existing `convertPdfToPng` pattern from `BlueprintUploader.tsx` (`pdfjs-dist` is already a dependency). First page only, dimension-capped. No server-side native `canvas` dependency is added.
3. **Normalized `[0,1]` coordinates are intrinsic-dimension-invariant** because the SVG uses `viewBox="0 0 1 1"` + `preserveAspectRatio="none"`. Stored `width`/`height` are used **only** for an aspect-ratio re-upload guard, not for rendering.
4. **The presentation component consumes a price-free `PlanoPresentacionDTO`** assembled server-side. The DTO type structurally has no `precio`/`moneda`/client field. A unit test asserts the built DTO carries none of them. The dashboard route and the future public route call the same server builder.
5. **Editor gains zoom+pan via `react-zoom-pan-pinch`** (the only new runtime dep, ~7KB) with an explicit **Navegar / Dibujar** mode toggle. Click→normalized mapping stays correct under zoom because it reads the rendered `getBoundingClientRect()`, which already includes the transform.
6. **The `guardarPoligonoLote` collision is resolved by renaming the legacy export** (`crm.lote.plano_poligono` writer). The editor already imports the correct masterplan writer — verified.

---

## Architecture, Upload, Coordinate System, DTO, Editor, Legacy Cleanup, Composition, and ADRs

[Full design content from source file — technical decisions on upload flow, coordinate math, price-free DTO guarantees, editor zoom/pan state machine, legacy path freezing, name collision resolution, dead code deletion strategy, presentation composition, and 6 ADRs — see source design.md for complete text]

---

## Test strategy (Strict TDD active)

All new features: test-first (RED → GREEN) via vitest for core logic, vitest + testing-library/react for components. Pure helpers (`toPlanoLoteDTO`, `scaleForMaxDimension`, `aspectRatioChanged`, `moverVertice`, `eliminarVertice`) are unit-tested with immutability and edge-case assertions. Components (`MasterplanEditor`, `MasterplanViewer`, `PlanoPresentacion`, `MasterplanEditorPanel` uploader wiring) are integration-tested with render output + user interaction assertions.
