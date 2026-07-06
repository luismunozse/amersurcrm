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

/**
 * Month-over-month percentage change for the command center's "sales vs.
 * goal" block (design.md §4, "MoM delta from obtenerKPIs/stats"). Returns
 * `null` when there is nothing meaningful to compare against (no prior-month
 * sales, or non-finite input), so the UI can omit the delta instead of
 * showing a meaningless +Infinity%.
 */
export function calcularDeltaMensual(actual: number, anterior: number): number | null {
  if (!Number.isFinite(actual) || !Number.isFinite(anterior) || anterior <= 0) {
    return null;
  }
  return Math.round(((actual - anterior) / anterior) * 100);
}

/**
 * Previous calendar period for the MoM comparison above, wrapping to
 * December of the prior year when the current month is January.
 */
export function calcularPeriodoAnterior(anio: number, mes: number): { anio: number; mes: number } {
  return mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
}
