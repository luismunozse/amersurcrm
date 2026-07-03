"use server";

/**
 * Server actions para CRUD de clientes.
 *
 * Convencion de errores: estas acciones LANZAN Error en caso de fallo.
 * Los consumidores deben usar try/catch + getErrorMessage().
 *
 * NOTA: Solo funciones async pueden ser exportadas desde archivos "use server".
 * Los helpers, tipos y schemas están en ./_actions-helpers.ts
 */

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createServerActionClient } from "@/lib/supabase.server-actions";
import { crearNotificacion } from "@/app/_actionsNotifications";
import { getCachedClientes } from "@/lib/cache.server";
import { PERMISOS } from "@/lib/permissions";
import { requierePermiso } from "@/lib/permissions/server";
import { parseOptionalNumber } from "@/lib/utils/numeric";
import { normalizePhoneE164 } from "@/lib/utils/phone";
import {
  TipoCliente,
  TipoDocumento,
  EstadoCliente,
  EstadoCivil,
  getEstadoClienteLabel,
} from "@/lib/types/clientes";
import {
  ClienteCompletoSchema,
  notifyVendedorAsignado,
} from "./_actions-helpers";

// Mapea el tipo de documento de la UI a los valores permitidos por la BD
// UI: 'DNI' | 'RUC' | 'PAS' | 'EXT'
// DB: 'dni' | 'ruc' | 'pasaporte' | 'carnet_extranjeria' | 'cuit' | 'otro'
function mapTipoDocumentoToDb(tipo?: TipoDocumento | null): string | null {
  if (!tipo) return null;
  const map: Record<string, string> = {
    DNI: 'dni',
    RUC: 'ruc',
    PAS: 'pasaporte',
    EXT: 'carnet_extranjeria',
  };
  return map[tipo] ?? 'otro';
}

// Resultado de las acciones de upsert de cliente.
// Se usa retorno (no throw) para los errores de negocio porque Next.js
// censura los Error lanzados desde Server Actions en producción.
export type ResultadoUpsertCliente = { ok: true } | { ok: false; error: string };

// Normaliza un teléfono opcional a su forma canónica (E.164 sin "+").
// Devuelve { error } si el usuario ingresó algo que no es un número posible.
function normalizarTelefonoCliente(
  raw: string | null | undefined,
  label: string,
): { telefono: string | null } | { error: string } {
  const original = (raw ?? "").trim();
  if (!original) return { telefono: null };
  const norm = normalizePhoneE164(original);
  if (!norm) {
    return { error: `El ${label} no es un número válido. Revisá el número y el código de país.` };
  }
  return { telefono: norm };
}

// Traduce una violación de unicidad (23505) a un mensaje legible.
// Para el choque de teléfono, identifica al cliente que ya lo tiene.
async function mensajeUnicidadCliente(
  supabase: Awaited<ReturnType<typeof createServerActionClient>>,
  error: { code?: string; message: string; details?: string | null },
  telefono: string | null,
  excludeId?: string,
): Promise<string> {
  if (error.code !== "23505") return error.message;

  const objetivo = `${error.message} ${error.details ?? ""}`.toLowerCase();

  if (objetivo.includes("telefono")) {
    if (telefono) {
      let query = supabase
        .from("cliente")
        .select("nombre, codigo_cliente")
        .eq("telefono", telefono);
      if (excludeId) query = query.neq("id", excludeId);
      const { data: existente } = await query.maybeSingle();
      if (existente?.nombre) {
        const codigo = existente.codigo_cliente ? ` (${existente.codigo_cliente})` : "";
        return `El teléfono ${telefono} ya está registrado en el cliente "${existente.nombre}"${codigo}. Usá otro número o editá ese cliente.`;
      }
    }
    return "Ya existe otro cliente con este número de teléfono.";
  }

  if (objetivo.includes("documento")) {
    return "Ya existe un cliente con este número de documento.";
  }

  return "Ya existe un cliente con estos datos.";
}

