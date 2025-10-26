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
    const perfil = await obtenerPerfilUsuario();
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
    const perfil = await obtenerPerfilUsuario();
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
  const moneda = String(fd.get("moneda") || "PEN"); // Moneda por defecto: Soles Peruanos
  const estado = String(fd.get("estado") || "disponible");


  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Verificar permisos de administrador
  try {
    const perfil = await obtenerPerfilUsuario();
    if (!perfil || perfil.rol?.nombre !== 'ROL_ADMIN') {
      throw new Error("No tienes permisos para crear lotes. Solo los administradores pueden realizar esta acción.");
    }
  } catch (error) {
    throw new Error("Error verificando permisos: " + (error as Error).message);
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

  return { success: true, lote };
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

  // Verificar permisos y ruta según rol
  const perfil = await obtenerPerfilUsuario();
  if (!perfil) {
    throw new Error("Perfil no encontrado");
  }

  // Si es vendedor: solo puede cambiar estado mediante RPC seguras
  if (perfil.rol?.nombre === 'ROL_VENDEDOR') {
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

    const { data: ok, error: rpcError } = await supabase.rpc(rpcName as any, { p_lote: loteId });
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

  revalidatePath(`/dashboard/proyectos/${fd.get("proyecto_id")}`);
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

  try {
    const perfil = await obtenerPerfilUsuario();
    if (!perfil || perfil.rol?.nombre !== "ROL_ADMIN") {
      throw new Error("No tienes permisos para actualizar el perímetro del proyecto");
    }
  } catch (error) {
    throw new Error("Error verificando permisos: " + (error as Error).message);
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

  try {
    const perfil = await obtenerPerfilUsuario();
    if (!perfil || perfil.rol?.nombre !== "ROL_ADMIN") {
      throw new Error("No tienes permisos para eliminar el perímetro del proyecto");
    }
  } catch (error) {
    throw new Error("Error verificando permisos: " + (error as Error).message);
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

  try {
    const perfil = await obtenerPerfilUsuario();
    if (!perfil || perfil.rol?.nombre !== "ROL_ADMIN") {
      throw new Error("No tienes permisos para actualizar lotes");
    }
  } catch (error) {
    throw new Error("Error verificando permisos: " + (error as Error).message);
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
  try {
    const perfil = await obtenerPerfilUsuario();
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

// Duplicar un lote manteniendo sus datos. Genera un código único con sufijo -copy, -copy-2, ...
export async function duplicarLote(loteId: string, proyectoId: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Solo admin
  try {
    const perfil = await obtenerPerfilUsuario();
    if (!perfil || perfil.rol?.nombre !== 'ROL_ADMIN') {
      throw new Error("No tienes permisos para duplicar lotes");
    }
  } catch (error) {
    throw new Error("Error verificando permisos: " + (error as Error).message);
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

export async function guardarCoordenadasLote(loteId: string, lat: number, lng: number) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Verificar permisos de administrador
  try {
    const perfil = await obtenerPerfilUsuario();
    if (!perfil || perfil.rol?.nombre !== 'ROL_ADMIN') {
      throw new Error("No tienes permisos para guardar coordenadas. Solo los administradores pueden realizar esta acción.");
    }
  } catch (error) {
    throw new Error("Error verificando permisos: " + (error as Error).message);
  }

  const { error } = await supabase
    .from("lote")
    .update({
      coordenada_lat: lat,
      coordenada_lng: lng,
      updated_at: new Date().toISOString()
    })
    .eq("id", loteId);

  if (error) throw new Error(`Error guardando coordenadas: ${error.message}`);

  revalidatePath(`/dashboard/proyectos/${loteId}`);
  return { success: true };
}

export async function guardarCoordenadasMultiples(proyectoId: string, coordenadas: Array<{loteId: string, lat: number, lng: number, nombre: string}>) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Verificar permisos de administrador
  try {
    const perfil = await obtenerPerfilUsuario();
    if (!perfil || perfil.rol?.nombre !== 'ROL_ADMIN') {
      throw new Error("No tienes permisos para guardar coordenadas. Solo los administradores pueden realizar esta acción.");
    }
  } catch (error) {
    throw new Error("Error verificando permisos: " + (error as Error).message);
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
export async function guardarOverlayBounds(proyectoId: string, bounds: [[number, number], [number, number]], rotationDeg?: number, opacity?: number) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Solo admin
  try {
    const perfil = await obtenerPerfilUsuario();
    if (!perfil || perfil.rol?.nombre !== 'ROL_ADMIN') {
      throw new Error("No tienes permisos para calibrar el plano");
    }
  } catch (error) {
    throw new Error("Error verificando permisos: " + (error as Error).message);
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
    const perfil = await obtenerPerfilUsuario();
    if (!perfil || !perfil.username) {
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
        vendedor_username: perfil.username,
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
      return { data: null, error: `Error creando reserva: ${reservaError.message}` };
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
        .update({ vendedor_asignado: perfil.username })
        .eq('id', datos.clienteId);
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
      error: error instanceof Error ? error.message : 'Error desconocido creando reserva'
    };
  }
}
