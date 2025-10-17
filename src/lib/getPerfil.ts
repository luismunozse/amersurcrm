import "server-only";
import { createOptimizedServerClient } from "@/lib/supabase.server";

export type PerfilActual = {
  id: string;
  nombre_completo: string;
  activo: boolean;
  rol_id: string | null;
  rol_nombre: string | null;
  permisos: string[];
};

export async function getPerfilActual(): Promise<PerfilActual | null> {
  const s = await createOptimizedServerClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return null;

  const { data, error } = await s
    .from("v_perfil_actual")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as PerfilActual | null;
}
