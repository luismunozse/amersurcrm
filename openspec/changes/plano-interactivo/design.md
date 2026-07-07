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

## 1. Architecture overview

```
Admin/coordinador setup                         Vendedor / (Phase 2 público)
─────────────────────                           ────────────────────────────
MasterplanEditorPanel (client)                  PlanoPresentacion (client, DTO-only)
  ├─ rasterizeToPng() ── pdfjs-dist (client)         ▲
  ├─ uploadProyectoAsset() ── bucket "imagenes"      │ props: PlanoPresentacionDTO
  ├─ guardarMasterplanProyecto() ── proyecto.masterplan
  └─ MasterplanEditor (draw/edit)                buildPlanoPresentacion(proyectoId)  ← server, whitelist
        └─ guardarPoligonoLote() ── lote.data.masterplan_poly   reads proyecto.masterplan + lote rows
                                                    │
                            shared pure core: src/lib/masterplan/geometry.ts + dto.ts
```

- **Setup side** (admin/coordinador) stays behind `PERMISOS.PROYECTOS.EDITAR` / `esAdminOCoordinador`, exactly as today.
- **Presentation side** is a new client component fed by a server-built DTO. It never touches the DB and never receives price. This is the leak-proof seam (Section 4).
- **Shared pure core** (`geometry.ts`, new `dto.ts`) is framework-free and test-first, matching the existing `geometry.test.ts` pattern.

## 2. Upload + PDF rasterization

### Decision: rasterize on the client, cap first page, reuse the existing pattern

`MasterplanEditorPanel.onFile` already: validates the image, reads intrinsic `naturalWidth/naturalHeight`, uploads via `uploadProyectoAsset`, and persists via `guardarMasterplanProyecto({ url, path, width, height })`. We extend it to accept `application/pdf`:

| Concern | Decision |
|---------|----------|
| Where rasterization runs | **Client**. Extract `convertPdfToPng` from `BlueprintUploader.tsx` into a shared `src/lib/masterplan/rasterize.client.ts` (`rasterizeFirstPageToPng(file, { maxDimension }) → File`). |
| Why not server | Server-side `pdfjs-dist` needs a native `canvas` build (not installed). The browser already has `<canvas>`; the pattern is proven in `BlueprintUploader`. Keeps the server route-free and the bundle change to just `react-zoom-pan-pinch`. |
| Page scope | **First page only** (non-goal: multi-page). `pdf.getPage(1)`. |
| Dimension cap | Render `scale` chosen so `max(width,height) ≤ MAX_DIM` (target 4000px). Prevents 20MP PNGs from a large PDF. Pure helper `scaleForMaxDimension(viewportW, viewportH, maxDim)` — unit-tested. |
| Size cap | After raster, re-run `validateProyectoImage` (existing 5MB gate). If the PNG still exceeds 5MB, lower the render scale once and retry; if still over, surface a formal-Spanish error ("El plano es demasiado pesado. Reduzca la resolución del PDF."). |
| Storage | Reuse `uploadProyectoAsset(supabase, proyectoId, file, "masterplan")` → bucket `imagenes`, path `proyectos/{proyectoId}/masterplan-{ts}-{rand}.png`. Public bucket (`getPublicUrl`) — required for the Phase 2 tokenized route to serve the image without auth. No new bucket. |
| Dimensions captured | From the **rasterized PNG** (`naturalWidth/Height`), not the PDF, so the stored `width/height` match the served image. |

`validateProyectoImage`'s accepted MIME set is extended to include `application/pdf` at the panel boundary only (the underlying `uploadProyectoAsset` always receives a PNG/JPG/WEBP `File`).

## 3. Polygon coordinate integrity across re-uploads (open question 1)

### Decision: coordinates are render-invariant; add an aspect-ratio guard, not a migration

