"use server";

import { createServerActionClient } from "@/lib/supabase.server-actions";
import { revalidatePath } from "next/cache";

type ActionResult = {
  success: boolean;
  error?: string;
  avatarUrl?: string | null;
};

export async function actualizarAvatarAction(formData: FormData): Promise<ActionResult> {
  const file = formData.get("avatar") as File | null;

  if (!file || file.size === 0) {
    return { success: false, error: "Selecciona una imagen válida" };
  }

  const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!validTypes.includes(file.type)) {
    return { success: false, error: "Solo se permiten imágenes JPG, PNG o WebP" };
  }

  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    return { success: false, error: "La imagen no debe superar los 2MB" };
  }

  const supabase = await createServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "No autenticado" };
  }

  try {
    const fileExt = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/avatar.${fileExt}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

    if (uploadError) {
      console.error("Error al subir avatar:", uploadError);
      return { success: false, error: uploadError.message || "No se pudo subir la imagen" };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

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
    const { error } = await supabase
      .from("usuario_perfil")
      .update({ avatar_url: null })
      .eq("id", user.id);

    if (error) {
      console.error("Error eliminando avatar:", error);
      return { success: false, error: error.message || "No se pudo eliminar la foto" };
    }

    // Opcional: No eliminamos del storage para evitar problemas con URLs firmadas
    revalidatePath("/dashboard/perfil");
    revalidatePath("/dashboard", "layout");
    return { success: true, avatarUrl: null };
  } catch (error) {
    console.error("Error inesperado eliminando avatar:", error);
    return { success: false, error: "Error inesperado al eliminar la foto" };
  }
}
