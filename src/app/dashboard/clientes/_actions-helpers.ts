/**
 * Helpers compartidos para server actions de clientes.
 * Este archivo NO tiene "use server" — contiene tipos, funciones sync,
 * schemas de validación y utilidades async que no son server actions.
 */

import { z } from "zod";
import { createServerActionClient } from "@/lib/supabase.server-actions";
import { crearNotificacion } from "@/app/_actionsNotifications";

// ============================================================
// Tipos
// ============================================================

export type SupabaseServerClient = Awaited<ReturnType<typeof createServerActionClient>>;

export interface DuplicadoEncontrado {
  id: string;
  nombre: string;
  codigo_cliente: string;
  telefono: string | null;
  email: string | null;
  matchType: "telefono" | "email" | "nombre";
}

// ============================================================
// Utilidades sync
// ============================================================

export function buildNombreResumen(nombres: (string | null | undefined)[]) {
  const clean = nombres.filter((nombre): nombre is string => Boolean(nombre));
  if (clean.length === 0) return "";
  if (clean.length <= 3) return clean.join(", ");
  return `${clean.slice(0, 3).join(", ")} y ${clean.length - 3} más`;
}

// ============================================================
// Utilidades async (helpers, no server actions)
// ============================================================

export async function getVendedorPerfilByUsername(
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

export async function notifyVendedorAsignado(
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

export async function getVendedoresMap(
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

// ============================================================
// Schemas de validación
// ============================================================

const DireccionSchema = z.object({
  calle: z.string().optional(),
  numero: z.string().optional(),
  barrio: z.string().optional(),
  ciudad: z.string().optional(),
  provincia: z.string().optional(),
  departamento: z.string().optional(),
  distrito: z.string().optional(),
  pais: z.string().optional(),
  codigo_postal: z.string().optional(),
  coordenadas: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional()
});

export const ClienteCompletoSchema = z.object({
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
      return val.trim().length >= 8;
    }, "El documento debe tener al menos 8 caracteres"),
  email: z.string()
    .optional()
    .or(z.literal(""))
    .refine(val => {
      if (!val || val === "") return true;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    }, "Formato de email inválido"),
  telefono: z.string()
    .optional()
    .or(z.literal(""))
    .refine(val => {
      if (!val || val === "") return true;
      const digits = val.replace(/\D/g, '');
      return digits.length >= 6;
    }, "El teléfono debe tener al menos 6 dígitos"),
  telefono_whatsapp: z.string()
    .optional()
    .or(z.literal(""))
    .refine(val => {
      if (!val || val === "") return true;
      const digits = val.replace(/\D/g, '');
      return digits.length >= 6;
    }, "El teléfono de WhatsApp debe tener al menos 6 dígitos"),
  direccion: DireccionSchema.optional().default({}),
  estado_civil: z.enum(['soltero','casado','viudo','divorciado']).optional(),

  // Estado comercial
  estado_cliente: z.enum(['por_contactar', 'contactado', 'transferido', 'intermedio', 'desestimado', 'potencial']),
  origen_lead: z.enum(['web', 'recomendacion', 'feria', 'campaña', 'campaña_facebook', 'campaña_tiktok', 'facebook_ads', 'whatsapp_web', 'redes_sociales', 'publicidad', 'referido', 'otro']).optional(),
  vendedor_asignado: z.string().optional().or(z.literal("")),
  proxima_accion: z.enum(['llamar', 'enviar_propuesta', 'reunion', 'seguimiento', 'cierre', 'nada']).optional(),

  // Información financiera/comercial
  interes_principal: z.enum(['lotes', 'casas', 'departamentos', 'oficinas', 'terrenos', 'locales', 'otro']).optional(),
  capacidad_compra_estimada: z.number().positive().optional(),
  forma_pago_preferida: z.enum(['contado', 'financiacion', 'credito_bancario', 'leasing', 'mixto']).optional(),

  // Información adicional
  notas: z.string().optional().or(z.literal("")),
}).refine(data => {
  if (data.tipo_documento === 'DNI' && data.documento_identidad && data.documento_identidad.trim()) {
    const digits = data.documento_identidad.replace(/\D/g, '');
    return digits.length === 8;
  }
  return true;
}, {
  message: "El DNI debe tener exactamente 8 dígitos",
  path: ["documento_identidad"]
}).refine(data => {
  if (data.tipo_documento === 'RUC' && data.documento_identidad && data.documento_identidad.trim()) {
    const digits = data.documento_identidad.replace(/\D/g, '');
    return digits.length === 11;
  }
  return true;
}, {
  message: "El RUC debe tener exactamente 11 dígitos",
  path: ["documento_identidad"]
});
