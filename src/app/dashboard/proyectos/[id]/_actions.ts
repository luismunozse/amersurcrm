"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createServerActionClient } from "@/lib/supabase.server-actions";
import { PERMISOS } from "@/lib/permissions";
import { requierePermiso, esAdmin, esAdminOCoordinador, obtenerPermisosUsuario, tieneRol } from "@/lib/permissions/server";
import type { LoteCoordenadas } from "@/types/proyectos";
import type { OverlayLayerConfig } from "@/types/overlay-layers";

export async function subirPlanos(proyectoId: string, fd: FormData) {
  const planosFile = fd.get("planos") as File | null;

  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  await requierePermiso(PERMISOS.PROYECTOS.EDITAR);

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

  await requierePermiso(PERMISOS.PROYECTOS.EDITAR);

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
  const moneda = String(fd.get("moneda") || "PEN"); // Moneda por defecto: Soles Peruanos
  const estado = String(fd.get("estado") || "disponible");


  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  await requierePermiso(PERMISOS.LOTES.CREAR);
  const puedeCrear = await esAdminOCoordinador();
  if (!puedeCrear) {
    throw new Error("Solo administradores o coordinadores pueden crear lotes");
  }

  // Validar que el código sea único dentro del proyecto
  if (codigo) {
    const { data: existingLote, error: checkError } = await supabase
      .from("lote")
      .select("id, codigo")
      .eq("proyecto_id", proyectoId)
      .eq("codigo", codigo)
      .maybeSingle();

    if (checkError) {
      throw new Error(`Error verificando código de lote: ${checkError.message}`);
    }

    if (existingLote) {
      throw new Error(`Ya existe un lote con código "${codigo}" en este proyecto`);
    }
  }

  const { data: lote, error } = await supabase
    .from("lote")
    .insert({
      proyecto_id: proyectoId,
      codigo,
      sup_m2,
      precio,
      moneda,
      estado: estado as "disponible" | "reservado" | "vendido",
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/proyectos/${proyectoId}`);
  revalidatePath("/dashboard/propiedades");
  revalidatePath("/dashboard");

  return { success: true, lote, message: `Lote "${codigo}" creado correctamente` };
}

export async function actualizarLote(loteId: string, fd: FormData) {
  const codigo = String(fd.get("codigo") || "");
  const sup_m2 = fd.get("sup_m2") ? Number(fd.get("sup_m2")) : null;
  const precio = fd.get("precio") ? Number(fd.get("precio")) : null;
  const moneda = String(fd.get("moneda") || "PEN"); // Moneda por defecto: Soles Peruanos
  const estado = String(fd.get("estado") || "disponible");
  const data = fd.get("data") ? String(fd.get("data")) : null;
  const planoPoligonoRaw = fd.has("plano_poligono") ? fd.get("plano_poligono") : null;

  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  await requierePermiso(PERMISOS.LOTES.EDITAR);

  // Verificar permisos y ruta según rol
  const esVendedorRol = await tieneRol('ROL_VENDEDOR');

  // Si es vendedor: solo puede cambiar estado mediante RPC seguras
  if (esVendedorRol) {
    // Validar que no intente modificar otros campos
    const quiereCambiarOtrosCampos = Boolean(
      (codigo && codigo.trim() !== "") ||
      sup_m2 !== null ||
      precio !== null ||
      (data && data.trim() !== "") ||
      planoPoligonoRaw !== null
    );
    if (quiereCambiarOtrosCampos) {
      throw new Error("No tienes permisos para editar datos del lote. Solo puedes cambiar el estado.");
    }

    // Ejecutar transición de estado vía funciones RPC (ya otorgadas a authenticated)
    let rpcName: 'reservar_lote' | 'vender_lote' | 'liberar_lote' | null = null;
    if (estado === 'reservado') rpcName = 'reservar_lote';
    else if (estado === 'vendido') rpcName = 'vender_lote';
    else if (estado === 'disponible') rpcName = 'liberar_lote';

    if (!rpcName) {
      throw new Error("Estado destino no permitido");
    }

    const { data: _ok, error: rpcError } = await supabase.rpc(rpcName as any, { p_lote: loteId });
    if (rpcError) {
      throw new Error(`No se pudo cambiar el estado: ${rpcError.message}`);
    }

    // Forzar revalidación de la página del proyecto
    revalidatePath(`/dashboard/proyectos/${fd.get("proyecto_id")}`);
    return { success: true };
  }

  // Validar que el código sea único dentro del proyecto (si se está cambiando)
  if (codigo && codigo.trim() !== "") {
    const { data: currentLote } = await supabase
      .from("lote")
      .select("codigo, proyecto_id")
      .eq("id", loteId)
      .single();

    if (currentLote && codigo !== currentLote.codigo) {
      const { data: existingLote, error: checkError } = await supabase
        .from("lote")
        .select("id, codigo")
        .eq("proyecto_id", currentLote.proyecto_id)
        .eq("codigo", codigo)
        .maybeSingle();

      if (checkError) {
        throw new Error(`Error verificando código de lote: ${checkError.message}`);
      }

      if (existingLote) {
        throw new Error(`Ya existe un lote con código "${codigo}" en este proyecto`);
      }
    }
  }

  // Validar permiso para cambios de precio/moneda
  if (precio !== null || Boolean(moneda)) {
    await requierePermiso(PERMISOS.PRECIOS.MODIFICAR);
  }

  // Construir objeto de actualización dinámicamente
  const updateData: any = {
    estado: estado as "disponible" | "reservado" | "vendido",
  };

  // Solo actualizar otros campos si tienen valores válidos
  if (codigo) updateData.codigo = codigo;
  if (sup_m2 !== null) updateData.sup_m2 = sup_m2;
  if (precio !== null) updateData.precio = precio;
  if (moneda) updateData.moneda = moneda;
  if (data) {
    try {
      updateData.data = JSON.parse(data);
    } catch (e) {
      console.warn("Error parsing data JSON:", e);
    }
  }
  if (planoPoligonoRaw !== null) {
    try {
      const parsed = typeof planoPoligonoRaw === "string" && planoPoligonoRaw.trim().length > 0
        ? JSON.parse(planoPoligonoRaw)
        : null;
      updateData.plano_poligono = parsed;
    } catch (e) {
      console.warn("Error parsing plano_poligono JSON:", e);
    }
  }

  // Admin (u otros roles con privilegio) pueden actualizar directamente
  const { error } = await supabase
    .from("lote")
    .update(updateData)
    .eq("id", loteId);

  if (error) throw new Error(error.message);

  const { data: loteActualizado } = await supabase
    .from("lote")
    .select("*")
    .eq("id", loteId)
    .maybeSingle();

  const proyectoId = (fd.get("proyecto_id") as string) || loteActualizado?.proyecto_id || null;
  if (proyectoId) {
    revalidatePath(`/dashboard/proyectos/${proyectoId}`);
  }
  revalidatePath("/dashboard/propiedades");

  return { success: true, lote: loteActualizado ?? null };
}

export async function guardarPoligonoProyecto(
  proyectoId: string,
  vertices: Array<{ lat: number; lng: number }>
) {
  const supabase = await createServerActionClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const isAdmin = await esAdmin();
  if (!isAdmin) {
    throw new Error("No tienes permisos para actualizar el perímetro del proyecto");
  }

  const sanitized = (vertices || []).map((v) => ({
    lat: Number(v.lat),
    lng: Number(v.lng)
  }));

  const { error } = await supabase
    .from("proyecto")
    .update({ poligono: sanitized })
    .eq("id", proyectoId);

  if (error) throw new Error(`Error guardando polígono: ${error.message}`);

  revalidatePath(`/dashboard/proyectos/${proyectoId}`);
  return { success: true, vertices: sanitized };
}

export async function eliminarPoligonoProyecto(proyectoId: string) {
  const supabase = await createServerActionClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const isAdmin = await esAdmin();
  if (!isAdmin) {
    throw new Error("No tienes permisos para eliminar el perímetro del proyecto");
  }

  const { error } = await supabase
    .from("proyecto")
    .update({ poligono: null })
    .eq("id", proyectoId);

  if (error) throw new Error(`Error eliminando polígono: ${error.message}`);

  revalidatePath(`/dashboard/proyectos/${proyectoId}`);
  return { success: true };
}

export async function guardarPoligonoLote(
  loteId: string,
  proyectoId: string,
  vertices: Array<[number, number]>
) {
  const supabase = await createServerActionClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const isAdmin = await esAdmin();
  if (!isAdmin) {
    throw new Error("No tienes permisos para actualizar lotes");
  }

  const sanitized = (vertices || [])
    .filter((pair) => Array.isArray(pair) && pair.length === 2)
    .map((pair) => [Number(pair[0]), Number(pair[1])] as [number, number]);

  const { error } = await supabase
    .from("lote")
    .update({
      plano_poligono: sanitized.length > 0 ? sanitized : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", loteId)
    .eq("proyecto_id", proyectoId);

  if (error) throw new Error(`Error guardando polígono del lote: ${error.message}`);

  revalidatePath(`/dashboard/proyectos/${proyectoId}`);
  return { success: true, vertices: sanitized };
}

export async function eliminarLote(loteId: string, proyectoId: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Verificar permisos de administrador
  await requierePermiso(PERMISOS.LOTES.ELIMINAR);
  const puedeEliminar = await esAdminOCoordinador();
  if (!puedeEliminar) {
    throw new Error("Solo administradores o coordinadores pueden eliminar lotes");
  }

  const { error } = await supabase
    .from("lote")
    .delete()
    .eq("id", loteId);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/proyectos/${proyectoId}`);
  revalidatePath("/dashboard/propiedades");
  return { success: true, message: "Lote eliminado correctamente" };
}

// Eliminar TODOS los lotes de un proyecto
export async function eliminarTodosLosLotes(proyectoId: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  await requierePermiso(PERMISOS.LOTES.ELIMINAR);
  const puedeEliminar = await esAdminOCoordinador();
  if (!puedeEliminar) {
    throw new Error("Solo administradores o coordinadores pueden eliminar lotes");
  }

  // Primero obtener la cantidad de lotes que se van a eliminar
  const { count, error: countError } = await supabase
    .from("lote")
    .select("*", { count: 'exact', head: true })
    .eq("proyecto_id", proyectoId);

  if (countError) throw new Error(countError.message);

  // Eliminar todos los lotes del proyecto
  const { error } = await supabase
    .from("lote")
    .delete()
    .eq("proyecto_id", proyectoId);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/proyectos/${proyectoId}`);
  revalidatePath("/dashboard/propiedades");
  return {
    success: true,
    message: `${count || 0} lote(s) eliminado(s) correctamente`,
    deletedCount: count || 0
  };
}

// Duplicar un lote manteniendo sus datos. Genera un código único con sufijo -copy, -copy-2, ...
export async function duplicarLote(loteId: string, proyectoId: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  await requierePermiso(PERMISOS.LOTES.CREAR);
  const puedeDuplicar = await esAdminOCoordinador();
  if (!puedeDuplicar) {
    throw new Error("Solo administradores o coordinadores pueden duplicar lotes");
  }

  // Traer lote original
  const { data: original, error: errGet } = await supabase
    .from('lote')
    .select('proyecto_id,codigo,sup_m2,precio,moneda,estado,data')
    .eq('id', loteId)
    .single();
  if (errGet) throw new Error(errGet.message);
  if (!original) throw new Error('Lote no encontrado');

  // Generar código único
  const base = `${original.codigo}-copy`;
  let candidate = base;
  let idx = 2;
  while (true) {
    const { data: exists, error: errExists } = await supabase
      .from('lote')
      .select('id', { count: 'exact', head: true })
      .eq('proyecto_id', proyectoId)
      .eq('codigo', candidate);
    if (errExists) throw new Error(errExists.message);
    if (!exists) break; // head:true -> exists es null; count viene en headers, pero si no hay error podemos intentar otra estrategia
    // fallback: intentar otra consulta para determinar existencia de manera confiable
    const { count } = await supabase
      .from('lote')
      .select('*', { count: 'exact', head: true })
      .eq('proyecto_id', proyectoId)
      .eq('codigo', candidate);
    if ((count ?? 0) === 0) break;
    candidate = `${base}-${idx++}`;
  }

  // Insertar duplicado
  const { data: inserted, error: errIns } = await supabase
    .from('lote')
    .insert({
      proyecto_id: proyectoId,
      codigo: candidate,
      sup_m2: original.sup_m2,
      precio: original.precio,
      moneda: original.moneda,
      estado: original.estado,
      data: original.data,
      created_by: user.id,
    })
    .select('*')
    .single();
  if (errIns) throw new Error(errIns.message);

  revalidatePath(`/dashboard/proyectos/${proyectoId}`);
  return inserted;
}

// =========================================
// Funciones para manejo de coordenadas de lotes
// =========================================

export async function guardarCoordenadasLote(loteId: string, coordenadas: LoteCoordenadas) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Verificar permisos de administrador
  const isAdmin = await esAdmin();
  if (!isAdmin) {
    throw new Error("No tienes permisos para guardar coordenadas. Solo los administradores pueden realizar esta acción.");
  }

  const { data: loteInfo } = await supabase
    .from("lote")
    .select("proyecto_id")
    .eq("id", loteId)
    .maybeSingle();

  const { error } = await supabase
    .from("lote")
    .update({
      plano_poligono: coordenadas.coordinates,
      updated_at: new Date().toISOString()
    })
    .eq("id", loteId);

  if (error) throw new Error(`Error guardando coordenadas: ${error.message}`);

  if (loteInfo?.proyecto_id) {
    revalidatePath(`/dashboard/proyectos/${loteInfo.proyecto_id}`);
  }
  revalidatePath("/dashboard/propiedades");
  return { success: true };
}

export async function guardarCoordenadasMultiples(proyectoId: string, coordenadas: Array<{loteId: string, lat: number, lng: number, nombre: string}>) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Verificar permisos de administrador
  const isAdmin = await esAdmin();
  if (!isAdmin) {
    throw new Error("No tienes permisos para guardar coordenadas. Solo los administradores pueden realizar esta acción.");
  }

  // Crear lotes si no existen, o actualizar si existen
  const updates = coordenadas.map(coord => ({
    id: coord.loteId,
    proyecto_id: proyectoId,
    nombre: coord.nombre,
    coordenada_lat: coord.lat,
    coordenada_lng: coord.lng,
    updated_at: new Date().toISOString()
  }));

  const { error } = await supabase
    .from("lote")
    .upsert(updates, { 
      onConflict: 'id',
      ignoreDuplicates: false 
    });

  if (error) throw new Error(`Error guardando coordenadas: ${error.message}`);

  revalidatePath(`/dashboard/proyectos/${proyectoId}`);
  return { success: true, count: coordenadas.length };
}

// Guardar bounds de overlay del plano
// Soporta tanto formato antiguo (2 puntos: bounding box) como nuevo (4 puntos: esquinas independientes)
export async function guardarOverlayBounds(
  proyectoId: string,
  bounds: [[number, number], [number, number]] | [[number, number], [number, number], [number, number], [number, number]],
  rotationDeg?: number,
  opacity?: number
) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Solo admin
  const isAdmin = await esAdmin();
  if (!isAdmin) {
    throw new Error("No tienes permisos para calibrar el plano");
  }

  const payload: any = { overlay_bounds: bounds as any };
  if (typeof rotationDeg === 'number') payload.overlay_rotation = rotationDeg;
  if (typeof opacity === 'number') payload.overlay_opacity = opacity;
  const { error } = await supabase
    .from('proyecto')
    .update(payload)
    .eq('id', proyectoId);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/proyectos/${proyectoId}`);
  return { success: true };
}

