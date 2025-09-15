"use server";

import { revalidatePath } from "next/cache";
import { createServerActionClient } from "@/lib/supabase.server-actions";

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

  const { error } = await supabase
    .from("notificacion")
    .insert({
      usuario_id: usuarioId,
      tipo,
      titulo,
      mensaje,
      data: data || null,
    });

  if (error) throw new Error(error.message);
}
