"use server";

import { revalidatePath } from "next/cache";
import { createServerActionClient } from "@/lib/supabase.server-actions";
import { obtenerPerfilUsuario } from "@/lib/auth/roles";

export async function crearProyecto(fd: FormData) {
  const nombre = String(fd.get("nombre") || "");
  const estado = String(fd.get("estado") || "activo");
  const ubicacion = String(fd.get("ubicacion") || "");
  const imagenFile = fd.get("imagen") as File | null;

  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Verificar permisos de administrador
  try {
    const perfil = await obtenerPerfilUsuario(user.id);
    if (!perfil || perfil.rol?.nombre !== 'ROL_ADMIN') {
      throw new Error("No tienes permisos para crear proyectos. Solo los administradores pueden realizar esta acción.");
    }
  } catch (error) {
    throw new Error("Error verificando permisos: " + (error as Error).message);
  }

  let imagenUrl = null;

  // Subir imagen si se proporcionó
  if (imagenFile && imagenFile.size > 0) {
    try {
      const fileExt = imagenFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `proyectos/${fileName}`;

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
    } catch (error) {
      throw new Error(`Error procesando imagen: ${(error as Error).message}`);
    }
  }

  const { error } = await supabase.from("proyecto").insert({
    nombre, 
    estado, 
    ubicacion: ubicacion || null, 
    imagen_url: imagenUrl,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/proyectos");
}
