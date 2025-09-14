"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";
import {z} from "zod";

const LoteSchema = z.object({
  id: z.string().uuid(),
  codigo: z.string().min(1),
  sup_m2: z.preprocess((v) => (v === "" ? undefined : v), z.number().optional()),
  precio: z.preprocess((v) => (v === "" ? undefined : v), z.number().optional()),
  moneda: z.string().min(1).default("ARS"),
  estado: z.enum(["disponible", "reservado", "vendido"]).default("disponible"),
});

export async function crearLote(proyectoId: string, fd: FormData) {
  const codigo  = String(fd.get("codigo") || "");
  const sup_m2  = fd.get("sup_m2") ? Number(fd.get("sup_m2")) : null;
  const precio  = fd.get("precio") ? Number(fd.get("precio")) : null;
  const moneda  = String(fd.get("moneda") || "ARS");
  const estado  = String(fd.get("estado") || "disponible");

  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase.from("lote").insert({
    proyecto_id: proyectoId,
    codigo, sup_m2, precio, moneda, estado, created_by: user.id
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/proyectos/${proyectoId}`);
}

export async function actualizarLote(proyectoId: string, fd: FormData) {
  const parsed = LoteSchema.safeParse({
    id: String(fd.get("id") || ""),
    codigo: String(fd.get("codigo") || ""),
    sup_m2: fd.get("sup_m2") ? Number(fd.get("sup_m2")) : undefined,
    precio: fd.get("precio") ? Number(fd.get("precio")) : undefined,
    moneda: String(fd.get("moneda") || "ARS"),
    estado: String(fd.get("estado") || "disponible"),
  });
  //if (!parsed.success) throw new Error(parsed.error.errors[0]?.message || "Datos inválidos");

  if (!parsed.success) {
    const { fieldErrors, formErrors } = parsed.error.flatten();
    const firstFieldMsg = Object.values(fieldErrors).flat()[0];
    const msg = firstFieldMsg ?? formErrors[0] ?? "Datos inválidos";
    throw new Error(msg);
    }


  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { id, codigo, sup_m2, precio, moneda, estado } = parsed.data;

  // RLS garantiza que solo puedas actualizar lotes de proyectos tuyos
  const { error } = await supabase
    .from("lote")
    .update({ codigo, sup_m2, precio, moneda, estado })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/proyectos/${proyectoId}`);
}

export async function eliminarLote(proyectoId: string, id: string) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase.from("lote").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/proyectos/${proyectoId}`);
}

export async function reservarLote(proyectoId: string, loteId: string) {
  const s = await supabaseServer();
  const { data, error } = await s.rpc("reservar_lote", { p_lote: loteId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("El lote no está disponible.");
  revalidatePath(`/dashboard/proyectos/${proyectoId}`);
}

export async function venderLote(proyectoId: string, loteId: string) {
  const s = await supabaseServer();
  const { data, error } = await s.rpc("vender_lote", { p_lote: loteId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("El lote debe estar reservado para venderse.");
  revalidatePath(`/dashboard/proyectos/${proyectoId}`);
}

export async function liberarLote(proyectoId: string, loteId: string) {
  const s = await supabaseServer();
  const { data, error } = await s.rpc("liberar_lote", { p_lote: loteId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Sólo lotes reservados pueden liberarse.");
  revalidatePath(`/dashboard/proyectos/${proyectoId}`);
}