// Avanza el puntero round-robin de forma ATÓMICA cuando una asignación manual
// (alta o reasignación) apunta a un vendedor activo. La RPC toma FOR UPDATE
// sobre asignacion_config, serializando contra obtener_siguiente_vendedor() y
// otras asignaciones concurrentes, y alinea el índice al vendedor elegido
// (sí consume turno). Best-effort: nunca rompe la operación principal.
async function avanzarRoundRobinManual(
  supabase: Awaited<ReturnType<typeof createServerActionClient>>,
  vendedorUsername: string | null | undefined,
): Promise<void> {
  if (!vendedorUsername) return;
  try {
    const { error } = await supabase
      .schema("crm")
      .rpc("registrar_asignacion_manual", { p_vendedor_username: vendedorUsername });
    if (error) {
      console.warn("[round-robin] No se pudo avanzar el puntero:", error);
    }
  } catch (err) {
    console.warn("[round-robin] No se pudo avanzar el puntero:", err);
  }
}

export async function crearCliente(formData: FormData): Promise<ResultadoUpsertCliente> {
  // Extraer datos del formulario
  const clienteData = {
    tipo_cliente: String(formData.get("tipo_cliente") || "persona") as TipoCliente,
    nombre: String(formData.get("nombre") || ""),
    tipo_documento: String(formData.get("tipo_documento") || "DNI") as TipoDocumento,
    documento_identidad: String(formData.get("documento_identidad") || ""),
    email: String(formData.get("email") || ""),
    telefono: String(formData.get("telefono") || ""),
    telefono_whatsapp: String(formData.get("telefono_whatsapp") || ""),
    direccion: {
      calle: String(formData.get("direccion_calle") || ""),
      numero: String(formData.get("direccion_numero") || ""),
      barrio: String(formData.get("direccion_barrio") || ""),
      ciudad: String(formData.get("direccion_ciudad") || ""),
      provincia: String(formData.get("direccion_provincia") || ""),
      departamento: String(formData.get("direccion_departamento") || ""),
      distrito: String(formData.get("direccion_distrito") || ""),
      pais: String(formData.get("direccion_pais") || "Perú"),
    },
    estado_civil: formData.get("estado_civil") ? String(formData.get("estado_civil")) as EstadoCivil : undefined,
    estado_cliente: String(formData.get("estado_cliente") || "por_contactar") as EstadoCliente,
    origen_lead: formData.get("origen_lead") ? String(formData.get("origen_lead")) : undefined,
    vendedor_asignado: formData.get("vendedor_asignado") ? String(formData.get("vendedor_asignado")) : undefined,
    proxima_accion: formData.get("proxima_accion") ? String(formData.get("proxima_accion")) : undefined,
    interes_principal: formData.get("interes_principal") ? String(formData.get("interes_principal")) : undefined,
    capacidad_compra_estimada: parseOptionalNumber(formData.get("capacidad_compra_estimada")) ?? undefined,
    forma_pago_preferida: formData.get("forma_pago_preferida") ? String(formData.get("forma_pago_preferida")) : undefined,
    notas: String(formData.get("notas") || ""),
  };

  // Validar datos
  const parsed = ClienteCompletoSchema.safeParse(clienteData);
  if (!parsed.success) {
    const { fieldErrors, formErrors } = parsed.error.flatten();
    const firstFieldMsg = Object.values(fieldErrors).flat()[0];
    const msg = firstFieldMsg ?? formErrors[0] ?? "Datos inválidos";
    throw new Error(msg);
  }

  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Validar documento duplicado (si se proporciona)
  if (parsed.data.documento_identidad && parsed.data.documento_identidad.trim()) {
    const { data: existingCliente } = await supabase
      .from("cliente")
      .select("id, nombre")
      .eq("documento_identidad", parsed.data.documento_identidad)
      .maybeSingle();

    if (existingCliente) {
      throw new Error(`Ya existe un cliente con este número de documento: ${existingCliente.nombre}`);
    }
  }

  // Normalizar teléfonos a formato canónico (E.164 sin "+")
  const telRes = normalizarTelefonoCliente(parsed.data.telefono, "teléfono");
  if ("error" in telRes) return { ok: false, error: telRes.error };
  const waRes = normalizarTelefonoCliente(parsed.data.telefono_whatsapp, "número de WhatsApp");
  if ("error" in waRes) return { ok: false, error: waRes.error };

  // Preparar datos para inserción
  const insertData = {
    ...parsed.data,
    email: parsed.data.email || null,
    telefono: telRes.telefono,
    telefono_whatsapp: waRes.telefono,
    // Alinear con constraint cliente_tipo_documento_check
    tipo_documento: mapTipoDocumentoToDb(parsed.data.tipo_documento),
    documento_identidad: parsed.data.documento_identidad || null,
    estado_civil: parsed.data.estado_civil || null,
    origen_lead: parsed.data.origen_lead || null,
    vendedor_asignado: parsed.data.vendedor_asignado && parsed.data.vendedor_asignado !== "" ? parsed.data.vendedor_asignado : null,
    vendedor_username: parsed.data.vendedor_asignado && parsed.data.vendedor_asignado !== "" ? parsed.data.vendedor_asignado : null,
    proxima_accion: parsed.data.proxima_accion || null,
    interes_principal: parsed.data.interes_principal || null,
    capacidad_compra_estimada: parsed.data.capacidad_compra_estimada || null,
    forma_pago_preferida: parsed.data.forma_pago_preferida || null,
    notas: parsed.data.notas || null,
    created_by: user.id,
  };

  const { data: inserted, error } = await supabase
    .from("cliente")
    .insert(insertData)
    .select("id, nombre")
    .single();
  if (error) {
    return { ok: false, error: await mensajeUnicidadCliente(supabase, error, insertData.telefono, undefined) };
  }

  revalidatePath("/dashboard/clientes");

  // El alta manual con vendedor asignado consume turno de la rotación.
  await avanzarRoundRobinManual(supabase, insertData.vendedor_username);

  // Notificación y automatizaciones no-bloqueantes (se ejecutan después de enviar la respuesta)
  after(async () => {
    try {
      await crearNotificacion(
        user.id,
        "cliente",
        "Nuevo cliente registrado",
        `Se ha registrado un nuevo cliente: ${parsed.data.nombre}`,
        { cliente_id: inserted?.id, cliente_nombre: parsed.data.nombre }
      );
    } catch (error) {
      console.warn("No se pudo crear notificación:", error);
    }
  });

  return { ok: true };
}

