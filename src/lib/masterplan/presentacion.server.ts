import "server-only";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { toPlanoLoteDTO, type LoteRowParaDTO, type PlanoPresentacionDTO } from "@/lib/masterplan/dto";
import type { Masterplan } from "@/types/proyectos";

/**
 * Server-only whitelist builder for the masterplan presentation DTO. Reads
 * `proyecto.masterplan` and the proyecto's `lote` rows (schema `crm`) and
 * maps each lote through `toPlanoLoteDTO`, which never spreads the raw row —
 * so no `precio`/`moneda`/commercial field can reach the returned DTO.
 *
 * Returns `null` when the proyecto has no masterplan uploaded yet (drives the
 * presentation component's empty state), and when the proyecto itself is not
 * found.
 *
 * This is the shared entry point the dashboard presentation route calls
 * today; the deferred Phase 2 public route (`/p/[token]`) is designed to call
 * this same function once it resolves `token -> proyectoId`.
 */
export async function buildPlanoPresentacion(proyectoId: string): Promise<PlanoPresentacionDTO | null> {
  const supabase = await createServerOnlyClient();

  const { data: proyecto, error: proyectoError } = await supabase
    .from("proyecto")
    .select("masterplan")
    .eq("id", proyectoId)
    .maybeSingle();

  if (proyectoError) throw proyectoError;
  if (!proyecto) return null;

  const masterplan = (proyecto as { masterplan?: Masterplan | null }).masterplan ?? null;
  if (!masterplan?.url) return null;

  const { data: lotes, error: lotesError } = await supabase
    .from("lote")
    .select("id,codigo,estado,sup_m2,data")
    .eq("proyecto_id", proyectoId);

  if (lotesError) throw lotesError;

  return {
    imageUrl: masterplan.url,
    width: masterplan.width,
    height: masterplan.height,
    lotes: ((lotes ?? []) as LoteRowParaDTO[]).map(toPlanoLoteDTO),
  };
}
