"use server";

import { revalidatePath } from "next/cache";
import { createServerActionClient } from "@/lib/supabase.server-actions";
import { dispatchNotificationChannels } from "@/lib/notificationsDelivery";

function revalidateNotificaciones() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/notificaciones");
}

export async function marcarNotificacionLeida(notificacionId: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .schema("crm")
    .from("notificacion")
    .update({ leida: true, updated_at: new Date().toISOString() })
    .eq("id", notificacionId)
    .eq("usuario_id", user.id);

  if (error) throw new Error(error.message);
  
  revalidateNotificaciones();
}

export async function marcarTodasLeidas() {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .schema("crm")
    .from("notificacion")
    .update({ leida: true, updated_at: new Date().toISOString() })
    .eq("usuario_id", user.id)
    .eq("leida", false);

  if (error) throw new Error(error.message);
  
  revalidateNotificaciones();
}

export async function crearNotificacion(
  usuarioId: string,
  tipo: 'cliente' | 'proyecto' | 'lote' | 'sistema' | 'evento' | 'recordatorio' | 'venta' | 'reserva' | 'lead_asignado',
  titulo: string,
  mensaje: string,
  data?: Record<string, unknown>
) {
  const supabase = await createServerActionClient();

  const [{ data: { user } }, configResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .schema("crm")
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
    .schema("crm")
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

  revalidateNotificaciones();

  return inserted;
}

type NotificacionTipo =
  | 'cliente'
  | 'proyecto'
  | 'lote'
  | 'sistema'
  | 'evento'
  | 'recordatorio'
  | 'venta'
  | 'reserva'
  | 'lead_asignado';

export async function notificarUsuariosPorRoles(
  roles: string[],
  tipo: NotificacionTipo,
  titulo: string,
  mensaje: string,
  data?: Record<string, unknown>,
  excluirUsuarioId?: string,
): Promise<{ enviadas: number; errores: number }> {
  if (roles.length === 0) return { enviadas: 0, errores: 0 };

  const supabase = await createServerActionClient();

  const { data: usuarios, error } = await supabase
    .schema('crm')
    .from('usuario_perfil')
    .select('id, rol:rol!usuario_perfil_rol_id_fkey(nombre)')
    .eq('activo', true);

  if (error || !usuarios) {
    console.warn('notificarUsuariosPorRoles: error obteniendo usuarios', error);
    return { enviadas: 0, errores: 1 };
  }

  const destinatarios = usuarios
    .filter((u) => {
      const rolObj = Array.isArray(u.rol) ? u.rol[0] : u.rol;
      return rolObj && roles.includes(rolObj.nombre);
    })
    .map((u) => u.id as string)
    .filter((id) => id && id !== excluirUsuarioId);

  let enviadas = 0;
  let errores = 0;

  await Promise.all(
    destinatarios.map(async (usuarioId) => {
      try {
        await crearNotificacion(usuarioId, tipo, titulo, mensaje, data);
        enviadas += 1;
      } catch (err) {
        console.warn(`Error enviando notif a ${usuarioId}:`, err);
        errores += 1;
      }
    }),
  );

  return { enviadas, errores };
}

export async function eliminarNotificacion(notificacionId: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .schema("crm")
    .from("notificacion")
    .delete()
    .eq("id", notificacionId)
    .eq("usuario_id", user.id);

  if (error) throw new Error(error.message);

  revalidateNotificaciones();
}
