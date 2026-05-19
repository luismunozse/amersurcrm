"use server";

import { revalidatePath } from "next/cache";
import { createServerActionClient } from "@/lib/supabase.server-actions";
import { PERMISOS } from "@/lib/permissions";
import { requierePermiso } from "@/lib/permissions/server";
import { crearNotificacion } from "@/app/_actionsNotifications";
import type { ProyectoMediaItem } from "@/types/proyectos";

type SupabaseServerClient = Awaited<ReturnType<typeof createServerActionClient>>;

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

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_GALERIA_ITEMS = 6;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateImageFile(file: File, label: string) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error(`Formato de ${label} no válido. Use JPG, PNG o WEBP`);
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`El archivo de ${label} es muy grande. Máximo 5MB`);
  }
}

async function uploadProyectoAsset(
  supabase: SupabaseServerClient,
  proyectoId: string,
  file: File,
  prefix: string,
) {
  const fileExt = file.name.split(".").pop() || "jpg";
  const fileName = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
  const filePath = `proyectos/${proyectoId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("imagenes")
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    throw new Error(`Error subiendo ${prefix}: ${uploadError.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("imagenes").getPublicUrl(filePath);

  return { publicUrl, filePath };
}

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
    const nombre = String(formData.get("nombre") || "").trim();
    const tipo = String(formData.get("tipo") || "propio"); // Tipo: propio o corretaje
    const estado = String(formData.get("estado") || "activo");
    const descripcion = String(formData.get("descripcion") || "").trim();
    const imagenFile = formData.get("imagen") as File | null;
    const logoFile = formData.get("logo") as File | null;
    const galeriaFiles = formData
      .getAll("galeria")
      .filter((file): file is File => file instanceof File && file.size > 0);

    // Datos de ubigeo
    const departamento = String(formData.get("departamento") || "").trim();
    const provincia = String(formData.get("provincia") || "").trim();
    const distrito = String(formData.get("distrito") || "").trim();

    // Coordenadas GPS (opcional)
    const latitudStr = String(formData.get("latitud") || "").trim();
    const longitudStr = String(formData.get("longitud") || "").trim();
    const latitud = latitudStr ? parseFloat(latitudStr) : null;
    const longitud = longitudStr ? parseFloat(longitudStr) : null;

    // Validaciones
    if (!nombre) {
      throw new Error("El nombre del proyecto es requerido");
    }

    if (!distrito) {
      throw new Error("Debe seleccionar al menos el distrito para la ubicación del proyecto");
    }

    if (imagenFile && imagenFile.size > 0) {
      validateImageFile(imagenFile, "imagen del proyecto");
    }

    if (logoFile && logoFile.size > 0) {
      validateImageFile(logoFile, "logo del proyecto");
    }

    if (galeriaFiles.length > MAX_GALERIA_ITEMS) {
      throw new Error(`Selecciona como máximo ${MAX_GALERIA_ITEMS} imágenes para la galería`);
    }

    galeriaFiles.forEach((file) => validateImageFile(file, "galería"));

    const ubicacionFinal = [distrito, provincia, departamento]
      .filter(Boolean)
      .join(", ");

    const { data: proyecto, error: insertError } = await supabase
      .from("proyecto")
      .insert({
        nombre,
        tipo: tipo as "propio" | "corretaje",
        estado: estado as "activo" | "pausado" | "cerrado",
        ubicacion: ubicacionFinal,
        descripcion: descripcion || null,
        latitud,
        longitud,
        imagen_url: null,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError || !proyecto) {
      throw new Error(`Error creando proyecto: ${insertError?.message || "Desconocido"}`);
    }

    let proyectoFinal = proyecto;

    const uploadedPaths: string[] = [];
    const updates: Record<string, unknown> = {};
    const galeriaPayload: ProyectoMediaItem[] = [];

    try {
      if (imagenFile && imagenFile.size > 0) {
        const { publicUrl, filePath } = await uploadProyectoAsset(supabase, proyecto.id, imagenFile, "portada");
        updates.imagen_url = publicUrl;
        uploadedPaths.push(filePath);
      }

      if (logoFile && logoFile.size > 0) {
        const { publicUrl, filePath } = await uploadProyectoAsset(supabase, proyecto.id, logoFile, "logo");
        updates.logo_url = publicUrl;
        uploadedPaths.push(filePath);
      }

      if (galeriaFiles.length > 0) {
        for (const file of galeriaFiles) {
          const { publicUrl, filePath } = await uploadProyectoAsset(supabase, proyecto.id, file, "galeria");
          galeriaPayload.push({
            url: publicUrl,
            path: filePath,
            nombre: file.name,
            created_at: new Date().toISOString(),
          });
          uploadedPaths.push(filePath);
        }
        updates.galeria_imagenes = galeriaPayload;
      }

      if (Object.keys(updates).length > 0) {
        const { data: updatedProject, error: updateError } = await supabase
          .from("proyecto")
          .update(updates)
          .eq("id", proyecto.id)
          .select()
          .single();

        if (updateError) {
          throw new Error(`Error asignando archivos al proyecto: ${updateError.message}`);
        }

        if (updatedProject) {
          proyectoFinal = updatedProject;
        }
      }
    } catch (imageError) {
      if (uploadedPaths.length > 0) {
        try {
          await supabase.storage.from("imagenes").remove(uploadedPaths);
        } catch (cleanupError) {
          console.warn("Error limpiando archivos tras fallo:", cleanupError);
        }
      }
      console.warn("Error procesando archivos del proyecto:", imageError);
      throw imageError instanceof Error ? imageError : new Error("Error procesando archivos multimedia");
    }

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

export async function actualizarProyecto(proyectoId: string, formData: FormData) {
  if (!UUID_REGEX.test(proyectoId)) {
    throw new Error("ID de proyecto inválido");
  }

  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  await requierePermiso(PERMISOS.PROYECTOS.EDITAR);

  const newUploadedPaths: string[] = [];

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
    const imagenFile = formData.get("imagen") as File | null;
    const eliminarImagen = formData.get("eliminar_imagen") === "true";
    const logoFile = formData.get("logo") as File | null;
    const eliminarLogo = formData.get("eliminar_logo") === "true";
    const galeriaFiles = formData
      .getAll("galeria")
      .filter((file): file is File => file instanceof File && file.size > 0);
    const galeriaRemove = formData
      .getAll("galeria_remove")
      .map((value) => String(value).trim())
      .filter(Boolean);

    if (!nombre) {
      throw new Error("El nombre del proyecto es requerido");
    }

    if (imagenFile && imagenFile.size > 0) {
      validateImageFile(imagenFile, "imagen del proyecto");
    }

    if (logoFile && logoFile.size > 0) {
      validateImageFile(logoFile, "logo del proyecto");
    }

    galeriaFiles.forEach((file) => validateImageFile(file, "galería"));

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
    const galeriaRemovalSet = new Set(galeriaRemove);
    const galeriaKeep = galeriaActual.filter(
      (item) => !galeriaRemovalSet.has(item.path ?? item.url),
    );

    if (galeriaKeep.length + galeriaFiles.length > MAX_GALERIA_ITEMS) {
      throw new Error(`La galería admite máximo ${MAX_GALERIA_ITEMS} imágenes`);
    }

    const obsoletePaths: string[] = [];

    if (galeriaRemovalSet.size > 0) {
      galeriaActual
        .filter((item) => galeriaRemovalSet.has(item.path ?? item.url))
        .forEach((item) => {
          const storagePath = item.path ?? buildStoragePathFromUrl(item.url, proyectoId);
          if (storagePath) {
            obsoletePaths.push(storagePath);
          }
        });
    }

    if (eliminarImagen && imagenUrl) {
      const storagePath = buildStoragePathFromUrl(imagenUrl, proyectoId);
      if (storagePath) {
        obsoletePaths.push(storagePath);
      }
      imagenUrl = null;
    } else if (imagenFile && imagenFile.size > 0) {
      const { publicUrl, filePath } = await uploadProyectoAsset(
        supabase,
        proyectoId,
        imagenFile,
        "portada",
      );
      newUploadedPaths.push(filePath);
      const storagePath = buildStoragePathFromUrl(imagenUrl, proyectoId);
      if (storagePath) {
        obsoletePaths.push(storagePath);
      }
      imagenUrl = publicUrl;
    }

    if (eliminarLogo && logoUrl) {
      const storagePath = buildStoragePathFromUrl(logoUrl, proyectoId);
      if (storagePath) {
        obsoletePaths.push(storagePath);
      }
      logoUrl = null;
    } else if (logoFile && logoFile.size > 0) {
      const { publicUrl, filePath } = await uploadProyectoAsset(
        supabase,
        proyectoId,
        logoFile,
        "logo",
      );
      newUploadedPaths.push(filePath);
      const storagePath = buildStoragePathFromUrl(logoUrl, proyectoId);
      if (storagePath) {
        obsoletePaths.push(storagePath);
      }
      logoUrl = publicUrl;
    }

    const galeriaFinal: ProyectoMediaItem[] = [...galeriaKeep];
    if (galeriaFiles.length > 0) {
      for (const file of galeriaFiles) {
        const { publicUrl, filePath } = await uploadProyectoAsset(
          supabase,
          proyectoId,
          file,
          "galeria",
        );
        newUploadedPaths.push(filePath);
        galeriaFinal.push({
          url: publicUrl,
          path: filePath,
          nombre: file.name,
          created_at: new Date().toISOString(),
        });
      }
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
    if (newUploadedPaths.length > 0) {
      await supabase.storage
        .from("imagenes")
        .remove(newUploadedPaths)
        .catch((cleanupError) => console.warn("Error limpiando archivos nuevos:", cleanupError));
    }
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