export async function actualizarCliente(formData: FormData): Promise<ResultadoUpsertCliente> {
  const clienteId = String(formData.get("id") || "");
  if (!clienteId) throw new Error("ID de cliente requerido");

  // Extraer datos del formulario (igual que en crearCliente)
  const clienteData = {
    tipo_cliente: String(formData.get("tipo_cliente") || "persona") as TipoCliente,
    nombre: String(formData.get("nombre") || ""),
    tipo_documento: String(formData.get("tipo_documento") || "DNI") as TipoDocumento,
    documento_identidad: String(formData.get("documento_identidad") || ""),
    email: String(formData.get("email") || ""),
    telefono: String(formData.get("telefono") || ""),
    telefono_whatsapp: String(formData.get("telefono_whatsapp") || ""),
    direccion: {
      calle: String(formData.get("direccion_calle") || ""),
      numero: String(formData.get("direccion_numero") || ""),
      barrio: String(formData.get("direccion_barrio") || ""),
      ciudad: String(formData.get("direccion_ciudad") || ""),
      provincia: String(formData.get("direccion_provincia") || ""),
      departamento: String(formData.get("direccion_departamento") || ""),
      distrito: String(formData.get("direccion_distrito") || ""),
      pais: String(formData.get("direccion_pais") || "Perú"),
    },
    estado_civil: formData.get("estado_civil") ? String(formData.get("estado_civil")) as EstadoCivil : undefined,
    estado_cliente: String(formData.get("estado_cliente") || "por_contactar") as EstadoCliente,
    origen_lead: formData.get("origen_lead") ? String(formData.get("origen_lead")) : undefined,
    vendedor_asignado: formData.get("vendedor_asignado") ? String(formData.get("vendedor_asignado")) : undefined,
    proxima_accion: formData.get("proxima_accion") ? String(formData.get("proxima_accion")) : undefined,
    interes_principal: formData.get("interes_principal") ? String(formData.get("interes_principal")) : undefined,
    capacidad_compra_estimada: parseOptionalNumber(formData.get("capacidad_compra_estimada")) ?? undefined,
    forma_pago_preferida: formData.get("forma_pago_preferida") ? String(formData.get("forma_pago_preferida")) : undefined,
    notas: String(formData.get("notas") || ""),
  };

  // Validar datos
  const parsed = ClienteCompletoSchema.safeParse(clienteData);
  if (!parsed.success) {
    const { fieldErrors, formErrors } = parsed.error.flatten();
    const firstFieldMsg = Object.values(fieldErrors).flat()[0];
    const msg = firstFieldMsg ?? formErrors[0] ?? "Datos inválidos";
    throw new Error(msg);
  }

  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Validar documento duplicado (si se proporciona)
  if (parsed.data.documento_identidad && parsed.data.documento_identidad.trim()) {
    const { data: existingCliente } = await supabase
      .from("cliente")
      .select("id")
      .eq("documento_identidad", parsed.data.documento_identidad)
      .neq("id", clienteId)
      .maybeSingle();

    if (existingCliente) {
      throw new Error("Ya existe un cliente con este número de documento");
    }
  }

  // Normalizar teléfonos a formato canónico (E.164 sin "+")
  const telRes = normalizarTelefonoCliente(parsed.data.telefono, "teléfono");
  if ("error" in telRes) return { ok: false, error: telRes.error };
  const waRes = normalizarTelefonoCliente(parsed.data.telefono_whatsapp, "número de WhatsApp");
  if ("error" in waRes) return { ok: false, error: waRes.error };

  // Detectar cambio de asesor para bumpear timestamps y reordenar la lista
  const nuevoVendedor = parsed.data.vendedor_asignado && parsed.data.vendedor_asignado !== ""
    ? parsed.data.vendedor_asignado
    : null;
  const { data: clienteActual } = await supabase
    .from("cliente")
    .select("vendedor_username")
    .eq("id", clienteId)
    .maybeSingle();
  const asesorCambio = (clienteActual?.vendedor_username ?? null) !== nuevoVendedor;

  // Preparar datos para actualización
  const updateData: Record<string, unknown> = {
    ...parsed.data,
    email: parsed.data.email || null,
    telefono: telRes.telefono,
    telefono_whatsapp: waRes.telefono,
    tipo_documento: mapTipoDocumentoToDb(parsed.data.tipo_documento),
    documento_identidad: parsed.data.documento_identidad || null,
    estado_civil: parsed.data.estado_civil || null,
    origen_lead: parsed.data.origen_lead || null,
    vendedor_asignado: nuevoVendedor,
    vendedor_username: nuevoVendedor,
    proxima_accion: parsed.data.proxima_accion || null,
    interes_principal: parsed.data.interes_principal || null,
    capacidad_compra_estimada: parsed.data.capacidad_compra_estimada || null,
    forma_pago_preferida: parsed.data.forma_pago_preferida || null,
    notas: parsed.data.notas || null,
  };

  if (asesorCambio) {
    const ahora = new Date().toISOString();
    updateData.updated_at = ahora;
    updateData.fecha_alta = ahora;
  }

  const { error } = await supabase
    .from("cliente")
    .update(updateData)
    .eq("id", clienteId);

  if (error) {
    return { ok: false, error: await mensajeUnicidadCliente(supabase, error, telRes.telefono, clienteId) };
  }

  // Si la reasignación apunta a un vendedor nuevo, consume turno de la rotación.
  if (asesorCambio) {
    await avanzarRoundRobinManual(supabase, nuevoVendedor);
  }

  revalidatePath("/dashboard/clientes");
  revalidatePath(`/dashboard/clientes/${clienteId}`);

  // Notificación no-bloqueante
  after(async () => {
    try {
      await crearNotificacion(
        user.id,
        "cliente",
        "Cliente actualizado",
        `Se ha actualizado la información del cliente: ${parsed.data.nombre}`,
        { cliente_id: clienteId, cliente_nombre: parsed.data.nombre }
      );
    } catch (error) {
      console.warn("No se pudo crear notificación:", error);
    }
  });

  return { ok: true };
}

