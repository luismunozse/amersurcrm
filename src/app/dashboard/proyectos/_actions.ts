"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";

export async function crearProyecto(fd: FormData) {
  const nombre = String(fd.get("nombre") || "");
  const estado = String(fd.get("estado") || "activo");
  const ubicacion = String(fd.get("ubicacion") || "");

  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase.from("proyecto").insert({
    nombre, estado, ubicacion: ubicacion || null, created_by: user.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/proyectos");
}