**Proof of invariance.** Both `MasterplanViewer` and `MasterplanEditor` render polygons in an SVG with `viewBox="0 0 1 1"` and `preserveAspectRatio="none"`, absolutely positioned over the `<img>`. A normalized point `(0.5, 0.5)` therefore always maps to the geometric center of the displayed image **regardless of the image's intrinsic pixel dimensions**. Re-uploading the *same* plano at a different resolution (e.g. a higher-DPI export, or PDF re-rasterized at a different scale) does **not** move any polygon: the stored `[0,1]` coords are independent of `width`/`height`. The stored `width`/`height` are not consumed by the render path at all today.

**Where it breaks.** Coordinates drift only if the replacement image has a **different aspect ratio or a different crop/framing** (a lote that was at 40% width is now at 55% because the new scan is cropped tighter). This is a *content* change, not a *dimension* change, and no stored number can detect a re-crop automatically.

**Guard (testable).** On re-upload, compare the new PNG's aspect ratio against the stored `masterplan.width/height`:

```
aspectRatioChanged(oldW, oldH, newW, newH, tolerance = 0.02) → boolean   // |newAR - oldAR| / oldAR
```

- Ratios match within tolerance → replace silently; existing polygons stay valid.
- Ratios differ beyond tolerance → show a formal-Spanish confirm: *"El nuevo plano tiene otra proporción. Los polígonos existentes podrían quedar desalineados. ¿Desea conservarlos o borrarlos para volver a marcarlos?"* Admin chooses **Conservar** (keep coords) or **Borrar y re-marcar** (the tasks phase decides whether "borrar" clears `masterplan_poly` per lote or just warns).

This keeps the honest guarantee: pure resolution changes are safe by construction; re-framing is flagged, never silently corrupted. No data migration is introduced (frozen legacy fields are not touched).

## 4. Leak-proof presentation DTO (open question 3) — the core security seam

### Decision: a server-built whitelist type with no price field, shared by both routes

Today `MasterplanViewer` receives `LoteMarcado` which **includes `precio`/`moneda` and renders price inside the `<title>` tooltip**. That is a real leak and it must not reach presentation mode or the future public route. The design removes price from the presentation path structurally.

**New pure DTO (`src/lib/masterplan/dto.ts`):**

```ts
export interface PlanoLoteDTO {
  id: string;
  codigo: string;
  estado: "disponible" | "reservado" | "vendido";
  area: number | null;     // from lote.sup_m2
  manzana: string | null;  // from lote.data.manzana
  etapa: string | null;    // from lote.data.etapa
  poly: Poligono | null;   // from lote.data.masterplan_poly
}

export interface PlanoPresentacionDTO {
  imageUrl: string;
  width: number;
  height: number;
  lotes: PlanoLoteDTO[];
}
```

There is **no `precio`, `moneda`, `cliente`, `vendedor`, `descuento`, `condiciones`, or `precio_m2` field** in these types. The presentation component's props are typed as `PlanoPresentacionDTO`, so price is not merely hidden — it is unrepresentable in the component's input.

**Server builder (`src/lib/masterplan/presentacion.server.ts`):**

```
buildPlanoPresentacion(proyectoId): Promise<PlanoPresentacionDTO | null>
```

- Reads `proyecto.masterplan` and the proyecto's `lote` rows (crm schema) server-side.
- Maps each lote to `PlanoLoteDTO` via a pure `toPlanoLoteDTO(lote)` mapper in `dto.ts` — the mapper explicitly picks the six safe fields and **never spreads** the raw row.
- Returns `null` when `masterplan.url` is absent (drives the empty state).

**Shared by both routes:**

- Dashboard presentation (this change): the proyecto detail screen resolves `proyectoId`, calls `buildPlanoPresentacion` in a server component, passes the DTO to `<PlanoPresentacion/>`.
- Phase 2 public route (deferred, design-only): `/p/[token]` resolves `token → proyectoId` server-side, calls the **same** `buildPlanoPresentacion`, passes the **same** DTO to the **same** component. No auth-only fields exist to strip because none are in the DTO.

