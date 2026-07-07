# Interactive Masterplan — Main Spec

## Domain: masterplan

Primary specification for `crm.proyecto.masterplan` and `crm.lote.data.masterplan_poly`. Covers the unified upload pipeline, polygon editing with visual zoom/pan, and price-free presentation mode for both authenticated (dashboard) and future public (deferred Phase 2) contexts.

---

## Requirements

### Requirement: Unified masterplan upload path

The uploader MUST write only to `crm.proyecto.masterplan` (`{ url, path, width, height }`). It MUST accept `image/jpeg|png|webp` and PDF; a PDF MUST be rasterized to PNG (first page only) via `pdfjs-dist`. Intrinsic pixel `width`/`height` MUST be captured. An unsupported file type MUST be rejected without modifying the existing `masterplan`.

#### Scenario: Image upload persists masterplan only
- GIVEN an admin uploads a valid PNG
- WHEN the upload completes
- THEN `masterplan` updates to `{url, path, width, height}` AND `planos_url`/`overlay_layers` stay unwritten

#### Scenario: PDF upload is rasterized before storage
- GIVEN an admin uploads a multi-page PDF
- WHEN the upload completes
- THEN only page 1 is rasterized to PNG and stored, with its pixel dimensions captured

#### Scenario: Unsupported file type is rejected
- GIVEN an admin selects a `.docx` file
- WHEN the upload is attempted
- THEN it is rejected and the previously stored `masterplan` is unchanged

### Requirement: Legacy plano write paths are frozen

No code path introduced or modified by this change MAY write to `crm.proyecto.planos_url` or `crm.proyecto.overlay_layers`. Existing reads of those fields by code outside this change's scope MUST continue to work unmodified.

#### Scenario: New uploader never touches legacy fields
- GIVEN the unified uploader runs for any proyecto
- WHEN the write completes
- THEN `planos_url` and `overlay_layers` values on that proyecto row are byte-for-byte unchanged

#### Scenario: Existing proyecto detail screen still renders
- GIVEN a proyecto with pre-existing `planos_url` data and no `masterplan`
- WHEN the proyecto detail screen loads
- THEN it renders without error (legacy read path unaffected)

### Requirement: Polygon editor vertex and history operations

`MasterplanEditor` MUST support: dragging a vertex to a new normalized `[0,1]` position; deleting a vertex (blocked below 3 remaining); undoing the last add/drag/delete; and zoom+pan while drawing (`react-zoom-pan-pinch`) without corrupting coordinate conversion.

#### Scenario: Dragging a vertex updates its coordinates
- GIVEN a 4-vertex polygon being edited
- WHEN one vertex is dragged
- THEN only that vertex's normalized coordinate changes

#### Scenario: Deleting the 3rd-to-last vertex is blocked
- GIVEN a polygon with exactly 3 vertices
- WHEN delete-vertex is triggered
- THEN the vertex is not removed

#### Scenario: Undo reverts the last action
- GIVEN a vertex was just added
- WHEN undo is triggered
- THEN the polygon returns to its prior state

#### Scenario: Zoom does not distort new vertex placement
- GIVEN the canvas is zoomed in
- WHEN a new vertex is placed by clicking the image
- THEN the stored coordinate matches the clicked image point, not the zoomed viewport

### Requirement: Presentation mode shows no price anywhere on screen

Presentation mode MUST render, per lote: `estado`-based color, a legend, and — on tap — a detail panel showing only área and manzana/etapa. Price (`precio`, `moneda`) MUST NOT be rendered, present in the DOM, or included in any tooltip/attribute in presentation mode.

#### Scenario: Tapping a lote reveals area and manzana/etapa only
- GIVEN presentation mode is open with lotes drawn
- WHEN a vendedor taps a lote polygon
- THEN the detail panel shows área and manzana/etapa AND no price value appears anywhere in the rendered output

#### Scenario: Legend reflects estado colors without price
- GIVEN lotes with `disponible`, `reservado`, and `vendido` states
- WHEN presentation mode renders
- THEN the legend shows the three estado colors and no monetary figures

### Requirement: Presentation component consumes a price-free whitelist DTO

The presentation component's props type MUST NOT declare a price/`moneda` field and MUST NOT query the database directly; it MUST consume a plain DTO assembled server-side with only: lote id, `estado`, área, manzana/etapa, polygon points. This DTO shape is the reuse boundary for the deferred Phase 2 public route.

#### Scenario: DTO omits price at the type/shape level
- GIVEN the server-built presentation DTO for a proyecto's lotes
- WHEN the DTO mapping function is unit-tested
- THEN no object in the result contains a `precio` or `moneda` key

#### Scenario: Presentation component renders from DTO alone
- GIVEN the component receives only the whitelist DTO as props
- WHEN it renders
- THEN no additional data fetch occurs (compile-time contract: no price-bearing prop type accepted)

### Requirement: Polygon coordinates remain resolution-independent

Polygon vertices MUST stay normalized to `[0,1]` SVG space, decoupled from the masterplan image's stored pixel `width`/`height`. Rendering MUST NOT require re-deriving coordinates from pixel dimensions at display time.

#### Scenario: Existing polygons render after a masterplan replacement
- GIVEN a proyecto has lotes with saved `masterplan_poly` values
- WHEN the masterplan image is replaced with one of different pixel dimensions
- THEN the existing polygons still render using the same normalized `[0,1]` points (visual alignment accuracy vs. the new image is a known follow-up, not a regression in stored data)
