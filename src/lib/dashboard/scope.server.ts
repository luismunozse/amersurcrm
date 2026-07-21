import "server-only";
import { cache } from "react";
import { createOptimizedServerClient, getCachedUserId } from "@/lib/supabase.server";

export type PerfilRol = {
  username: string | null;
  nombreCompleto: string | null;
  rolNombre: string | null;
  esAdmin: boolean;
  esGerente: boolean;
  esCoordinador: boolean;
  /** True for admin/gerente only (ROL_COORDINADOR_VENTAS is team-scoped, not global). */
  esGlobal: boolean;
};

const PERFIL_NEUTRO: PerfilRol = {
  username: null,
  nombreCompleto: null,
  rolNombre: null,
  esAdmin: false,
  esGerente: false,
  esCoordinador: false,
  esGlobal: false,
};

/**
 * Shared profile+role lookup, memoized per request via `React.cache` so the
 * command-center fetchers (design.md ADR-1) don't each repeat the
 * `usuario_perfil` query that several existing `cache.server.ts` fetchers
 * already run independently.
 *
 * `esGlobal` matches `crm.es_visibilidad_global()` — admin/gerente only.
 * ROL_COORDINADOR_VENTAS is intentionally EXCLUDED as of the coordinador-teams
 * change: coordinador visibility is team-scoped (see
 * `src/lib/auth/equipo-scope.server.ts`). `esGlobal` (this field) is consumed
 * only by callers that still want a strict "admin/gerente only" boolean —
 * `src/lib/dashboard/command-center.server.ts`'s fetchers no longer take it
 * (Task 4b switched them to the richer `EquipoScope`, which distinguishes
 * "global" from "equipo" instead of collapsing both into one flag).
 */
export const getPerfilRol = cache(async (): Promise<PerfilRol> => {
  const userId = await getCachedUserId();
  if (!userId) return PERFIL_NEUTRO;

  const supabase = await createOptimizedServerClient();
  const { data: perfil } = await supabase
    .schema('crm')
    .from('usuario_perfil')
    .select('username, nombre_completo, rol:rol!usuario_perfil_rol_id_fkey(nombre)')
    .eq('id', userId)
    .single();

  if (!perfil) return PERFIL_NEUTRO;

  const rolData = perfil.rol as any;
  const rolNombre: string | null = Array.isArray(rolData) ? rolData[0]?.nombre ?? null : rolData?.nombre ?? null;
  const esAdmin = rolNombre === 'ROL_ADMIN';
  const esGerente = rolNombre === 'ROL_GERENTE';
  const esCoordinador = rolNombre === 'ROL_COORDINADOR_VENTAS';

  return {
    username: perfil.username ?? null,
    nombreCompleto: perfil.nombre_completo ?? null,
    rolNombre,
    esAdmin,
    esGerente,
    esCoordinador,
    esGlobal: esAdmin || esGerente,
  };
});