**Structural test (TDD, non-negotiable):** a vitest test asserts `toPlanoLoteDTO(rowWithPrice)` output has no `precio`/`moneda`/`descuento`/`precio_m2`/`condiciones` keys (`expect(Object.keys(dto)).toEqual([...safe])`), and that a raw lote row carrying price does not leak through `buildPlanoPresentacion`. This is the executable form of the spec's "no price on screen" acceptance criterion.

### Consequence: make the viewer price-agnostic

`MasterplanViewer` is refactored to consume `PlanoLoteDTO[]` (drop `precio`/`moneda` from `LoteMarcado`; the tooltip shows `codigo` + `estado`, not price). The admin `_LotesList` and `MasterplanEditor` are updated to the price-free shape. Rationale: keeping two viewer variants invites the leak to reappear; a single price-free viewer used by both the internal admin view and presentation mode makes the guarantee global. Price display for admins, if still wanted, lives in the existing lote list rows — not on the plano overlay.

## 5. Editor: zoom/pan coexisting with drawing (open question 4)

### Decision: explicit mode toggle over `react-zoom-pan-pinch`; reuse the transform-invariant click mapping

`MasterplanEditor`'s image + SVG overlay are wrapped in `<TransformWrapper>` / `<TransformComponent>`. A two-state toggle governs gestures:

| Mode | Gesture behavior | Vertex clicks |
|------|------------------|---------------|
| **Navegar** (default) | Pan + wheel/pinch zoom enabled | Ignored (clicks pan) |
| **Dibujar** | Pan disabled (`panning.disabled = true`), zoom kept or reduced | Click adds a vertex |

**Why the existing geometry still works under zoom.** `onImageClick` computes `pixelANormalizado(clientX - rect.left, clientY - rect.top, rect.width, rect.height)` from the image's live `getBoundingClientRect()`. When `react-zoom-pan-pinch` scales/translates the container, the `<img>`'s rendered rect reflects that transform — both the click offset and `rect.width/height` scale together, so the normalized ratio is unchanged. This means the current `pixelANormalizado` needs **no zoom-aware math**; it is already transform-invariant. A unit test locks this: for a given normalized point, the computed value is identical at scale 1 and scale 2 (simulated via a scaled rect).

**Editor operations added** (each a pure geometry helper + a thin handler, test-first):

| Operation | Helper (in `geometry.ts`) | Notes |
|-----------|---------------------------|-------|
| Add vertex | (existing append) | Only in Dibujar mode |
| Drag vertex | `moverVertice(poly, index, punto)` | Pointer drag on a vertex handle; re-clamps to `[0,1]` |
| Delete vertex | `eliminarVertice(poly, index)` | Guarded to keep `length ≥ 3` before save |
| Undo | in-component history stack | `useState<Poligono[]>` snapshots; no persistence |

All new helpers are pure and return new arrays (immutability), matching the Vercel `js-tosorted-immutable`/re-render guidance and the existing geometry style. Drawing state stays in the component (`useRef` for the transient drag position per `rerender-use-ref-transient-values`) to avoid re-rendering the whole overlay on every pointer move.

## 6. Legacy write paths, name collision, and dead code (open questions 5 + 6)

### 6a. The three write paths — freeze now, delete in a bounded slice

| Path | Writes | Decision |
|------|--------|----------|
| `src/app/api/proyectos/upload-plano/route.ts` (POST/DELETE) | `proyecto.planos_url` | **Freeze** — no new caller. The masterplan uploader supersedes it. Route deletion is a candidate for the cleanup slice; not called by the new flow. |
| `overlay_layers` (`OverlayLayersPanel.tsx` + migration `202511181200`) | `proyecto.overlay_layers` | **Freeze** — stop new writes; UI panel is dead. Column/migration left in place (no forward migration; per non-goals). |
| `src/app/dashboard/proyectos/[id]/_actions.ts:363 guardarPoligonoLote` | `lote.plano_poligono` | **Freeze + rename** (see 6b). |

The **new** write targets are unchanged and already correct: `guardarMasterplanProyecto` → `proyecto.masterplan`, and `src/app/dashboard/proyectos/_actions.ts:578 guardarPoligonoLote` → `lote.data.masterplan_poly`.

