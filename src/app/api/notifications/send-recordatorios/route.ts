import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase.server";
import { dispatchNotificationChannels } from "@/lib/notificationsDelivery";

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

async function handleRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET no está configurado en las variables de entorno");
    return unauthorizedResponse();
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return unauthorizedResponse();
  }

  const supabase = createServiceRoleClient();
  const supabaseCrm = supabase.schema("crm");
  const nowIso = new Date().toISOString();

  const { data: configData, error: configError } = await supabaseCrm
    .from("configuracion_sistema")
    .select(
      "notificaciones_push, notificaciones_recordatorios, push_provider, push_vapid_public, push_vapid_private, push_vapid_subject",
    )
    .eq("id", 1)
    .maybeSingle();

  if (configError) {
    return NextResponse.json({ error: configError.message }, { status: 500 });
  }

  const pushHabilitado =
    configData?.notificaciones_push === true &&
    configData.notificaciones_recordatorios === true &&
    configData.push_provider === "webpush" &&
    !!configData.push_vapid_public &&
    !!configData.push_vapid_private;

  const { data: pendientes, error } = await supabaseCrm
    .from("recordatorio")
    .select(
      "id, titulo, descripcion, prioridad, fecha_recordatorio, vendedor_id, notificar_push, data",
    )
    .eq("completado", false)
    .eq("enviado", false)
    .lte("fecha_recordatorio", nowIso)
    // Deterministic FIFO: failed batches stay enviado=false and get retried
    // by the next run, so without an explicit order a backlog larger than
    // the limit could starve the oldest recordatorios (mirrors the
    // cobranza-alertas cron's retry read ordering).
    .order("fecha_recordatorio", { ascending: true })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!pendientes || pendientes.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  const failures: Array<{ id: string; error: string }> = [];

  // Datos comunes
  const notificacionesData = pendientes.map((recordatorio) => {
    const mensaje =
      recordatorio.descripcion ??
      `Recordatorio programado para ${new Date(recordatorio.fecha_recordatorio).toLocaleString("es-PE")}.`;
    const dataPayload: Record<string, unknown> = {
      recordatorio_id: recordatorio.id,
      prioridad: recordatorio.prioridad,
      fecha_recordatorio: recordatorio.fecha_recordatorio,
      url: "/dashboard/agenda?tab=recordatorios",
    };
    if (recordatorio.data) {
      Object.assign(dataPayload, recordatorio.data as Record<string, unknown>);
    }
    return { recordatorio, mensaje, dataPayload };
  });

  // 1. Notificación in-app siempre (batch)
  const notificacionesInsert = notificacionesData.map(({ recordatorio, mensaje, dataPayload }) => ({
    usuario_id: recordatorio.vendedor_id,
    tipo: "sistema",
    titulo: recordatorio.titulo,
    mensaje,
    data: dataPayload,
  }));

  const { error: notifInsertError } = await supabaseCrm
    .from("notificacion")
    .insert(notificacionesInsert);

  if (notifInsertError) {
    // Safe failure: nothing was inserted, rows stay enviado=false and the
    // next 5-min run retries the whole batch. Log and keep going so the
    // response still reports per-recordatorio failures.
    console.error(
      "Error insertando notificaciones de recordatorios (se reintentará en el próximo cron):",
      notifInsertError.message,
    );
  }

  // 2. Push (solo si habilitado en config)
  const pushSuccessIds: string[] = [];
  if (pushHabilitado) {
    const pushTargets = notificacionesData.filter(
      ({ recordatorio }) => recordatorio.notificar_push,
    );
    const dispatchResults = await Promise.allSettled(
      pushTargets.map(({ recordatorio, mensaje, dataPayload }) =>
        dispatchNotificationChannels(
          {
            userId: recordatorio.vendedor_id,
            titulo: recordatorio.titulo,
            mensaje,
            tipo: "sistema",
            createdAt: new Date().toISOString(),
            data: dataPayload,
            url: "/dashboard/agenda?tab=recordatorios",
          },
          { pushEnabled: true, recordatoriosEnabled: true },
          {
            push: {
              provider: "webpush",
              vapidPublicKey: configData!.push_vapid_public,
              vapidPrivateKey: configData!.push_vapid_private,
              subject: configData!.push_vapid_subject ?? null,
            },
          },
          { supabaseClient: supabase },
        ).then((result) => ({ id: recordatorio.id, outcome: result.push })),
      ),
    );

    dispatchResults.forEach((result, index) => {
      const recordatorioId = pushTargets[index]?.recordatorio.id ?? "";
      if (result.status === "fulfilled") {
        const { id, outcome } = result.value;
        if (outcome && outcome.sent > 0) {
          // At least one device actually received the push.
          pushSuccessIds.push(id);
        } else if (!outcome || outcome.attempted > 0) {
          // Either the channel wasn't attempted, or subscriptions existed
          // but every send failed — both are real failures, not silent
          // successes.
          failures.push({
            id: recordatorioId,
            error: outcome
              ? `0/${outcome.attempted} dispositivo(s) recibieron el push (${outcome.failed} fallidos, ${outcome.pruned} expirados)`
              : "Despacho de push no ejecutado",
          });
        }
        // outcome.attempted === 0 (no subscriptions for this vendedor):
        // not a failure, simply nothing to deliver.
      } else {
        failures.push({
          id: recordatorioId,
          error: result.reason instanceof Error ? result.reason.message : "Error desconocido",
        });
      }
    });
  }

  // 3. Mark as enviado ONLY the recordatorios whose in-app insert succeeded.
  // The insert above is a single batch for every pending row, so success or
  // failure applies to the whole lot: on failure nothing gets marked
  // `enviado=true` — rows stay `enviado=false` so the next cron run (every
  // 5 min) retries them instead of silently losing them.
  const allIds = pendientes.map((r) => r.id);
  let sentIds: string[] = [];

  if (notifInsertError) {
    failures.push(
      ...allIds.map((id) => ({
        id,
        error: `No se pudo crear la notificación in-app: ${notifInsertError.message}`,
      })),
    );
  } else if (allIds.length > 0) {
    const { error: updateError } = await supabaseCrm
      .from("recordatorio")
      .update({ enviado: true, updated_at: new Date().toISOString() })
      .in("id", allIds);

    if (updateError) {
      // Unavoidable duplicate-risk window: the notifications above were
      // already inserted and cannot be un-sent, yet these recordatorios
      // still read `enviado=false`, so the next run WILL pick them up again
      // and insert duplicate notifications (crm.notificacion has no unique
      // constraint that would dedupe them). There is no way to roll this
      // back from here — surfacing it loudly (500 + a response that reflects
      // reality instead of pretending success) is the only mitigation, so an
      // operator can investigate immediately instead of the duplication
      // silently recurring every 5 minutes (same treatment as the
      // cobranza-alertas cron).
      console.error("Error marcando recordatorios como enviados:", updateError.message);
      failures.push(
        ...allIds.map((id) => ({
          id,
          error: `Notificación creada pero no se pudo marcar como enviada: ${updateError.message}`,
        })),
      );
      return NextResponse.json(
        {
          processed: pendientes.length,
          inApp: 0,
          pushDispatched: pushSuccessIds.length,
          failures,
          error: `No se pudo persistir el estado enviado de los recordatorios: ${updateError.message}`,
        },
        { status: 500 },
      );
    }

    sentIds = allIds;
  }

  return NextResponse.json({
    processed: pendientes.length,
    inApp: sentIds.length,
    pushDispatched: pushSuccessIds.length,
    failures,
  });
}

export async function GET(req: NextRequest) {
  return handleRequest(req);
}

export async function POST(req: NextRequest) {
  return handleRequest(req);
}
