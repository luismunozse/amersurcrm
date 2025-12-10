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
  origen?: string;  // Filtro por origen del lead
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  mode?: 'list' | 'dashboard';
  withTotal?: boolean;
}

type ClienteDashboardMetrics = {
  total: number;
  sinSeguimiento: number;
  conAccion: number;
  fueraDeRango: number;
};

const CLIENTE_LIST_COLUMNS = `
      id,
      codigo_cliente,
      nombre,
      tipo_cliente,
      email,
      telefono,
      telefono_whatsapp,
      estado_cliente,
      origen_lead,
      vendedor_asignado,
      vendedor_username,
      fecha_alta,
      ultimo_contacto,
      proxima_accion,
      created_at
    `;

const CLIENTE_DASHBOARD_COLUMNS = `
      id,
      nombre,
      email,
      estado_cliente,
      vendedor_username,
      ultimo_contacto,
      proxima_accion,
      created_at
    `;

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
    origen = '',
    sortBy = 'fecha_alta',
    sortOrder = 'desc',
    mode = 'list',
    withTotal = mode === 'list'
  } = params || {};

  const selectedColumns = mode === 'dashboard' ? CLIENTE_DASHBOARD_COLUMNS : CLIENTE_LIST_COLUMNS;

  // Obtener el rol y username del usuario
  // NOTA: No usar .schema('crm') porque el cliente ya tiene db: { schema: "crm" } configurado
  const { data: perfil } = await supabase
    .from('usuario_perfil')
    .select('username, rol:rol!usuario_perfil_rol_id_fkey(nombre)')
    .eq('id', userId)
    .single();

  const rolData = perfil?.rol as any;
  const rolNombre = Array.isArray(rolData) ? rolData[0]?.nombre : rolData?.nombre;
  const esAdmin = rolNombre === 'ROL_ADMIN';
  const esGerente = rolNombre === 'ROL_GERENTE';
  const username = perfil?.username;

  const usarVistaAccesible = !esAdmin && !esGerente && !vendedor && username;
  const tablaClientes = usarVistaAccesible ? 'cliente_accesible' : 'cliente';

  // buildBaseQuery ahora recibe las columnas a seleccionar y opciones
  // IMPORTANTE: .select() debe llamarse PRIMERO para que .or() esté disponible
  const buildBaseQuery = (selectColumns: string, options?: { count?: 'exact' | 'planned' | 'estimated', head?: boolean }) => {
    // Crear query con .select() primero para obtener PostgrestFilterBuilder (que tiene .or())
    let query = supabase.schema('crm').from(tablaClientes).select(selectColumns, options);

    // Filtros de permisos usando vista accesible (solo para vendedores, no admins)
    if (usarVistaAccesible) {
      query = query.eq('usuario_id', userId);
      // Si usamos vista accesible, aplicar filtros adicionales directamente
      if (searchDni) {
        query = query.ilike('documento_identidad', `%${searchDni}%`);
      }
      if (estado) {
        query = query.eq('estado_cliente', estado);
      }
      if (tipo) {
        query = query.eq('tipo_cliente', tipo);
      }
      if (origen) {
        query = query.eq('origen_lead', origen);
      }
      // Para búsquedas en vista accesible, usar filtros individuales
      if (searchTerm) {
        query = query.ilike('nombre', `%${searchTerm}%`);
      }
      if (searchTelefono) {
        query = query.ilike('telefono', `%${searchTelefono}%`);
      }
      return query;
    }

    // Determinar qué filtros necesitamos
    const necesitaFiltroPermisos = !esAdmin && !esGerente && username && !vendedor;
    const necesitaFiltroVendedor = !!vendedor && vendedor.trim() !== '' && (esAdmin || esGerente);

    // Construir todas las condiciones OR en un solo array
    const orConditions: string[] = [];

    // 1. Filtros de permisos para vendedores (solo si no hay filtro de vendedor específico)
    if (necesitaFiltroPermisos) {
      orConditions.push(`created_by.eq.${userId}`);
      orConditions.push(`vendedor_username.eq.${username}`);
    }

    // 2. Filtro por vendedor (admins pueden filtrar por cualquier vendedor)
    if (necesitaFiltroVendedor && vendedor && vendedor.trim() !== '') {
      orConditions.push(`vendedor_asignado.eq.${vendedor}`);
      orConditions.push(`vendedor_username.eq.${vendedor}`);
    }

    // 3. Búsquedas: agregar todas las condiciones de búsqueda
    if (searchTerm && searchTerm.trim() !== '') {
      orConditions.push(`nombre.ilike.%${searchTerm}%`);
      orConditions.push(`email.ilike.%${searchTerm}%`);
      orConditions.push(`codigo_cliente.ilike.%${searchTerm}%`);
    }

    if (searchTelefono && searchTelefono.trim() !== '') {
      orConditions.push(`telefono.ilike.%${searchTelefono}%`);
      orConditions.push(`telefono_whatsapp.ilike.%${searchTelefono}%`);
    }

    // Aplicar todas las condiciones OR juntas (solo una vez)
    // Ahora .or() está disponible porque ya llamamos .select()
    if (orConditions.length > 0) {
      query = query.or(orConditions.join(','));
    }

    // Filtros individuales (no requieren OR, se aplican con AND sobre los resultados del OR)
    if (searchDni && searchDni.trim() !== '') {
      query = query.ilike('documento_identidad', `%${searchDni}%`);
    }

    if (estado && estado.trim() !== '') {
      query = query.eq('estado_cliente', estado);
    }

    if (tipo && tipo.trim() !== '') {
      query = query.eq('tipo_cliente', tipo);
    }

    if (origen && origen.trim() !== '') {
      query = query.eq('origen_lead', origen);
    }

    return query;
  };

  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  
  // Ahora pasamos las columnas a buildBaseQuery (ya incluye .select())
  const { data, error } = await buildBaseQuery(selectedColumns)
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(start, end);

  if (error) {
    console.error('Error en getCachedClientes:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw error;
  }

  // Deduplicar resultados por ID (puede haber duplicados si hay múltiples condiciones OR)
  const dataArray = data as any[];
  const uniqueData = dataArray ? Array.from(
    new Map(dataArray.map(item => [item.id, item])).values()
  ) : [];

  let total = uniqueData.length;
  if (withTotal) {
    // Usar 'exact' en lugar de 'planned' para obtener el conteo real con filtros aplicados
    const { count } = await buildBaseQuery('id', { count: 'exact', head: true });
    total = count ?? total;
  }

  return {
    data: uniqueData as ClienteCached[],
    total,
  };
});

