"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";

const ClienteSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().min(1, "Nombre requerido"),
  email: z.string().email().optional().or(z.literal("")),
  telefono: z.string().optional().or(z.literal("")),
});

export async function crearCliente(formData: FormData) {
  const nombre = String(formData.get("nombre") || "");
  const email = String(formData.get("email") || "");
  const telefono = String(formData.get("telefono") || "");

  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase.from("cliente").insert({
    nombre,
    email: email || null,
    telefono: telefono || null,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);

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

  const supabase = await supabaseServer();
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
  const supabase = await createOptimizedServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase.from("cliente").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/clientes");
}
