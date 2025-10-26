"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServerActionClient } from "@/lib/supabase.server-actions";
import { crearNotificacion } from "@/app/_actionsNotifications";
import { getCachedClientes } from "@/lib/cache.server";
import {
  TipoCliente,
  TipoDocumento,
  EstadoCliente,
  EstadoCivil
} from "@/lib/types/clientes";

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

const ClienteSchema = z.object({
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

  const { error } = await supabase
    .from("cliente")
    .update({ estado_cliente: nuevoEstado })
    .eq("id", clienteId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/clientes");
}

export async function asignarVendedorCliente(clienteId: string, vendedorUsername: string | null) {
  const supabase = await createServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autenticado");
  }

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
}

export async function eliminarCliente(id: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  console.log('🗑️ Intentando eliminar cliente:', id);

  // Primero verificar si el cliente existe
  const { data: clienteExiste } = await supabase
    .from("cliente")
    .select("id, nombre")
    .eq("id", id)
    .single();

  if (!clienteExiste) {
    throw new Error("El cliente no existe");
  }

  console.log('📋 Cliente encontrado:', clienteExiste.nombre);

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

  console.log('✅ Cliente eliminado, registros afectados:', count);

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

// Eliminar múltiples clientes
export async function eliminarClientesMasivo(ids: string[]) {
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

// Asignar vendedor a múltiples clientes
export async function asignarVendedorMasivo(ids: string[], vendedorEmail: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("cliente")
    .update({ vendedor_asignado: vendedorEmail })
    .in("id", ids);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/clientes");
  return { success: true, count: ids.length };
}

// Cambiar estado a múltiples clientes
export async function cambiarEstadoMasivo(ids: string[], nuevoEstado: EstadoCliente) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("cliente")
    .update({ estado_cliente: nuevoEstado })
    .in("id", ids);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/clientes");
  return { success: true, count: ids.length };
}
