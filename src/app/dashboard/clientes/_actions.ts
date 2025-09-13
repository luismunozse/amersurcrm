"use server";

import { supabaseServer } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

export async function crearCliente(formData: FormData) {
  const nombre = String(formData.get("nombre") || "");
  const email = String(formData.get("email") || "");
  const telefono = String(formData.get("telefono") || "");

  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Si tu RLS requiere created_by = auth.uid(), setealo:
  const { error } = await supabase.from("crm.cliente").insert({
    nombre, email, telefono, created_by: user.id
  });
  if (error) throw new Error(error.message);

  revalidatePath("/clientes");
}
