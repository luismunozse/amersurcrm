import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase.server";

/**
 * Global-visibility roles. Callers in this set see all clients; callers NOT
 * in this set (e.g. ROL_VENDEDOR) are scoped to their own clients by routes
 * that consume this constant (search, etc.).
 */
export const GLOBAL_ROLES = [
  "ROL_ADMIN",
  "ROL_GERENTE",
  "ROL_COORDINADOR_VENTAS",
] as const;

// ── Discriminated union returned by the helper ──────────────────────────────

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

// ── Main helper ─────────────────────────────────────────────────────────────

/**
 * Validates a raw Bearer token string AND enforces that the identity has a
 * global-visibility CRM role. Vendors (ROL_VENDEDOR) are intentionally
 * excluded from this function — they access global extension ops only via
 * the web session; Bearer-authenticated calls require a GLOBAL_ROLES entry.
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

  // PostgREST may return the joined rol as an array or as a plain object depending
  // on the relationship cardinality hint it resolves at query time. Normalize both.
  const rolData = (perfil as any)?.rol;
  const rolNombre = Array.isArray(rolData) ? rolData[0]?.nombre : rolData?.nombre;

  if (!perfil || !rolNombre || !(GLOBAL_ROLES as readonly string[]).includes(rolNombre)) {
    return { ok: false, status: 403, error: "Permiso insuficiente" };
  }

  const username = (perfil as { username: string | null }).username;
  if (!username) {
    return { ok: false, status: 403, error: "Perfil incompleto" };
  }

  return {
    ok: true,
    user,
    username,
    rol: rolNombre as string,
    supabase,
  };
}
