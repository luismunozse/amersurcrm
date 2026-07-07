/**
 * Pure aging-lead predicate for the command-center funnel block
 * (design.md ADR-3, spec.md "Gerencia/coordinador command center priority
 * order"). Kept side-effect-free and unit-tested; the DB-facing two-step
 * query lives in `command-center.server.ts`.
 */

/** User-ratified staleness threshold, in days. */
export const AGING_THRESHOLD_DAYS = 3;

/**
 * User-ratified recency window, in days (fix 2 — funnel/aging 90-day scope).
 *
 * Full aging-lead definition (data-provenance fix update — all four
 * conditions are ANDed together):
 *   1. Created within the last `AGING_WINDOW_DAYS` days (`fecha_alta` cutoff).
 *   2. Not desestimado/transferido/propietario (see `ESTADOS_EXCLUIDOS` below).
 *   3. More than `AGING_THRESHOLD_DAYS` days without contact, or never
 *      contacted (`ultimo_contacto` null or stale).
 *   4. Nothing scheduled — no future `fecha_proxima_accion`.
 *   5. NOT a bulk-imported cliente that has never been worked, i.e. NOT
 *      (`origen_lead = 'importacion'` AND `ultimo_contacto IS NULL`) — see
 *      `EXCLUIR_IMPORTACION_NUNCA_CONTACTADO` below.
 *
 * Conditions 1-4 are enforced by this pure predicate (`isAgingLead`) plus the
 * SQL-level `.not('estado_cliente', ...)` / `.gte('fecha_alta', ...)` filters
 * in `command-center.server.ts`. Condition 5 is enforced ONLY at the SQL
 * layer (both the candidate query and the at-cap head-count query already
 * only pass rows through that satisfy it), since `AgingClienteInput` never
 * carries `origen_lead` into this predicate — no defense-in-depth check is
 * needed here the way there is for `estado_cliente`, because condition 5 is
 * a data-provenance concern the DB query owns outright, not a business rule
 * this predicate re-derives from row data it already has.
 *
 * WHY a creation-date window at all: without it, clientes imported years ago
 * from a legacy system — with no realistic path to follow-up today — would
 * dominate the "leads sin gestionar" count and make it meaningless as a
 * priority signal. This mirrors the user's prior 90-day standing-cap
 * decision for the cobranza/mora calculation, made for the same reason
 * (legacy base != actionable data).
 *
 * WHY condition 5 is needed IN ADDITION to condition 1: bulk imports set
 * `fecha_alta` to the import date, not to any real "entered the funnel"
 * event, so a ~22k-row historical import lands squarely inside the 90-day
 * window (or even the origin day itself) and would otherwise look exactly
 * like a fresh, never-worked lead — the creation-date window alone cannot
 * tell the two apart.
 */
export const AGING_WINDOW_DAYS = 90;

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

/**
 * PostgREST `.or()` filter that excludes bulk-imported clientes that were
 * NEVER worked (data-provenance fix — see src/app/api/clientes/import/route.ts,
 * which stamps `origen_lead = 'importacion'` on every imported row).
 *
 * The predicate to EXCLUDE is `origen_lead = 'importacion' AND
 * ultimo_contacto IS NULL`. Bulk imports set `fecha_alta` to the import
 * date (not a real "lead entered the funnel" event), so the aging window
 * and the funnel's per-estado counts cannot rely on `fecha_alta` alone to
 * keep ~22k historical imported contacts from polluting them — they'd look
 * exactly like fresh, never-contacted leads. The moment someone actually
 * contacts an imported cliente (`ultimo_contacto` becomes non-null), it
 * re-enters every metric naturally — no separate "un-flag" step needed.
 *
 * Expressed via De Morgan's law since PostgREST/postgrest-js has no direct
 * "NOT (A AND B)" filter: NOT(A AND B) = (NOT A) OR (NOT B).
 *   NOT A -> origen_lead IS NULL OR origen_lead <> 'importacion'
 *   NOT B -> ultimo_contacto IS NOT NULL
 */
export const EXCLUIR_IMPORTACION_NUNCA_CONTACTADO =
  "origen_lead.is.null,origen_lead.neq.importacion,ultimo_contacto.not.is.null";

export type AgingClienteInput = {
  estado_cliente: string;
  ultimo_contacto: string | null;
  /**
   * When the cliente was created (`crm.cliente.fecha_alta`). Nullable in the
   * schema even though app code always sets it on create/reassign — treated
   * as "outside the window" (see `isWithinAgingWindow`) since recency can't
   * be confirmed without it.
   */
  fecha_alta: string | null;
};

/**
 * True when `fechaAlta` is within the last `windowDays` days of `now`.
 * Boundary is inclusive (elapsed <= windowDays) to mirror the `.gte()`
 * cutoff used by the DB-facing query in command-center.server.ts (a cliente
 * whose `fecha_alta` equals the cutoff exactly satisfies `gte`).
 */
function isWithinAgingWindow(
  fechaAlta: string | null,
  now: Date,
  windowDays: number = AGING_WINDOW_DAYS,
): boolean {
  if (fechaAlta === null) return false;
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const elapsedMs = now.getTime() - new Date(fechaAlta).getTime();
  return elapsedMs <= windowMs;
}

/**
 * A lead is aging when: it is not desestimado/transferido/propietario, AND
 * it was created within the last `windowDays` days, AND its last contact is
 * null or at least `thresholdDays` old, AND it has no future scheduled
 * action (`hasFutureAction=false`).
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
  windowDays: number = AGING_WINDOW_DAYS,
): boolean {
  if (ESTADOS_EXCLUIDOS.has(cliente.estado_cliente)) return false;
  if (hasFutureAction) return false;
  if (!isWithinAgingWindow(cliente.fecha_alta, now, windowDays)) return false;
  if (cliente.ultimo_contacto === null) return true;

  const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
  const elapsedMs = now.getTime() - new Date(cliente.ultimo_contacto).getTime();
  return elapsedMs >= thresholdMs;
}
