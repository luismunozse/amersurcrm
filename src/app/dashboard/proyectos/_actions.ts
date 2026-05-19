"use server";

import { revalidatePath } from "next/cache";
import { createServerActionClient } from "@/lib/supabase.server-actions";
import { PERMISOS } from "@/lib/permissions";
import { requierePermiso } from "@/lib/permissions/server";
import { crearNotificacion } from "@/app/_actionsNotifications";
import type { ProyectoMediaItem } from "@/types/proyectos";

function buildStoragePathFromUrl(url: string | null, proyectoId: string): string | null {
  if (!url) return null;

  try {
    // Intentar extraer el path de diferentes formatos de URL de Supabase Storage
    const marker = "/storage/v1/object/public/imagenes/";
    const markerIndex = url.indexOf(marker);

    if (markerIndex !== -1) {
      // Formato estándar: https://xxx.supabase.co/storage/v1/object/public/imagenes/path/to/file.jpg
      return decodeURIComponent(url.slice(markerIndex + marker.length));
    }

    // Intentar parsear como URL completa
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const imagenesIndex = pathParts.indexOf('imagenes');

    if (imagenesIndex !== -1 && imagenesIndex < pathParts.length - 1) {
      // Extraer el path después de 'imagenes/'
      return decodeURIComponent(pathParts.slice(imagenesIndex + 1).join('/'));
    }

    // Fallback: intentar extraer el nombre de archivo y construir path
    const fileName = url.split("/").pop();
    if (fileName && fileName.length > 0) {
      return `proyectos/${proyectoId}/${fileName}`;
    }

    return null;
  } catch (error) {
    console.warn(`Error parseando URL de storage: ${url}`, error);
    return null;
  }
}

const MAX_GALERIA_ITEMS = 6;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeGaleriaPayload(value: unknown): ProyectoMediaItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is ProyectoMediaItem =>
        !!item &&
        typeof item === "object" &&
        typeof (item as ProyectoMediaItem).url === "string",
    )
    .map((item) => ({
      url: item.url,
      path: item.path ?? null,
      nombre: item.nombre ?? null,
      created_at: item.created_at ?? null,
    }));
}

export async function crearProyecto(formData: FormData) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  await requierePermiso(PERMISOS.PROYECTOS.CREAR);

  try {
    const proyectoIdRaw = String(formData.get("proyecto_id") || "").trim();
    if (!proyectoIdRaw || !UUID_REGEX.test(proyectoIdRaw)) {
      throw new Error("ID de proyecto inválido");
    }
    const proyectoId = proyectoIdRaw;

    const nombre = String(formData.get("nombre") || "").trim();
    const tipo = String(formData.get("tipo") || "propio");
    const estado = String(formData.get("estado") || "activo");
    const descripcion = String(formData.get("descripcion") || "").trim();
    const imagenUrl = (formData.get("imagen_url") as string | null) || null;
    const imagenPath = (formData.get("imagen_path") as string | null) || null;
    const logoUrl = (formData.get("logo_url") as string | null) || null;
    const logoPath = (formData.get("logo_path") as string | null) || null;
    const galeriaNewRaw = (formData.get("galeria_new") as string | null) || null;

    const departamento = String(formData.get("departamento") || "").trim();
    const provincia = String(formData.get("provincia") || "").trim();
    const distrito = String(formData.get("distrito") || "").trim();

    const latitudStr = String(formData.get("latitud") || "").trim();
    const longitudStr = String(formData.get("longitud") || "").trim();
    const latitud = latitudStr ? parseFloat(latitudStr) : null;
    const longitud = longitudStr ? parseFloat(longitudStr) : null;

    if (!nombre) {
      throw new Error("El nombre del proyecto es requerido");
    }

    if (!distrito) {
      throw new Error("Debe seleccionar al menos el distrito para la ubicación del proyecto");
    }

    if (imagenPath && !asegurarPathPertenece(imagenPath, proyectoId)) {
      throw new Error("Path de imagen no pertenece al proyecto");
    }
    if (logoPath && !asegurarPathPertenece(logoPath, proyectoId)) {
      throw new Error("Path de logo no pertenece al proyecto");
    }

    const galeriaItems = parseGaleriaNew(galeriaNewRaw, proyectoId);
    if (galeriaItems.length > MAX_GALERIA_ITEMS) {
      throw new Error(`Selecciona como máximo ${MAX_GALERIA_ITEMS} imágenes para la galería`);
    }

    const ubicacionFinal = [distrito, provincia, departamento]
      .filter(Boolean)
      .join(", ");

    const { data: proyecto, error: insertError } = await supabase
      .from("proyecto")
      .insert({
        id: proyectoId,
        nombre,
        tipo: tipo as "propio" | "corretaje",
        estado: estado as "activo" | "pausado" | "cerrado",
        ubicacion: ubicacionFinal,
        descripcion: descripcion || null,
        latitud,
        longitud,
        imagen_url: imagenUrl,
        logo_url: logoUrl,
        galeria_imagenes: galeriaItems,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError || !proyecto) {
      throw new Error(`Error creando proyecto: ${insertError?.message || "Desconocido"}`);
    }

    const proyectoFinal = proyecto;

    revalidatePath("/dashboard/proyectos");
    revalidatePath("/dashboard");

    // Crear notificación sobre el nuevo proyecto
    try {
      await crearNotificacion(
        user.id,
        "proyecto",
        "🏢 Nuevo proyecto creado",
        `Has creado el proyecto "${proyectoFinal.nombre}" en ${proyectoFinal.ubicacion || 'ubicación no especificada'}`,
        {
          proyecto_id: proyectoFinal.id,
          nombre: proyectoFinal.nombre,
          tipo: proyectoFinal.tipo,
          estado: proyectoFinal.estado,
          ubicacion: proyectoFinal.ubicacion,
          url: `/dashboard/proyectos/${proyectoFinal.id}`
        }
      );
    } catch (notifError) {
      console.error("Error creando notificación:", notifError);
      // No fallar la operación principal si la notificación falla
    }

    return { success: true, proyecto: proyectoFinal };
  } catch (error) {
    // No capturar NEXT_REDIRECT como error
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error;
    }
    console.error("Error creando proyecto:", error);
    throw new Error(error instanceof Error ? error.message : "Error creando proyecto");
  }
}

