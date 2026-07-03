"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

export type ProyectoAssetPrefix = "portada" | "logo" | "galeria" | "masterplan";

export type UploadedProyectoAsset = {
  publicUrl: string;
  path: string;
  nombre: string;
};

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const BUCKET = "imagenes";

export function validateProyectoImage(file: File, label: string): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return `${label}: formato no permitido (usa JPG, PNG o WEBP)`;
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return `${label}: supera el límite de 5MB`;
  }
  return null;
}

export async function uploadProyectoAsset(
  // Solo usa supabase.storage, que es agnóstico al schema (public/crm).
  supabase: SupabaseClient<any, any, any>,
  proyectoId: string,
  file: File,
  prefix: ProyectoAssetPrefix,
): Promise<UploadedProyectoAsset> {
  const fileExt = (file.name.split(".").pop() || "jpg").toLowerCase();
  const fileName = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
  const filePath = `proyectos/${proyectoId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    throw new Error(`Error subiendo ${prefix}: ${uploadError.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

  return { publicUrl, path: filePath, nombre: file.name };
}

export async function removeProyectoAssets(
  // Solo usa supabase.storage, que es agnóstico al schema (public/crm).
  supabase: SupabaseClient<any, any, any>,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) return;
  await supabase.storage
    .from(BUCKET)
    .remove(paths)
    .catch((err) => console.warn("Error eliminando uploads parciales:", err));
}