### 6b. Resolve the `guardarPoligonoLote` collision

Two exports share the name with different signatures:

- `src/app/dashboard/proyectos/_actions.ts:578` — `(loteId, poly)` → `lote.data.masterplan_poly` (**correct**, imported by `MasterplanEditor`).
- `src/app/dashboard/proyectos/[id]/_actions.ts:363` — `(loteId, proyectoId, vertices)` → `lote.plano_poligono` (**legacy**).

**Decision:** rename the legacy `[id]/_actions.ts` export to `guardarPoligonoLoteLegacy` (or delete it if the cleanup slice removes its only callers). The editor already imports from the masterplan `_actions.ts`, so no editor rewiring is needed — verified. This removes the ambiguity without touching the working path.

### 6c. Dead code (~2,350 lines) — delete in a dedicated cleanup slice

Verified dead files, all under `src/app/dashboard/proyectos/[id]/`:

- `_MapeoLotesMejorado.tsx`, `_MapeoLotesVisualizacion.tsx`
- `_PlanosViewer.tsx`, `_PlanosUploader.tsx`
- `OverlayLayersPanel.tsx`

**Explicitly NOT dead (correction, verified at tasks phase):** `_MapeoLotes.tsx` is imported at `page.tsx:7` **and rendered** at `page.tsx:487` — it is the live "Mapeo de Lotes" tab (Google-Maps-based lote pinning, a distinct feature from the masterplan overlay). Removing it is a product decision outside this change; it MUST NOT be deleted in the cleanup slice.

**Dependency map for safe removal (verified):**

- `_PlanosUploader.tsx` imports `_PlanosViewer.tsx` (internal cluster; no external importers found).
- `OverlayLayersPanel.tsx` has no importers.

**Strategy:** freeze in the feature slices; perform deletion in a **separate cleanup slice/PR** ordered after the feature works, so a regression in cleanup cannot break the upload/editor/presentation delivery. Order within that slice: (1) delete the dead file cluster listed above, (2) rename/delete the legacy `guardarPoligonoLote`. Keeping cleanup isolated bounds the blast radius and keeps each PR under the review budget.

## 7. Presentation mode composition

`PlanoPresentacion` (new client component) is a fullscreen wrapper:

- Base image + price-free polygon overlay (reuses the refactored `MasterplanViewer`).
- Estado legend (disponible/reservado/vendido) using `estadoColor` from `geometry.ts` (single source of truth for color→estado).
- Tap/click a lote → detail panel showing **área + manzana/etapa only** (from `PlanoLoteDTO`), never price.
- Mobile-first, dark-aware (project convention): the detail panel is a bottom sheet on small screens; the component is designed for touch first because Phase 2 opens on phones via WhatsApp.
- Empty state when `buildPlanoPresentacion` returns `null` (no plano uploaded), with formal-Spanish copy.
- Reachable from the proyecto detail screen via a "Modo presentación" entry (fullscreen).

The component is `dynamic`-imported (`next/dynamic`) from the proyecto route so `react-zoom-pan-pinch` and the presentation bundle load only when opened (`bundle-dynamic-imports`).

## 8. Architecture Decision Records

### ADR-1 — Consolidate on the masterplan stack, do not add a fourth plano implementation
Build on `proyecto.masterplan` + `lote.data.masterplan_poly` + SVG viewer/editor. Rejected alternatives: Google Maps/Leaflet/Mapbox (the plano is a static image, not a geographic map), and a Konva/Fabric canvas rewrite (the pure-SVG normalized-coord stack already works and is testable). This is the approved Approach 1.

### ADR-2 — Client-side PDF rasterization, reuse `convertPdfToPng`
`pdfjs-dist` (already a dependency) runs in the browser using `<canvas>`; extract the proven `BlueprintUploader` helper to `src/lib/masterplan/rasterize.client.ts`. Rejected: server-side rasterization, which requires a native `canvas` build and a new heavy dependency. First page only, dimension-capped at ~4000px, re-validated against the 5MB gate.