function asegurarPathPertenece(path: string, proyectoId: string): boolean {
  return path.startsWith(`proyectos/${proyectoId}/`);
}

function parseGaleriaNew(raw: string | null, proyectoId: string): ProyectoMediaItem[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Galería nueva inválida (JSON malformado)");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("Galería nueva inválida (debe ser arreglo)");
  }
  return parsed.map((item, idx) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Galería nueva inválida en posición ${idx}`);
    }
    const obj = item as { url?: unknown; path?: unknown; nombre?: unknown };
    if (typeof obj.url !== "string" || typeof obj.path !== "string") {
      throw new Error(`Galería nueva inválida en posición ${idx}: faltan url/path`);
    }
    if (!asegurarPathPertenece(obj.path, proyectoId)) {
      throw new Error(`Path no pertenece al proyecto en posición ${idx}`);
    }
    return {
      url: obj.url,
      path: obj.path,
      nombre: typeof obj.nombre === "string" ? obj.nombre : null,
      created_at: new Date().toISOString(),
    };
  });
}

function parseGaleriaFinal(
  raw: string,
  proyectoId: string,
  galeriaActualPaths: Set<string>,
): ProyectoMediaItem[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Galería final inválida (JSON malformado)");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("Galería final inválida (debe ser arreglo)");
  }
  return parsed.map((item, idx) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Galería final inválida en posición ${idx}`);
    }
    const obj = item as {
      url?: unknown;
      path?: unknown;
      nombre?: unknown;
      created_at?: unknown;
    };
    if (typeof obj.url !== "string") {
      throw new Error(`Galería final inválida en posición ${idx}: falta url`);
    }
    const path = typeof obj.path === "string" ? obj.path : null;
    // Items pre-existentes ya validados en DB; nuevos deben pertenecer al proyecto
    if (path && !galeriaActualPaths.has(path) && !asegurarPathPertenece(path, proyectoId)) {
      throw new Error(`Path no pertenece al proyecto en posición ${idx}`);
    }
    return {
      url: obj.url,
      path,
      nombre: typeof obj.nombre === "string" ? obj.nombre : null,
      created_at: typeof obj.created_at === "string" ? obj.created_at : new Date().toISOString(),
    };
  });
}

