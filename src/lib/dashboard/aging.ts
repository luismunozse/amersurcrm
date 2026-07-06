/**
 * Pure aging-lead predicate for the command-center funnel block
 * (design.md ADR-3, spec.md "Gerencia/coordinador command center priority
 * order"). Kept side-effect-free and unit-tested; the DB-facing two-step
 * query lives in `command-center.server.ts`.
 */

/** User-ratified staleness threshold, in days. */
export const AGING_THRESHOLD_DAYS = 3;

// Mirrors the SQL-level exclusion in command-center.server.ts's candidate
// query (defense-in-depth — the DB filter already keeps these out of the
// list this predicate runs against). Full estado_cliente CHECK list
// (20260512000000_estado_propietario.sql): por_contactar, contactado,
// intermedio, potencial, en_proceso, propietario, desestimado, transferido.
//  - 'desestimado' : lead discarded — nothing left to chase.
//  - 'transferido' : ownership moved elsewhere — no longer this org's follow-up.
//  - 'propietario' : terminal state (client already bought, set by
//                     cerrar_proceso_y_crear_venta) — no "next action" left.
// 'en_proceso' is deliberately NOT excluded: a client mid-sale-process can
// still go stale if follow-up lapses.
const ESTADOS_EXCLUIDOS = new Set(["desestimado", "transferido", "propietario"]);

export type AgingClienteInput = {
  estado_cliente: string;
  ultimo_contacto: string | null;
};

/**
 * A lead is aging when: it is not desestimado/transferido, AND its last
 * contact is null or at least `thresholdDays` old, AND it has no future
 * scheduled action (`hasFutureAction=false`).
 *
 * Boundary is inclusive (elapsed >= thresholdDays) to match the spec's
 * explicit "exactly 3 days ago" scenario — design.md's SQL sketch
 * (`ultimo_contacto < now() - interval '3 days'`) is illustrative, not the
 * literal boundary contract.
 */
export function isAgingLead(
  cliente: AgingClienteInput,
  hasFutureAction: boolean,
  now: Date = new Date(),
  thresholdDays: number = AGING_THRESHOLD_DAYS,
): boolean {
  if (ESTADOS_EXCLUIDOS.has(cliente.estado_cliente)) return false;
  if (hasFutureAction) return false;
  if (cliente.ultimo_contacto === null) return true;

  const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
  const elapsedMs = now.getTime() - new Date(cliente.ultimo_contacto).getTime();
  return elapsedMs >= thresholdMs;
}
