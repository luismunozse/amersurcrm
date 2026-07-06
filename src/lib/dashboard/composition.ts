import type { RolNombre } from "@/lib/permissions/types";

/**
 * The two role compositions the dashboard home can render.
 * `cockpit` answers "what do I do today?" (vendedor, own-scoped data).
 * `command-center` answers "how is the business doing?" (global data).
 */
export type DashboardComposition = "cockpit" | "command-center";

/**
 * Resolves which dashboard composition a role sees. Single source of truth
 * for the `/dashboard` role branch — mirrors `crm.es_visibilidad_global()`.
 */
export function resolveComposition(rol: RolNombre): DashboardComposition {
  return rol === "ROL_VENDEDOR" ? "cockpit" : "command-center";
}