export async function actualizarProyecto(proyectoId: string, formData: FormData) {
  if (!UUID_REGEX.test(proyectoId)) {
    throw new Error("ID de proyecto inválido");
  }

  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  await requierePermiso(PERMISOS.PROYECTOS.EDITAR);

  try {
    const nombre = String(formData.get("nombre") || "").trim();
    const tipo = String(formData.get("tipo") || "propio");
    const estado = String(formData.get("estado") || "activo");
    const ubicacion = String(formData.get("ubicacion") || "").trim();
    const latitudStr = String(formData.get("latitud") || "").trim();
    const longitudStr = String(formData.get("longitud") || "").trim();
    const latitud = latitudStr ? parseFloat(latitudStr) : null;
    const longitud = longitudStr ? parseFloat(longitudStr) : null;
    const descripcion = String(formData.get("descripcion") || "").trim();
    const imagenUrlNueva = (formData.get("imagen_url") as string | null) || null;
    const imagenPathNueva = (formData.get("imagen_path") as string | null) || null;
    const eliminarImagen = formData.get("eliminar_imagen") === "true";
    const logoUrlNueva = (formData.get("logo_url") as string | null) || null;
    const logoPathNueva = (formData.get("logo_path") as string | null) || null;
    const eliminarLogo = formData.get("eliminar_logo") === "true";
    const galeriaFinalRaw = formData.get("galeria_final") as string | null;
    const galeriaNewRawLegacy = (formData.get("galeria_new") as string | null) || null;
    const galeriaRemoveLegacy = formData
      .getAll("galeria_remove")
      .map((value) => String(value).trim())
      .filter(Boolean);

    if (!nombre) {
      throw new Error("El nombre del proyecto es requerido");
    }

    if (imagenPathNueva && !asegurarPathPertenece(imagenPathNueva, proyectoId)) {
      throw new Error("Path de imagen no pertenece al proyecto");
    }
    if (logoPathNueva && !asegurarPathPertenece(logoPathNueva, proyectoId)) {
      throw new Error("Path de logo no pertenece al proyecto");
    }

    const { data: proyectoActual, error: proyectoError } = await supabase
      .from("proyecto")
      .select("imagen_url,logo_url,galeria_imagenes")
      .eq("id", proyectoId)
      .single();

    if (proyectoError) {
      throw new Error(`Error obteniendo proyecto: ${proyectoError.message}`);
    }

    let imagenUrl = proyectoActual?.imagen_url ?? null;
    let logoUrl = proyectoActual?.logo_url ?? null;
    const galeriaActual = sanitizeGaleriaPayload(proyectoActual?.galeria_imagenes ?? []);
    const galeriaActualPaths = new Set<string>(
      galeriaActual.map((item) => item.path).filter((p): p is string => !!p),
    );

    let galeriaFinal: ProyectoMediaItem[];

    if (galeriaFinalRaw !== null) {
      // Modo nuevo: cliente envía orden completo (drag-and-drop reorder + add/remove)
      galeriaFinal = parseGaleriaFinal(galeriaFinalRaw, proyectoId, galeriaActualPaths);
    } else {
      // Modo legacy: galeria_new + galeria_remove
      const galeriaNueva = parseGaleriaNew(galeriaNewRawLegacy, proyectoId);
      const galeriaRemovalSet = new Set(galeriaRemoveLegacy);
      const galeriaKeep = galeriaActual.filter(
        (item) => !galeriaRemovalSet.has(item.path ?? item.url),
      );
      galeriaFinal = [...galeriaKeep, ...galeriaNueva];
    }

    if (galeriaFinal.length > MAX_GALERIA_ITEMS) {
      throw new Error(`La galería admite máximo ${MAX_GALERIA_ITEMS} imágenes`);
    }

    // Calcular paths obsoletos: presentes en actual pero no en final
    const finalPaths = new Set<string>(
      galeriaFinal.map((item) => item.path).filter((p): p is string => !!p),
    );
    const obsoletePaths: string[] = [];
    for (const item of galeriaActual) {
      const id = item.path ?? buildStoragePathFromUrl(item.url, proyectoId);
      if (!id) continue;
      if (item.path && !finalPaths.has(item.path)) {
        obsoletePaths.push(item.path);
      } else if (!item.path) {
        // Item sin path: comparar por URL
        const stillPresent = galeriaFinal.some((f) => f.url === item.url);
        if (!stillPresent) obsoletePaths.push(id);
      }
    }

    if (eliminarImagen && imagenUrl) {
      const storagePath = buildStoragePathFromUrl(imagenUrl, proyectoId);
      if (storagePath) {
        obsoletePaths.push(storagePath);
      }
      imagenUrl = null;
    } else if (imagenUrlNueva) {
      const storagePath = buildStoragePathFromUrl(imagenUrl, proyectoId);
      if (storagePath) {
        obsoletePaths.push(storagePath);
      }
      imagenUrl = imagenUrlNueva;
    }

    if (eliminarLogo && logoUrl) {
      const storagePath = buildStoragePathFromUrl(logoUrl, proyectoId);
      if (storagePath) {
        obsoletePaths.push(storagePath);
      }
      logoUrl = null;
    } else if (logoUrlNueva) {
      const storagePath = buildStoragePathFromUrl(logoUrl, proyectoId);
      if (storagePath) {
        obsoletePaths.push(storagePath);
      }
      logoUrl = logoUrlNueva;
    }

    const { error: updateError } = await supabase
      .from("proyecto")
      .update({
        nombre,
        tipo: tipo as "propio" | "corretaje",
        estado: estado as "activo" | "pausado" | "cerrado",
        ubicacion: ubicacion || null,
        latitud,
        longitud,
        descripcion: descripcion || null,
        imagen_url: imagenUrl,
        logo_url: logoUrl,
        galeria_imagenes: galeriaFinal,
      })
      .eq("id", proyectoId);

    if (updateError) {
      throw new Error(`Error actualizando proyecto: ${updateError.message}`);
    }

    if (obsoletePaths.length > 0) {
      await supabase.storage
        .from("imagenes")
        .remove(obsoletePaths)
        .catch((cleanupError) => console.warn("Error eliminando archivos obsoletos:", cleanupError));
    }

    revalidatePath("/dashboard/proyectos");
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/proyectos/${proyectoId}`);

    return { success: true, message: `Proyecto "${nombre}" actualizado correctamente` };
  } catch (error) {
    console.error("Error actualizando proyecto:", error);
    throw new Error(error instanceof Error ? error.message : "Error actualizando proyecto");
  }
}

export async function eliminarProyecto(proyectoId: string) {
  if (!UUID_REGEX.test(proyectoId)) {
    throw new Error("ID de proyecto inválido");
  }

  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  await requierePermiso(PERMISOS.PROYECTOS.ELIMINAR);

  try {
    // 1. Obtener información del proyecto para eliminar archivos relacionados
    const { data: proyecto, error: proyectoError } = await supabase
      .from("proyecto")
      .select("id, nombre, planos_url, imagen_url, logo_url, galeria_imagenes")
      .eq("id", proyectoId)
      .single();

    if (proyectoError) {
      throw new Error(`Error obteniendo proyecto: ${proyectoError.message}`);
    }

    if (!proyecto) {
      throw new Error("Proyecto no encontrado");
    }

    // 2. Eliminar archivos del storage si existen
    const archivosAEliminar: string[] = [];

    // Agregar planos_url si existe
    if (proyecto.planos_url) {
      const storagePath = buildStoragePathFromUrl(proyecto.planos_url, proyectoId);
      if (storagePath) {
        archivosAEliminar.push(storagePath);
      }
    }

    // Agregar imagen_url si existe
    if (proyecto.imagen_url) {
      const storagePath = buildStoragePathFromUrl(proyecto.imagen_url, proyectoId);
      if (storagePath) {
        archivosAEliminar.push(storagePath);
      }
    }

    // Agregar logo_url si existe
    if (proyecto.logo_url) {
      const storagePath = buildStoragePathFromUrl(proyecto.logo_url, proyectoId);
      if (storagePath) {
        archivosAEliminar.push(storagePath);
      }
    }

    // Agregar galería
    const galeria = sanitizeGaleriaPayload(proyecto.galeria_imagenes ?? []);
    for (const item of galeria) {
      const storagePath = item.path ?? buildStoragePathFromUrl(item.url, proyectoId);
      if (storagePath) {
        archivosAEliminar.push(storagePath);
      }
    }

    // Eliminar todos los archivos en un solo batch
    if (archivosAEliminar.length > 0) {
      try {
        const { error: deleteError } = await supabase.storage
          .from('imagenes')
          .remove(archivosAEliminar);

        if (deleteError) {
          console.warn(`Error eliminando archivos del storage: ${deleteError.message}`);
        }
      } catch (storageError) {
        console.warn(`Error procesando archivos del storage: ${storageError}`);
      }
    }

    // 3. Eliminar lotes asociados al proyecto
    const { error: lotesError } = await supabase
      .from("lote")
      .delete()
      .eq("proyecto_id", proyectoId);

    if (lotesError) {
      console.warn(`Error eliminando lotes: ${lotesError.message}`);
    }

    // 4. Eliminar el proyecto
    const { error: deleteError } = await supabase
      .from("proyecto")
      .delete()
      .eq("id", proyectoId);

    if (deleteError) {
      throw new Error(`Error eliminando proyecto: ${deleteError.message}`);
    }

    // 5. Revalidar las páginas relacionadas
    revalidatePath("/dashboard/proyectos");
    revalidatePath("/dashboard");

    return { success: true, message: `Proyecto "${proyecto.nombre}" eliminado correctamente` };

  } catch (error) {
    console.error("Error eliminando proyecto:", error);
    throw new Error(error instanceof Error ? error.message : "Error eliminando proyecto");
  }
}
