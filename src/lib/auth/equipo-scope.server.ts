import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createOptimizedServerClient, createServiceRoleClient, getCachedUserId } from "@/lib/supabase.server";

/**
 * Visibility tier for the current user, resolved once and consumed by
 * every client-visibility fetcher/route instead of each re-deriving
 * role/ownership logic locally. RLS remains the authoritative enforcement
 * layer (see supabase/migrations/20260720000001_coordinador_teams_rls.sql)
 * — this only optimizes/narrows the app-level query.
 */
export type EquipoScope =
  | { tier: "global" }
  | { tier: "equipo"; userId: string; username: string; equipoUsernames: string[]; equipoUserIds: string[] }
  | { tier: "propio"; userId: string; username: string | null }
  | { tier: "anonimo" };

/**
 * Resolves the visibility tier for an already-authenticated user, given an
 * already-resolved supabase client (cookie-session OR service-role — both
 * work: the self-profile lookup is either RLS-allowed as "own row" or
 * bypasses RLS entirely). Use this from routes that support Bearer-token
 * auth (e.g. the Chrome extension), where `getEquipoScope()`'s cookie-based
 * `getCachedUserId()` would resolve nothing.
 */
export async function resolveEquipoScope(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
): Promise<EquipoScope> {
  const { data: perfil } = await supabase
    .schema("crm")
    .from("usuario_perfil")
    .select("username, rol:rol!usuario_perfil_rol_id_fkey(nombre)")
    .eq("id", userId)
    .single();

  if (!perfil) return { tier: "anonimo" };

  const rolData = (perfil as any).rol;
  const rolNombre: string | null = Array.isArray(rolData) ? rolData[0]?.nombre ?? null : rolData?.nombre ?? null;
  const username = ((perfil as any).username as string | null) ?? null;

  if (rolNombre === "ROL_ADMIN" || rolNombre === "ROL_GERENTE") {
    return { tier: "global" };
  }

  if (rolNombre === "ROL_COORDINADOR_VENTAS") {
    // usuario_perfil RLS ("usuarios_ven_su_perfil") only allows reading
    // one's own row, so a service-role client is required here regardless
    // of which client was passed in — matches the existing pattern in
    // src/app/api/clientes/vendedores/route.ts.
    const serviceRole = createServiceRoleClient();
    const { data: equipo, error } = await serviceRole
      .schema("crm")
      .from("usuario_perfil")
      .select("id, username")
      .eq("coordinador_id", userId);

    if (error) {
      console.error("[equipo-scope] Error obteniendo equipo del coordinador:", error);
    }

    const equipoRows = (equipo ?? []) as Array<{ id: string; username: string | null }>;
    const equipoUsernames = equipoRows
      .map((row) => row.username)
      .filter((u): u is string => Boolean(u));
    const equipoUserIds = equipoRows.map((row) => row.id);

    if (username) equipoUsernames.push(username);
    equipoUserIds.push(userId);

    return { tier: "equipo", userId, username: username ?? "", equipoUsernames, equipoUserIds };
  }

  return { tier: "propio", userId, username };
}

/**
 * Cookie-session convenience wrapper, memoized per request via
 * `React.cache()`. Use from dashboard/server-component code. Do NOT use
 * from Bearer-token routes (Chrome extension) — use `resolveEquipoScope`
 * with the already-resolved service-role client + userId instead.
 */
export const getEquipoScope = cache(async (): Promise<EquipoScope> => {
  const userId = await getCachedUserId();
  if (!userId) return { tier: "anonimo" };

  const supabase = await createOptimizedServerClient();
  return resolveEquipoScope(supabase, userId);
});

/**
 * Builds the PostgREST `.or(...)` ownership-filter string for a scope.
 * Returns `null` when no ownership filter is needed (global tier) or when
 * there is no authenticated user (anonimo — callers should already have
 * short-circuited before reaching a query in that case).
 */
export function equipoOrFilter(scope: EquipoScope): string | null {
  if (scope.tier === "global" || scope.tier === "anonimo") return null;

  if (scope.tier === "equipo") {
    if (scope.equipoUsernames.length === 0) return `created_by.eq.${scope.userId}`;
    const usernamesCsv = scope.equipoUsernames.map((u) => `"${u}"`).join(",");
    return `created_by.eq.${scope.userId},vendedor_username.in.(${usernamesCsv})`;
  }

  // propio
  if (!scope.username) return `created_by.eq.${scope.userId}`;
  return `created_by.eq.${scope.userId},vendedor_username.eq.${scope.username}`;
}