const sanitizeOverlayLayer = (layer: OverlayLayerConfig, index: number) => {
  if (!layer.url) return null;
  return {
    id: layer.id ?? randomUUID(),
    name: layer.name ?? `Capa ${index + 1}`,
    url: layer.url,
    bounds: layer.bounds ?? null,
    opacity: typeof layer.opacity === "number" ? layer.opacity : null,
    visible: typeof layer.visible === "boolean" ? layer.visible : true,
    isPrimary: typeof layer.isPrimary === "boolean" ? layer.isPrimary : index === 0,
    order: typeof layer.order === "number" ? layer.order : index,
  } satisfies OverlayLayerConfig;
};

export async function guardarOverlayLayers(
  proyectoId: string,
  layers: OverlayLayerConfig[]
) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const isAdmin = await esAdmin();
  if (!isAdmin) {
    throw new Error("No tienes permisos para actualizar las capas del plano");
  }

  const sanitizedLayers = (layers || [])
    .map(sanitizeOverlayLayer)
    .filter((layer): layer is NonNullable<typeof layer> => layer !== null);

  const primaryLayer = sanitizedLayers.find((layer) => layer.isPrimary) ?? sanitizedLayers[0] ?? null;

  const payload: Record<string, unknown> = {
    overlay_layers: sanitizedLayers.length ? sanitizedLayers : null,
  };

  payload.planos_url = primaryLayer?.url ?? null;
  payload.overlay_bounds = primaryLayer?.bounds ?? null;
  payload.overlay_opacity =
    primaryLayer && typeof primaryLayer.opacity === "number" ? primaryLayer.opacity : null;

  const { error } = await supabase
    .from("proyecto")
    .update(payload)
    .eq("id", proyectoId);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/proyectos/${proyectoId}`);
  return { success: true, layers: sanitizedLayers };
}

export async function obtenerCoordenadasProyecto(proyectoId: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: lotes, error } = await supabase
    .from('lote')
    .select(`
      id,
      nombre,
      coordenada_lat,
      coordenada_lng,
      created_at,
      updated_at
    `)
    .eq('proyecto_id', proyectoId)
    .not('coordenada_lat', 'is', null)
    .not('coordenada_lng', 'is', null);

  if (error) throw new Error(`Error obteniendo coordenadas: ${error.message}`);

  return lotes || [];
}

export async function eliminarProyecto(proyectoId: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Verificar permisos de administrador
  const isAdmin = await esAdmin();
  if (!isAdmin) {
    throw new Error("No tienes permisos para eliminar proyectos. Solo los administradores pueden realizar esta acción.");
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
        // Extraer la ruta del archivo de la URL
        const urlParts = proyecto.planos_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `proyectos/${proyectoId}/${fileName}`;
        
        const { error: deleteError } = await supabase.storage
          .from('imagenes')
          .remove([filePath]);
        
        if (deleteError) {
          console.warn(`Error eliminando archivo del storage: ${deleteError.message}`);
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

// ============================================
// SISTEMA DE RESERVAS
// ============================================

/**
 * Genera un código único para reserva
 */
async function generarCodigoReserva(): Promise<string> {
  const supabase = await createServerActionClient();

  // Formato: RSV-YYYYMMDD-XXX (ej: RSV-20250126-001)
  const fecha = new Date();
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  const fechaStr = `${año}${mes}${dia}`;

  // Buscar el último código del día
  const { data: ultimaReserva } = await supabase
    .schema('crm')
    .from('reserva')
    .select('codigo_reserva')
    .like('codigo_reserva', `RSV-${fechaStr}%`)
    .order('codigo_reserva', { ascending: false })
    .limit(1)
    .single();

  let secuencia = 1;
  if (ultimaReserva?.codigo_reserva) {
    const partes = ultimaReserva.codigo_reserva.split('-');
    secuencia = parseInt(partes[2] || '0') + 1;
  }

  return `RSV-${fechaStr}-${String(secuencia).padStart(3, '0')}`;
}

/**
 * Obtiene los datos del vendedor actual para la proforma
 */
export async function obtenerDatosVendedorActual(): Promise<{
  nombre: string | null;
  telefono: string | null;
  error: string | null;
}> {
  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { nombre: null, telefono: null, error: "No autenticado" };
    }

    const { data: perfil } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .select('nombre_completo, telefono')
      .eq('id', user.id)
      .single();

    if (!perfil) {
      return { nombre: null, telefono: null, error: "No se pudo obtener el perfil del vendedor" };
    }

    return {
      nombre: perfil.nombre_completo || null,
      telefono: perfil.telefono || null,
      error: null
    };
  } catch (error) {
    return { nombre: null, telefono: null, error: error instanceof Error ? error.message : 'Error desconocido' };
  }
}

/**
 * Obtiene lista de clientes para el selector (con búsqueda opcional)
 */
export async function obtenerClientesParaSelect(busqueda?: string): Promise<{
  data: Array<{ id: string; nombre: string; email: string | null; telefono: string | null }> | null;
  error: string | null
}> {
  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "No autenticado" };
    }

    let query = supabase
      .schema('crm')
      .from('cliente')
      .select('id, nombre, email, telefono')
      .order('nombre', { ascending: true })
      .limit(500); // Aumentado a 500 clientes

    // Si hay búsqueda, filtrar por nombre, email o teléfono
    if (busqueda && busqueda.trim()) {
      const termino = busqueda.trim();
      query = query.or(`nombre.ilike.%${termino}%,email.ilike.%${termino}%,telefono.ilike.%${termino}%`);
    }

    const { data: clientes, error } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: clientes, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Error desconocido' };
  }
}

/**
 * Crea un cliente rápido desde el modal de reserva
 */
export async function crearClienteRapido(datos: {
  nombre: string;
  email?: string;
  telefono?: string;
  documento?: string;
}): Promise<{ data: { id: string } | null; error: string | null }> {
  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "No autenticado" };
    }

    // Validar datos requeridos
    if (!datos.nombre || datos.nombre.trim().length === 0) {
      return { data: null, error: "El nombre es requerido" };
    }

    const { data: nuevoCliente, error } = await supabase
      .schema('crm')
      .from('cliente')
      .insert({
        nombre: datos.nombre.trim(),
        email: datos.email?.trim() || null,
        telefono: datos.telefono?.trim() || null,
        documento: datos.documento?.trim() || null,
        estado_cliente: 'lead',
        origen_lead: 'crm_manual',
        created_by: user.id
      })
      .select('id')
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    revalidatePath('/dashboard/clientes');
    return { data: nuevoCliente, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Error creando cliente' };
  }
}

/**
 * Crea una reserva con vinculación completa: cliente, vendedor, lote
 */
export async function crearReservaConVinculacion(datos: {
  loteId: string;
  proyectoId: string;
  clienteId: string;
  precioVenta: number;
  montoInicial: number;
  numeroCuotas: number;
  formaPago: string;
  fechaVencimiento: string;
  notas?: string;
}): Promise<{ data: any | null; error: string | null }> {
  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "No autenticado" };
    }

    // Obtener perfil del vendedor
    const usuario = await obtenerPermisosUsuario();
    if (!usuario || !usuario.id) {
      return { data: null, error: "No se pudo obtener el perfil del vendedor" };
    }

    // Validaciones
    if (datos.precioVenta <= 0) {
      return { data: null, error: "El precio de venta debe ser mayor a 0" };
    }

    if (datos.montoInicial < 0 || datos.montoInicial > datos.precioVenta) {
      return { data: null, error: "El monto inicial no es válido" };
    }

    if (datos.numeroCuotas < 0) {
      return { data: null, error: "El número de cuotas no es válido" };
    }

    // Verificar que el lote esté disponible
    const { data: lote, error: loteError } = await supabase
      .schema('crm')
      .from('lote')
      .select('estado, codigo')
      .eq('id', datos.loteId)
      .single();

    if (loteError || !lote) {
      return { data: null, error: "Lote no encontrado" };
    }

    if (lote.estado !== 'disponible') {
      return { data: null, error: `El lote ${lote.codigo} no está disponible (estado actual: ${lote.estado})` };
    }

    // Generar código de reserva
    const codigoReserva = await generarCodigoReserva();

    // Iniciar transacción: Crear reserva + Cambiar estado lote + Asignar vendedor a cliente
    // 1. Crear reserva
    const { data: nuevaReserva, error: reservaError } = await supabase
      .schema('crm')
      .from('reserva')
      .insert({
        codigo_reserva: codigoReserva,
        cliente_id: datos.clienteId,
        lote_id: datos.loteId,
        vendedor_username: usuario.email,
        monto_reserva: datos.montoInicial,
        moneda: 'PEN',
        fecha_vencimiento: datos.fechaVencimiento,
        estado: 'activa',
        metodo_pago: datos.formaPago,
        notas: datos.notas || null
      })
      .select()
      .single();

    if (reservaError) {
      return { data: null, error: `Error creando separación: ${reservaError.message}` };
    }

    // 2. Cambiar estado del lote a reservado
    const { error: estadoError } = await supabase
      .schema('crm')
      .from('lote')
      .update({ estado: 'reservado' })
      .eq('id', datos.loteId);

    if (estadoError) {
      // Revertir reserva
      await supabase.schema('crm').from('reserva').delete().eq('id', nuevaReserva.id);
      return { data: null, error: `Error cambiando estado del lote: ${estadoError.message}` };
    }

    // 3. Asignar vendedor al cliente (si no lo tiene)
    const { data: cliente } = await supabase
      .schema('crm')
      .from('cliente')
      .select('vendedor_asignado')
      .eq('id', datos.clienteId)
      .single();

    if (cliente && !cliente.vendedor_asignado) {
      await supabase
        .schema('crm')
        .from('cliente')
        .update({ vendedor_asignado: usuario.email })
        .eq('id', datos.clienteId);
    }

    // Notificar admins + coordinadores sobre la nueva reserva
    try {
      const { notificarUsuariosPorRoles } = await import('@/app/_actionsNotifications');
      await notificarUsuariosPorRoles(
        ['ROL_ADMIN', 'ROL_COORDINADOR_VENTAS'],
        'reserva',
        `Nueva reserva: lote ${lote.codigo}`,
        `${usuario.nombre_completo || usuario.email} reservó el lote ${lote.codigo} por ${datos.montoInicial} (código ${codigoReserva})`,
        {
          loteId: datos.loteId,
          proyectoId: datos.proyectoId,
          reservaId: nuevaReserva.id,
          codigoReserva,
          url: `/dashboard/proyectos/${datos.proyectoId}`,
        },
        usuario.id,
      );
    } catch (notifError) {
      console.warn('Error notificando reserva:', notifError);
    }

    // Revalidar páginas
    revalidatePath(`/dashboard/proyectos/${datos.proyectoId}`);
    revalidatePath('/dashboard/clientes');

    return {
      data: {
        ...nuevaReserva,
        codigo_lote: lote.codigo
      },
      error: null
    };
  } catch (error) {
    console.error('Error en crearReservaConVinculacion:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Error desconocido creando separación'
    };
  }
}

/**
 * Obtiene el detalle completo de un lote incluyendo reserva y cliente si aplica
 */
export async function obtenerDetalleLote(loteId: string): Promise<{
  data: {
    lote: any;
    reserva: any | null;
    cliente: any | null;
    proyecto: any | null;
  } | null;
  error: string | null;
}> {
  try {
    const supabase = await createServerActionClient();
    
    // Obtener lote con proyecto
    const { data: lote, error: loteError } = await supabase
      .schema('crm')
      .from('lote')
      .select(`
        *,
        proyecto:proyecto_id (
          id,
          nombre,
          ubicacion,
          estado
        )
      `)
      .eq('id', loteId)
      .single();

    if (loteError || !lote) {
      return { data: null, error: 'Lote no encontrado' };
    }

    let reserva = null;
    let cliente = null;

    // Si el lote está reservado o vendido, buscar la reserva activa
    if (lote.estado === 'reservado' || lote.estado === 'vendido') {
      const { data: reservaData } = await supabase
        .schema('crm')
        .from('reserva')
        .select(`
          *,
          cliente:cliente_id (
            id,
            nombre,
            email,
            telefono,
            documento,
            tipo_documento
          )
        `)
        .eq('lote_id', loteId)
        .in('estado', ['activa', 'completada'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (reservaData) {
        reserva = reservaData;
        cliente = reservaData.cliente;
      }
    }

    return {
      data: {
        lote,
        reserva,
        cliente,
        proyecto: lote.proyecto
      },
      error: null
    };
  } catch (error) {
    console.error('Error obteniendo detalle del lote:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Error obteniendo detalle'
    };
  }
}

// ============================================================================
// LIBERAR LOTE — revierte estado a 'disponible' y cancela reserva activa
// Solo admin/coordinador. Notifica al vendedor original.
// ============================================================================
export async function liberarLote(
  loteId: string,
  motivo: string,
): Promise<{ success: boolean; error?: string }> {
  if (!loteId || typeof loteId !== 'string') {
    return { success: false, error: 'ID de lote inválido' };
  }
  if (!motivo || motivo.trim().length < 5) {
    return { success: false, error: 'Motivo requerido (mínimo 5 caracteres)' };
  }

  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const puedeLiberar = await esAdminOCoordinador();
    if (!puedeLiberar) {
      return { success: false, error: 'Solo administradores o coordinadores pueden liberar lotes' };
    }

    const { data: lote, error: loteError } = await supabase
      .schema('crm')
      .from('lote')
      .select('id, codigo, estado, proyecto_id')
      .eq('id', loteId)
      .single();

    if (loteError || !lote) {
      return { success: false, error: 'Lote no encontrado' };
    }

    if (lote.estado === 'disponible') {
      return { success: false, error: 'El lote ya está disponible' };
    }

    const { data: reservasActivas } = await supabase
      .schema('crm')
      .from('reserva')
      .select('id, vendedor_username, cliente_id')
      .eq('lote_id', loteId)
      .eq('estado', 'activa');

    const { error: updateError } = await supabase
      .schema('crm')
      .from('lote')
      .update({ estado: 'disponible' })
      .eq('id', loteId);

    if (updateError) {
      return { success: false, error: `Error actualizando estado: ${updateError.message}` };
    }

    if (reservasActivas && reservasActivas.length > 0) {
      const ids = reservasActivas.map((r) => r.id);
      await supabase
        .schema('crm')
        .from('reserva')
        .update({
          estado: 'cancelada',
          motivo_cancelacion: motivo.trim(),
        })
        .in('id', ids);
    }

    try {
      const { notificarUsuariosPorRoles } = await import('@/app/_actionsNotifications');
      await notificarUsuariosPorRoles(
        ['ROL_ADMIN', 'ROL_COORDINADOR_VENTAS'],
        'lote',
        `Lote ${lote.codigo} liberado`,
        `El lote ${lote.codigo} fue liberado. Motivo: ${motivo.trim()}`,
        { loteId, proyectoId: lote.proyecto_id, motivo: motivo.trim() },
        user.id,
      );
    } catch (notifError) {
      console.warn('Error enviando notificación de liberación:', notifError);
    }

    revalidatePath(`/dashboard/proyectos/${lote.proyecto_id}`);
    return { success: true };
  } catch (error) {
    console.error('Error en liberarLote:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error liberando lote',
    };
  }
}

// ============================================================================
// CAMBIAR ESTADO MASIVO — actualiza múltiples lotes a un nuevo estado
// Solo admin/coordinador. Bloquea cambios inválidos.
// ============================================================================
export async function cambiarEstadoMasivoLotes(
  proyectoId: string,
  loteIds: string[],
  nuevoEstado: 'disponible' | 'reservado' | 'vendido',
): Promise<{ success: boolean; actualizados: number; error?: string }> {
  if (!proyectoId || !loteIds || loteIds.length === 0) {
    return { success: false, actualizados: 0, error: 'Parámetros inválidos' };
  }

  if (!['disponible', 'reservado', 'vendido'].includes(nuevoEstado)) {
    return { success: false, actualizados: 0, error: 'Estado inválido' };
  }

  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, actualizados: 0, error: 'No autenticado' };

    await requierePermiso(PERMISOS.LOTES.EDITAR);
    const puede = await esAdminOCoordinador();
    if (!puede) {
      return {
        success: false,
        actualizados: 0,
        error: 'Solo administradores o coordinadores pueden cambiar estado masivo',
      };
    }

    const { data: updated, error } = await supabase
      .schema('crm')
      .from('lote')
      .update({ estado: nuevoEstado })
      .eq('proyecto_id', proyectoId)
      .in('id', loteIds)
      .select('id');

    if (error) {
      return { success: false, actualizados: 0, error: error.message };
    }

    const count = updated?.length ?? 0;

    revalidatePath(`/dashboard/proyectos/${proyectoId}`);
    return { success: true, actualizados: count };
  } catch (error) {
    console.error('Error en cambiarEstadoMasivoLotes:', error);
    return {
      success: false,
      actualizados: 0,
      error: error instanceof Error ? error.message : 'Error en cambio masivo',
    };
  }
}

// ============================================================================
// ASIGNAR VENDEDOR MASIVO — set vendedor_asignado en varios lotes
// Solo admin/coordinador. Username debe corresponder a usuario activo.
// ============================================================================
export async function asignarVendedorMasivoLotes(
  proyectoId: string,
  loteIds: string[],
  vendedorUsername: string | null,
): Promise<{ success: boolean; actualizados: number; error?: string }> {
  if (!proyectoId || !loteIds || loteIds.length === 0) {
    return { success: false, actualizados: 0, error: 'Parámetros inválidos' };
  }

  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, actualizados: 0, error: 'No autenticado' };

    await requierePermiso(PERMISOS.LOTES.EDITAR);
    const puede = await esAdminOCoordinador();
    if (!puede) {
      return {
        success: false,
        actualizados: 0,
        error: 'Solo administradores o coordinadores pueden asignar vendedores',
      };
    }

    if (vendedorUsername) {
      const { data: vendedor, error: vendedorError } = await supabase
        .schema('crm')
        .from('usuario_perfil')
        .select('id, username, activo')
        .eq('username', vendedorUsername)
        .eq('activo', true)
        .maybeSingle();

      if (vendedorError || !vendedor) {
        return {
          success: false,
          actualizados: 0,
          error: `Vendedor "${vendedorUsername}" no existe o está inactivo`,
        };
      }
    }

    const { data: updated, error } = await supabase
      .schema('crm')
      .from('lote')
      .update({ vendedor_asignado: vendedorUsername })
      .eq('proyecto_id', proyectoId)
      .in('id', loteIds)
      .select('id');

    if (error) {
      return { success: false, actualizados: 0, error: error.message };
    }

    revalidatePath(`/dashboard/proyectos/${proyectoId}`);
    return { success: true, actualizados: updated?.length ?? 0 };
  } catch (error) {
    console.error('Error en asignarVendedorMasivoLotes:', error);
    return {
      success: false,
      actualizados: 0,
      error: error instanceof Error ? error.message : 'Error asignando vendedor',
    };
  }
}

// ============================================================================
// LISTA VENDEDORES ACTIVOS — para UI de asignación masiva
// ============================================================================
export async function listarVendedoresActivos(): Promise<{
  data: Array<{ username: string; nombre_completo: string; rol: string }>;
  error: string | null;
}> {
  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: 'No autenticado' };

    const { data, error } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .select('username, nombre_completo, rol:rol!usuario_perfil_rol_id_fkey(nombre)')
      .eq('activo', true)
      .order('nombre_completo');

    if (error) return { data: [], error: error.message };

    const vendedores = (data || [])
      .map((u) => {
        const rolObj = Array.isArray(u.rol) ? u.rol[0] : u.rol;
        return {
          username: u.username as string,
          nombre_completo: u.nombre_completo as string,
          rol: (rolObj?.nombre as string) ?? '',
        };
      })
      .filter(
        (u) =>
          u.username &&
          ['ROL_VENDEDOR', 'ROL_COORDINADOR_VENTAS', 'ROL_ADMIN'].includes(u.rol),
      );

    return { data: vendedores, error: null };
  } catch (error) {
    console.error('Error listando vendedores:', error);
    return {
      data: [],
      error: error instanceof Error ? error.message : 'Error listando vendedores',
    };
  }
}

// ============================================================================
// IMPORTACION MASIVA DE LOTES — CSV/Excel
// ============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type LoteImportRow = {
  codigo: string;
  sup_m2?: number | null;
  precio?: number | null;
  moneda?: 'PEN' | 'USD' | 'ARS' | null;
  estado?: 'disponible' | 'reservado' | 'vendido' | null;
  manzana?: string | null;
  etapa?: string | null;
  tipo_unidad?: string | null;
  numero?: string | null;
  vendedor_asignado?: string | null;
};

export type ImportError = {
  fila: number;
  codigo?: string;
  mensaje: string;
};

export type ImportarLotesResult = {
  success: boolean;
  insertados: number;
  errores: ImportError[];
  warnings: string[];
};

const MONEDAS_VALIDAS: ReadonlyArray<'PEN' | 'USD' | 'ARS'> = ['PEN', 'USD', 'ARS'];
const ESTADOS_VALIDOS: ReadonlyArray<'disponible' | 'reservado' | 'vendido'> = [
  'disponible',
  'reservado',
  'vendido',
];

export async function importarLotesMasivo(
  proyectoId: string,
  filas: LoteImportRow[],
  opciones?: { dryRun?: boolean },
): Promise<ImportarLotesResult> {
  const dryRun = opciones?.dryRun === true;
  const errores: ImportError[] = [];
  const warnings: string[] = [];

  if (!proyectoId || !UUID_REGEX.test(proyectoId)) {
    return {
      success: false,
      insertados: 0,
      errores: [{ fila: 0, mensaje: 'ID de proyecto inválido' }],
      warnings,
    };
  }

  if (!Array.isArray(filas) || filas.length === 0) {
    return {
      success: false,
      insertados: 0,
      errores: [{ fila: 0, mensaje: 'No hay filas para importar' }],
      warnings,
    };
  }

  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      success: false,
      insertados: 0,
      errores: [{ fila: 0, mensaje: 'No autenticado' }],
      warnings,
    };
  }

  await requierePermiso(PERMISOS.LOTES.CREAR);
  const puedeCrear = await esAdminOCoordinador();
  if (!puedeCrear) {
    return {
      success: false,
      insertados: 0,
      errores: [
        { fila: 0, mensaje: 'Solo administradores o coordinadores pueden importar lotes' },
      ],
      warnings,
    };
  }

  // 1) Validacion por fila + deteccion de duplicados en batch
  const codigosVistos = new Map<string, number>();
  const filasValidadas: Array<{ index: number; row: LoteImportRow }> = [];

  for (let i = 0; i < filas.length; i++) {
    const numeroFila = i + 1;
    const row = filas[i] || ({} as LoteImportRow);

    const codigo = typeof row.codigo === 'string' ? row.codigo.trim() : '';
    if (!codigo) {
      errores.push({ fila: numeroFila, mensaje: 'Código requerido' });
      continue;
    }

    if (codigosVistos.has(codigo)) {
      errores.push({
        fila: numeroFila,
        codigo,
        mensaje: `Código duplicado en el archivo (también en fila ${codigosVistos.get(codigo)})`,
      });
      continue;
    }
    codigosVistos.set(codigo, numeroFila);

    if (row.sup_m2 !== undefined && row.sup_m2 !== null) {
      if (typeof row.sup_m2 !== 'number' || !Number.isFinite(row.sup_m2) || row.sup_m2 < 0) {
        errores.push({
          fila: numeroFila,
          codigo,
          mensaje: 'Superficie (sup_m2) debe ser un número mayor o igual a 0',
        });
        continue;
      }
    }

    if (row.precio !== undefined && row.precio !== null) {
      if (typeof row.precio !== 'number' || !Number.isFinite(row.precio) || row.precio < 0) {
        errores.push({
          fila: numeroFila,
          codigo,
          mensaje: 'Precio debe ser un número mayor o igual a 0',
        });
        continue;
      }
    }

    if (row.moneda && !MONEDAS_VALIDAS.includes(row.moneda)) {
      errores.push({
        fila: numeroFila,
        codigo,
        mensaje: `Moneda inválida: "${row.moneda}". Use PEN, USD o ARS`,
      });
      continue;
    }

    if (row.estado && !ESTADOS_VALIDOS.includes(row.estado)) {
      errores.push({
        fila: numeroFila,
        codigo,
        mensaje: `Estado inválido: "${row.estado}". Use disponible, reservado o vendido`,
      });
      continue;
    }

    filasValidadas.push({ index: numeroFila, row: { ...row, codigo } });
  }

  // 2) Verificacion de existencia en DB (skip + warning) — una sola query
  const codigosLista = filasValidadas.map((f) => f.row.codigo);
  if (codigosLista.length > 0) {
    const { data: existentes, error: errExist } = await supabase
      .from('lote')
      .select('codigo')
      .eq('proyecto_id', proyectoId)
      .in('codigo', codigosLista);

    if (errExist) {
      return {
        success: false,
        insertados: 0,
        errores: [{ fila: 0, mensaje: `Error verificando lotes existentes: ${errExist.message}` }],
        warnings,
      };
    }

    const setExistentes = new Set((existentes || []).map((e) => e.codigo));
    if (setExistentes.size > 0) {
      const filtradas: typeof filasValidadas = [];
      for (const f of filasValidadas) {
        if (setExistentes.has(f.row.codigo)) {
          warnings.push(
            `Lote "${f.row.codigo}" ya existe en el proyecto — omitido (fila ${f.index})`,
          );
        } else {
          filtradas.push(f);
        }
      }
      filasValidadas.length = 0;
      filasValidadas.push(...filtradas);
    }
  }

  // 3) Validar vendedor_asignado en una sola query batch
  const usernamesUnicos = Array.from(
    new Set(
      filasValidadas
        .map((f) => (f.row.vendedor_asignado || '').trim())
        .filter((u) => u.length > 0),
    ),
  );

  if (usernamesUnicos.length > 0) {
    const { data: vendedores, error: errVend } = await supabase
      .from('usuario_perfil')
      .select('username, activo')
      .in('username', usernamesUnicos)
      .eq('activo', true);

    if (errVend) {
      return {
        success: false,
        insertados: 0,
        errores: [{ fila: 0, mensaje: `Error verificando vendedores: ${errVend.message}` }],
        warnings,
      };
    }

    const setVendedoresValidos = new Set((vendedores || []).map((v) => v.username as string));
    const filtradas: typeof filasValidadas = [];
    for (const f of filasValidadas) {
      const vendedor = (f.row.vendedor_asignado || '').trim();
      if (vendedor && !setVendedoresValidos.has(vendedor)) {
        errores.push({
          fila: f.index,
          codigo: f.row.codigo,
          mensaje: `Vendedor "${vendedor}" no existe o está inactivo`,
        });
      } else {
        filtradas.push(f);
      }
    }
    filasValidadas.length = 0;
    filasValidadas.push(...filtradas);
  }

  // 4) Si dryRun, retornar sin insertar
  if (dryRun) {
    return {
      success: errores.length === 0,
      insertados: 0,
      errores,
      warnings,
    };
  }

  if (filasValidadas.length === 0) {
    return {
      success: errores.length === 0 && warnings.length > 0,
      insertados: 0,
      errores,
      warnings,
    };
  }

  // 5) Construir filas a insertar
  const filasInsert = filasValidadas.map(({ row }) => {
    const data: Record<string, unknown> = {};
    if (row.manzana) data.manzana = row.manzana.trim();
    if (row.etapa) data.etapa = row.etapa.trim();
    if (row.tipo_unidad) data.tipo_unidad = row.tipo_unidad.trim();
    if (row.numero) data.numero = row.numero.trim();

    const insertRow: Record<string, unknown> = {
      proyecto_id: proyectoId,
      codigo: row.codigo,
      sup_m2: row.sup_m2 ?? null,
      precio: row.precio ?? null,
      moneda: row.moneda || 'PEN',
      estado: row.estado || 'disponible',
      created_by: user.id,
      data: Object.keys(data).length > 0 ? data : null,
    };

    const vendedor = (row.vendedor_asignado || '').trim();
    if (vendedor) {
      insertRow.vendedor_asignado = vendedor;
    }

    return insertRow;
  });

  // 6) Bulk insert con fallback row-by-row si falla
  const { data: insertResult, error: bulkError } = await supabase
    .from('lote')
    .insert(filasInsert)
    .select('id');

  let insertados = 0;
  if (!bulkError && insertResult) {
    insertados = insertResult.length;
  } else {
    // Fallback fila por fila para identificar cuáles fallan
    for (let i = 0; i < filasInsert.length; i++) {
      const fila = filasInsert[i];
      const numeroFila = filasValidadas[i].index;
      const codigo = filasValidadas[i].row.codigo;
      const { error: rowErr } = await supabase
        .from('lote')
        .insert(fila)
        .select('id')
        .single();

      if (rowErr) {
        errores.push({
          fila: numeroFila,
          codigo,
          mensaje: `Error al insertar: ${rowErr.message}`,
        });
      } else {
        insertados++;
      }
    }
  }

  if (insertados > 0) {
    revalidatePath(`/dashboard/proyectos/${proyectoId}`);
    revalidatePath('/dashboard/propiedades');
  }

  return {
    success: insertados > 0 && errores.length === 0,
    insertados,
    errores,
    warnings,
  };
}

// ============================================================================
// APLICAR DESCUENTO MASIVO — multiplica precio por (1 - %/100) en N lotes
// ============================================================================
export async function aplicarDescuentoMasivoLotes(
  proyectoId: string,
  loteIds: string[],
  porcentaje: number,
): Promise<{ success: boolean; actualizados: number; error?: string }> {
  if (!proyectoId || !loteIds || loteIds.length === 0) {
    return { success: false, actualizados: 0, error: "Parámetros inválidos" };
  }
  if (!Number.isFinite(porcentaje) || porcentaje <= 0 || porcentaje >= 100) {
    return { success: false, actualizados: 0, error: "Porcentaje fuera de rango (0-100, excluyentes)" };
  }

  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, actualizados: 0, error: "No autenticado" };

    await requierePermiso(PERMISOS.PRECIOS.MODIFICAR);
    const puede = await esAdminOCoordinador();
    if (!puede) {
      return {
        success: false,
        actualizados: 0,
        error: "Solo administradores o coordinadores pueden modificar precios",
      };
    }

    const factor = 1 - porcentaje / 100;

    // Multi-row update con factor uniforme: fetch + update per id (max ~100 ids razonable)
    const { data: lotes, error: fetchError } = await supabase
      .schema("crm")
      .from("lote")
      .select("id, precio")
      .eq("proyecto_id", proyectoId)
      .in("id", loteIds);

    if (fetchError) return { success: false, actualizados: 0, error: fetchError.message };

    let actualizados = 0;
    for (const lote of lotes ?? []) {
      if (lote.precio == null) continue;
      const nuevoPrecio = Math.round(Number(lote.precio) * factor * 100) / 100;
      const { error } = await supabase
        .schema("crm")
        .from("lote")
        .update({ precio: nuevoPrecio })
        .eq("id", lote.id);
      if (!error) actualizados += 1;
    }

    revalidatePath(`/dashboard/proyectos/${proyectoId}`);
    return { success: true, actualizados };
  } catch (error) {
    console.error("Error en aplicarDescuentoMasivoLotes:", error);
    return {
      success: false,
      actualizados: 0,
      error: error instanceof Error ? error.message : "Error aplicando descuento",
    };
  }
}

// ============================================================================
// CAMBIAR MONEDA MASIVO — actualiza columna moneda en N lotes
// ============================================================================
export async function cambiarMonedaMasivoLotes(
  proyectoId: string,
  loteIds: string[],
  nuevaMoneda: "PEN" | "USD" | "ARS",
): Promise<{ success: boolean; actualizados: number; error?: string }> {
  if (!proyectoId || !loteIds || loteIds.length === 0) {
    return { success: false, actualizados: 0, error: "Parámetros inválidos" };
  }
  if (!["PEN", "USD", "ARS"].includes(nuevaMoneda)) {
    return { success: false, actualizados: 0, error: "Moneda inválida" };
  }

  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, actualizados: 0, error: "No autenticado" };

    await requierePermiso(PERMISOS.LOTES.EDITAR);
    const puede = await esAdminOCoordinador();
    if (!puede) {
      return {
        success: false,
        actualizados: 0,
        error: "Solo administradores o coordinadores pueden cambiar moneda",
      };
    }

    const { data: updated, error } = await supabase
      .schema("crm")
      .from("lote")
      .update({ moneda: nuevaMoneda })
      .eq("proyecto_id", proyectoId)
      .in("id", loteIds)
      .select("id");

    if (error) return { success: false, actualizados: 0, error: error.message };

    revalidatePath(`/dashboard/proyectos/${proyectoId}`);
    return { success: true, actualizados: updated?.length ?? 0 };
  } catch (error) {
    console.error("Error en cambiarMonedaMasivoLotes:", error);
    return {
      success: false,
      actualizados: 0,
      error: error instanceof Error ? error.message : "Error cambiando moneda",
    };
  }
}
