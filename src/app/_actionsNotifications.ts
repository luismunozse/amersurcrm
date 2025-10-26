"use server";

import { revalidatePath } from "next/cache";
import { createServerActionClient } from "@/lib/supabase.server-actions";
import { dispatchNotificationChannels } from "@/lib/notificationsDelivery";

export async function marcarNotificacionLeida(notificacionId: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("notificacion")
    .update({ leida: true, updated_at: new Date().toISOString() })
    .eq("id", notificacionId)
    .eq("usuario_id", user.id);

  if (error) throw new Error(error.message);
  
  revalidatePath("/dashboard");
}

export async function marcarTodasLeidas() {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("notificacion")
    .update({ leida: true, updated_at: new Date().toISOString() })
    .eq("usuario_id", user.id)
    .eq("leida", false);

  if (error) throw new Error(error.message);
  
  revalidatePath("/dashboard");
}

export async function crearNotificacion(
  usuarioId: string,
  tipo: 'cliente' | 'proyecto' | 'lote' | 'sistema',
  titulo: string,
  mensaje: string,
  data?: Record<string, unknown>
) {
  const supabase = await createServerActionClient();

  const [{ data: { user } }, configResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("configuracion_sistema")
      .select(
        "notificaciones_email, notificaciones_push, notificaciones_recordatorios, push_provider, push_vapid_public, push_vapid_private, push_vapid_subject",
      )
      .eq("id", 1)
      .maybeSingle(),
  ]);

  if (!user) {
    throw new Error("No autenticado");
  }

  const { data: inserted, error } = await supabase
    .from("notificacion")
    .insert({
      usuario_id: usuarioId,
      tipo,
      titulo,
      mensaje,
      data: data || null,
    })
    .select("id, tipo, titulo, mensaje, data, created_at")
    .single();

  if (error) throw new Error(error.message);

  const config = configResult?.data;
  const prefs = {
    emailEnabled: config?.notificaciones_email ?? true,
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
        email: user.id === usuarioId ? user.email : null,
        titulo,
        mensaje,
        tipo,
        data: data ?? null,
        createdAt: inserted.created_at,
        url: (data as { url?: string } | undefined)?.url ?? null,
      },
      prefs,
      pushConfig,
    );
  } catch (deliveryError) {
    console.warn("No se pudo despachar notificación externa:", deliveryError);
  }

  return inserted;
}
