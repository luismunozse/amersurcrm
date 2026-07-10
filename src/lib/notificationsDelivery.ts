"use server";

import { createServerActionClient } from "@/lib/supabase.server-actions";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { createServiceRoleClient } from "@/lib/supabase.server";

type AnySupabaseClient =
  | SupabaseClient
  | ReturnType<typeof createServiceRoleClient>;
type WebPushModule = typeof import("web-push");

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

/** Outcome of a single push dispatch attempt, in terms real callers can trust. */
export interface PushDispatchOutcome {
  /** Subscriptions found for the target user. */
  attempted: number;
  /** Deliveries that succeeded. */
  sent: number;
  /** Deliveries that failed for a reason other than an expired subscription. */
  failed: number;
  /** Subscriptions removed because the push service reported them gone (404/410). */
  pruned: number;
}

export interface NotificationDispatchResult {
  push?: PushDispatchOutcome;
}

export async function dispatchNotificationChannels(
  payload: NotificationDeliveryPayload,
  prefs: NotificationPreferences,
  config?: NotificationChannelConfig,
  context?: { supabaseClient?: AnySupabaseClient },
): Promise<NotificationDispatchResult> {
  const isRecordatorio = Boolean((payload.data as Record<string, unknown> | undefined)?.recordatorio_id);
  const allowRecordatorio = !isRecordatorio || prefs.recordatoriosEnabled;

  if (prefs.pushEnabled && allowRecordatorio && config?.push) {
    const push = await sendPushNotification(payload, config.push, context);
    return { push };
  }

  return {};
}

async function sendPushNotification(
  payload: NotificationDeliveryPayload,
  pushConfig: NonNullable<NotificationChannelConfig["push"]>,
  context?: { supabaseClient?: AnySupabaseClient },
): Promise<PushDispatchOutcome> {
  const empty: PushDispatchOutcome = { attempted: 0, sent: 0, failed: 0, pruned: 0 };

  const webpush = await loadWebPushModule();
  if (!webpush) {
    console.warn("Librería web-push no disponible; notificación push omitida.");
    return empty;
  }

  const supabase = context?.supabaseClient ?? (await createServerActionClient());
  // Always pin the schema explicitly: callers may pass a service-role client
  // (whose default schema is "public"), and relying on the caller's default
  // silently turns this into a no-op query against a nonexistent table.
  const crmSchema = supabase.schema("crm");

  const {
    data: subscriptions,
    error,
  } = await crmSchema
    .from("push_subscription")
    .select("id, endpoint, p256dh, auth")
    .eq("usuario_id", payload.userId);

  if (error) {
    // Surface the failure instead of swallowing it into a false "success" —
    // callers (e.g. the test-push action, the recordatorios cron) rely on
    // this to report real failures instead of "0/N sent" as success.
    throw new Error(`No se pudieron obtener suscripciones push: ${error.message}`);
  }

  const subscriptionRows =
    (subscriptions ?? []) as Array<{
      id: string;
      endpoint: string;
      p256dh: string;
      auth: string;
    }>;

  if (subscriptionRows.length === 0) {
    return empty;
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

  let sent = 0;
  let failed = 0;
  let pruned = 0;

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
        sent += 1;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await crmSchema.from("push_subscription").delete().eq("id", subscription.id);
          pruned += 1;
        } else {
          failed += 1;
          console.warn("Error enviando push notification:", err);
        }
      }
    }),
  );

  return { attempted: subscriptionRows.length, sent, failed, pruned };
}

async function loadWebPushModule(): Promise<WebPushModule | null> {
  try {
    const mod = await import("web-push");
    const webpushModule =
      ("default" in mod && mod.default ? mod.default : (mod as unknown)) as WebPushModule;
    return webpushModule;
  } catch (error) {
    console.warn("No se pudo cargar el módulo web-push:", error);
    return null;
  }
}
