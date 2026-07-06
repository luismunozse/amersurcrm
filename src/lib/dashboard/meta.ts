/**
 * Pure helper for the vendedor cockpit "Meta del mes" block
 * (design.md §2 sourcing table, §4 visual hierarchy — below the fold).
 */

/**
 * Progress percentage of real sales against the monthly goal, clamped to
 * [0, 100]. Returns 0 when the goal is zero/missing to avoid a
 * divide-by-zero, and never returns a negative percentage.
 */
export function calcularProgresoMeta(realVentasMonto: number, metaVentasMonto: number): number {
  if (!Number.isFinite(realVentasMonto) || !Number.isFinite(metaVentasMonto) || metaVentasMonto <= 0) {
    return 0;
  }
  const porcentaje = (realVentasMonto / metaVentasMonto) * 100;
  return Math.min(100, Math.max(0, Math.round(porcentaje)));
}
