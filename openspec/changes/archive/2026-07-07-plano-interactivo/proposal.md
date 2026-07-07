# Interactive masterplan as a live sales tool (`plano-interactivo`)

Give the vendedor a live, interactive **plano** of a proyecto to show a client during a sales conversation: the base masterplan image with every lote drawn on top, colored by real-time `estado`, where tapping a lote reveals its área and manzana/etapa — but never its price. Today no proyecto has an interactive plano at all: the masterplan stack (`crm.proyecto.masterplan` + `crm.lote.data.masterplan_poly` + the SVG `MasterplanViewer`/`MasterplanEditor`) exists but is unreachable in the sales flow, and it competes with ~2,350 lines of dead legacy plano code and three divergent upload paths that write to three different DB fields. This change consolidates on the masterplan stack and delivers the full pipeline: **upload plano → draw/edit polygons → presentation mode**.

## Why now

- Planos are **not yet uploaded** for any proyecto, so the whole pipeline (upload → draw → present) must ship together; there is no "just add presentation mode" shortcut.
- The vendedor has no way to show live availability to a client. Availability lives in the CRM; the sales conversation happens on a screen with no map of the proyecto.
- The masterplan foundation already exists and is clean (pure SVG, normalized `[0,1]` coordinates, `src/lib/masterplan/geometry.ts`), but it is buried under legacy plano features that confuse contributors and split writes across `planos_url`, `overlay_layers`, and `masterplan`.

## Who this is for

| User | Situation | Need |
|------|-----------|------|
| Vendedor | Live sales conversation with a client (in person or screen-share) | Show the proyecto plano, point at available lotes, answer "¿cuáles quedan?" instantly, without exposing price on screen |
| Admin / coordinador (setup) | Onboarding a proyecto | Upload the plano image/PDF once and trace each lote's polygon accurately |
| Client (Phase 2, out of implementation scope) | Received a WhatsApp link, no login | Browse live availability of a single proyecto safely, with zero internal/price data |

## What success looks like

- A vendedor can open a proyecto, enter a clean **presentation mode**, and show a client the plano with lotes colored by `estado`, a legend, and a tap-to-detail panel (área + manzana/etapa, **no price**).
- An admin can **upload one plano** (image or PDF, PDF rasterized to PNG) and **draw/edit** every lote polygon with a usable editor (add/drag/delete vertex, undo, zoom+pan while drawing).
- All new plano writes go to `crm.proyecto.masterplan` **only**; legacy fields (`planos_url`, `overlay_layers`) are frozen and no longer written by new code paths.
- The presentation component is built so that **Phase 2 public route can reuse it unchanged**, fed by a server-built whitelist DTO that structurally cannot leak price or internal data.

## Scope

### In scope (implementation now)

| Slice | Change |
|-------|--------|
| Unified plano uploader | Single upload path writing to `crm.proyecto.masterplan` (`{ url, path, width, height }`). Accepts image; accepts PDF and rasterizes the first page to PNG via `pdfjs-dist`. Captures intrinsic `width`/`height` for correct polygon scaling |
| Improved polygon editor | Extend `MasterplanEditor`: add/drag/delete vertex, undo, and zoom+pan **while drawing** (via `react-zoom-pan-pinch`, the only new runtime dependency, ~7KB). Writes to `crm.lote.data.masterplan_poly` |
| Presentation mode (vendedor) | Fullscreen clean view: base image + lote polygons colored by `estado`, legend, tap → lote panel showing **área + manzana/etapa only**. Reachable from the proyecto detail screen. No price anywhere on screen |
| Presentation component shape | The presentation view consumes a plain, already-sanitized DTO (no direct DB access, no price field in its props) so Phase 2 can reuse it verbatim |
| Legacy cleanup (bounded) | Freeze legacy write paths and stop new writes to `planos_url`/`overlay_layers`. Removal of the ~2,350 lines of dead code and the `guardarPoligonoLote` name collision is a candidate for the same chain but must be **scoped by the tasks phase**, not assumed done here |

### In design constraints, OUT of implementation scope

- **Phase 2 public tokenized link** (`/p/[token]`, WhatsApp, no login): NOT implemented in this change. It IS a binding design constraint — the presentation component and its DTO must be designed from day one so the public route can reuse them with a server-side whitelist (no price, no client/internal data, no auth-only fields). Design must prove the leak-proof boundary; implementation is deferred.

### Out of scope (non-goals)

