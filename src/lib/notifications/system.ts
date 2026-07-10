import "server-only";

import { createServiceRoleClient } from "@/lib/supabase.server";
import { dispatchNotificationChannels } from "@/lib/notificationsDelivery";

export type NotificacionTipo =
  | "cliente"
  | "proyecto"
  | "lote"
  | "sistema"
  | "evento"
  | "recordatorio"
  | "venta"
  | "reserva"
  | "lead_asignado";

/**
 * Session-free counterpart to `crearNotificacion` (src/app/_actionsNotifications.ts).
 *
 * `crearNotificacion` requires an authenticated session (it throws "No autenticado"
 * otherwise) because it reads the acting user for the in-app insert's RLS check.
 * Some callers have no session to lean on — Chrome-extension routes authenticated
 * via a Bearer token that maps to a *different* user than "who is logged in right
 * now", and (in the future) cron jobs. This helper uses the service-role client
 * end-to-end, mirroring `crearNotificacion`'s exact payload shape (in-app insert +
 * push dispatch via `dispatchNotificationChannels`), so both paths notify the same
 * way regardless of which one fired.
 */
export async function crearNotificacionSistema(
  usuarioId: string,
  tipo: NotificacionTipo,
  titulo: string,
  mensaje: string,
  data?: Record<string, unknown>,
) {
  const supabase = createServiceRoleClient();
  const supabaseCrm = supabase.schema("crm");

  const [{ data: inserted, error }, configResult] = await Promise.all([
    supabaseCrm
      .from("notificacion")
      .insert({
        usuario_id: usuarioId,
        tipo,
        titulo,
        mensaje,
        data: data || null,
      })
      .select("id, tipo, titulo, mensaje, data, created_at")
      .single(),
    supabaseCrm
      .from("configuracion_sistema")
      .select(
        "notificaciones_push, notificaciones_recordatorios, push_provider, push_vapid_public, push_vapid_private, push_vapid_subject",
      )
      .eq("id", 1)
      .maybeSingle(),
  ]);

  if (error) throw new Error(error.message);

  const config = configResult?.data;
  const prefs = {
    pushEnabled: config?.notificaciones_push ?? true,
    recordatoriosEnabled: config?.notificaciones_recordatorios ?? true,
  };

  const pushConfig =
    config?.push_provider === "webpush" &&
    config.push_vapid_public &&
    config.push_vapid_private
      ? {
          push: {
            provider: "webpush" as const,
            vapidPublicKey: config.push_vapid_public,
            vapidPrivateKey: config.push_vapid_private,
            subject: config.push_vapid_subject ?? null,
          },
        }
      : undefined;

  try {
    await dispatchNotificationChannels(
      {
        userId: usuarioId,
        // No session actor to attribute an email to on this path.
        email: null,
        titulo,
        mensaje,
        tipo,
        data: data ?? null,
        createdAt: inserted.created_at,
        url: (data as { url?: string } | undefined)?.url ?? null,
      },
      prefs,
      pushConfig,
      { supabaseClient: supabase },
    );
  } catch (deliveryError) {
    console.warn("No se pudo despachar notificación externa (sistema):", deliveryError);
  }

  return inserted;
}
