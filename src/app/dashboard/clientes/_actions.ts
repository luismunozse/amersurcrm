"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServerActionClient } from "@/lib/supabase.server-actions";
import { crearNotificacion } from "@/app/_actionsNotifications";
import { getCachedClientes } from "@/lib/cache.server";
import { esAdmin } from "@/lib/permissions/server";
import { PERMISOS } from "@/lib/permissions";
import { requierePermiso } from "@/lib/permissions/server";
import {
  TipoCliente,
  TipoDocumento,
  EstadoCliente,
  EstadoCivil
} from "@/lib/types/clientes";

type SupabaseServerClient = Awaited<ReturnType<typeof createServerActionClient>>;

const ESTADO_CLIENTE_LABELS: Record<string, string> = {
  por_contactar: "por contactar",
  contactado: "contactado",
  transferido: "transferido",
  intermedio: "en seguimiento",
  desestimado: "desestimado",
  potencial: "potencial",
};

function mapEstadoClienteLabel(estado: string) {
  return ESTADO_CLIENTE_LABELS[estado] ?? estado;
}

function buildNombreResumen(nombres: (string | null | undefined)[]) {
  const clean = nombres.filter((nombre): nombre is string => Boolean(nombre));
  if (clean.length === 0) return "";
  if (clean.length <= 3) return clean.join(", ");
  return `${clean.slice(0, 3).join(", ")} y ${clean.length - 3} más`;
}

async function getVendedorPerfilByUsername(
  supabase: SupabaseServerClient,
  username?: string | null,
) {
  if (!username) return null;
  const { data, error } = await supabase
    .schema("crm")
    .from("usuario_perfil")
    .select("id, username, nombre_completo")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    console.warn("No se pudo obtener el perfil del vendedor:", error.message);
    return null;
  }

  return data;
}

async function notifyVendedorAsignado(
  supabase: SupabaseServerClient,
  vendedorUsername: string | null | undefined,
  titulo: string,
  mensaje: string,
  data?: Record<string, unknown>,
) {
  const perfil = await getVendedorPerfilByUsername(supabase, vendedorUsername);
  if (!perfil?.id) return;

  try {
    await crearNotificacion(perfil.id, "cliente", titulo, mensaje, data);
  } catch (error) {
    console.warn("No se pudo crear notificación para vendedor:", error);
  }
}

async function getVendedoresMap(
  supabase: SupabaseServerClient,
  usernames: string[],
) {
  if (usernames.length === 0) return new Map<string, { id: string; username: string; nombre_completo?: string | null }>();

  const { data, error } = await supabase
    .schema("crm")
    .from("usuario_perfil")
    .select("id, username, nombre_completo")
    .in("username", usernames);

  if (error || !data) {
    console.warn("No se pudieron obtener perfiles de vendedores:", error?.message);
    return new Map();
  }

  return new Map(data.map((perfil) => [perfil.username, perfil]));
}

const DireccionSchema = z.object({
  calle: z.string().optional(),
  numero: z.string().optional(),
  barrio: z.string().optional(),
  ciudad: z.string().optional(),
  provincia: z.string().optional(),
  pais: z.string().optional(),
  codigo_postal: z.string().optional(),
  coordenadas: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional()
});

const _ClienteSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().min(1, "Nombre requerido"),
  email: z.string().email().optional().or(z.literal("")),
  telefono: z.string().optional().or(z.literal("")),
});