export const getCachedClientesTotal = cache(async (): Promise<number> => {
  const supabase = await createOptimizedServerClient();
  const userId = await getUserIdOrNull(supabase);
  if (!userId) return 0;

  // Obtener el rol y username del usuario
  // NOTA: No usar .schema('crm') porque el cliente ya tiene db: { schema: "crm" } configurado
  const { data: perfil } = await supabase
    .from('usuario_perfil')
    .select('username, rol:rol!usuario_perfil_rol_id_fkey(nombre)')
    .eq('id', userId)
    .single();

  const rolData = perfil?.rol as any;
  const rolNombre = Array.isArray(rolData) ? rolData[0]?.nombre : rolData?.nombre;
  const esAdmin = rolNombre === 'ROL_ADMIN';
  const esGerente = rolNombre === 'ROL_GERENTE';
  const username = perfil?.username;

  // IMPORTANTE: .select() debe llamarse PRIMERO para que .or() esté disponible
  let query = supabase.schema('crm').from('cliente').select('*', { count: 'exact', head: true });

  // Vendedores solo ven sus clientes
  if (!esAdmin && !esGerente && username) {
    query = query.or(`created_by.eq.${userId},vendedor_username.eq.${username}`);
  }

  const { count, error } = await query;

  if (error) throw error;
  return count ?? 0;
});

