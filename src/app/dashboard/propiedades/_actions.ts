"use server";

import { revalidatePath } from "next/cache";
import { createServerActionClient } from "@/lib/supabase.server-actions";
import { z } from "zod";

const PropiedadSchema = z.object({
  id: z.string().uuid(),
  codigo: z.string().min(1),
  tipo: z.enum(['lote', 'casa', 'departamento', 'oficina', 'otro']),
  proyecto_id: z.string().uuid(),
  identificacion_interna: z.string().min(1),
  ubicacion: z.object({
    direccion_completa: z.string(),
    pais: z.string(),
    provincia: z.string(),
    ciudad: z.string(),
    barrio: z.string(),
    codigo_postal: z.string().optional(),
    geolocalizacion: z.object({
      lat: z.number(),
      lng: z.number()
    }).optional()
  }),
  superficie: z.object({
    total: z.number(),
    cubierta: z.number().optional(),
    semicubierta: z.number().optional(),
    descubierta: z.number().optional(),
    terreno: z.number().optional()
  }),
  estado_comercial: z.enum(['disponible', 'reservado', 'vendido', 'bloqueado']),
  precio: z.number().optional(),
  moneda: z.string().default('PEN'),
  opciones_financiacion: z.object({
    anticipo_porcentaje: z.number().optional(),
    cuotas: z.number().optional(),
    interes_anual: z.number().optional(),
    moneda_financiacion: z.string().optional(),
    observaciones: z.string().optional()
  }).optional(),
  marketing: z.object({
    fotos: z.array(z.string()),
    plano: z.string().optional(),
    video: z.string().optional(),
    links3D: z.array(z.string()),
    etiquetas: z.array(z.string()),
    descripcion: z.string().optional(),
    fecha_publicacion: z.string().optional()
  }).optional(),
  data: z.record(z.any())
});

export async function crearPropiedad(fd: FormData) {
  const tipo = String(fd.get("tipo") || "");
  const codigo = String(fd.get("codigo") || "");
  const proyecto_id = String(fd.get("proyecto_id") || "");
  const proyectoId = proyecto_id === "" ? null : proyecto_id;
  const dataJson = String(fd.get("data") || "{}");

  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Parsear datos adicionales
  let additionalData = {};
  try {
    additionalData = JSON.parse(dataJson);
  } catch (e) {
    console.warn("Error parsing additional data:", e);
  }

  // Crear datos básicos de la propiedad
  const propiedadData = {
    codigo,
    tipo,
    proyecto_id: proyectoId, // Permitir null para propiedades independientes
    identificacion_interna: additionalData.identificador || codigo,
    ubicacion: {
      direccion_completa: additionalData.ubicacion || "",
      pais: "Perú",
      provincia: "Lima",
      ciudad: "Huaral",
      barrio: additionalData.ubicacion || "",
      geolocalizacion: null
    },
    superficie: {
      total: 0, // Se calculará según el tipo
      terreno: 0
    },
    estado_comercial: additionalData.condiciones || "disponible",
    precio: null,
    moneda: "PEN",
    opciones_financiacion: {},
    marketing: {
      fotos: additionalData.fotos || [],
      renders: additionalData.renders || [],
      plano: additionalData.plano || null,
      links3D: additionalData.links3D || [],
      etiquetas: additionalData.etiquetas || [],
      descripcion: additionalData.descripcion || "",
      fecha_publicacion: additionalData.fecha_publicacion || new Date().toISOString()
    },
    data: additionalData,
    created_by: user.id
  };

  const { error } = await supabase.from("propiedad").insert(propiedadData);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/propiedades");
}

export async function actualizarPropiedad(propiedadId: string, fd: FormData) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const dataJson = String(fd.get("data") || "{}");
  let additionalData = {};
  try {
    additionalData = JSON.parse(dataJson);
  } catch (e) {
    console.warn("Error parsing additional data:", e);
  }

  const { error } = await supabase
    .from("propiedad")
    .update({ 
      data: additionalData,
      updated_at: new Date().toISOString()
    })
    .eq("id", propiedadId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/propiedades");
}

export async function eliminarPropiedad(propiedadId: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("propiedad")
    .delete()
    .eq("id", propiedadId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/propiedades");
}

export async function cambiarEstadoPropiedad(
  propiedadId: string, 
  nuevoEstado: 'disponible' | 'reservado' | 'vendido' | 'bloqueado'
) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("propiedad")
    .update({ 
      estado_comercial: nuevoEstado,
      updated_at: new Date().toISOString()
    })
    .eq("id", propiedadId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/propiedades");
}
