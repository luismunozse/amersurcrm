"use client";

/**
 * Client-side PDF -> PNG rasterization for the unified masterplan uploader.
 *
 * This is a deliberately independent copy of the pattern proven in
 * `BlueprintUploader.tsx` (`convertPdfToPng`). It is NOT shared with that
 * frozen legacy component: the legacy path keeps its own inline copy so this
 * module can evolve (dimension cap, retry-at-lower-scale) without touching
 * frozen code (see design.md ADR-2, tasks.md Phase 1 REFACTOR note).
 */

const DEFAULT_MAX_DIMENSION = 4000;
const BASE_RENDER_SCALE = 2.0;

/**
 * Returns a multiplicative factor (<= 1) that, applied to both `width` and
 * `height`, clamps the largest of the two to `maxDimension` while preserving
 * the aspect ratio. Returns 1 when already within bounds or when the input
 * dimensions are invalid (avoids dividing by zero).
 */
export function scaleForMaxDimension(width: number, height: number, maxDimension: number): number {
  const largest = Math.max(width, height);
  if (!largest || !maxDimension || largest <= maxDimension) return 1;
  return maxDimension / largest;
}

/**
 * True when the aspect ratio of (newW, newH) differs from (oldW, oldH) by
 * more than `tolerance` (relative difference). Used to guard re-uploads:
 * a pure resolution change is safe (see design.md ADR-3), a re-crop/re-frame
 * is flagged for admin confirmation.
 */
export function aspectRatioChanged(
  oldW: number,
  oldH: number,
  newW: number,
  newH: number,
  tolerance = 0.02,
): boolean {
  if (!oldW || !oldH || !newW || !newH) return false;
  const oldAspectRatio = oldW / oldH;
  const newAspectRatio = newW / newH;
  return Math.abs(newAspectRatio - oldAspectRatio) / oldAspectRatio > tolerance;
}

/**
 * Rasterizes the first page of a PDF file to a PNG `File`, capping the
 * largest rendered dimension at `maxDimension` pixels (default 4000).
 * First page only (non-goal: multi-page masterplans).
 */
export async function rasterizeFirstPageToPng(
  file: File,
  { maxDimension = DEFAULT_MAX_DIMENSION }: { maxDimension?: number } = {},
): Promise<File> {
  const pdfjsLib = await import("pdfjs-dist");
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const baseViewport = page.getViewport({ scale: BASE_RENDER_SCALE });
  const factor = scaleForMaxDimension(baseViewport.width, baseViewport.height, maxDimension);
  const viewport = factor === 1 ? baseViewport : page.getViewport({ scale: BASE_RENDER_SCALE * factor });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear contexto canvas");
  // pdfjs-dist v5 espera canvasContext como Object
  await page.render({ canvasContext: ctx as unknown as object, viewport } as any).promise;

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Canvas to Blob falló"));
      resolve(new File([blob], file.name.replace(/\.pdf$/i, ".png"), { type: "image/png" }));
    }, "image/png", 0.95);
  });
}
