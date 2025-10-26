"use server";

import { createServerActionClient } from "@/lib/supabase.server-actions";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { createServiceRoleClient } from "@/lib/supabase.server";

type AnySupabaseClient =
  | SupabaseClient<Record<string, unknown>, "public", Record<string, unknown>>
  | ReturnType<typeof createServiceRoleClient>;

export interface NotificationDeliveryPayload {
  userId: string;
  email?: string | null;
  titulo: string;
  mensaje: string;
  tipo: string;
  data?: Record<string, unknown> | null;
  createdAt: string;
  url?: string | null;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  recordatoriosEnabled: boolean;
}

export interface NotificationChannelConfig {
  push?: {
    provider: "webpush";
    vapidPublicKey: string;
    vapidPrivateKey: string;
    subject?: string | null;
  };
}

export async function dispatchNotificationChannels(
  payload: NotificationDeliveryPayload,
  prefs: NotificationPreferences,
  config?: NotificationChannelConfig,
  context?: { supabaseClient?: AnySupabaseClient },
) {
  const isRecordatorio = Boolean((payload.data as Record<string, unknown> | undefined)?.recordatorio_id);
  const allowRecordatorio = !isRecordatorio || prefs.recordatoriosEnabled;

  if (prefs.emailEnabled && allowRecordatorio) {
    await sendEmailNotification(payload);
  }

  if (prefs.pushEnabled && allowRecordatorio && config?.push) {
    await sendPushNotification(payload, config.push, context);
  }
}

async function sendEmailNotification(payload: NotificationDeliveryPayload) {
  if (!payload.email) {
    console.info("Notificación por email omitida: usuario sin correo", { userId: payload.userId });
    return;
  }

  console.info(`Stub email notification -> ${payload.email}: ${payload.titulo}`, {
    message: payload.mensaje,
    type: payload.tipo,
    data: payload.data ?? null,
  });
}

async function sendPushNotification(
  payload: NotificationDeliveryPayload,
  pushConfig: NonNullable<NotificationChannelConfig["push"]>,
  context?: { supabaseClient?: AnySupabaseClient },
) {
  const webpush = await loadWebPushModule();
  if (!webpush) {
    console.warn("Librería web-push no disponible; notificación push omitida.");
    return;
  }

  const supabase = context?.supabaseClient ?? (await createServerActionClient());

  const {
    data: subscriptions,
    error,
  } = await supabase
    .from("push_subscription")
    .select("id, endpoint, p256dh, auth")
    .eq("usuario_id", payload.userId);

  if (error) {
    console.warn("No se pudieron obtener suscripciones push:", error.message);
    return;
  }

  const subscriptionRows =
    (subscriptions ?? []) as Array<{
      id: string;
      endpoint: string;
      p256dh: string;
      auth: string;
    }>;

  if (subscriptionRows.length === 0) {
    return;
  }

  const subject = pushConfig.subject ?? "mailto:notificaciones@amersurcrm.com";
  webpush.setVapidDetails(subject, pushConfig.vapidPublicKey, pushConfig.vapidPrivateKey);

  const baseData = { ...(payload.data ?? {}) } as Record<string, unknown>;
  if (payload.url && !baseData.url) {
    baseData.url = payload.url;
  }
  if (!baseData.url) {
    baseData.url = "/dashboard";
  }
  baseData.created_at = payload.createdAt;
  baseData.tipo = payload.tipo;

  const pushPayload = JSON.stringify({
    title: payload.titulo,
    body: payload.mensaje,
    data: baseData,
  });

  await Promise.all(
    subscriptionRows.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          pushPayload,
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscription").delete().eq("id", subscription.id);
        } else {
          console.warn("Error enviando push notification:", err);
        }
      }
    }),
  );
}

async function loadWebPushModule(): Promise<typeof import("web-push")["default"] | null> {
  try {
    const dynamicImport = new Function("moduleName", "return import(moduleName);");
    const mod = (await dynamicImport("web-push")) as { default: typeof import("web-push")["default"] };
    return mod.default;
  } catch (error) {
    console.warn("No se pudo cargar el módulo web-push:", error);
    return null;
  }
}
