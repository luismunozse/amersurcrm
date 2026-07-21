/**
 * Daily proactive collections alerts.
 *
 * Triggered by Vercel Cron (see vercel.json, schedule `0 13 * * *` = 08:00
 * America/Lima — load-bearing, see design D5). Each run:
 *   1. Refreshes mora state via `crm.actualizar_cuotas_vencidas()` so tier
 *      evaluation reads just-computed `cuota.estado`/`monto_mora`. Aborts
 *      (500) if the refresh fails — evaluating tiers against stale state
 *      is worse than not running at all.
 *   2. Reads every open cuota (`estado != 'pagada'`) with venta/cliente
 *      context, bounded to a `fecha_vencimiento` window of
 *      [today-91d, today+16d] (mirrors the tiers' [due-15d, overdue-90d]
 *      range with a ±1 day margin) and excluding cuotas whose venta.estado
 *      is `cancelada`/`suspendida` (mirrors `crm.v_cobranza`).
 *   3. Maps each cuota to a collections tier via `computeTier()` (pure logic,
 *      src/lib/cobranza/tiers.ts), which also enforces the 90-day overdue cap.
 *   4. Upserts `crm.alerta_cobranza` rows, relying on the unique
 *      `(cuota_id, tipo_alerta)` index + `ignoreDuplicates` for dedup. A
 *      conflicting (pre-existing) row is silently skipped here — it never
 *      comes back via `.select()` RETURNING, which is exactly why step 5
 *      below exists.
 *   5. Retries stuck alerts: reads every `crm.alerta_cobranza` row still
 *      `enviada = false` (a prior run generated it but never successfully
 *      dispatched it — see step 8), excluding rows already produced by
 *      step 4 this run and rows whose cuota's venta is now
 *      `cancelada`/`suspendida` (a cancelled sale needs no further
 *      collections follow-up — see the inline comment at the query for why
 *      leaving those `enviada = false` forever is intentional, not a bug).
 *   6. Unions step 4's freshly-inserted alerts with step 5's retried alerts
 *      into one list; both flow through the same recipient-resolution and
 *      dispatch pipeline below — a retried alert is indistinguishable from
 *      a brand-new one once it reaches step 7.
 *   7. Resolves recipients (cliente owner — vendedor_username /
 *      vendedor_asignado / created_by — plus active global-role holders)
 *      and inserts one `crm.notificacion` row per unique recipient, per
 *      alert in the union. Aborts (500) if recipient resolution fails.
 *   8. Marks `enviada = true` only for alerts that resolved at least one
 *      recipient AND whose notification insert succeeded. Everything else
 *      is left `enviada = false`, to be picked up by step 5 on a future
 *      run — that `WHERE NOT enviada` read is the *only* place that
 *      implements retry; the upsert in step 4 does not (see step 4 note).
 *
 * See openspec/changes/cobranza-alertas/design.md for the full architecture.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase.server";
import { computeTier, limaToday, type TipoAlertaCobranza } from "@/lib/cobranza/tiers";
import { GLOBAL_ROLES } from "@/lib/auth/extension-auth";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

interface ClienteContext {
  id: string;
  nombre: string;
  vendedor_username: string | null;
  vendedor_asignado: string | null;
  created_by: string | null;
}

interface CuotaContextRow {
  id: string;
  numero_cuota: number;
  monto_programado: number;
  moneda: string;
  fecha_vencimiento: string;
  estado: string;
  venta: { estado: string; cliente: ClienteContext | null } | null;
}

interface AlertaPendienteRow {
  id: string;
  cuota_id: string;
  tipo_alerta: string;
  cuota: CuotaContextRow | null;
}

interface PerfilRow {
  id: string;
  username: string;
  rol: { nombre: string } | { nombre: string }[] | null;
  coordinador_id: string | null;
}

function rolNombreDe(perfil: PerfilRow): string | undefined {
  return Array.isArray(perfil.rol) ? perfil.rol[0]?.nombre : perfil.rol?.nombre;
}

const MS_PER_DAY = 86_400_000;

/** Shifts a "YYYY-MM-DD" date string by `days` (negative allowed), UTC-safe. */
function shiftDateStr(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

async function handleRequest(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cobranza-alertas] CRON_SECRET no configurado");
    return unauthorized();
  }
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return unauthorized();
  }

  const supabase = createServiceRoleClient();
  const supabaseCrm = supabase.schema("crm");

  // 1. Refresh mora state (cuota.estado / monto_mora) before evaluating tiers.
  // Abort on failure: evaluating tiers against stale state is worse than not
  // running at all (spec: refresh MUST precede evaluation).
  const { error: refreshError } = await supabaseCrm.rpc("actualizar_cuotas_vencidas");
  if (refreshError) {
    console.error("[cobranza-alertas] Error refrescando cuotas vencidas:", refreshError);
    return NextResponse.json({ error: refreshError.message }, { status: 500 });
  }

  const today = limaToday();
  // Tiers only fire within [due-15d, overdue-90d] (tiers.ts); a ±1 day
  // margin absorbs boundary/timezone skew. Bounding the query also avoids
  // relying on PostgREST's default ~1000-row page for a table that can
  // otherwise accumulate stale cuotas outside the alerting window.
  const windowStart = shiftDateStr(today, -91);
  const windowEnd = shiftDateStr(today, 16);

  // 2. Read every open cuota with venta/cliente context.
  // NOTE: PostgREST embedded-resource filters do NOT filter parent rows
  // unless the join hint is `!inner` — a plain `venta:venta!venta_id(...)`
  // filter on `venta.estado` would only prune the nested object, never
  // exclude the cuota row itself. `!inner` + `.not(...)` below excludes
  // cuotas of cancelled/suspended ventas (mirrors crm.v_cobranza,
  // 20260406000000_cobranza.sql:64).
  const { data: cuotasData, error: cuotasError } = await supabaseCrm
    .from("cuota")
    .select(
      "id, numero_cuota, monto_programado, moneda, fecha_vencimiento, estado, venta:venta!venta_id!inner(estado, cliente:cliente!cliente_id(id, nombre, vendedor_username, vendedor_asignado, created_by))",
    )
    .neq("estado", "pagada")
    .not("venta.estado", "in", '("cancelada","suspendida")')
    .gte("fecha_vencimiento", windowStart)
    .lte("fecha_vencimiento", windowEnd);

  if (cuotasError) {
    return NextResponse.json({ error: cuotasError.message }, { status: 500 });
  }

  const cuotaById = new Map<string, CuotaContextRow>();
  const rows: Array<{ cuota_id: string; tipo_alerta: TipoAlertaCobranza }> = [];

  for (const cuota of ((cuotasData ?? []) as unknown as CuotaContextRow[])) {
    cuotaById.set(cuota.id, cuota);
    const tipoAlerta = computeTier({
      fechaVencimiento: cuota.fecha_vencimiento,
      estado: cuota.estado,
      today,
    });
    if (tipoAlerta) {
      rows.push({ cuota_id: cuota.id, tipo_alerta: tipoAlerta });
    }
  }

  // 4. Insert new alerts; conflicting (cuota_id, tipo_alerta) pairs are
  // skipped by `ignoreDuplicates` and never appear in `RETURNING` — that is
  // NOT a retry mechanism, it is pure dedup (see step 5 for the actual
  // retry path). Skipped entirely when there is nothing new to insert.
  let nuevasAlertas: Array<{ id: string; cuota_id: string; tipo_alerta: string }> = [];
  if (rows.length > 0) {
    const { data: insertadasData, error: insertError } = await supabaseCrm
      .from("alerta_cobranza")
      .upsert(rows, { onConflict: "cuota_id,tipo_alerta", ignoreDuplicates: true })
      .select("id, cuota_id, tipo_alerta");

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    nuevasAlertas = (insertadasData ?? []) as Array<{
      id: string;
      cuota_id: string;
      tipo_alerta: string;
    }>;
  }

  // 5. Retry path: read every alert still `enviada = false`, regardless of
  // which run generated it. This is the ONLY query in the whole route that
  // filters on `enviada` — it is what makes "leave enviada=false so a future
  // run retries it" (step 8) actually true. Excludes:
  //   (a) alerts just inserted above (`nuevasIds`) — they are already in
  //       `nuevasAlertas`; including them again would double-dispatch and
  //       double-count them.
  //   (b) alerts whose cuota's venta is now cancelada/suspendida. A
  //       cancelled sale needs no further collections follow-up, so these
  //       rows are deliberately left `enviada = false` FOREVER rather than
  //       flipped to `true` as a synthetic "closed" marker: `enviada` means
  //       "a notification was actually dispatched" (the same invariant
  //       FIX 2c enforces for zero-recipient alerts below), and misusing it
  //       to mean "no longer relevant" would corrupt that meaning for any
  //       future audit. The row is harmless dead weight — this same filter
  //       excludes it from every future run's retry sweep too, so it is
  //       never re-evaluated, just never touched again.
  //   (c) alerts whose cuota is now `pagada`. A paid cuota needs no further
  //       collections follow-up either — same accepted semantics as (b):
  //       these rows are deliberately left `enviada = false` FOREVER rather
  //       than flipped to `true`, for the identical "enviada means actually
  //       dispatched" reasoning. Harmless dead weight, permanently excluded
  //       from every future retry sweep by this same filter.
  // Bounded and deterministic: oldest-first (`fecha_alerta` ascending) so
  // stuck alerts retry in FIFO order, capped at 500 rows/run to avoid a
  // silent PostgREST default-page-size truncation — 500/day retry
  // throughput is far above any plausible stuck-alert volume.
  const nuevasIds = new Set(nuevasAlertas.map((a) => a.id));
  const { data: pendientesData, error: pendientesError } = await supabaseCrm
    .from("alerta_cobranza")
    .select(
      "id, cuota_id, tipo_alerta, cuota:cuota!cuota_id!inner(id, numero_cuota, monto_programado, moneda, fecha_vencimiento, estado, venta:venta!venta_id!inner(estado, cliente:cliente!cliente_id(id, nombre, vendedor_username, vendedor_asignado, created_by)))",
    )
    .eq("enviada", false)
    .not("cuota.venta.estado", "in", '("cancelada","suspendida")')
    .neq("cuota.estado", "pagada")
    .order("fecha_alerta", { ascending: true })
    .limit(500);

  if (pendientesError) {
    console.error("[cobranza-alertas] Error leyendo alertas pendientes de reintento:", pendientesError);
    return NextResponse.json({ error: pendientesError.message }, { status: 500 });
  }

  const alertasReintento = ((pendientesData ?? []) as unknown as AlertaPendienteRow[]).filter(
    (a) => !nuevasIds.has(a.id),
  );

  // Register each retried alert's cuota/venta/cliente context so the
  // recipient-resolution loop below (keyed off `cuotaById`) resolves it
  // exactly like a freshly-generated alert, with no separate code path.
  for (const pendiente of alertasReintento) {
    if (pendiente.cuota) cuotaById.set(pendiente.cuota_id, pendiente.cuota);
  }

  // 6. Union of step 4 (new) and step 5 (retried) — from here on both are
  // processed identically.
  const alertasAProcesar: Array<{ id: string; cuota_id: string; tipo_alerta: string }> = [
    ...nuevasAlertas,
    ...alertasReintento.map((a) => ({ id: a.id, cuota_id: a.cuota_id, tipo_alerta: a.tipo_alerta })),
  ];

  if (alertasAProcesar.length === 0) {
    return NextResponse.json({ generadas: 0, reintentadas: 0, notificaciones: 0 });
  }

  // 7. Resolve recipients: active profiles (username -> id map + global-role broadcast).
  // Abort on failure instead of proceeding: an unresolved recipient list
  // guarantees an empty fan-out while still (falsely) reporting success.
  const { data: perfilesData, error: perfilesError } = await supabaseCrm
    .from("usuario_perfil")
    .select("id, username, rol:rol_id(nombre), coordinador_id")
    .eq("activo", true);

  if (perfilesError) {
    console.error("[cobranza-alertas] Error resolviendo destinatarios:", perfilesError);
    return NextResponse.json({ error: perfilesError.message }, { status: 500 });
  }

  const perfilesActivos = (perfilesData ?? []) as unknown as PerfilRow[];
  const usernameToId = new Map<string, string>();
  const globalRoleIds: string[] = [];
  // Set of active perfil ids, used below to validate `cliente.created_by`
  // before treating it as a notification recipient (FIX: created_by has no
  // FK, unlike notificacion.usuario_id -> auth.users; an orphaned or
  // inactive created_by would otherwise poison the single all-or-nothing
  // notification insert for the whole cohort).
  const perfilIds = new Set(perfilesActivos.map((p) => p.id));
  // Maps a vendedor's username to their coordinador's auth.users id (if
  // assigned) — used below so the owning vendedor's coordinador is notified
  // for their team's cobranza alerts, team-scoped (not every coordinador).
  const usernameToCoordinadorId = new Map<string, string>();
  for (const perfil of perfilesActivos) {
    usernameToId.set(perfil.username, perfil.id);
    const rolNombre = rolNombreDe(perfil);
    if (rolNombre && (GLOBAL_ROLES as readonly string[]).includes(rolNombre)) {
      globalRoleIds.push(perfil.id);
    }
    if (perfil.coordinador_id) {
      usernameToCoordinadorId.set(perfil.username, perfil.coordinador_id);
    }
  }

  const notificacionesInsert: Array<Record<string, unknown>> = [];
  // Tracks, per alert, whether at least one recipient was resolved — an
  // alert with zero recipients must NOT be marked `enviada` even if the
  // (empty-for-it) notification batch insert succeeds.
  const alertaTuvoDestinatarios = new Map<string, boolean>();
  for (const alerta of alertasAProcesar) {
    const cuota = cuotaById.get(alerta.cuota_id);
    const cliente = cuota?.venta?.cliente ?? null;
    const ownerUsername = cliente?.vendedor_username || cliente?.vendedor_asignado || null;
    const ownerId = ownerUsername ? usernameToId.get(ownerUsername) : undefined;

    // Owner resolution: vendedor_username, falling back to vendedor_asignado
    // (a single fallback chain — only the first non-null username counts as
    // "the owner"), resolved to an id via usernameToId; created_by (already
    // an auth.users.id, no username lookup needed) is added as its own,
    // independent recipient. This is an intentional single-notify-owner
    // fallback per design D2 — it does NOT mirror crm.p1_puede_ver_cliente's
    // RLS semantics, where the three signals are an independent OR (any one
    // alone grants access); here they are combined into "owner" (first
    // match) plus "creator" (always checked), not three alternative checks.
    // created_by is only trusted if it matches an id already fetched into
    // `perfilIds` above: `cliente.created_by` has NO FK constraint (unlike
    // `notificacion.usuario_id`, which does), so an orphaned created_by
    // would otherwise fail the notification insert and wedge the whole
    // cohort. Checking against `perfilIds` (built from `activo = true`
    // profiles) also means an inactive creator is skipped — desirable,
    // since an inactive user should not receive new notifications either.
    const recipientIds = new Set<string>(globalRoleIds);
    if (ownerId) recipientIds.add(ownerId);
    if (cliente?.created_by && perfilIds.has(cliente.created_by)) {
      recipientIds.add(cliente.created_by);
    }
    // Team-scoped coordinador notification: the owning vendedor's OWN
    // coordinador (via coordinador_id), not every active coordinador —
    // restores what GLOBAL_ROLES used to do broadly, now correctly scoped.
    const coordinadorId = ownerUsername ? usernameToCoordinadorId.get(ownerUsername) : undefined;
    if (coordinadorId) recipientIds.add(coordinadorId);

    alertaTuvoDestinatarios.set(alerta.id, recipientIds.size > 0);

    const titulo = `Alerta de cobranza: ${alerta.tipo_alerta}`;
    const mensaje = cliente
      ? `La cuota N.° ${cuota?.numero_cuota} de ${cliente.nombre} requiere seguimiento (${alerta.tipo_alerta}).`
      : `Una cuota requiere seguimiento (${alerta.tipo_alerta}).`;

    for (const usuarioId of recipientIds) {
      notificacionesInsert.push({
        usuario_id: usuarioId,
        tipo: "sistema",
        titulo,
        mensaje,
        data: {
          alerta_id: alerta.id,
          cuota_id: alerta.cuota_id,
          tipo_alerta: alerta.tipo_alerta,
          url: "/dashboard/cobranza?tab=alertas",
        },
      });
    }
  }

  let notifOk = true;
  if (notificacionesInsert.length > 0) {
    // Single all-or-nothing INSERT for the whole cohort — no chunking is
    // implemented; that is an accepted tradeoff at this volume (see
    // design.md). On failure the entire cohort's alerts stay
    // `enviada = false` and are picked up by the next run's pending-retry
    // read (step 5 above), not lost.
    const { error: notifError } = await supabaseCrm.from("notificacion").insert(notificacionesInsert);
    if (notifError) {
      console.error("[cobranza-alertas] Error insertando notificaciones:", notifError);
      notifOk = false;
    }
  }

  // 8. Mark dispatched alerts. Only flip `enviada = true` for alerts that
  // (a) resolved at least one recipient AND (b) whose notification insert
  // actually succeeded. Everything else stays `enviada = false` so step 5's
  // `WHERE NOT enviada` read lets a future run retry it.
  const alertaIds = notifOk
    ? alertasAProcesar.filter((a) => alertaTuvoDestinatarios.get(a.id)).map((a) => a.id)
    : [];

  let updateError: { message: string } | null = null;
  if (alertaIds.length > 0) {
    const { error } = await supabaseCrm
      .from("alerta_cobranza")
      .update({ enviada: true })
      .in("id", alertaIds);
    updateError = error;
    if (updateError) {
      console.error("[cobranza-alertas] Error marcando alertas como enviadas:", updateError);
    }
  }

  if (!notifOk) {
    return NextResponse.json(
      {
        generadas: nuevasAlertas.length,
        reintentadas: alertasReintento.length,
        notificaciones: 0,
        enviadas: alertaIds.length,
        error: "No se pudieron insertar las notificaciones de cobranza",
      },
      { status: 500 },
    );
  }

  // If notifications were dispatched successfully but persisting `enviada =
  // true` fails, we are stuck in an unavoidable duplicate-risk window: the
  // notifications are already sent and cannot be un-sent, yet the alerts
  // still read `enviada = false` and WILL be re-picked-up (and
  // re-dispatched, duplicating notifications) by step 5 on the next run.
  // There is no way to roll this back from here — surfacing it loudly (500
  // + a response that reflects reality instead of pretending success) is
  // the only mitigation, so an operator can investigate immediately instead
  // of the failure silently recurring every day.
  if (updateError) {
    return NextResponse.json(
      {
        generadas: nuevasAlertas.length,
        reintentadas: alertasReintento.length,
        notificaciones: notificacionesInsert.length,
        enviadas_persistidas: 0,
        error: `No se pudo persistir el estado enviada de las alertas: ${updateError.message}`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    generadas: nuevasAlertas.length,
    reintentadas: alertasReintento.length,
    notificaciones: notificacionesInsert.length,
    enviadas: alertaIds.length,
  });
}

export async function GET(req: NextRequest) {
  return handleRequest(req);
}

export async function POST(req: NextRequest) {
  return handleRequest(req);
}
