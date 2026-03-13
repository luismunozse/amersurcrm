import { createServerOnlyClient } from "@/lib/supabase.server";
import { esAdmin } from "@/lib/permissions/server";
import { unstable_cache } from "next/cache";

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
 * Calculate start/end dates from period string or explicit dates
 */
export function calcularFechas(periodo: string, fechaInicio?: string, fechaFin?: string) {
  const days = parseInt(periodo);
  let startDate: Date;
  let endDate = new Date();

  if (fechaInicio && fechaFin) {
    startDate = new Date(fechaInicio);
    endDate = new Date(fechaFin);
  } else {
    startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
  }

  return { startDate, endDate, days };
}

/**
 * Wraps a report action with standard error handling pattern
 */
export async function safeAction<T>(
  fn: () => Promise<T>
): Promise<{ data: T | null; error: string | null }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (error) {
    console.error('Error en acción de reportes:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Server-side cache wrapper for report data.
 * Caches for 60s with tag-based revalidation.
 * Use `revalidateTag("reportes")` to bust all report caches.
 */
export function cachedReport<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyParts: string[],
  revalidateSeconds = 60
): T {
  return unstable_cache(
    fn,
    keyParts,
    {
      revalidate: revalidateSeconds,
      tags: ["reportes", ...keyParts],
    }
  ) as unknown as T;
}
