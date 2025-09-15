"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServerActionClient } from "@/lib/supabase.server-actions";
import { crearNotificacion } from "@/app/_actionsNotifications";
import { 
  TipoCliente, 
  EstadoCliente, 
  OrigenLead, 
  FormaPago, 
  InteresPrincipal, 
  ProximaAccion,
  DireccionCliente 
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
  documento_identidad: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  telefono: z.string().optional().or(z.literal("")),
  telefono_whatsapp: z.string().optional().or(z.literal("")),
  direccion: DireccionSchema.optional().default({}),
  
  // Estado comercial
  estado_cliente: z.enum(['activo', 'prospecto', 'lead', 'inactivo']),
  origen_lead: z.enum(['web', 'recomendacion', 'feria', 'campaña', 'redes_sociales', 'publicidad', 'referido', 'otro']).optional(),
  vendedor_asignado: z.string().uuid().optional().or(z.literal("")),
  proxima_accion: z.enum(['llamar', 'enviar_propuesta', 'reunion', 'seguimiento', 'cierre', 'nada']).optional(),
  
  // Información financiera/comercial
  interes_principal: z.enum(['lotes', 'casas', 'departamentos', 'oficinas', 'terrenos', 'locales', 'otro']).optional(),
  capacidad_compra_estimada: z.number().positive().optional(),
  forma_pago_preferida: z.enum(['contado', 'financiacion', 'credito_bancario', 'leasing', 'mixto']).optional(),
  
  // Información adicional
  notas: z.string().optional().or(z.literal("")),
});

export async function crearCliente(formData: FormData) {
  // Extraer datos del formulario
  const clienteData = {
    tipo_cliente: String(formData.get("tipo_cliente") || "persona") as TipoCliente,
    nombre: String(formData.get("nombre") || ""),
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
    estado_cliente: String(formData.get("estado_cliente") || "prospecto") as EstadoCliente,
    origen_lead: String(formData.get("origen_lead") || ""),
    vendedor_asignado: String(formData.get("vendedor_asignado") || ""),
    proxima_accion: String(formData.get("proxima_accion") || ""),
    interes_principal: String(formData.get("interes_principal") || ""),
    capacidad_compra_estimada: formData.get("capacidad_compra_estimada") ? 
      Number(formData.get("capacidad_compra_estimada")) : undefined,
    forma_pago_preferida: String(formData.get("forma_pago_preferida") || ""),
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
    documento_identidad: parsed.data.documento_identidad || null,
    origen_lead: parsed.data.origen_lead || null,
    vendedor_asignado: parsed.data.vendedor_asignado || null,
    proxima_accion: parsed.data.proxima_accion || null,
    interes_principal: parsed.data.interes_principal || null,
    capacidad_compra_estimada: parsed.data.capacidad_compra_estimada || null,
    forma_pago_preferida: parsed.data.forma_pago_preferida || null,
    notas: parsed.data.notas || null,
    created_by: user.id,
  };

  const { error } = await supabase.from("cliente").insert(insertData);
  if (error) throw new Error(error.message);

  // Crear notificación
  try {
    await crearNotificacion(
      user.id,
      "cliente",
      "Nuevo cliente registrado",
      `Se ha registrado un nuevo cliente: ${parsed.data.nombre}`,
      { cliente_id: user.id, cliente_nombre: parsed.data.nombre }
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

export async function eliminarCliente(id: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase.from("cliente").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/clientes");
}
