"use server";

import { createServerActionClient } from "@/lib/supabase.server-actions";
import { revalidatePath } from "next/cache";

type ActionResult = {
  success: boolean;
  error?: string;
  avatarUrl?: string | null;
};

const AVATAR_BUCKET = "avatars";
const AVATAR_FILENAME = "avatar.webp"; // path fijo: client comprime y convierte a WebP antes de subir

export async function actualizarAvatarAction(formData: FormData): Promise<ActionResult> {
  const file = formData.get("avatar") as File | null;

  if (!file || file.size === 0) {
    return { success: false, error: "Selecciona una imagen válida" };
  }

  // Aceptar webp (output del cliente) más fallbacks por si bypass
  const validTypes = ["image/webp", "image/jpeg", "image/jpg", "image/png"];
  if (!validTypes.includes(file.type)) {
    return { success: false, error: "Formato de imagen no soportado" };
  }

  // Tras compresión cliente espera <500KB; 1MB margen seguro
  const maxSize = 1 * 1024 * 1024;
  if (file.size > maxSize) {
    return { success: false, error: "Imagen demasiado grande tras procesado" };
  }

  const supabase = await createServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "No autenticado" };
  }

  try {
    const path = `${user.id}/${AVATAR_FILENAME}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

    if (uploadError) {
      console.error("Error al subir avatar:", uploadError);
      return { success: false, error: uploadError.message || "No se pudo subir la imagen" };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);

    const cacheBustedUrl = `${publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("usuario_perfil")
      .update({ avatar_url: cacheBustedUrl })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error actualizando perfil:", updateError);
      return { success: false, error: updateError.message || "No se pudo actualizar el perfil" };
    }

    revalidatePath("/dashboard/perfil");
    revalidatePath("/dashboard", "layout");
    return { success: true, avatarUrl: cacheBustedUrl };
  } catch (error) {
    console.error("Error inesperado subiendo avatar:", error);
    return { success: false, error: "Error inesperado al subir la imagen" };
  }
}

export async function eliminarAvatarAction(): Promise<ActionResult> {
  const supabase = await createServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "No autenticado" };
  }

  try {
    const path = `${user.id}/${AVATAR_FILENAME}`;

    // Borrar archivo del storage. No bloqueamos si falla (ej: archivo legacy
    // con otra extensión); la fuente de verdad es avatar_url=null en DB.
    const { error: storageError } = await supabase.storage.from(AVATAR_BUCKET).remove([path]);
    if (storageError) {
      console.warn("No se pudo borrar avatar del storage:", storageError.message);
    }

    const { error } = await supabase
      .from("usuario_perfil")
      .update({ avatar_url: null })
      .eq("id", user.id);

    if (error) {
      console.error("Error eliminando avatar:", error);
      return { success: false, error: error.message || "No se pudo eliminar la foto" };
    }

    revalidatePath("/dashboard/perfil");
    revalidatePath("/dashboard", "layout");
    return { success: true, avatarUrl: null };
  } catch (error) {
    console.error("Error inesperado eliminando avatar:", error);
    return { success: false, error: "Error inesperado al eliminar la foto" };
  }
}
