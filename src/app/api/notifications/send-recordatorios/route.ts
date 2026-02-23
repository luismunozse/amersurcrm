import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase.server";
import { dispatchNotificationChannels } from "@/lib/notificationsDelivery";

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

async function handleRequest(req: NextRequest) {
  // Vercel envía automáticamente Authorization: Bearer <CRON_SECRET>
  // cuando CRON_SECRET está configurado en las variables de entorno
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    // Si no hay CRON_SECRET configurado, rechazar por seguridad
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

  // Determinar si el envío push está habilitado (opcional — no bloquea las notificaciones in-app)
  const pushHabilitado =
    configData?.notificaciones_push === true &&
    configData.notificaciones_recordatorios === true &&
    configData.push_provider === "webpush" &&
    !!configData.push_vapid_public &&
    !!configData.push_vapid_private;

  // Buscar recordatorios pendientes de todos modos (sin filtrar por notificar_push)
  const { data: pendientes, error } = await supabaseCrm
    .from("recordatorio")
    .select(
      "id, titulo, descripcion, prioridad, fecha_recordatorio, vendedor_id, notificar_push, data",
    )
    .eq("completado", false)
    .eq("enviado", false)
    .lte("fecha_recordatorio", nowIso)
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!pendientes || pendientes.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  const failures: Array<{ id: string; error: string }> = [];

  // Preparar todos los datos primero
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

  // Batch insert de todas las notificaciones in-app (siempre, independiente de push)
  const notificacionesInsert = notificacionesData.map(({ recordatorio, mensaje, dataPayload }) => ({
    usuario_id: recordatorio.vendedor_id,
    tipo: "sistema",
    titulo: recordatorio.titulo,
    mensaje,
    data: dataPayload,
  }));

  await supabaseCrm.from("notificacion").insert(notificacionesInsert);

  // Dispatch push notifications solo si está habilitado
  const successIds: string[] = [];

  if (pushHabilitado) {
    const dispatchResults = await Promise.allSettled(
      notificacionesData
        .filter(({ recordatorio }) => recordatorio.notificar_push)
        .map(({ recordatorio, mensaje, dataPayload }) =>
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
          ).then(() => recordatorio.id)
        )
    );

    dispatchResults.forEach((result, index) => {
      const filteredPendientes = pendientes.filter((r) => r.notificar_push);
      if (result.status === "fulfilled") {
        successIds.push(result.value);
      } else {
        failures.push({
          id: filteredPendientes[index]?.id ?? "",
          error: result.reason instanceof Error ? result.reason.message : "Error desconocido",
        });
      }
    });
  }

  // Marcar todos los recordatorios como enviados (la notif in-app ya fue insertada)
  const allIds = pendientes.map((r) => r.id);
  if (allIds.length > 0) {
    await supabaseCrm
      .from("recordatorio")
      .update({ enviado: true, updated_at: new Date().toISOString() })
      .in("id", allIds);
  }

  return NextResponse.json({
    processed: pendientes.length,
    success: allIds.length,
    pushDispatched: successIds.length,
    failures,
  });
}

// Vercel Cron usa GET
export async function GET(req: NextRequest) {
  return handleRequest(req);
}

// Mantener POST para llamadas manuales
export async function POST(req: NextRequest) {
  return handleRequest(req);
}
