import "server-only";

import { unstable_cache, revalidateTag } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase.server";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Helpers de cache para reportes — server-only.
 *
 * Vive separado de `shared.ts` porque importa `next/cache` (revalidateTag,
 * unstable_cache) que NO se puede arrastrar a client bundles. Cualquier
 * archivo que necesite estos helpers debe importarlos explícitamente
 * desde aquí en un contexto server (server action o route handler).
 *
 * NO re-exportar este módulo desde `actions/index.ts` ni desde el barrel
 * `_actions.ts` — rompería el build de cualquier client component que
 * importe tipos de esos barriles.
 */

/**
 * Construye un fetcher cacheado para un reporte admin.
 *
 * Patrón: la auth/authorization vive FUERA (en el wrapper público que
 * llama a getAuthorizedClient). El fetcher cacheado usa un cliente
 * service-role (bypass RLS) y depende solo de sus argumentos
 * primitivos, así `unstable_cache` puede compartir resultados entre
 * usuarios admin distintos.
 *
 * Cache TTL por defecto: 60s. Bustear con
 * `revalidateTag("reportes")` o `revalidateTag(keyPart)`.
 *
 * IMPORTANTE: solo usar en reportes admin-only. No usar para datos
 * que dependen del usuario actual (multi-tenant, RLS-scoped, etc.).
 */
export function buildCachedReportFetcher<TArgs extends readonly unknown[], TData>(
  fetcher: (supabase: SupabaseClient<any, "crm">, ...args: TArgs) => Promise<TData>,
  keyParts: string[],
  revalidateSeconds = 60,
): (...args: TArgs) => Promise<TData> {
  return unstable_cache(
    async (...args: TArgs) => {
      const supabase = createServiceRoleClient() as unknown as SupabaseClient<any, "crm">;
      return fetcher(supabase, ...args);
    },
    keyParts,
    {
      revalidate: revalidateSeconds,
      tags: ["reportes", ...keyParts],
    },
  );
}

/**
 * Bustea TODOS los caches de reportes (TTL por defecto: 60s).
 * Llamar desde mutations que afecten visiblemente reportes:
 * - crear/editar/eliminar cliente, venta, interacción, separación, lote.
 *
 * Uso opcional: si no se llama, los reportes se refrescan al cumplirse el TTL.
 */
export function revalidarReportes(scope: "all" | string = "all") {
  if (scope === "all") {
    revalidateTag("reportes");
  } else {
    revalidateTag(scope);
  }
}

/**
 * @deprecated usar buildCachedReportFetcher (separa auth + data fetch).
 */
export function cachedReport<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyParts: string[],
  revalidateSeconds = 60,
): T {
  return unstable_cache(fn, keyParts, {
    revalidate: revalidateSeconds,
    tags: ["reportes", ...keyParts],
  }) as unknown as T;
}
