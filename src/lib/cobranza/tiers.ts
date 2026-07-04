// Pure collections-alert tier logic (no side effects, no DB access).
//
// Mirrors crm.v_cobranza.estado_cobranza (supabase/migrations/20260406000000_cobranza.sql)
// but expressed in TypeScript so it is unit-testable with injected dates, and adds the
// 90-day backfill cap. Tier `en_mora` in the SQL view maps to `tipo_alerta = 'mora'` here.
// See openspec/changes/cobranza-alertas/design.md (D3, D4, D5, D8).

const MS_PER_DAY = 86_400_000;
const OVERDUE_CAP_DAYS = 90;

export type TipoAlertaCobranza =
  | "por_vencer_15d"
  | "por_vencer_7d"
  | "por_vencer_3d"
  | "vencida"
  | "mora";

export interface ComputeTierInput {
  /** "YYYY-MM-DD" — cuota.fecha_vencimiento (date column, no time component). */
  fechaVencimiento: string;
  /** cuota.estado (e.g. "pendiente", "vencida", "en_mora", "parcial", "pagada"). */
  estado: string;
  /** "YYYY-MM-DD" — Lima calendar date, from limaToday(). */
  today: string;
}

/**
 * Returns today's calendar date in América/Lima, formatted "YYYY-MM-DD".
 * Lima has no DST (UTC-5 year-round), so a timezone-aware Intl format is
 * sufficient — no manual UTC offset arithmetic needed.
 */
export function limaToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(now);
}

function parseDateOnlyUTC(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

/** Calendar days between two "YYYY-MM-DD" dates, computed as `to - from`. */
function diffCalendarDays(from: string, to: string): number {
  return Math.round((parseDateOnlyUTC(to) - parseDateOnlyUTC(from)) / MS_PER_DAY);
}

/**
 * Maps a cuota's due date/estado to its collections tier (`tipo_alerta`), or
 * `null` if no alert should fire (cuota is paid, still far from due, or past
 * the 90-day overdue cap). The 90-day cap applies unconditionally — even a
 * cuota already flagged `en_mora` stops alerting once it crosses the cap.
 */
export function computeTier(input: ComputeTierInput): TipoAlertaCobranza | null {
  const { fechaVencimiento, estado, today } = input;
  if (estado === "pagada") return null;

  const diasAtraso = diffCalendarDays(fechaVencimiento, today); // > 0 = overdue
  if (diasAtraso > OVERDUE_CAP_DAYS) return null;

  if (estado === "en_mora" || diasAtraso > 3) return "mora";
  if (diasAtraso > 0) return "vencida";

  const diasParaVencer = -diasAtraso;
  if (diasParaVencer <= 3) return "por_vencer_3d";
  if (diasParaVencer <= 7) return "por_vencer_7d";
  if (diasParaVencer <= 15) return "por_vencer_15d";
  return null;
}

export interface ReminderMessageInput {
  clienteNombre: string;
  numeroCuota: number;
  monto: number;
  moneda: string;
  /** "YYYY-MM-DD" — cuota.fecha_vencimiento. */
  fechaVencimiento: string;
}

/**
 * Formal Peruvian ("usted") collections reminder copy, per design D8.
 * The result is passed to buildWhatsAppUrl() by the UI layer (slice 2) to
 * build the wa.me link — this function only produces the plain-text body.
 */
export function buildReminderMessage(input: ReminderMessageInput): string {
  const { clienteNombre, numeroCuota, monto, moneda, fechaVencimiento } = input;

  const montoFormateado = new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(monto);

  const fechaFormateada = new Intl.DateTimeFormat("es-PE", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(parseDateOnlyUTC(fechaVencimiento)));

  return (
    `Estimado(a) ${clienteNombre}, le escribimos de AMERSUR en relación a su cuota N.° ${numeroCuota} ` +
    `por ${moneda} ${montoFormateado} con vencimiento el ${fechaFormateada}. Le agradeceríamos comunicarse ` +
    `con nosotros para regularizar su pago. Quedamos atentos a su respuesta.`
  );
}
