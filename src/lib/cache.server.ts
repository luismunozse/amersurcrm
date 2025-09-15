import "server-only";
import { cache } from "react";
import { createOptimizedServerClient } from "./supabase.server";
import type {
  ClienteCached,
  ProyectoCached,
  LoteCached,
  DashboardStats,
  NotificacionNoLeida,
} from "@/types/crm";

async function getUserIdOrNull(s: Awaited<ReturnType<typeof createOptimizedServerClient>>) {
  const { data } = await s.auth.getUser();
  return data.user?.id ?? null;
}

/* ========= Clientes ========= */
export const getCachedClientes = cache(async (searchTerm?: string): Promise<ClienteCached[]> => {
  const supabase = await createOptimizedServerClient();
  const userId = await getUserIdOrNull(supabase);
  if (!userId) return [];

  let q = supabase
    .from("cliente")
    .select(`
      id,
      codigo_cliente,
      nombre,
      tipo_cliente,
      email,
      telefono,
      telefono_whatsapp,
      documento_identidad,
      estado_cliente,
      origen_lead,
      vendedor_asignado,
      fecha_alta,
      ultimo_contacto,
      proxima_accion,
      interes_principal,
      capacidad_compra_estimada,
      forma_pago_preferida,
      propiedades_reservadas,
      propiedades_compradas,
      propiedades_alquiladas,
      saldo_pendiente,
      notas,
      direccion,
      created_at
    `)
    .eq("created_by", userId)
    .order("created_at", { ascending: false });

  if (searchTerm) {
    q = q.or(`nombre.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ClienteCached[];
});

/* ========= Proyectos ========= */
export const getCachedProyectos = cache(async (): Promise<ProyectoCached[]> => {
  const supabase = await createOptimizedServerClient();
  const userId = await getUserIdOrNull(supabase);
  if (!userId) return [];

  const { data, error } = await supabase
    .from("proyecto")
    .select("id,nombre,estado,ubicacion,descripcion,created_at")
    .eq("created_by", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ProyectoCached[];
});

/* ========= Lotes por proyecto ========= */
export const getCachedLotes = cache(async (proyectoId: string): Promise<LoteCached[]> => {
  const supabase = await createOptimizedServerClient();
  const userId = await getUserIdOrNull(supabase);
  if (!userId) return [];

  const { data, error } = await supabase
    .from("lote")
    .select("id,codigo,sup_m2,precio,moneda,estado")
    .eq("proyecto_id", proyectoId)
    .eq("created_by", userId)
    .order("codigo");

  if (error) throw error;
  return (data ?? []) as LoteCached[];
});

/* ========= Estadísticas ========= */
export const getCachedDashboardStats = cache(async (): Promise<DashboardStats> => {
  const supabase = await createOptimizedServerClient();
  const userId = await getUserIdOrNull(supabase);
  if (!userId) return { totalClientes: 0, totalProyectos: 0, totalLotes: 0 };

  const [cRes, pRes, lRes] = await Promise.all([
    supabase.from("cliente").select("*", { count: "exact", head: true }).eq("created_by", userId),
    supabase.from("proyecto").select("*", { count: "exact", head: true }).eq("created_by", userId),
    supabase.from("lote").select("*", { count: "exact", head: true }).eq("created_by", userId),
  ]);

  return {
    totalClientes: cRes.count ?? 0,
    totalProyectos: pRes.count ?? 0,
    totalLotes: lRes.count ?? 0,
  };
});

/* ========= Un proyecto ========= */
export const getCachedProyecto = cache(async (proyectoId: string): Promise<ProyectoCached | null> => {
  const supabase = await createOptimizedServerClient();
  const userId = await getUserIdOrNull(supabase);
  if (!userId) return null;

  const { data, error } = await supabase
    .from("proyecto")
    .select("id,nombre,estado,ubicacion,descripcion,created_at")
    .eq("id", proyectoId)
    .eq("created_by", userId)
    .single();

  if (error) throw error;
  return data as ProyectoCached;
});

/* ========= Notificaciones ========= */
export const getCachedNotificacionesNoLeidas = cache(async (): Promise<NotificacionNoLeida[]> => {
  const supabase = await createOptimizedServerClient();
  const userId = await getUserIdOrNull(supabase);
  if (!userId) return [];

  const { data, error } = await supabase
    .from("notificacion")
    .select("id,tipo,titulo,mensaje,data,created_at")
    .eq("usuario_id", userId)
    .eq("leida", false)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data ?? []) as NotificacionNoLeida[];
});

export const getCachedNotificacionesCount = cache(async (): Promise<number> => {
  const supabase = await createOptimizedServerClient();
  const userId = await getUserIdOrNull(supabase);
  if (!userId) return 0;

  const { count, error } = await supabase
    .from("notificacion")
    .select("*", { count: "exact", head: true })
    .eq("usuario_id", userId)
    .eq("leida", false);

  if (error) throw error;
  return count ?? 0;
});

export function invalidateCache() {
  // Usar revalidatePath/revalidateTag desde Server Actions
}