const ClienteCompletoSchema = z.object({
  // Identificación básica
  tipo_cliente: z.enum(['persona', 'empresa']),
  nombre: z.string()
    .min(1, "Nombre requerido")
    .refine(val => val.trim().length >= 2, "El nombre debe tener al menos 2 caracteres")
    .refine(val => !/^\d+$/.test(val.trim()), "El nombre no puede contener solo números"),
  tipo_documento: z.enum(['DNI', 'PAS', 'EXT', 'RUC']).optional(),
  documento_identidad: z.string()
    .optional()
    .or(z.literal(""))
    .refine(val => {
      if (!val || val === "") return true;
      // Si hay valor, debe tener al menos 8 caracteres
      return val.trim().length >= 8;
    }, "El documento debe tener al menos 8 caracteres"),
  email: z.string()
    .optional()
    .or(z.literal(""))
    .refine(val => {
      if (!val || val === "") return true;
      // Si hay valor, validar formato email
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    }, "Formato de email inválido"),
  telefono: z.string()
    .optional()
    .or(z.literal(""))
    .refine(val => {
      if (!val || val === "") return true;
      // Si hay valor, debe contener al menos 6 dígitos
      const digits = val.replace(/\D/g, '');
      return digits.length >= 6;
    }, "El teléfono debe tener al menos 6 dígitos"),
  telefono_whatsapp: z.string()
    .optional()
    .or(z.literal(""))
    .refine(val => {
      if (!val || val === "") return true;
      // Si hay valor, debe contener al menos 6 dígitos
      const digits = val.replace(/\D/g, '');
      return digits.length >= 6;
    }, "El teléfono de WhatsApp debe tener al menos 6 dígitos"),
  direccion: DireccionSchema.optional().default({}),
  estado_civil: z.enum(['soltero','casado','viudo','divorciado']).optional(),

  // Estado comercial
  estado_cliente: z.enum(['por_contactar', 'contactado', 'transferido', 'intermedio', 'desestimado', 'potencial']),
  origen_lead: z.enum(['web', 'recomendacion', 'feria', 'campaña', 'redes_sociales', 'publicidad', 'referido', 'otro']).optional(),
  vendedor_asignado: z.string().optional().or(z.literal("")),
  proxima_accion: z.enum(['llamar', 'enviar_propuesta', 'reunion', 'seguimiento', 'cierre', 'nada']).optional(),

  // Información financiera/comercial
  interes_principal: z.enum(['lotes', 'casas', 'departamentos', 'oficinas', 'terrenos', 'locales', 'otro']).optional(),
  capacidad_compra_estimada: z.number().positive().optional(),
  forma_pago_preferida: z.enum(['contado', 'financiacion', 'credito_bancario', 'leasing', 'mixto']).optional(),

  // Información adicional
  notas: z.string().optional().or(z.literal("")),
}).refine(data => {
  // Validación adicional: si el tipo de documento es DNI, el documento debe tener 8 dígitos
  if (data.tipo_documento === 'DNI' && data.documento_identidad && data.documento_identidad.trim()) {
    const digits = data.documento_identidad.replace(/\D/g, '');
    return digits.length === 8;
  }
  return true;
}, {
  message: "El DNI debe tener exactamente 8 dígitos",
  path: ["documento_identidad"]
}).refine(data => {
  // Validación adicional: si el tipo de documento es RUC, el documento debe tener 11 dígitos
  if (data.tipo_documento === 'RUC' && data.documento_identidad && data.documento_identidad.trim()) {
    const digits = data.documento_identidad.replace(/\D/g, '');
    return digits.length === 11;
  }
  return true;
}, {
  message: "El RUC debe tener exactamente 11 dígitos",
  path: ["documento_identidad"]
});

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
      .single();

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

  // Crear notificación
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

  revalidatePath("/dashboard/clientes");
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
      .single();

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

  // Crear notificación
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

  revalidatePath("/dashboard/clientes");
  revalidatePath(`/dashboard/clientes/${clienteId}`);
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

  await notifyVendedorAsignado(
    supabase,
    cliente.vendedor_username,
    "Estado de cliente actualizado",
    `El cliente ${cliente.nombre ?? ""} ahora está marcado como ${mapEstadoClienteLabel(nuevoEstado)}.`,
    {
      cliente_id: clienteId,
      nuevo_estado: nuevoEstado,
      url: `/dashboard/clientes/${clienteId}`,
    },
  );
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

  if (vendedorUsername) {
    await notifyVendedorAsignado(
      supabase,
      vendedorUsername,
      "Nuevo cliente asignado",
      `Se te asignó el cliente ${cliente?.nombre ?? ""}.`,
      {
        cliente_id: clienteId,
        url: `/dashboard/clientes/${clienteId}`,
      },
    );
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

// Eliminar múltiples clientes
export async function eliminarClientesMasivo(ids: string[]) {
  await requierePermiso(PERMISOS.CLIENTES.ELIMINAR, {
    accion: 'eliminar_clientes_masivo',
    recurso_tipo: 'cliente',
    cliente_ids: ids,
  });
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("cliente")
    .delete()
    .in("id", ids);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/clientes");
  return { success: true, count: ids.length };
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

// Asignar vendedor a múltiples clientes
export async function asignarVendedorMasivo(ids: string[], vendedorUsername: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Verificar que el usuario es administrador
  const isAdmin = await esAdmin();
  if (!isAdmin) {
    throw new Error("No tienes permisos para asignar vendedores masivamente");
  }

  // Validar que el vendedor existe
  const { data: vendedor, error: vendedorError } = await supabase
    .schema('crm')
    .from('usuario_perfil')
    .select('id, username, nombre_completo')
    .eq('username', vendedorUsername)
    .eq('activo', true)
    .single();

  if (vendedorError || !vendedor) {
    throw new Error("Vendedor no encontrado o inactivo");
  }

  const { data: clientesSeleccionados } = await supabase
    .from("cliente")
    .select("id, nombre")
    .in("id", ids);

  // Actualizar ambos campos para mantener consistencia
  const payload = {
    vendedor_username: vendedorUsername,
    vendedor_asignado: vendedorUsername,
  };

  const { error } = await supabase
    .from("cliente")
    .update(payload)
    .in("id", ids);

  if (error) {
    console.error('Error asignando vendedor masivo:', error);
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/clientes");

  if (vendedor?.id) {
    try {
      const resumen = buildNombreResumen((clientesSeleccionados ?? []).map((c) => c?.nombre));
      const descripcionExtra = resumen ? ` (${resumen})` : "";
      await crearNotificacion(
        vendedor.id,
        "cliente",
        "Asignación de clientes",
        `Se te asignaron ${ids.length} cliente${ids.length === 1 ? "" : "s"}${descripcionExtra}.`,
        {
          cliente_ids: ids,
          url: "/dashboard/clientes?vista=asignados",
        },
      );
    } catch (notifyError) {
      console.warn("No se pudo crear notificación para asignación masiva:", notifyError);
    }
  }

  return { success: true, count: ids.length };
}

// Cambiar estado a múltiples clientes
export async function cambiarEstadoMasivo(ids: string[], nuevoEstado: EstadoCliente) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: clientes } = await supabase
    .from("cliente")
    .select("id, nombre, vendedor_username")
    .in("id", ids);

  const { error } = await supabase
    .from("cliente")
    .update({ estado_cliente: nuevoEstado })
    .in("id", ids);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/clientes");

  try {
    const agrupados = new Map<string, { id: string; nombre: string | null }[]>();
    (clientes ?? []).forEach((cliente) => {
      if (!cliente?.vendedor_username) return;
      const lista = agrupados.get(cliente.vendedor_username) ?? [];
      lista.push({ id: cliente.id, nombre: cliente.nombre });
      agrupados.set(cliente.vendedor_username, lista);
    });

    if (agrupados.size > 0) {
      const vendedoresMap = await getVendedoresMap(supabase, Array.from(agrupados.keys()));
      await Promise.all(
        Array.from(agrupados.entries()).map(async ([username, lista]) => {
          const perfil = vendedoresMap.get(username);
          if (!perfil?.id) return;
          const nombres = lista.map((item) => item.nombre);
          const resumen = buildNombreResumen(nombres);
          const mensaje =
            lista.length === 1
              ? `El cliente ${nombres[0] ?? ""} ahora está marcado como ${mapEstadoClienteLabel(nuevoEstado)}.`
              : `${lista.length} clientes${resumen ? ` (${resumen})` : ""} ahora están marcados como ${mapEstadoClienteLabel(nuevoEstado)}.`;

          await crearNotificacion(
            perfil.id,
            "cliente",
            "Clientes actualizados",
            mensaje,
            {
              cliente_ids: lista.map((item) => item.id),
              nuevo_estado: nuevoEstado,
            },
          );
        }),
      );
    }
  } catch (notificationError) {
    console.warn("No se pudieron enviar notificaciones por cambio masivo:", notificationError);
  }

  return { success: true, count: ids.length };
}
