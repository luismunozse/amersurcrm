"use server";

import { createServerActionClient } from "@/lib/supabase.server-actions";
import { createServiceRoleClient } from "@/lib/supabase.server";
import { dispatchNotificationChannels } from "@/lib/notificationsDelivery";

type ActionResult = { success: boolean; error?: string; message?: string };

export interface EstadoPush {
  pushEnabledGlobal: boolean;
  vapidPublicKey: string | null;
  suscripcionesCount: number;
}

/**
 * Devuelve estado actual de push para el usuario: si está habilitado globalmente,
 * la VAPID public key (para suscribirse), y cuántas suscripciones tiene activas.
 */
export async function obtenerEstadoPushAction(): Promise<EstadoPush> {
  const supabaseAuth = await createServerActionClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    return { pushEnabledGlobal: false, vapidPublicKey: null, suscripcionesCount: 0 };
  }

  const supabaseAdmin = createServiceRoleClient();
  const supabaseCrm = supabaseAdmin.schema("crm");

  const { data: config } = await supabaseCrm
    .from("configuracion_sistema")
    .select("notificaciones_push, push_provider, push_vapid_public")
    .eq("id", 1)
    .maybeSingle();

  const pushEnabledGlobal =
    config?.notificaciones_push === true &&
    config.push_provider === "webpush" &&
    !!config.push_vapid_public;

  const { count } = await supabaseCrm
    .from("push_subscription")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", user.id);

  return {
    pushEnabledGlobal,
    vapidPublicKey: pushEnabledGlobal ? (config!.push_vapid_public as string) : null,
    suscripcionesCount: count ?? 0,
  };
}

/**
 * Borra todas las suscripciones push del usuario (cualquier dispositivo).
 * Útil cuando el usuario quiere "resetear" desde el perfil sin reinstalar PWA.
 */
export async function eliminarTodasSuscripcionesPushAction(): Promise<ActionResult> {
  const supabase = await createServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "No autenticado" };

  const { error } = await supabase
    .from("push_subscription")
    .delete()
    .eq("usuario_id", user.id);

  if (error) {
    console.error("Error eliminando suscripciones push:", error);
    return { success: false, error: error.message };
  }

  return { success: true, message: "Suscripciones push eliminadas" };
}

/**
 * Envía una notificación push de prueba al usuario actual (todos sus dispositivos).
 */
export async function enviarPushPruebaAction(): Promise<ActionResult> {
  const supabaseAuth = await createServerActionClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) return { success: false, error: "No autenticado" };

  // Usar service role para leer configuracion_sistema sin restricción RLS
  const supabaseAdmin = createServiceRoleClient();
  const supabaseCrm = supabaseAdmin.schema("crm");

  const { data: config } = await supabaseCrm
    .from("configuracion_sistema")
    .select("notificaciones_push, push_provider, push_vapid_public, push_vapid_private, push_vapid_subject")
    .eq("id", 1)
    .maybeSingle();

  if (
    !config?.notificaciones_push ||
    config.push_provider !== "webpush" ||
    !config.push_vapid_public ||
    !config.push_vapid_private
  ) {
    return { success: false, error: "Push no está habilitado en configuración" };
  }

  // Verificar que hay suscripciones para este usuario
  const { count } = await supabaseCrm
    .from("push_subscription")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", user.id);

  if (!count || count === 0) {
    return { success: false, error: "Sin suscripciones activas en este navegador" };
  }

  try {
    await dispatchNotificationChannels(
      {
        userId: user.id,
        titulo: "Prueba de notificación push",
        mensaje: "Si recibes este mensaje, las notificaciones push están funcionando correctamente.",
        tipo: "sistema",
        createdAt: new Date().toISOString(),
        data: { test: true },
        url: "/dashboard/perfil",
      },
      { pushEnabled: true, recordatoriosEnabled: true },
      {
        push: {
          provider: "webpush",
          vapidPublicKey: config.push_vapid_public,
          vapidPrivateKey: config.push_vapid_private,
          subject: config.push_vapid_subject ?? null,
        },
      },
      { supabaseClient: supabaseAdmin },
    );
    return { success: true, message: `Push enviado a ${count} dispositivo(s)` };
  } catch (err) {
    console.error("Error enviando push de prueba:", err);
    return { success: false, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}
