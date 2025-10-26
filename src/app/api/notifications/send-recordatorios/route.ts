"use server";

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase.server";
import { dispatchNotificationChannels } from "@/lib/notificationsDelivery";

const CRON_SECRET = process.env.NOTIFICATIONS_CRON_SECRET;

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: NextRequest) {
  if (CRON_SECRET) {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
      return unauthorizedResponse();
    }
  }

  const supabase = createServiceRoleClient();
  const nowIso = new Date().toISOString();

  const { data: configData, error: configError } = await supabase
    .from("configuracion_sistema")
    .select(
      "notificaciones_push, notificaciones_recordatorios, push_provider, push_vapid_public, push_vapid_private, push_vapid_subject",
    )
    .eq("id", 1)
    .maybeSingle();

  if (configError) {
    return NextResponse.json({ error: configError.message }, { status: 500 });
  }

  if (
    !configData?.notificaciones_push ||
    !configData.notificaciones_recordatorios ||
    configData.push_provider !== "webpush" ||
    !configData.push_vapid_public ||
    !configData.push_vapid_private
  ) {
    return NextResponse.json({ processed: 0, skipped: "Push notifications disabled" });
  }

  const { data: pendientes, error } = await supabase
    .from("recordatorio")
    .select(
      "id, titulo, descripcion, prioridad, fecha_recordatorio, vendedor_id, notificar_push, data",
    )
    .eq("notificar_push", true)
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

  let successCount = 0;
  const failures: Array<{ id: string; error: string }> = [];

  for (const recordatorio of pendientes) {
    try {
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

      await supabase.from("notificacion").insert({
        usuario_id: recordatorio.vendedor_id,
        tipo: "sistema",
        titulo: recordatorio.titulo,
        mensaje,
        data: dataPayload,
      });

      await dispatchNotificationChannels(
        {
          userId: recordatorio.vendedor_id,
          titulo: recordatorio.titulo,
          mensaje,
          tipo: "sistema",
          createdAt: new Date().toISOString(),
          data: dataPayload,
          url: "/dashboard/agenda?tab=recordatorios",
        },
        {
          emailEnabled: false,
          pushEnabled: true,
          recordatoriosEnabled: true,
        },
        {
          push: {
            provider: "webpush",
            vapidPublicKey: configData.push_vapid_public,
            vapidPrivateKey: configData.push_vapid_private,
            subject: configData.push_vapid_subject ?? null,
          },
        },
        { supabaseClient: supabase },
      );

      await supabase
        .from("recordatorio")
        .update({ enviado: true, updated_at: new Date().toISOString() })
        .eq("id", recordatorio.id);

      successCount += 1;
    } catch (err) {
      failures.push({
        id: recordatorio.id,
        error: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  }

  return NextResponse.json({
    processed: pendientes.length,
    success: successCount,
    failures,
  });
}