export async function actualizarEstadoCliente(clienteId: string, nuevoEstado: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: cliente, error: clienteError } = await supabase
    .from("cliente")
    .select("id, nombre, vendedor_username")
    .eq("id", clienteId)
    .single();

  if (clienteError || !cliente) {
    throw new Error("Cliente no encontrado");
  }

  const { error } = await supabase
    .from("cliente")
    .update({ estado_cliente: nuevoEstado })
    .eq("id", clienteId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/clientes");
  revalidatePath(`/dashboard/clientes/${clienteId}`);

  // Notificación no-bloqueante
  const vendedorUsername = cliente.vendedor_username;
  const clienteNombre = cliente.nombre;
  after(async () => {
    const supabaseAfter = await createServerActionClient();
    await notifyVendedorAsignado(
      supabaseAfter,
      vendedorUsername,
      "Estado de cliente actualizado",
      `El cliente ${clienteNombre ?? ""} ahora está marcado como ${getEstadoClienteLabel(nuevoEstado as EstadoCliente)}.`,
      {
        cliente_id: clienteId,
        nuevo_estado: nuevoEstado,
        url: `/dashboard/clientes/${clienteId}`,
      },
    );
  });
}

export async function asignarVendedorCliente(clienteId: string, vendedorUsername: string | null) {
  const supabase = await createServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autenticado");
  }

  const { data: cliente } = await supabase
    .from("cliente")
    .select("nombre, vendedor_username")
    .eq("id", clienteId)
    .maybeSingle();

  // Solo consume turno si la asignación realmente cambia el asesor.
  const asesorCambio = (cliente?.vendedor_username ?? null) !== (vendedorUsername || null);

  const ahora = new Date().toISOString();
  const payload: Record<string, string | null> = {
    vendedor_username: vendedorUsername || null,
    vendedor_asignado: vendedorUsername || null,
    // Bumpear timestamps para que el cliente reordene al tope de la lista
    updated_at: ahora,
    fecha_alta: ahora,
  };

  const { error } = await supabase
    .from("cliente")
    .update(payload)
    .eq("id", clienteId);

  if (error) {
    throw new Error(error.message);
  }

  // La asignación directa consume turno solo si el asesor realmente cambió.
  if (asesorCambio) {
    await avanzarRoundRobinManual(supabase, vendedorUsername);
  }

  revalidatePath(`/dashboard/clientes/${clienteId}`);
  revalidatePath("/dashboard/clientes");

  // Notificación no-bloqueante
  if (vendedorUsername) {
    const clienteNombre = cliente?.nombre;
    after(async () => {
      const supabaseAfter = await createServerActionClient();
      await notifyVendedorAsignado(
        supabaseAfter,
        vendedorUsername,
        "Nuevo cliente asignado",
        `Se te asignó el cliente ${clienteNombre ?? ""}.`,
        {
          cliente_id: clienteId,
          url: `/dashboard/clientes/${clienteId}`,
        },
      );
    });
  }
}