- Google Maps / Leaflet / Mapbox for this view — explicitly rejected; the plano is a static image with SVG overlays, not a geographic map.
- Konva/Fabric canvas rewrite — rejected; the SVG stack stays.
- Multi-page PDF planos, multiple base images per proyecto, or layered/overlay planos — single base image per proyecto for now.
- Editing lote business data (price, estado rules, assignment) from the plano — the plano reads `estado`, it does not manage it.
- Any mobile-app work.
- Migrating existing `planos_url`/`overlay_layers` data forward — those fields are frozen, not migrated (no proyecto has a usable interactive plano yet).

## Approach summary (Approach 1 — consolidate on the masterplan stack)

Build on what already works instead of adding a fourth plano implementation.

1. **One upload path, one field.** New uploader writes only to `crm.proyecto.masterplan`. PDF input is rasterized client- or server-side to PNG via `pdfjs-dist`; intrinsic dimensions are stored so normalized `[0,1]` polygon coordinates scale correctly on any screen.
2. **Extend, don't replace, the editor.** Enhance `MasterplanEditor`/`MasterplanEditorPanel` (`src/components/masterplan/`) with vertex drag/delete, undo, and zoom+pan-while-drawing (`react-zoom-pan-pinch`). Polygons keep living in `crm.lote.data.masterplan_poly`.
3. **Presentation mode reuses the viewer.** A clean fullscreen wrapper over `MasterplanViewer` renders `estado` colors, legend, and a detail panel fed by a sanitized DTO (área + manzana/etapa, no price).
4. **Design the public boundary now, build it later.** The DTO is a whitelist assembled server-side; the presentation component never receives price or internal fields, so the deferred `/p/[token]` route can adopt it without a rewrite.

## Risks and open questions

| Risk | Note / mitigation |
|------|-------------------|
| Price leak into presentation / future public route | Structural guardrail: presentation component props carry no price field; DTO is a server-side whitelist. Design must specify and prove this boundary. Spec must assert "no price on screen" as acceptance criteria |
| Three upload paths still write divergent fields | Verified: legacy `src/app/api/proyectos/upload-plano/route.ts` writes `planos_url`; `overlay_layers` migration (`202511181200`) exists; `masterplan` is the new target. New code must write `masterplan` only; freezing legacy paths must not break existing proyecto detail screens mid-chain |
| `guardarPoligonoLote` name collision | Verified: two exports — `src/app/dashboard/proyectos/_actions.ts:578` and `src/app/dashboard/proyectos/[id]/_actions.ts:363`, with different signatures. Editor wiring must target the correct one; tasks phase decides whether to rename/dedupe within scope |
| ~2,350 lines of dead plano code | Verified present: `_MapeoLotes.tsx`, `_MapeoLotesMejorado.tsx`, `_MapeoLotesVisualizacion.tsx`, `_PlanosSection.tsx`, `_PlanosViewer.tsx`, `_PlanosUploader.tsx`, `OverlayLayersPanel.tsx`. Removal reduces confusion but expands the diff; tasks phase must bound it so cleanup does not balloon the change |
| PDF rasterization weight/perf | `pdfjs-dist` is heavy; decide (in design) where rasterization runs (worker/server vs. client) and cap to first page + a max dimension to keep the stored PNG reasonable |
| New dependency footprint | Only `react-zoom-pan-pinch` (~7KB) is approved as new runtime dep; anything beyond that needs explicit justification |
| Polygon coordinate integrity across images | Normalized `[0,1]` coords depend on stored intrinsic `width`/`height`; if a plano is re-uploaded at different dimensions, existing polygons must still render correctly (design to confirm) |
| UI copy language | Project convention is Peruvian formal Spanish (usted); all client-facing copy in the plano/presentation follows it. Code, identifiers, and these SDD artifacts stay English |
| Delivery size | Full pipeline across upload + editor + presentation is very likely **> 400 lines**; auto-chain slicing is expected. Slice boundaries are decided by the tasks phase, not here |

## Implementation constraints (for later phases)

- **Strict TDD is active** (`vitest`, `npm test`): editor geometry, DTO sanitization (no-price guarantee), and upload validation are test-first. The existing `geometry.test.ts` / `MasterplanEditor.test.tsx` / `MasterplanViewer.test.tsx` are the pattern to extend.
- **Auto-chain delivery**: proposal acknowledges the change slices into chained PRs; exact boundaries are the tasks phase's call.

## Next step

Run `sdd-spec` (acceptance criteria: upload accepts image+PDF, editor operations, presentation shows área/manzana/etapa with **no price**, estado→color mapping, empty/error states) and `sdd-design` (upload/rasterization architecture, editor enhancements, the sanitized DTO + leak-proof public boundary, dead-code/collision cleanup plan) — both can run in parallel from this proposal.
