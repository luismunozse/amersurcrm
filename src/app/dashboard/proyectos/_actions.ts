"use server";

import { revalidatePath } from "next/cache";
import { createServerActionClient } from "@/lib/supabase.server-actions";
import { obtenerPerfilUsuario } from "@/lib/auth/roles";
import { redirect } from "next/navigation";

function buildStoragePathFromUrl(url: string | null, proyectoId: string) {
  if (!url) return null;

  const marker = "/storage/v1/object/public/imagenes/";
  const markerIndex = url.indexOf(marker);

  if (markerIndex !== -1) {
    return decodeURIComponent(url.slice(markerIndex + marker.length));
  }

  const fileName = url.split("/").pop();
  if (!fileName) return null;

  return `proyectos/${proyectoId}/${fileName}`;
}

export async function crearProyecto(formData: FormData) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Verificar permisos de administrador
  try {
    const perfil = await obtenerPerfilUsuario();
    if (!perfil || perfil.rol?.nombre !== 'ROL_ADMIN') {
      throw new Error("No tienes permisos para crear proyectos. Solo los administradores pueden realizar esta acción.");
    }
  } catch (error) {
    throw new Error("Error verificando permisos: " + (error as Error).message);
  }

  try {
    const nombre = String(formData.get("nombre") || "").trim();
    const estado = String(formData.get("estado") || "activo");
    const descripcion = String(formData.get("descripcion") || "").trim();
    const imagenFile = formData.get("imagen") as File | null;

    // Datos de ubigeo
    const departamento = String(formData.get("departamento") || "").trim();
    const provincia = String(formData.get("provincia") || "").trim();
    const distrito = String(formData.get("distrito") || "").trim();

    // Validaciones
    if (!nombre) {
      throw new Error("El nombre del proyecto es requerido");
    }

    if (!distrito) {
      throw new Error("Debe seleccionar al menos el distrito para la ubicación del proyecto");
    }

    if (imagenFile && imagenFile.size > 0) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(imagenFile.type)) {
        throw new Error("Formato de imagen no válido. Use JPG, PNG o WEBP");
      }

      const maxSize = 5 * 1024 * 1024; // 5MB
      if (imagenFile.size > maxSize) {
        throw new Error("La imagen es muy grande. Máximo 5MB");
      }
    }

    const ubicacionFinal = [distrito, provincia, departamento]
      .filter(Boolean)
      .join(", ");

    const { data: proyecto, error: insertError } = await supabase
      .from("proyecto")
      .insert({
        nombre,
        estado: estado as "activo" | "pausado" | "cerrado",
        ubicacion: ubicacionFinal,
        descripcion: descripcion || null,
        imagen_url: null,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError || !proyecto) {
      throw new Error(`Error creando proyecto: ${insertError?.message || "Desconocido"}`);
    }

    let proyectoFinal = proyecto;

    if (imagenFile && imagenFile.size > 0) {
      try {
        const fileExt = imagenFile.name.split(".").pop() || "jpg";
        const fileName = `proyecto-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `proyectos/${proyecto.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("imagenes")
          .upload(filePath, imagenFile, { upsert: true });

        if (uploadError) {
          throw new Error(`Error subiendo imagen: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from("imagenes")
          .getPublicUrl(filePath);

        const { data: updatedProject, error: updateError } = await supabase
          .from("proyecto")
          .update({ imagen_url: publicUrl })
          .eq("id", proyecto.id)
          .select()
          .single();

        if (updateError) {
          await supabase.storage.from("imagenes").remove([filePath]);
          throw new Error(`Error asignando imagen al proyecto: ${updateError.message}`);
        }

        if (updatedProject) {
          proyectoFinal = updatedProject;
        }
      } catch (imageError) {
        console.warn("Error procesando imagen del proyecto:", imageError);
      }
    }

    revalidatePath("/dashboard/proyectos");
    revalidatePath("/dashboard");

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
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Verificar permisos de administrador
  try {
    const perfil = await obtenerPerfilUsuario();
    if (!perfil || perfil.rol?.nombre !== 'ROL_ADMIN') {
      throw new Error("No tienes permisos para actualizar proyectos. Solo los administradores pueden realizar esta acción.");
    }
  } catch (error) {
    throw new Error("Error verificando permisos: " + (error as Error).message);
  }

  try {
    const nombre = String(formData.get("nombre") || "").trim();
    const estado = String(formData.get("estado") || "activo");
    const ubicacion = String(formData.get("ubicacion") || "").trim();
    const descripcion = String(formData.get("descripcion") || "").trim();
    const imagenFile = formData.get("imagen") as File | null;
    const eliminarImagen = formData.get("eliminar_imagen") === "true";

    // Validaciones
    if (!nombre) {
      throw new Error("El nombre del proyecto es requerido");
    }

    // Obtener proyecto actual para comparar imagen
    const { data: proyectoActual, error: proyectoError } = await supabase
      .from("proyecto")
      .select("imagen_url")
      .eq("id", proyectoId)
      .single();

    if (proyectoError) {
      throw new Error(`Error obteniendo proyecto: ${proyectoError.message}`);
    }

    let imagenUrl = proyectoActual?.imagen_url;

    // Manejar imagen
    if (eliminarImagen) {
      // Eliminar imagen actual del storage si existe
      if (imagenUrl) {
        try {
          const storagePath = buildStoragePathFromUrl(imagenUrl, proyectoId);
          if (storagePath) {
            await supabase.storage
              .from('imagenes')
              .remove([storagePath]);
          }
        } catch (storageError) {
          console.warn(`Error eliminando imagen del storage: ${storageError}`);
        }
      }
      imagenUrl = null;
    } else if (imagenFile && imagenFile.size > 0) {
      // Validar tipo de archivo
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(imagenFile.type)) {
        throw new Error('Formato de imagen no válido. Use JPG, PNG o WEBP');
      }

      // Validar tamaño (5MB máximo)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (imagenFile.size > maxSize) {
        throw new Error('La imagen es muy grande. Máximo 5MB');
      }

      try {
        // Eliminar imagen anterior si existe
        if (imagenUrl) {
          const storagePath = buildStoragePathFromUrl(imagenUrl, proyectoId);
          if (storagePath) {
            await supabase.storage
              .from('imagenes')
              .remove([storagePath]);
          }
        }

        // Subir nueva imagen
        const fileExt = imagenFile.name.split('.').pop();
        const fileName = `proyecto-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `proyectos/${proyectoId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('imagenes')
          .upload(filePath, imagenFile);

        if (uploadError) {
          throw new Error(`Error subiendo imagen: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('imagenes')
          .getPublicUrl(filePath);

        imagenUrl = publicUrl;
      } catch (imageError) {
        console.warn('Error subiendo imagen:', imageError);
        throw new Error(`Error procesando imagen: ${imageError instanceof Error ? imageError.message : 'Error desconocido'}`);
      }
    }

    // Actualizar el proyecto
    const { error: updateError } = await supabase
      .from("proyecto")
      .update({
        nombre,
        estado: estado as "activo" | "pausado" | "cerrado",
        ubicacion: ubicacion || null,
        descripcion: descripcion || null,
        imagen_url: imagenUrl,
        updated_at: new Date().toISOString()
      })
      .eq("id", proyectoId);

    if (updateError) {
      throw new Error(`Error actualizando proyecto: ${updateError.message}`);
    }

    // Revalidar las páginas relacionadas
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
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Verificar permisos de administrador
  try {
    const perfil = await obtenerPerfilUsuario();
    if (!perfil || perfil.rol?.nombre !== 'ROL_ADMIN') {
      throw new Error("No tienes permisos para eliminar proyectos. Solo los administradores pueden realizar esta acción.");
    }
  } catch (error) {
    throw new Error("Error verificando permisos: " + (error as Error).message);
  }

  try {
    // 1. Obtener información del proyecto para eliminar archivos relacionados
    const { data: proyecto, error: proyectoError } = await supabase
      .from("proyecto")
      .select("id, nombre, planos_url")
      .eq("id", proyectoId)
      .single();

    if (proyectoError) {
      throw new Error(`Error obteniendo proyecto: ${proyectoError.message}`);
    }

    if (!proyecto) {
      throw new Error("Proyecto no encontrado");
    }

    // 2. Eliminar archivos del storage si existen
    if (proyecto.planos_url) {
      try {
        const storagePath = buildStoragePathFromUrl(proyecto.planos_url, proyectoId);
        if (storagePath) {
          const { error: deleteError } = await supabase.storage
            .from('imagenes')
            .remove([storagePath]);

          if (deleteError) {
            console.warn(`Error eliminando archivo del storage: ${deleteError.message}`);
          }
        }
      } catch (storageError) {
        console.warn(`Error procesando archivo del storage: ${storageError}`);
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