### ADR-3 — Normalized `[0,1]` coords are render-invariant; guard aspect ratio, do not migrate
`viewBox="0 0 1 1"` + `preserveAspectRatio="none"` makes stored coordinates independent of intrinsic pixel size. Pure resolution changes on re-upload are safe by construction; only aspect-ratio/crop changes can misalign, and those are flagged by `aspectRatioChanged(...)` with an admin confirm. No data migration; frozen legacy fields untouched.

### ADR-4 — Price-free `PlanoPresentacionDTO` is the security seam
Presentation props are typed with no price field, so price is unrepresentable, not merely hidden. A server whitelist builder (`buildPlanoPresentacion`) and a pure `toPlanoLoteDTO` mapper pick only six safe fields. The same builder + DTO + component serve the dashboard and the future `/p/[token]` route. A vitest test asserts no price/client keys survive the mapper. `MasterplanViewer` is refactored to be price-agnostic so the guarantee is global and cannot regress via a second viewer.

### ADR-5 — Explicit Navegar/Dibujar mode over `react-zoom-pan-pinch`; keep transform-invariant click mapping
A mode toggle disables panning while drawing to avoid gesture ambiguity. `pixelANormalizado` needs no zoom-aware math because it reads the live `getBoundingClientRect()`, which already reflects the transform; a unit test locks scale-invariance. New editor ops (`moverVertice`, `eliminarVertice`, undo) are pure/immutable helpers in `geometry.ts`. `react-zoom-pan-pinch` (~7KB) is the only new runtime dependency and is `dynamic`-imported.

### ADR-6 — Freeze legacy writes, rename the collision, delete dead code in a separate slice
Stop new writes to `planos_url` and `overlay_layers`; rename the legacy `guardarPoligonoLote` (`lote.plano_poligono`) to remove the ambiguity while leaving the correct masterplan writer untouched (editor wiring verified). Delete the dead cluster (`_MapeoLotesMejorado`, `_MapeoLotesVisualizacion`, `_PlanosViewer`, `_PlanosUploader`, `OverlayLayersPanel`, ~2,630 lines) in a dedicated cleanup slice ordered after the feature. `_MapeoLotes.tsx` stays — it is the live "Mapeo de Lotes" tab (see 6c). Isolation bounds the blast radius and the review budget.

## 9. Test strategy (Strict TDD active)

| Area | Test (vitest), written first |
|------|------------------------------|
| DTO no-price guarantee | `toPlanoLoteDTO` / `buildPlanoPresentacion` drop `precio`/`moneda`/`descuento`/`precio_m2`/`condiciones`/client fields |
| Rasterization caps | `scaleForMaxDimension` clamps to MAX_DIM; first-page-only contract |
| Re-upload guard | `aspectRatioChanged` true/false around tolerance |
| Editor geometry | `moverVertice`, `eliminarVertice` (≥3 guard), undo stack; click mapping identical at scale 1 vs 2 |
| Estado→color | `estadoColor` mapping stable for disponible/reservado/vendido/default |
| Viewer/presentation | polygon render for `poly.length ≥ 3`; empty state when no masterplan; no price text in the DOM |

Extend the existing `geometry.test.ts`, `MasterplanViewer.test.tsx`, `MasterplanEditor.test.tsx` rather than starting new harnesses.

## 10. Risks carried into tasks/apply

- **Re-crop misalignment is not auto-detectable** — the aspect-ratio guard catches ratio changes, not same-ratio re-crops; the admin confirm is the mitigation. Accepted.
- **Client rasterization of very large PDFs** — dimension + size caps with a single downscale retry; if still too heavy, a clear formal-Spanish error. No server fallback in scope.
- **Delivery size > 400 lines** — full pipeline plus cleanup will chain; slice boundaries (uploader / editor / presentation / cleanup) are the tasks phase's call. Cleanup must be its own slice.
- **`react-zoom-pan-pinch` API drift** — pinned single dependency; isolate its usage inside `MasterplanEditor` and the presentation wrapper so a future swap is local.
