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
  nombre: z.string().min(1, "Nombre requerido"),
  tipo_documento: z.enum(['DNI', 'PAS', 'EXT', 'RUC']).optional(),
  documento_identidad: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  telefono: z.string().optional().or(z.literal("")),
  telefono_whatsapp: z.string().optional().or(z.literal("")),
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
  const parsed = ClienteSchema.safeParse({
    id: String(formData.get("id") || ""),
    nombre: String(formData.get("nombre") || ""),
    email: String(formData.get("email") || ""),
    telefono: String(formData.get("telefono") || ""),
  });

  //if (!parsed.success) throw new Error(parsed.error.errors[0]?.message || "Datos inválidos");

  if (!parsed.success) {
    const { fieldErrors, formErrors } = parsed.error.flatten();
    const firstFieldMsg = Object.values(fieldErrors).flat()[0];
    const msg = firstFieldMsg ?? formErrors[0] ?? "Datos inválidos";
    throw new Error(msg);
  }

  const { id, nombre, email, telefono } = parsed.data;

  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("cliente")
    .update({ nombre, email: email || null, telefono: telefono || null })
    .eq("id", id); // RLS garantiza que solo se actualicen los propios

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/clientes");
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

  const { error } = await supabase.from("cliente").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/clientes");
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
