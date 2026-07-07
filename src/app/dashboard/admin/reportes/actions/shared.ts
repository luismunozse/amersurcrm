import { createServerOnlyClient } from "@/lib/supabase.server";
import { esAdmin } from "@/lib/permissions/server";

/**
 * Helpers compartidos por todas las server actions de reportes.
 *
 * IMPORTANTE: este archivo NO debe importar `next/cache`. Para cache TTL
 * o revalidación de tags, usar `./shared-cache` (server-only). Mantener
 * este módulo libre de imports server-only permite que tipos derivados
 * de aquí puedan referenciarse desde código que termina en client bundles
 * sin romper el build.
 */

/**
 * Shared auth guard for all report actions.
 * Returns the supabase client if authorized, otherwise throws.
 */
export async function getAuthorizedClient() {
  const supabase = await createServerOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autorizado");
  }

  const isAdminUser = await esAdmin();
  if (!isAdminUser) {
    throw new Error("No tienes permisos de administrador");
  }

  return supabase;
}

/**
 * Calculate start/end dates from period string or explicit dates.
 * Always normalizes startDate to 00:00:00.000 and endDate to 23:59:59.999
 * so range queries with .gte/.lte include the full first and last day.
 *
 * For explicit `fechaInicio`/`fechaFin` (YYYY-MM-DD) the dates are interpreted
 * in local time and snapped to day boundaries, avoiding UTC-shift off-by-one.
 */
export function calcularFechas(periodo: string, fechaInicio?: string, fechaFin?: string) {
  const days = parseInt(periodo) || 30;
  let startDate: Date;
  let endDate: Date;

  if (fechaInicio && fechaFin) {
    startDate = new Date(`${fechaInicio}T00:00:00`);
    endDate = new Date(`${fechaFin}T23:59:59.999`);
  } else {
    endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
  }

  return { startDate, endDate, days };
}

/**
 * Real previous-period comparison window (design.md ADR3).
 *
 * Returns the window of the same length immediately before `startDate`:
 * `prevEnd = startDate - 1ms` (the instant right before the current window
 * starts — no gap, no overlap), `prevStart = prevEnd - (endDate - startDate)`
 * (same duration as the current window). Both bounds are then normalized to
 * day boundaries the same way `calcularFechas` normalizes its own
 * `startDate`/`endDate`, so a `.gte()/.lte()` pair against this window
 * behaves identically to the current-period query.
 *
 * Placed here (not in `src/lib/dashboard/meta.ts`) because reportes periods
 * are arbitrary day ranges, not calendar months — this is period arithmetic,
 * the natural neighbor of `calcularFechas`. `meta.ts`'s `calcularPeriodoAnterior`
 * remains the calendar-month version used for MoM dashboard comparisons.
 */
export function calcularVentanaAnterior(
  startDate: Date,
  endDate: Date,
): { prevStart: Date; prevEnd: Date } {
  const duration = endDate.getTime() - startDate.getTime();

  const prevEnd = new Date(startDate.getTime() - 1);
  prevEnd.setHours(23, 59, 59, 999);

  const prevStart = new Date(prevEnd.getTime() - duration);
  prevStart.setHours(0, 0, 0, 0);

  return { prevStart, prevEnd };
}

/**
 * Every calendar month a report period overlaps (design.md ADR4,
 * "Period-vs-month reconciliation"). `meta_vendedor` targets are monthly
 * (`periodo_anio`, `periodo_mes`); reportes filters are arbitrary day
 * ranges. A single-month period returns one `{anio, mes}` entry; a span
 * crossing a month boundary returns one entry per overlapped month, in
 * chronological order.
 */
export function mesesEnRango(
  startDate: Date,
  endDate: Date,
): { anio: number; mes: number }[] {
  const meses: { anio: number; mes: number }[] = [];

  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const last = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (cursor.getTime() <= last.getTime()) {
    meses.push({ anio: cursor.getFullYear(), mes: cursor.getMonth() + 1 });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return meses;
}

/**
 * Wraps a report action with standard error handling pattern
 */
export async function safeAction<T>(
  fn: () => Promise<T>,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (error) {
    console.error("Error en acción de reportes:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
