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
import { dispararAutomatizaciones } from "@/lib/services/marketing-automatizaciones";
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

export async function crearCliente(formData: FormData) {
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
    capacidad_compra_estimada: formData.get("capacidad_compra_estimada") ?
      Number(formData.get("capacidad_compra_estimada")) : undefined,
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

  // Preparar datos para inserción
  const insertData = {
    ...parsed.data,
    email: parsed.data.email || null,
    telefono: parsed.data.telefono || null,
    telefono_whatsapp: parsed.data.telefono_whatsapp || null,
    // Alinear con constraint cliente_tipo_documento_check
    tipo_documento: mapTipoDocumentoToDb(parsed.data.tipo_documento),
    documento_identidad: parsed.data.documento_identidad || null,
    estado_civil: parsed.data.estado_civil || null,
    origen_lead: parsed.data.origen_lead || null,
    vendedor_asignado: parsed.data.vendedor_asignado && parsed.data.vendedor_asignado !== "" ? parsed.data.vendedor_asignado : null,
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
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/clientes");

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

    try {
      await dispararAutomatizaciones("lead.created", {
        clienteId: inserted!.id,
        nombre: parsed.data.nombre,
        telefono: parsed.data.telefono_whatsapp || parsed.data.telefono || undefined,
        vendedorUsername: parsed.data.vendedor_asignado || undefined,
      });
    } catch (error) {
      console.warn("[Marketing] Error disparando automatizaciones lead.created:", error);
    }
  });
}

export async function actualizarCliente(formData: FormData) {
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
    capacidad_compra_estimada: formData.get("capacidad_compra_estimada") ?
      Number(formData.get("capacidad_compra_estimada")) : undefined,
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

  // Preparar datos para actualización
  const updateData = {
    ...parsed.data,
    email: parsed.data.email || null,
    telefono: parsed.data.telefono || null,
    telefono_whatsapp: parsed.data.telefono_whatsapp || null,
    tipo_documento: mapTipoDocumentoToDb(parsed.data.tipo_documento),
    documento_identidad: parsed.data.documento_identidad || null,
    estado_civil: parsed.data.estado_civil || null,
    origen_lead: parsed.data.origen_lead || null,
    vendedor_asignado: parsed.data.vendedor_asignado && parsed.data.vendedor_asignado !== "" ? parsed.data.vendedor_asignado : null,
    proxima_accion: parsed.data.proxima_accion || null,
    interes_principal: parsed.data.interes_principal || null,
    capacidad_compra_estimada: parsed.data.capacidad_compra_estimada || null,
    forma_pago_preferida: parsed.data.forma_pago_preferida || null,
    notas: parsed.data.notas || null,
  };

  const { error } = await supabase
    .from("cliente")
    .update(updateData)
    .eq("id", clienteId);

  if (error) throw new Error(error.message);

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
    .select("nombre")
    .eq("id", clienteId)
    .maybeSingle();

  const payload = {
    vendedor_username: vendedorUsername || null,
    vendedor_asignado: vendedorUsername || null,
  };

  const { error } = await supabase
    .from("cliente")
    .update(payload)
    .eq("id", clienteId);

  if (error) {
    throw new Error(error.message);
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
    throw new Error("No se puede eliminar el cliente porque tiene reservas asociadas. Elimine primero las reservas.");
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
export async function obtenerTodosLosClientes(params: {
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
    const result = await getCachedClientes({
      ...params,
      page: 1,
      pageSize: 1000,
    });
    return result;
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
