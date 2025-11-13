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
interface GetClientesParams {
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
}

export const getCachedClientes = cache(async (params?: GetClientesParams): Promise<{ data: ClienteCached[], total: number }> => {
  const supabase = await createOptimizedServerClient();
  const userId = await getUserIdOrNull(supabase);
  if (!userId) return { data: [], total: 0 };

  const {
    page = 1,
    pageSize = 20,
    searchTerm = '',
    searchTelefono = '',
    searchDni = '',
    estado = '',
    tipo = '',
    vendedor = '',
    sortBy = 'fecha_alta',
    sortOrder = 'desc'
  } = params || {};

  // Obtener el rol y username del usuario
  const { data: perfil } = await supabase
    .schema('crm')
    .from('usuario_perfil')
    .select('rol, username')
    .eq('id', userId)
    .single();

  const esAdmin = perfil?.rol === 'ROL_ADMIN';
  const esGerente = perfil?.rol === 'ROL_GERENTE';
  const username = perfil?.username;

  let q = supabase
    .schema('crm')
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
    `, { count: 'exact' });

  // Filtro por rol: vendedores solo ven sus clientes asignados
  if (!esAdmin && !esGerente && !vendedor && username) {
    // Si es vendedor y no se está filtrando por vendedor específico, mostrar solo sus clientes
    // Usar vendedor_username (columna TEXT) en lugar de vendedor_asignado
    q = q.or(`created_by.eq.${userId},vendedor_username.eq.${username}`);
  }

  // Aplicar filtros
  if (searchTerm) {
    q = q.or(`nombre.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,codigo_cliente.ilike.%${searchTerm}%`);
  }

  if (searchTelefono) {
    q = q.or(`telefono.ilike.%${searchTelefono}%,telefono_whatsapp.ilike.%${searchTelefono}%`);
  }

  if (searchDni) {
    q = q.ilike('documento_identidad', `%${searchDni}%`);
  }

  if (estado) {
    q = q.eq('estado_cliente', estado);
  }

  if (tipo) {
    q = q.eq('tipo_cliente', tipo);
  }

  if (vendedor) {
    q = q.eq('vendedor_asignado', vendedor);
  }

  // Ordenar
  q = q.order(sortBy, { ascending: sortOrder === 'asc' });

  // Paginación
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  q = q.range(start, end);

  const { data, error, count } = await q;

  if (error) throw error;

  return {
    data: (data ?? []) as ClienteCached[],
    total: count ?? 0
  };
});

export const getCachedClientesTotal = cache(async (): Promise<number> => {
  const supabase = await createOptimizedServerClient();
  const userId = await getUserIdOrNull(supabase);
  if (!userId) return 0;

  // Obtener el rol y username del usuario
  const { data: perfil } = await supabase
    .schema('crm')
    .from('usuario_perfil')
    .select('rol, username')
    .eq('id', userId)
    .single();

  const esAdmin = perfil?.rol === 'ROL_ADMIN';
  const esGerente = perfil?.rol === 'ROL_GERENTE';
  const username = perfil?.username;

  let query = supabase.schema('crm').from('cliente').select('*', { count: 'exact', head: true });

  // Vendedores solo ven sus clientes
  if (!esAdmin && !esGerente && username) {
    query = query.or(`created_by.eq.${userId},vendedor_username.eq.${username}`);
  }

  const { count, error } = await query;

  if (error) throw error;
  return count ?? 0;
});

/* ========= Proyectos ========= */
export const getCachedProyectos = cache(async (): Promise<ProyectoCached[]> => {
  const supabase = await createOptimizedServerClient();
  const userId = await getUserIdOrNull(supabase);
  if (!userId) return [];

  // Todos los usuarios pueden ver todos los proyectos (vendedores y admins)
  const { data, error } = await supabase
    .schema('crm')
    .from("proyecto")
    .select("id,nombre,estado,tipo,ubicacion,latitud,longitud,descripcion,imagen_url,logo_url,galeria_imagenes,planos_url,created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ProyectoCached[];
});

/* ========= Lotes por proyecto ========= */
export const getCachedLotes = cache(async (proyectoId: string): Promise<LoteCached[]> => {
  const supabase = await createOptimizedServerClient();
  const userId = await getUserIdOrNull(supabase);
  if (!userId) return [];

  // Todos los usuarios pueden ver todos los lotes de un proyecto
  const { data, error } = await supabase
    .schema('crm')
    .from("lote")
    .select("id,codigo,sup_m2,precio,moneda,estado")
    .eq("proyecto_id", proyectoId)
    .order("codigo");

  if (error) throw error;
  return (data ?? []) as LoteCached[];
});

/* ========= Estadísticas ========= */
export const getCachedDashboardStats = cache(async (): Promise<DashboardStats> => {
  const supabase = await createOptimizedServerClient();
  const userId = await getUserIdOrNull(supabase);
  if (!userId) return { totalClientes: 0, totalProyectos: 0, totalLotes: 0 };

  // Obtener el rol y username del usuario para determinar qué datos mostrar
  const { data: perfil } = await supabase
    .schema('crm')
    .from('usuario_perfil')
    .select('rol, username')
    .eq('id', userId)
    .single();

  const esAdmin = perfil?.rol === 'ROL_ADMIN';
  const esGerente = perfil?.rol === 'ROL_GERENTE';
  const username = perfil?.username;

  // Administradores y gerentes ven todos los clientes del sistema
  // Vendedores solo ven sus clientes asignados
  let clientesQuery = supabase.schema('crm').from("cliente").select("*", { count: "exact", head: true });

  if (!esAdmin && !esGerente && username) {
    // Vendedor: solo sus clientes (donde created_by = userId o vendedor_username = username)
    clientesQuery = clientesQuery.or(`created_by.eq.${userId},vendedor_username.eq.${username}`);
  }

  const [cRes, pRes, lRes] = await Promise.all([
    clientesQuery,
    // Proyectos: todos los proyectos (todos pueden ver)
    supabase.schema('crm').from("proyecto").select("*", { count: "exact", head: true }),
    // Lotes: todos los lotes (todos pueden ver)
    supabase.schema('crm').from("lote").select("*", { count: "exact", head: true }),
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

  // Todos los usuarios pueden ver cualquier proyecto
  const { data, error } = await supabase
    .schema('crm')
    .from("proyecto")
    .select("id,nombre,estado,ubicacion,latitud,longitud,descripcion,imagen_url,planos_url,created_at")
    .eq("id", proyectoId)
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
    .schema('crm')
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
    .schema('crm')
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