export const getCachedClientesDashboardMetrics = cache(async (): Promise<ClienteDashboardMetrics> => {
  const supabase = await createOptimizedServerClient();
  const userId = await getUserIdOrNull(supabase);
  if (!userId) {
    return { total: 0, sinSeguimiento: 0, conAccion: 0, fueraDeRango: 0 };
  }

  const { data: perfil } = await supabase
    .schema('crm')
    .from('usuario_perfil')
    .select('username, rol:rol!usuario_perfil_rol_id_fkey(nombre)')
    .eq('id', userId)
    .single();

  const rolData = perfil?.rol as any;
  const rolNombre = Array.isArray(rolData) ? rolData[0]?.nombre : rolData?.nombre;
  const esAdmin = rolNombre === 'ROL_ADMIN';
  const esGerente = rolNombre === 'ROL_GERENTE';
  const username = perfil?.username;

  const { data, error } = await supabase
    .schema('crm')
    .rpc('obtener_metricas_dashboard_clientes', {
      p_usuario_id: userId,
      p_es_admin: esAdmin,
      p_es_gerente: esGerente,
      p_username: username ?? null,
    })
    .single();

  if (error) {
    console.error('Error obteniendo métricas del dashboard:', error);
    throw error;
  }

  const metricas = data as any;
  return {
    total: metricas?.total ?? 0,
    sinSeguimiento: metricas?.sin_seguimiento ?? 0,
    conAccion: metricas?.con_accion ?? 0,
    fueraDeRango: metricas?.fuera_de_rango ?? 0,
  };
});

export const getCachedLeadsStatsByOrigen = cache(async (): Promise<{ origen: string; count: number }[]> => {
  const supabase = await createOptimizedServerClient();
  const userId = await getUserIdOrNull(supabase);
  if (!userId) return [];

  // Solo obtener estadísticas de leads (estado_cliente = 'lead')
  const { data, error } = await supabase
    .schema('crm')
    .from('cliente')
    .select('origen_lead')
    .eq('estado_cliente', 'lead');

  if (error) {
    console.error('Error obteniendo estadísticas de leads:', error);
    return [];
  }

  // Agrupar y contar por origen
  const stats = (data ?? []).reduce((acc, row) => {
    const origen = row.origen_lead || 'no_especificado';
    acc[origen] = (acc[origen] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Convertir a array y ordenar por cantidad descendente
  return Object.entries(stats)
    .map(([origen, count]) => ({ origen, count }))
    .sort((a, b) => b.count - a.count);
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

  if (error) {
    console.error('Error en getCachedProyectos:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw error;
  }
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

  const { data: perfil } = await supabase
    .schema('crm')
    .from('usuario_perfil')
    .select('username, rol:rol!usuario_perfil_rol_id_fkey(nombre)')
    .eq('id', userId)
    .single();

  const rolData = perfil?.rol as any;
  const rolNombre = Array.isArray(rolData) ? rolData[0]?.nombre : rolData?.nombre;
  const esAdmin = rolNombre === 'ROL_ADMIN';
  const esGerente = rolNombre === 'ROL_GERENTE';
  const username = perfil?.username;

  // Total de clientes según permisos (usa la misma lógica que el dashboard de clientes)
  const { data: clienteMetrics, error: clienteMetricsError } = await supabase
    .schema('crm')
    .rpc('obtener_metricas_dashboard_clientes', {
      p_usuario_id: userId,
      p_es_admin: esAdmin,
      p_es_gerente: esGerente,
      p_username: username ?? null,
    })
    .single();

  let totalClientes = (clienteMetrics as any)?.total ?? 0;

  // Fallback: si la RPC falla, contar manualmente usando la vista accesible para vendedores
  if (clienteMetricsError) {
    console.error('Error obteniendo total de clientes vía RPC:', clienteMetricsError);

    const usarVistaAccesible = !esAdmin && !esGerente && username;
    const tablaClientes = usarVistaAccesible ? 'cliente_accesible' : 'cliente';

    // IMPORTANTE: .select() debe llamarse PRIMERO para que .or() esté disponible
    let clientesQuery = supabase.schema('crm').from(tablaClientes).select('id', { count: 'exact', head: true });

    if (usarVistaAccesible) {
      clientesQuery = clientesQuery.eq('usuario_id', userId);
    } else if (!esAdmin && !esGerente && username) {
      clientesQuery = clientesQuery.or(`created_by.eq.${userId},vendedor_username.eq.${username}`);
    }

    const { count, error } = await clientesQuery;
    if (error) {
      console.error('Error obteniendo total de clientes (fallback):', error);
    } else if (typeof count === 'number') {
      totalClientes = count;
    }
  }

  const [pRes, lRes] = await Promise.all([
    supabase.schema('crm').from("proyecto").select("*", { count: "exact", head: true }),
    supabase.schema('crm').from("lote").select("*", { count: "exact", head: true }),
  ]);

  return {
    totalClientes,
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

  if (error) {
    console.error('Error en getCachedNotificacionesNoLeidas:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw error;
  }
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
