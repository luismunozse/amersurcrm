"use server";

import { revalidatePath } from "next/cache";
import { createServerActionClient } from "@/lib/supabase.server-actions";
import { obtenerPerfilUsuario } from "@/lib/auth/roles";
import { crearNotificacion } from "@/app/_actionsNotifications";

export async function crearPropiedad(formData: FormData) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Verificar permisos de administrador
  try {
    const perfil = await obtenerPerfilUsuario();
    if (!perfil || perfil.rol?.nombre !== 'ROL_ADMIN') {
      throw new Error("No tienes permisos para crear propiedades. Solo los administradores pueden realizar esta acción.");
    }
  } catch (error) {
    throw new Error("Error verificando permisos: " + (error as Error).message);
  }

  try {
    const codigo = String(formData.get("codigo") || "").trim();
    const tipo = String(formData.get("tipo") || "lote");
    const identificacion_interna = String(formData.get("identificacion_interna") || "").trim();
    const proyecto_id = formData.get("proyecto_id") ? String(formData.get("proyecto_id")) : null;
    const ubicacion_ciudad = String(formData.get("ubicacion_ciudad") || "").trim();
    const ubicacion_direccion = String(formData.get("ubicacion_direccion") || "").trim();
    const superficie_total = formData.get("superficie_total") ? Number(formData.get("superficie_total")) : null;
    const superficie_construida = formData.get("superficie_construida") ? Number(formData.get("superficie_construida")) : null;
    const precio = formData.get("precio") ? Number(formData.get("precio")) : null;
    const moneda = String(formData.get("moneda") || "USD");
    const estado_comercial = String(formData.get("estado_comercial") || "disponible");
    const etiquetas = formData.getAll("etiquetas") as string[];

        // Validaciones
        if (!codigo) {
          throw new Error("El código de la propiedad es requerido");
        }
        if (!identificacion_interna) {
          throw new Error("La identificación interna es requerida");
        }

        // Generar código único si no se proporciona
        let codigoFinal = codigo;
        if (!codigoFinal) {
          codigoFinal = `${tipo.toUpperCase()}-${Date.now()}`;
        }

    // Crear la propiedad
    const { data: propiedad, error: insertError } = await supabase
      .from("propiedad")
      .insert({
        codigo: codigoFinal,
        tipo: tipo as "lote" | "casa" | "departamento" | "oficina" | "local" | "terreno" | "otro",
        identificacion_interna,
        proyecto_id: proyecto_id || null,
        ubicacion: {
          ciudad: ubicacion_ciudad || null,
          direccion: ubicacion_direccion || null,
        },
        superficie: {
          total: superficie_total,
          construida: superficie_construida,
        },
        precio,
        moneda,
        estado_comercial: estado_comercial as "disponible" | "reservado" | "vendido" | "bloqueado",
        marketing: {
          etiquetas: etiquetas.filter(etiqueta => etiqueta.trim() !== ''),
        },
        created_by: user.id
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Error creando propiedad: ${insertError.message}`);
    }

    // Revalidar las páginas relacionadas
    revalidatePath("/dashboard/propiedades");
    revalidatePath("/dashboard");

    // Retornar éxito sin redirigir (la redirección se maneja en el cliente)
    return { success: true, propiedad };

  } catch (error) {
    // No capturar NEXT_REDIRECT como error
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error;
    }
    console.error("Error creando propiedad:", error);
    throw new Error(error instanceof Error ? error.message : "Error creando propiedad");
  }
}

export async function cambiarEstadoPropiedad(propiedadId: string, nuevoEstado: 'disponible' | 'reservado' | 'vendido' | 'bloqueado') {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Verificar permisos de administrador
  try {
    const perfil = await obtenerPerfilUsuario();
    if (!perfil || perfil.rol?.nombre !== 'ROL_ADMIN') {
      throw new Error("No tienes permisos para cambiar el estado de propiedades. Solo los administradores pueden realizar esta acción.");
    }
  } catch (error) {
    throw new Error("Error verificando permisos: " + (error as Error).message);
  }

  try {
    // Obtener información de la propiedad antes de actualizar
    const { data: propiedad, error: propiedadError } = await supabase
      .from("propiedad")
      .select("id, codigo, identificacion_interna, tipo, precio, moneda")
      .eq("id", propiedadId)
      .single();

    if (propiedadError || !propiedad) {
      throw new Error("Propiedad no encontrada");
    }

    // Actualizar el estado
    const { error } = await supabase
      .from("propiedad")
      .update({
        estado_comercial: nuevoEstado,
        updated_at: new Date().toISOString()
      })
      .eq("id", propiedadId);

    if (error) {
      throw new Error(`Error actualizando estado: ${error.message}`);
    }

    // Crear notificación para estados importantes
    if (nuevoEstado === 'reservado' || nuevoEstado === 'vendido') {
      try {
        const precioFormateado = propiedad.precio
          ? `${propiedad.moneda} ${propiedad.precio.toLocaleString()}`
          : 'Sin precio';

        const titulo = nuevoEstado === 'reservado'
          ? `🏠 Lote reservado`
          : `🎉 Lote vendido`;

        const mensaje = nuevoEstado === 'reservado'
          ? `Has reservado el lote "${propiedad.identificacion_interna}" (${propiedad.codigo}) por ${precioFormateado}`
          : `Has vendido el lote "${propiedad.identificacion_interna}" (${propiedad.codigo}) por ${precioFormateado}`;

        await crearNotificacion(
          user.id,
          "lote",
          titulo,
          mensaje,
          {
            propiedad_id: propiedadId,
            codigo: propiedad.codigo,
            tipo: propiedad.tipo,
            estado: nuevoEstado,
            precio: propiedad.precio,
            moneda: propiedad.moneda,
            url: `/dashboard/propiedades/${propiedadId}`
          }
        );
      } catch (notifError) {
        console.error("Error creando notificación:", notifError);
        // No fallar la operación principal si la notificación falla
      }
    }

    revalidatePath("/dashboard/propiedades");
    return { success: true, message: "Estado actualizado correctamente" };

  } catch (error) {
    console.error("Error cambiando estado de propiedad:", error);
    throw new Error(error instanceof Error ? error.message : "Error cambiando estado de propiedad");
  }
}

export async function eliminarPropiedad(propiedadId: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Verificar permisos de administrador
  try {
    const perfil = await obtenerPerfilUsuario();
    if (!perfil || perfil.rol?.nombre !== 'ROL_ADMIN') {
      throw new Error("No tienes permisos para eliminar propiedades. Solo los administradores pueden realizar esta acción.");
    }
  } catch (error) {
    throw new Error("Error verificando permisos: " + (error as Error).message);
  }

  try {
    // 1. Obtener información de la propiedad para eliminar archivos relacionados
    const { data: propiedad, error: propiedadError } = await supabase
      .from("propiedad")
      .select("id, codigo, marketing")
      .eq("id", propiedadId)
      .single();

    if (propiedadError) {
      throw new Error(`Error obteniendo propiedad: ${propiedadError.message}`);
    }

    if (!propiedad) {
      throw new Error("Propiedad no encontrada");
    }

    // 2. Eliminar registros relacionados primero (si existen)
    // Esto evita problemas de dependencias que puedan causar ambigüedades
    try {
      // Eliminar recordatorios relacionados (si existen)
      const { error: recordatoriosError } = await supabase
        .from("recordatorio")
        .delete()
        .eq("propiedad_id", propiedadId);
      
      if (recordatoriosError) {
        console.warn("Error eliminando recordatorios:", recordatoriosError);
      }
    } catch (error) {
      console.warn("No se pudieron eliminar recordatorios:", error);
    }

    // 3. Eliminar archivos del storage si existen
    if (propiedad.marketing?.fotos) {
      try {
        const fotos: string[] = Array.isArray(propiedad.marketing.fotos)
          ? (propiedad.marketing.fotos as string[])
          : [];
        const filePaths = fotos
          .map((foto: string) => {
            const name = foto.split('/').pop() || '';
            return name ? `propiedades/${propiedadId}/${name}` : null;
          })
          .filter((p): p is string => Boolean(p));
        
        if (filePaths.length > 0) {
          const { error: deleteError } = await supabase.storage
            .from('imagenes')
            .remove(filePaths);

          if (deleteError) {
            console.warn(`Error eliminando fotos del storage: ${deleteError.message}`);
          }
        }
      } catch (storageError) {
        console.warn(`Error procesando fotos del storage: ${storageError}`);
      }
    }

    if (propiedad.marketing?.renders) {
      try {
        const renders: string[] = Array.isArray(propiedad.marketing.renders)
          ? (propiedad.marketing.renders as string[])
          : [];
        const filePaths = renders
          .map((renderPath: string) => {
            const name = renderPath.split('/').pop() || '';
            return name ? `propiedades/${propiedadId}/${name}` : null;
          })
          .filter((p): p is string => Boolean(p));
        
        if (filePaths.length > 0) {
          const { error: deleteError } = await supabase.storage
            .from('imagenes')
            .remove(filePaths);

          if (deleteError) {
            console.warn(`Error eliminando renders del storage: ${deleteError.message}`);
          }
        }
      } catch (storageError) {
        console.warn(`Error procesando renders del storage: ${storageError}`);
      }
    }

    // 4. Eliminar la propiedad
    const { error: deleteError } = await supabase
      .from("propiedad")
      .delete()
      .eq("id", propiedadId);

    if (deleteError) {
      throw new Error(`Error eliminando propiedad: ${deleteError.message}`);
    }

    // 5. Revalidar las páginas relacionadas
    revalidatePath("/dashboard/propiedades");
    revalidatePath("/dashboard");

    return { success: true, message: `Propiedad "${propiedad.codigo}" eliminada correctamente` };

  } catch (error) {
    console.error("Error eliminando propiedad:", error);
    throw new Error(error instanceof Error ? error.message : "Error eliminando propiedad");
  }
}
