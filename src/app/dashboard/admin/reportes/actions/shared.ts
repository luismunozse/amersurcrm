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
