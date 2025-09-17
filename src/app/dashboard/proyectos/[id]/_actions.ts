"use server";

import { revalidatePath } from "next/cache";
import { createServerActionClient } from "@/lib/supabase.server-actions";
import { obtenerPerfilUsuario } from "@/lib/auth/roles";

export async function subirPlanos(proyectoId: string, fd: FormData) {
  const planosFile = fd.get("planos") as File | null;

  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Verificar permisos de administrador
  try {
    const perfil = await obtenerPerfilUsuario(user.id);
    if (!perfil || perfil.rol?.nombre !== 'ROL_ADMIN') {
      throw new Error("No tienes permisos para subir planos. Solo los administradores pueden realizar esta acción.");
    }
  } catch (error) {
    throw new Error("Error verificando permisos: " + (error as Error).message);
  }

  if (!planosFile || planosFile.size === 0) {
    throw new Error("Debe seleccionar un archivo de planos");
  }

  try {
    const fileExt = planosFile.name.split('.').pop();
    const fileName = `planos-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `proyectos/${proyectoId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('imagenes')
      .upload(filePath, planosFile);

    if (uploadError) {
      throw new Error(`Error subiendo planos: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('imagenes')
      .getPublicUrl(filePath);

    // Actualizar el proyecto con la URL de los planos
    const { error: updateError } = await supabase
      .from("proyecto")
      .update({ planos_url: publicUrl })
      .eq("id", proyectoId);

    if (updateError) {
      throw new Error(`Error actualizando proyecto: ${updateError.message}`);
    }

    revalidatePath(`/dashboard/proyectos/${proyectoId}`);
    return { success: true, url: publicUrl };
  } catch (error) {
    throw new Error(`Error procesando planos: ${(error as Error).message}`);
  }
}

export async function eliminarPlanos(proyectoId: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Verificar permisos de administrador
  try {
    const perfil = await obtenerPerfilUsuario(user.id);
    if (!perfil || perfil.rol?.nombre !== 'ROL_ADMIN') {
      throw new Error("No tienes permisos para eliminar planos. Solo los administradores pueden realizar esta acción.");
    }
  } catch (error) {
    throw new Error("Error verificando permisos: " + (error as Error).message);
  }

  try {
    // Obtener la URL actual de los planos
    const { data: proyecto, error: fetchError } = await supabase
      .from("proyecto")
      .select("planos_url")
      .eq("id", proyectoId)
      .single();

    if (fetchError) {
      throw new Error(`Error obteniendo proyecto: ${fetchError.message}`);
    }

    if (proyecto.planos_url) {
      // Extraer el path del archivo de la URL
      const url = new URL(proyecto.planos_url);
      const filePath = url.pathname.split('/storage/v1/object/public/imagenes/')[1];
      
      if (filePath) {
        // Eliminar el archivo del storage
        const { error: deleteError } = await supabase.storage
          .from('imagenes')
          .remove([filePath]);

        if (deleteError) {
          console.warn(`Error eliminando archivo del storage: ${deleteError.message}`);
        }
      }
    }

    // Actualizar el proyecto para eliminar la URL de los planos
    const { error: updateError } = await supabase
      .from("proyecto")
      .update({ planos_url: null })
      .eq("id", proyectoId);

    if (updateError) {
      throw new Error(`Error actualizando proyecto: ${updateError.message}`);
    }

    revalidatePath(`/dashboard/proyectos/${proyectoId}`);
    return { success: true };
  } catch (error) {
    throw new Error(`Error eliminando planos: ${(error as Error).message}`);
  }
}

// =========================================
// Funciones para manejo de lotes
// =========================================

export async function crearLote(fd: FormData) {
  const proyectoId = String(fd.get("proyecto_id") || "");
  const codigo = String(fd.get("codigo") || "");
  const sup_m2 = fd.get("sup_m2") ? Number(fd.get("sup_m2")) : null;
  const precio = fd.get("precio") ? Number(fd.get("precio")) : null;
  const moneda = String(fd.get("moneda") || "ARS");
  const estado = String(fd.get("estado") || "disponible");

  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Verificar permisos de administrador
  try {
    const perfil = await obtenerPerfilUsuario(user.id);
    if (!perfil || perfil.rol?.nombre !== 'ROL_ADMIN') {
      throw new Error("No tienes permisos para crear lotes. Solo los administradores pueden realizar esta acción.");
    }
  } catch (error) {
    throw new Error("Error verificando permisos: " + (error as Error).message);
  }

  const { error } = await supabase
    .from("lote")
    .insert({
      proyecto_id: proyectoId,
      codigo,
      sup_m2,
      precio,
      moneda,
      estado: estado as "disponible" | "reservado" | "vendido",
      created_by: user.id,
    });

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/proyectos/${proyectoId}`);
}

export async function actualizarLote(loteId: string, fd: FormData) {
  const codigo = String(fd.get("codigo") || "");
  const sup_m2 = fd.get("sup_m2") ? Number(fd.get("sup_m2")) : null;
  const precio = fd.get("precio") ? Number(fd.get("precio")) : null;
  const moneda = String(fd.get("moneda") || "ARS");
  const estado = String(fd.get("estado") || "disponible");

  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Verificar permisos de administrador
  try {
    const perfil = await obtenerPerfilUsuario(user.id);
    if (!perfil || perfil.rol?.nombre !== 'ROL_ADMIN') {
      throw new Error("No tienes permisos para actualizar lotes. Solo los administradores pueden realizar esta acción.");
    }
  } catch (error) {
    throw new Error("Error verificando permisos: " + (error as Error).message);
  }

  const { error } = await supabase
    .from("lote")
    .update({
      codigo,
      sup_m2,
      precio,
      moneda,
      estado: estado as "disponible" | "reservado" | "vendido",
    })
    .eq("id", loteId);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/proyectos/${fd.get("proyecto_id")}`);
}

export async function eliminarLote(loteId: string, proyectoId: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Verificar permisos de administrador
  try {
    const perfil = await obtenerPerfilUsuario(user.id);
    if (!perfil || perfil.rol?.nombre !== 'ROL_ADMIN') {
      throw new Error("No tienes permisos para eliminar lotes. Solo los administradores pueden realizar esta acción.");
    }
  } catch (error) {
    throw new Error("Error verificando permisos: " + (error as Error).message);
  }

  const { error } = await supabase
    .from("lote")
    .delete()
    .eq("id", loteId);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/proyectos/${proyectoId}`);
}