export async function eliminarCliente(id: string) {
  await requierePermiso(PERMISOS.CLIENTES.ELIMINAR, {
    accion: 'eliminar_cliente',
    recurso_tipo: 'cliente',
    recurso_id: id,
  });
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Primero verificar si el cliente existe
  const { data: clienteExiste } = await supabase
    .from("cliente")
    .select("id, nombre")
    .eq("id", id)
    .single();

  if (!clienteExiste) {
    throw new Error("El cliente no existe");
  }

  // Verificar relaciones que podrían impedir la eliminación
  const { data: reservas } = await supabase
    .from("reserva")
    .select("id")
    .eq("cliente_id", id)
    .limit(1);

  const { data: ventas } = await supabase
    .from("venta")
    .select("id")
    .eq("cliente_id", id)
    .limit(1);

  if (reservas && reservas.length > 0) {
    throw new Error("No se puede eliminar el cliente porque tiene separaciones asociadas. Elimine primero las separaciones.");
  }

  if (ventas && ventas.length > 0) {
    throw new Error("No se puede eliminar el cliente porque tiene ventas asociadas. Elimine primero las ventas.");
  }

  // Intentar eliminar
  const { error, count } = await supabase
    .from("cliente")
    .delete({ count: 'exact' })
    .eq("id", id);

  if (error) {
    console.error('❌ Error al eliminar cliente:', error);

    // Manejar errores específicos
    if (error.code === '23503') {
      throw new Error("No se puede eliminar el cliente porque tiene datos relacionados. Elimine primero las relaciones.");
    }

    throw new Error(error.message);
  }

  if (count === 0) {
    throw new Error("El cliente no pudo ser eliminado. Verifique los permisos.");
  }

  revalidatePath("/dashboard/clientes");
  revalidatePath(`/dashboard/clientes/${id}`);

  return { success: true, count };
}

