import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase.server";
import { resolveEquipoScope } from "@/lib/auth/equipo-scope.server";

/**
 * Global-visibility roles. Callers in this set see all clients; callers NOT
 * in this set (e.g. ROL_VENDEDOR, ROL_COORDINADOR_VENTAS) are scoped by
 * routes that consume this constant (search, etc.) — coordinador is
 * team-scoped as of the coordinador-teams change (see
 * src/lib/auth/equipo-scope.server.ts), not globally visible.
 */
export const GLOBAL_ROLES = [
  "ROL_ADMIN",
  "ROL_GERENTE",
] as const;

// ── Discriminated union returned by the helpers ─────────────────────────────

export type ExtensionAuthError = {
  ok: false;
  status: 401 | 403;
  error: string;
};

export type ExtensionAuthOk = {
  ok: true;
  user: User;
  username: string;
  rol: string;
  /** The service-role client used for auth; routes should reuse it for DB ops. */
  supabase: SupabaseClient;
};

type BearerIdentity =
  | { ok: true; user: User; username: string; rolNombre: string; supabase: SupabaseClient }
  | ExtensionAuthError;

/**
 * Shared first half of Bearer-token validation: token -> auth user -> CRM
 * profile (username + rol). Both `validateBearerAndEnsureGlobalRole` and
 * `validateBearerAndEnsureClientAccess` build on this — they differ only in
 * what they additionally require once the identity is resolved.
 */
async function resolveBearerIdentity(token: string | null): Promise<BearerIdentity> {
  if (!token) {
    return { ok: false, status: 401, error: "No autenticado" };
  }

  const supabase = createServiceRoleClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return { ok: false, status: 401, error: "Token inválido" };
  }

  const { data: perfil, error: perfilError } = await supabase
    .schema("crm")
    .from("usuario_perfil")
    .select("username, rol:rol!rol_id(nombre)")
    .eq("id", user.id)
    .single();

  if (perfilError) {
    console.error("[extension-auth] perfil query failed", perfilError);
    return { ok: false, status: 403, error: "Permiso insuficiente" };
  }

  // PostgREST may return the joined rol as an array or as a plain object
  // depending on the relationship cardinality hint it resolves at query
  // time. Normalize both.
  const rolData = (perfil as any)?.rol;
  const rolNombre = Array.isArray(rolData) ? rolData[0]?.nombre : rolData?.nombre;

  if (!perfil || !rolNombre) {
    return { ok: false, status: 403, error: "Permiso insuficiente" };
  }

  const username = (perfil as { username: string | null }).username;
  if (!username) {
    return { ok: false, status: 403, error: "Perfil incompleto" };
  }

  return { ok: true, user, username, rolNombre: rolNombre as string, supabase };
}

/**
 * Validates a raw Bearer token string AND enforces that the identity has a
 * global-visibility CRM role (admin/gerente). Vendors and coordinadores are
 * intentionally excluded from this function: vendors never had extension
 * access; coordinadores are team-scoped via `validateBearerAndEnsureClientAccess`
 * instead, for routes that operate on a specific cliente id.
 *
 * Returns a typed discriminated union — never throws.
 *
 * Error semantics:
 *   401 — missing or invalid/expired token
 *   403 — valid token but role is not in GLOBAL_ROLES
 */
export async function validateBearerAndEnsureGlobalRole(
  token: string | null,
): Promise<ExtensionAuthOk | ExtensionAuthError> {
  const identity = await resolveBearerIdentity(token);
  if (!identity.ok) return identity;

  if (!(GLOBAL_ROLES as readonly string[]).includes(identity.rolNombre)) {
    return { ok: false, status: 403, error: "Permiso insuficiente" };
  }

  return {
    ok: true,
    user: identity.user,
    username: identity.username,
    rol: identity.rolNombre,
    supabase: identity.supabase,
  };
}

/**
 * Validates a raw Bearer token string for a route that reads/writes exactly
 * ONE specific cliente (`clienteId`). Unlike `validateBearerAndEnsureGlobalRole`,
 * this ADMITS `ROL_COORDINADOR_VENTAS` — but only when the target cliente
 * belongs to their team, using the SAME membership semantics as RLS/
 * `equipoOrFilter` (src/lib/auth/equipo-scope.server.ts): the cliente's
 * `vendedor_username` OR `vendedor_asignado` is a team member's username, OR
 * `created_by` is ANY team member's auth.users id (not just the coordinador's
 * own — `scope.equipoUserIds` always includes the coordinador themself, so
 * this still covers "the coordinador created it"). `ROL_VENDEDOR` is still
 * rejected — vendors never had extension access, this does not change that.
 *
 * Use this from any Bearer-token route under `/api/clientes/[id]/...`
 * instead of `validateBearerAndEnsureGlobalRole`.
 *
 * Error semantics:
 *   401 — missing or invalid/expired token
 *   403 — role not permitted, OR the cliente does not belong to this
 *          coordinador's team, OR any scope-resolution/lookup step errors
 *          (fail closed — never falls through to global access). All 403
 *          cases return the SAME generic message, deliberately, to avoid
 *          leaking which cliente ids exist to an unauthorized caller — same
 *          pattern as the search route.
 */
export async function validateBearerAndEnsureClientAccess(
  token: string | null,
  clienteId: string,
): Promise<ExtensionAuthOk | ExtensionAuthError> {
  const identity = await resolveBearerIdentity(token);
  if (!identity.ok) return identity;

  const { user, username, rolNombre, supabase } = identity;

  if ((GLOBAL_ROLES as readonly string[]).includes(rolNombre)) {
    return { ok: true, user, username, rol: rolNombre, supabase };
  }

  if (rolNombre === "ROL_COORDINADOR_VENTAS") {
    const scope = await resolveEquipoScope(supabase, user.id);
    if (scope.tier !== "equipo") {
      return { ok: false, status: 403, error: "Permiso insuficiente" };
    }

    const { data: cliente, error: clienteError } = await supabase
      .schema("crm")
      .from("cliente")
      .select("vendedor_username, vendedor_asignado, created_by")
      .eq("id", clienteId)
      .maybeSingle();

    if (clienteError || !cliente) {
      return { ok: false, status: 403, error: "Permiso insuficiente" };
    }

    const ownerUsername = (cliente as { vendedor_username: string | null }).vendedor_username;
    const ownerAsignado = (cliente as { vendedor_asignado: string | null }).vendedor_asignado;
    const createdBy = (cliente as { created_by: string | null }).created_by;

    const perteneceAlEquipo =
      (!!ownerUsername && scope.equipoUsernames.includes(ownerUsername)) ||
      (!!ownerAsignado && scope.equipoUsernames.includes(ownerAsignado)) ||
      (!!createdBy && scope.equipoUserIds.includes(createdBy));

    if (!perteneceAlEquipo) {
      return { ok: false, status: 403, error: "Permiso insuficiente" };
    }

    return { ok: true, user, username, rol: rolNombre, supabase };
  }

  return { ok: false, status: 403, error: "Permiso insuficiente" };
}