// Server Action para obtener clientes con paginación y filtros
export async function obtenerClientesPaginados(params: {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  searchTelefono?: string;
  searchDni?: string;
  estado?: string;
  tipo?: string;
  vendedor?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  try {
    const result = await getCachedClientes(params);
    return result;
  } catch (error) {
    console.error('Error obteniendo clientes:', error);
    throw error;
  }
}

// Obtener todos los clientes con los filtros aplicados (sin paginación)
// Supabase REST cap por request es 1000 filas, asi que paginamos hasta cubrir total.
export async function obtenerTodosLosClientes(params: {
  searchTerm?: string;
  searchTelefono?: string;
  searchDni?: string;
  estado?: string;
  tipo?: string;
  vendedor?: string;
  origen?: string;
  proyectoInteres?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  try {
    const PAGE_SIZE = 1000;
    const first = await getCachedClientes({
      ...params,
      page: 1,
      pageSize: PAGE_SIZE,
    });

    const total = first.total ?? first.data.length;
    if (first.data.length >= total) {
      return first;
    }

    const totalPages = Math.ceil(total / PAGE_SIZE);
    const restPages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        getCachedClientes({
          ...params,
          page: i + 2,
          pageSize: PAGE_SIZE,
        })
      )
    );

    const data = first.data.concat(...restPages.map((r) => r.data));
    return { data, total };
  } catch (error) {
    console.error('Error obteniendo clientes para exportación:', error);
    throw error;
  }
}

// Obtener lista de vendedores activos
// Esta función está disponible para todos los usuarios autenticados
export async function obtenerVendedores() {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: vendedores, error } = await supabase
    .schema('crm')
    .from('usuario_perfil')
    .select(`
      id,
      username,
      nombre_completo,
      email,
      rol:rol!usuario_perfil_rol_id_fkey (
        nombre
      )
    `)
    .eq('activo', true)
    .order('nombre_completo', { ascending: true });

  if (error) {
    console.error('Error obteniendo vendedores:', error);
    throw new Error(error.message);
  }

  // Filtrar solo vendedores y coordinadores y mapear a la estructura esperada
  const vendedoresFiltrados = (vendedores || [])
    .filter((v: any) =>
      v.rol?.nombre === 'ROL_VENDEDOR' || v.rol?.nombre === 'ROL_COORDINADOR_VENTAS'
    )
    .map((v: any) => ({
      id: v.id,
      username: v.username,
      nombre_completo: v.nombre_completo,
      email: v.email
    }));

  return vendedoresFiltrados;
}

// Sugerencia round-robin: usa la misma fuente de verdad que /dashboard/admin/vendedores-activos
// (tabla crm.vendedor_activo + crm.asignacion_config.ultimo_indice).
// Solo sugiere; no avanza el contador (asignaciones manuales no consumen el turno).
export async function obtenerProximoVendedorSugerido(): Promise<{
  id: string;
  username: string;
  nombre_completo: string;
} | null> {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: vendedoresActivos, error: vaErr } = await supabase
    .schema("crm")
    .from("vendedor_activo")
    .select("vendedor_id, orden")
    .eq("activo", true)
    .order("orden", { ascending: true });

  if (vaErr) {
    console.error("[obtenerProximoVendedorSugerido] vendedor_activo:", vaErr);
    return null;
  }
  if (!vendedoresActivos || vendedoresActivos.length === 0) return null;

  const { data: config } = await supabase
    .schema("crm")
    .from("asignacion_config")
    .select("ultimo_indice")
    .eq("id", 1)
    .maybeSingle();

  const ultimoIndice = config?.ultimo_indice ?? 0;
  const idx = ultimoIndice % vendedoresActivos.length;
  const seleccionado = vendedoresActivos[idx];
  if (!seleccionado) return null;

  const { data: perfil, error: perfilErr } = await supabase
    .schema("crm")
    .from("usuario_perfil")
    .select("id, username, nombre_completo")
    .eq("id", seleccionado.vendedor_id)
    .maybeSingle();

  if (perfilErr || !perfil) {
    console.error("[obtenerProximoVendedorSugerido] usuario_perfil:", perfilErr);
    return null;
  }

  return {
    id: perfil.id,
    username: perfil.username,
    nombre_completo: perfil.nombre_completo,
  };
}

export type ClienteQuickView = {
  id: string;
  codigo_cliente: string | null;
  nombre: string;
  estado_cliente: string | null;
  tipo_cliente: string | null;
  telefono: string | null;
  telefono_whatsapp: string | null;
  email: string | null;
  direccion: Record<string, unknown> | null;
  origen_lead: string | null;
  interes_principal: string | null;
  capacidad_compra_estimada: number | null;
  vendedor_username: string | null;
  vendedor_nombre: string | null;
  ultimo_contacto: string | null;
  proxima_accion: string | null;
  fecha_proxima_accion: string | null;
  notas: string | null;
};

export async function obtenerClienteParaQuickView(id: string): Promise<ClienteQuickView | null> {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [clienteRes, interaccionRes] = await Promise.all([
    supabase
      .from('cliente')
      .select('id, codigo_cliente, nombre, estado_cliente, tipo_cliente, telefono, telefono_whatsapp, email, direccion, origen_lead, interes_principal, capacidad_compra_estimada, vendedor_username, ultimo_contacto, notas')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('cliente_interaccion')
      .select('proxima_accion, fecha_proxima_accion')
      .eq('cliente_id', id)
      .not('fecha_proxima_accion', 'is', null)
      .order('fecha_proxima_accion', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const cliente = clienteRes.data;
  if (!cliente) return null;

  let vendedorNombre: string | null = null;
  if (cliente.vendedor_username) {
    const { data: vendedor } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .select('nombre_completo')
      .eq('username', cliente.vendedor_username)
      .maybeSingle();
    vendedorNombre = vendedor?.nombre_completo ?? null;
  }

  return {
    id: cliente.id,
    codigo_cliente: cliente.codigo_cliente,
    nombre: cliente.nombre,
    estado_cliente: cliente.estado_cliente,
    tipo_cliente: cliente.tipo_cliente,
    telefono: cliente.telefono,
    telefono_whatsapp: cliente.telefono_whatsapp,
    email: cliente.email,
    direccion: cliente.direccion as Record<string, unknown> | null,
    origen_lead: cliente.origen_lead,
    interes_principal: cliente.interes_principal,
    capacidad_compra_estimada: cliente.capacidad_compra_estimada,
    vendedor_username: cliente.vendedor_username,
    vendedor_nombre: vendedorNombre,
    ultimo_contacto: cliente.ultimo_contacto,
    proxima_accion: interaccionRes.data?.proxima_accion ?? null,
    fecha_proxima_accion: interaccionRes.data?.fecha_proxima_accion ?? null,
    notas: cliente.notas,
  };
}

/**
 * Activa/desactiva opt-out de WhatsApp para un cliente.
 * Cuando opt_out = true, el cliente no recibe envíos de plantillas.
 */
export async function actualizarWhatsAppOptOut(
  clienteId: string,
  optOut: boolean,
  motivo?: string,
): Promise<void> {
  await requierePermiso(PERMISOS.CLIENTES.EDITAR_ASIGNADOS, {
    accion: optOut ? "activar_whatsapp_opt_out" : "desactivar_whatsapp_opt_out",
    recurso_tipo: "cliente",
    recurso_id: clienteId,
  });

  const supabase = await createServerActionClient();

  const updates: Record<string, unknown> = {
    whatsapp_opt_out: optOut,
    whatsapp_opt_out_fecha: optOut ? new Date().toISOString() : null,
    whatsapp_opt_out_motivo: optOut ? (motivo ?? null) : null,
  };

  const { error } = await supabase
    .schema("crm")
    .from("cliente")
    .update(updates)
    .eq("id", clienteId);

  if (error) {
    throw new Error(`Error actualizando opt-out WhatsApp: ${error.message}`);
  }

  revalidatePath(`/dashboard/clientes/${clienteId}`);
}
