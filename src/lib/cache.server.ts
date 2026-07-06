import "server-only";
import { cache } from "react";
import { createOptimizedServerClient, getCachedUserId } from "./supabase.server";
import type {
  ClienteCached,
  ProyectoCached,
  LoteCached,
  DashboardStats,
  NotificacionNoLeida,
} from "@/types/crm";

// DEPRECATED: Usar getCachedUserId() directamente en su lugar
// Mantener por compatibilidad temporal
async function getUserIdOrNull(_s: Awaited<ReturnType<typeof createOptimizedServerClient>>) {
  return getCachedUserId();
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
  proyectoInteres?: string;  // Filtro por proyecto de interés (ID de proyecto o "__general__")
  fechaDesde?: string;  // Filtro fecha_alta desde (YYYY-MM-DD)
  fechaHasta?: string;  // Filtro fecha_alta hasta (YYYY-MM-DD)
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
      created_at,
      updated_at
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
    proyectoInteres = '',
    fechaDesde = '',
    fechaHasta = '',
    sortBy = 'updated_at',
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

  // Pre-filtro: obtener IDs de clientes por proyecto de interés (si aplica)
  let clienteIdsProyecto: string[] | null = null;
  if (proyectoInteres && proyectoInteres.trim() !== '') {
    let interesQuery = supabase.schema('crm')
      .from('cliente_propiedad_interes')
      .select('cliente_id');

    if (proyectoInteres === '__general__') {
      // Consulta general: sin proyecto_id, sin lote_id, sin propiedad_id
      interesQuery = interesQuery
        .is('proyecto_id', null)
        .is('lote_id', null)
        .is('propiedad_id', null);
    } else {
      // Proyecto específico: buscar por proyecto_id directo o por lote.proyecto_id
      interesQuery = interesQuery.eq('proyecto_id', proyectoInteres);
    }

    const { data: interesData } = await interesQuery;
    clienteIdsProyecto = [...new Set((interesData ?? []).map((r: any) => r.cliente_id as string))];

    // Si no hay clientes con ese interés, retornar vacío
    if (clienteIdsProyecto.length === 0) {
      return { data: [], total: 0 };
    }
  }

  // buildBaseQuery ahora recibe las columnas a seleccionar y opciones
  // IMPORTANTE: .select() debe llamarse PRIMERO para que .or() esté disponible
  const buildBaseQuery = (selectColumns: string, options?: { count?: 'exact' | 'planned' | 'estimated', head?: boolean }) => {
    // Crear query con .select() primero para obtener PostgrestFilterBuilder (que tiene .or())
    let query = supabase.schema('crm').from(tablaClientes).select(selectColumns, options);

    // Filtro por proyecto de interés (pre-computado)
    if (clienteIdsProyecto) {
      query = query.in('id', clienteIdsProyecto);
    }

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
        // Limpiar número: solo dígitos para búsqueda más flexible
        const cleanPhone = searchTelefono.replace(/[^\d]/g, '');
        // Buscar en ambos campos de teléfono
        query = query.or(`telefono.ilike.%${cleanPhone}%,telefono_whatsapp.ilike.%${cleanPhone}%`);
      }
      if (fechaDesde) {
        query = query.gte('fecha_alta', `${fechaDesde}T00:00:00`);
      }
      if (fechaHasta) {
        query = query.lte('fecha_alta', `${fechaHasta}T23:59:59`);
      }
      return query;
    }

    // Determinar qué filtros necesitamos
    const necesitaFiltroPermisos = !esAdmin && !esGerente && username && !vendedor;
    const necesitaFiltroVendedor = !!vendedor && vendedor.trim() !== '' && (esAdmin || esGerente);

    // 1. PRIMERO aplicar filtros de permisos (AND) - estos restringen el acceso
    if (necesitaFiltroPermisos) {
      // Vendedores solo ven clientes que crearon o que tienen asignados
      query = query.or(`created_by.eq.${userId},vendedor_username.eq.${username}`);
    }

    // 2. Filtro por vendedor específico (admins pueden filtrar por cualquier vendedor)
    if (necesitaFiltroVendedor && vendedor && vendedor.trim() !== '') {
      query = query.or(`vendedor_asignado.eq.${vendedor},vendedor_username.eq.${vendedor}`);
    }

    // 3. DESPUÉS aplicar filtros de búsqueda (AND con los permisos anteriores)
    // Construir condiciones de búsqueda
    const searchConditions: string[] = [];

    if (searchTerm && searchTerm.trim() !== '') {
      const term = searchTerm.trim();
      searchConditions.push(`nombre.ilike.%${term}%`);
      searchConditions.push(`email.ilike.%${term}%`);
      searchConditions.push(`codigo_cliente.ilike.%${term}%`);

      // Si parece un número de teléfono, buscar también en campos de teléfono
      const digitsOnly = term.replace(/[^\d]/g, '');
      if (digitsOnly.length >= 3) {
        searchConditions.push(`telefono.ilike.%${digitsOnly}%`);
        searchConditions.push(`telefono_whatsapp.ilike.%${digitsOnly}%`);
      }
    }

    if (searchTelefono && searchTelefono.trim() !== '') {
      // Limpiar número: solo dígitos para búsqueda más flexible
      const cleanPhone = searchTelefono.replace(/[^\d]/g, '');
      if (cleanPhone) {
        searchConditions.push(`telefono.ilike.%${cleanPhone}%`);
        searchConditions.push(`telefono_whatsapp.ilike.%${cleanPhone}%`);
      }
    }

    // Aplicar condiciones de búsqueda (OR entre ellas, AND con permisos)
    if (searchConditions.length > 0) {
      query = query.or(searchConditions.join(','));
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

    if (fechaDesde && fechaDesde.trim() !== '') {
      query = query.gte('fecha_alta', `${fechaDesde}T00:00:00`);
    }

    if (fechaHasta && fechaHasta.trim() !== '') {
      query = query.lte('fecha_alta', `${fechaHasta}T23:59:59`);
    }

    return query;
  };

  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  // OPTIMIZADO: Ejecutar data query y count query en paralelo (~100ms vs ~200ms secuencial)
  const dataQueryPromise = buildBaseQuery(selectedColumns)
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(start, end);

  const countQueryPromise = withTotal
    ? buildBaseQuery('id', { count: 'exact', head: true })
    : Promise.resolve({ count: null });

  const [dataResult, countResult] = await Promise.all([dataQueryPromise, countQueryPromise]);

  if (dataResult.error) {
    console.error('Error en getCachedClientes:', {
      message: dataResult.error.message,
      details: dataResult.error.details,
      hint: dataResult.error.hint,
      code: dataResult.error.code,
    });
    throw dataResult.error;
  }

  // Deduplicar resultados por ID (puede haber duplicados si hay múltiples condiciones OR)
  const dataArray = dataResult.data as any[];
  const uniqueData = dataArray ? Array.from(
    new Map(dataArray.map(item => [item.id, item])).values()
  ) : [];

  const total = countResult.count ?? uniqueData.length;

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

/* ========= Pipeline Kanban ========= */
export type PipelineCliente = {
  id: string;
  codigo_cliente: string;
  nombre: string;
  estado_cliente: string;
  vendedor_username: string | null;
  vendedor_asignado: string | null;
  capacidad_compra_estimada: number | null;
  ultimo_contacto: string | null;
  proxima_accion: string | null;
  fecha_proxima_accion: string | null;
  origen_lead: string | null;
  propiedades_reservadas: number;
  telefono: string | null;
  telefono_whatsapp: string | null;
};

interface GetPipelineParams {
  vendedor?: string;
  origen?: string;
}

export type PipelineResult = {
  clientes: PipelineCliente[];
  totalesPorEstado: Record<string, number>;
};

export const getCachedPipelineClientes = cache(
  async (params?: GetPipelineParams): Promise<PipelineResult> => {
    const supabase = await createOptimizedServerClient();
    const userId = await getUserIdOrNull(supabase);
    if (!userId) return { clientes: [], totalesPorEstado: {} };

    const { vendedor = '', origen = '' } = params || {};

    const { data: perfil } = await supabase
      .from('usuario_perfil')
      .select('username, rol:rol!usuario_perfil_rol_id_fkey(nombre)')
      .eq('id', userId)
      .single();

    const rolData = perfil?.rol as any;
    const rolNombre = Array.isArray(rolData) ? rolData[0]?.nombre : rolData?.nombre;
    const esAdmin = rolNombre === 'ROL_ADMIN';
    const esGerente = rolNombre === 'ROL_GERENTE';
    const esCoordinador = rolNombre === 'ROL_COORDINADOR_VENTAS';
    const puedeVerTodos = esAdmin || esGerente || esCoordinador;
    const username = perfil?.username;

    const ESTADOS_PIPELINE = [
      'por_contactar',
      'contactado',
      'intermedio',
      'potencial',
      'en_proceso',
      'desestimado',
      'transferido',
    ] as const;
    const PER_ESTADO_LIMIT = 300;

    const aplicarFiltros = (q: any) => {
      if (origen && origen.trim() !== '') {
        q = q.eq('origen_lead', origen);
      }
      if (!puedeVerTodos && username) {
        q = q.or(`created_by.eq.${userId},vendedor_username.eq.${username}`);
      } else if (puedeVerTodos && vendedor && vendedor.trim() !== '') {
        q = q.or(`vendedor_asignado.eq.${vendedor},vendedor_username.eq.${vendedor}`);
      }
      return q;
    };

    const perEstadoQueries = ESTADOS_PIPELINE.map((estado) =>
      aplicarFiltros(
        supabase
          .schema('crm')
          .from('cliente')
          .select(`
            id,
            codigo_cliente,
            nombre,
            estado_cliente,
            vendedor_username,
            vendedor_asignado,
            capacidad_compra_estimada,
            ultimo_contacto,
            proxima_accion,
            origen_lead,
            propiedades_reservadas,
            telefono,
            telefono_whatsapp,
            fecha_alta
          `)
          .eq('estado_cliente', estado)
          .order('fecha_alta', { ascending: false })
          .limit(PER_ESTADO_LIMIT),
      ),
    );

    const perEstadoCountQueries = ESTADOS_PIPELINE.map((estado) =>
      aplicarFiltros(
        supabase
          .schema('crm')
          .from('cliente')
          .select('id', { count: 'exact', head: true })
          .eq('estado_cliente', estado),
      ),
    );

    const [dataResults, countResults] = await Promise.all([
      Promise.all(perEstadoQueries),
      Promise.all(perEstadoCountQueries),
    ]);

    const totalesPorEstado: Record<string, number> = {};
    const merged: any[] = [];
    for (let i = 0; i < dataResults.length; i++) {
      const r = dataResults[i];
      const estadoKey = ESTADOS_PIPELINE[i];
      const countRes = countResults[i];
      totalesPorEstado[estadoKey] = countRes.count ?? 0;
      if (r.error) {
        console.error(`Error pipeline (${estadoKey}):`, r.error.message);
        continue;
      }
      if (r.data) merged.push(...(r.data as any[]));
    }

    const unique = Array.from(new Map(merged.map((c) => [c.id, c])).values()) as any[];
    if (unique.length === 0) return { clientes: [], totalesPorEstado };

    const ids = unique.map((c) => c.id);
    const { data: interacciones, error: interErr } = await supabase
      .schema('crm')
      .from('cliente_interaccion')
      .select('cliente_id, fecha_proxima_accion')
      .in('cliente_id', ids)
      .not('fecha_proxima_accion', 'is', null);

    const proximasPorCliente = new Map<string, string>();
    if (!interErr && interacciones) {
      for (const row of interacciones as { cliente_id: string; fecha_proxima_accion: string }[]) {
        const actual = proximasPorCliente.get(row.cliente_id);
        if (!actual || row.fecha_proxima_accion < actual) {
          proximasPorCliente.set(row.cliente_id, row.fecha_proxima_accion);
        }
      }
    }

    const clientes = unique.map((c) => ({
      ...c,
      fecha_proxima_accion: proximasPorCliente.get(c.id) ?? null,
    })) as PipelineCliente[];

    return { clientes, totalesPorEstado };
  }
);

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

/* ========= Proyectos paginados (server-side search + filters) ========= */
export interface GetProyectosParams {
  page?: number;
  pageSize?: number;
  q?: string;
  estado?: string;
  tipo?: string;
  sort?: string;
}

export type ProyectosPaginadosResult = {
  data: ProyectoCached[];
  total: number;
  page: number;
  pageSize: number;
};

const PROYECTOS_SORT_FIELDS: Record<string, string> = {
  nombre: 'nombre',
  ubicacion: 'ubicacion',
  created_at: 'created_at',
  estado: 'estado',
};

const PROYECTOS_MAX_PAGE_SIZE = 50;
const PROYECTOS_DEFAULT_PAGE_SIZE = 12;

export const getCachedProyectosPaginados = cache(async (
  params: GetProyectosParams = {}
): Promise<ProyectosPaginadosResult> => {
  const supabase = await createOptimizedServerClient();
  const userId = await getUserIdOrNull(supabase);

  const rawPage = Number(params.page);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;

  const rawPageSize = Number(params.pageSize);
  const pageSize = Number.isFinite(rawPageSize) && rawPageSize > 0
    ? Math.min(Math.floor(rawPageSize), PROYECTOS_MAX_PAGE_SIZE)
    : PROYECTOS_DEFAULT_PAGE_SIZE;

  if (!userId) {
    return { data: [], total: 0, page, pageSize };
  }

  const q = (params.q ?? '').trim();
  const estado = (params.estado ?? '').trim();
  const tipo = (params.tipo ?? '').trim();

  // Parsear sort: formato "campo-asc" o "campo-desc"
  const sortParam = (params.sort ?? 'nombre-asc').trim();
  const [sortFieldRaw, sortOrderRaw] = sortParam.split('-');
  const sortField = PROYECTOS_SORT_FIELDS[sortFieldRaw] ?? 'nombre';
  const sortAscending = sortOrderRaw !== 'desc';

  const SELECT_COLS = "id,nombre,estado,tipo,ubicacion,latitud,longitud,descripcion,imagen_url,logo_url,galeria_imagenes,planos_url,created_at";

  const buildBaseQuery = (selectExpr: string, options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) => {
    let query = supabase.schema('crm').from('proyecto').select(selectExpr, options);

    if (q) {
      // Escape % y , para evitar romper sintaxis de .or()
      const safe = q.replace(/[%,]/g, ' ');
      query = query.or(`nombre.ilike.%${safe}%,ubicacion.ilike.%${safe}%`);
    }

    if (estado) {
      query = query.eq('estado', estado);
    }

    if (tipo) {
      query = query.eq('tipo', tipo);
    }

    return query;
  };

  const offset = (page - 1) * pageSize;

  const dataQuery = buildBaseQuery(SELECT_COLS)
    .order(sortField, { ascending: sortAscending })
    .range(offset, offset + pageSize - 1);

  const countQuery = buildBaseQuery('id', { count: 'exact', head: true });

  const [dataResult, countResult] = await Promise.all([dataQuery, countQuery]);

  if (dataResult.error) {
    console.error('Error en getCachedProyectosPaginados:', {
      message: dataResult.error.message,
      details: dataResult.error.details,
      hint: dataResult.error.hint,
      code: dataResult.error.code,
    });
    throw dataResult.error;
  }

  return {
    data: ((dataResult.data ?? []) as unknown) as ProyectoCached[],
    total: countResult.count ?? 0,
    page,
    pageSize,
  };
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
// NOTE (dashboard-rol, ADR-2): design.md conditionally proposed adding the
// coordinador global-scope fix here too ("if consumed by the command
// center"). Grep-verified at apply time: this fetcher has ZERO consumers
// anywhere in src/ after PR1a deleted its only callers (LazyDashboardStats,
// DashboardVentasChart, DashboardLotesDonut). The command center's inventory
// block uses the NEW `getInventarioLotesPorProyecto` (ADR-4) instead — see
// design.md §2's data-sourcing table. The condition resolves false, so the
// coordinador fix was intentionally NOT applied here; re-verify before
// reusing this fetcher for anything else.
export const getCachedDashboardStats = cache(async (): Promise<DashboardStats> => {
  const supabase = await createOptimizedServerClient();
  const userId = await getUserIdOrNull(supabase);
  if (!userId) return {
    totalClientes: 0, totalProyectos: 0, totalLotes: 0,
    lotesVendidos: 0, lotesReservados: 0, lotesDisponibles: 0,
    ventasMesActual: 0, ventasMesAnterior: 0,
    clientesNuevosMes: 0, clientesNuevosMesAnterior: 0,
  };

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

  // Fechas para tendencias
  const ahora = new Date();
  const inicioMesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();
  const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1).toISOString();
  const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59).toISOString();

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

  const [pRes, lRes, lotesEstados, ventasMesActualRes, ventasMesAnteriorRes, clientesNuevosMesRes, clientesNuevosMesAnteriorRes] = await Promise.all([
    supabase.schema('crm').from("proyecto").select("*", { count: "exact", head: true }),
    supabase.schema('crm').from("lote").select("*", { count: "exact", head: true }),
    // Lotes por estado (global)
    supabase.schema('crm').from("lote").select("estado"),
    // Ventas mes actual
    supabase.schema('crm').from("venta").select("id", { count: "exact", head: true })
      .eq("estado", "finalizada")
      .gte("fecha_venta", inicioMesActual),
    // Ventas mes anterior
    supabase.schema('crm').from("venta").select("id", { count: "exact", head: true })
      .eq("estado", "finalizada")
      .gte("fecha_venta", inicioMesAnterior)
      .lte("fecha_venta", finMesAnterior),
    // Clientes nuevos mes actual
    supabase.schema('crm').from("cliente").select("id", { count: "exact", head: true })
      .gte("created_at", inicioMesActual),
    // Clientes nuevos mes anterior
    supabase.schema('crm').from("cliente").select("id", { count: "exact", head: true })
      .gte("created_at", inicioMesAnterior)
      .lte("created_at", finMesAnterior),
  ]);

  const lotes = (lotesEstados.data ?? []) as { estado: string }[];
  const lotesVendidos = lotes.filter(l => l.estado === 'vendido').length;
  const lotesReservados = lotes.filter(l => l.estado === 'reservado').length;
  const lotesDisponibles = lotes.filter(l => l.estado === 'disponible').length;

  return {
    totalClientes,
    totalProyectos: pRes.count ?? 0,
    totalLotes: lRes.count ?? 0,
    lotesVendidos,
    lotesReservados,
    lotesDisponibles,
    ventasMesActual: ventasMesActualRes.count ?? 0,
    ventasMesAnterior: ventasMesAnteriorRes.count ?? 0,
    clientesNuevosMes: clientesNuevosMesRes.count ?? 0,
    clientesNuevosMesAnterior: clientesNuevosMesAnteriorRes.count ?? 0,
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

/* ========= Ventas mensuales (últimos 6 meses) ========= */
export const getCachedVentasMensuales = cache(async (): Promise<Record<string, number>> => {
  const supabase = await createOptimizedServerClient();
  const userId = await getUserIdOrNull(supabase);
  if (!userId) return {};

  const ahora = new Date();
  const hace6Meses = new Date(ahora.getFullYear(), ahora.getMonth() - 5, 1).toISOString();

  const { data, error } = await supabase
    .schema('crm')
    .from('venta')
    .select('fecha_venta')
    .eq('estado', 'finalizada')
    .gte('fecha_venta', hace6Meses)
    .order('fecha_venta', { ascending: true });

  if (error) {
    console.error('Error obteniendo ventas mensuales:', error);
    return {};
  }

  // Inicializar los 6 meses con 0
  const resultado: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    resultado[key] = 0;
  }

  // Agrupar ventas por mes
  for (const venta of (data ?? []) as { fecha_venta: string }[]) {
    const fecha = new Date(venta.fecha_venta);
    const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    if (key in resultado) {
      resultado[key] += 1;
    }
  }

  return resultado;
});

/* ========= Funnel de clientes por estado ========= */
export const getCachedFunnelClientes = cache(async (): Promise<Record<string, number>> => {
  const supabase = await createOptimizedServerClient();
  const userId = await getUserIdOrNull(supabase);
  if (!userId) return {};

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
  // ADR-2 (dashboard-rol): ROL_COORDINADOR_VENTAS has global visibility per
  // crm.es_visibilidad_global() — getCachedPipelineClientes and
  // sidebar-badges already treat coordinador as global. This fetcher backs
  // the command-center funnel block, so it must match.
  const esCoordinador = rolNombre === 'ROL_COORDINADOR_VENTAS';
  const username = perfil?.username;

  let query = supabase.schema('crm').from('cliente').select('estado_cliente');

  // Vendedores solo ven sus clientes
  if (!esAdmin && !esGerente && !esCoordinador && username) {
    query = query.or(`created_by.eq.${userId},vendedor_username.eq.${username}`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error obteniendo funnel de clientes:', error);
    return {};
  }

  const funnel: Record<string, number> = {
    por_contactar: 0,
    contactado: 0,
    intermedio: 0,
    potencial: 0,
    desestimado: 0,
    transferido: 0,
  };

  for (const cliente of (data ?? []) as { estado_cliente: string }[]) {
    const estado = cliente.estado_cliente || 'por_contactar';
    if (estado in funnel) {
      funnel[estado] += 1;
    }
  }

  return funnel;
});

/* ========= Seguimientos del día ========= */
export type SeguimientoHoy = {
  id: string;
  nombre: string;
  estado_cliente: string;
  ultimo_contacto: string | null;
  proxima_accion: string | null;
  fecha_proxima_accion: string | null;
  telefono: string | null;
};

export const getCachedSeguimientosHoy = cache(async (): Promise<SeguimientoHoy[]> => {
  const supabase = await createOptimizedServerClient();
  const userId = await getUserIdOrNull(supabase);
  if (!userId) return [];

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

  const hoyFin = new Date();
  hoyFin.setHours(23, 59, 59, 999);
  const hace7Dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const SEGUIMIENTOS_DISPLAY_LIMIT = 8;
  // The global (no ownership prefilter) branch has no natural bound on how
  // many clientes it could match, and every past-due `cliente_interaccion`
  // row keeps matching forever (inserts-only, never cleaned up) — so a
  // handful of neglected clientes can otherwise fill the whole raw window
  // before the per-client dedup below even runs. 200 is a generous multiple
  // of the display cap; the FINAL size is still enforced after dedup, not by
  // this raw cap.
  const INTERACCION_RAW_LIMIT_GLOBAL = 200;
  const INTERACCION_RAW_LIMIT_SCOPED = 20;

  // Vencidas/para hoy: fuente de verdad = cliente_interaccion.fecha_proxima_accion
  // (TIMESTAMPTZ). `cliente.proxima_accion` es solo la etiqueta de texto del
  // enum (llamar/reunion/...), nunca una fecha — ver ADR-7 en design.md. Sin
  // este fix, `.lte('proxima_accion', isoString)` comparaba texto contra una
  // fecha y esta rama siempre devolvía vacío.
  //
  // Ownership scope: for non-privileged callers this MUST be the CLIENTE's
  // own ownership (created_by/vendedor_username), never
  // cliente_interaccion.vendedor_username — historical interacciones are
  // never reassigned when a cliente changes owner, so filtering by the
  // interaccion row's own vendedor_username both (a) keeps surfacing
  // reassigned clientes to their former vendedor forever, and (b) hides
  // follow-ups a covering coordinador logged from the client's true current
  // owner. Mirrors the two-step + Map merge pattern already used by
  // getCachedPipelineClientes and sidebar-badges: (1) resolve the caller's
  // own cliente ids, (2) filter interacciones by `.in('cliente_id', ownIds)`.
  let ownClienteIds: string[] | null = null;
  if (!esAdmin && !esGerente && username) {
    const { data: ownClientes, error: errorOwnClientes } = await supabase
      .schema('crm')
      .from('cliente')
      .select('id')
      .or(`created_by.eq.${userId},vendedor_username.eq.${username}`);

    if (errorOwnClientes) {
      console.error('Error obteniendo clientes propios (seguimientos):', errorOwnClientes);
    }
    ownClienteIds = (ownClientes ?? []).map((c: { id: string }) => c.id);
  }

  const proximaPorCliente = new Map<string, string>();

  // Mirrors getCachedPipelineClientes's `if (unique.length === 0) return ...`
  // guard: never issue `.in('cliente_id', [])` — a caller who owns no
  // clientes has nothing due, full stop.
  if (ownClienteIds === null || ownClienteIds.length > 0) {
    let interaccionQuery = supabase
      .schema('crm')
      .from('cliente_interaccion')
      .select('cliente_id, fecha_proxima_accion')
      .not('fecha_proxima_accion', 'is', null)
      .lte('fecha_proxima_accion', hoyFin.toISOString())
      .order('fecha_proxima_accion', { ascending: true });

    interaccionQuery = ownClienteIds !== null
      ? interaccionQuery.in('cliente_id', ownClienteIds).limit(INTERACCION_RAW_LIMIT_SCOPED)
      : interaccionQuery.limit(INTERACCION_RAW_LIMIT_GLOBAL);

    const { data: interacciones, error: errorInteracciones } = await interaccionQuery;

    if (errorInteracciones) {
      console.error('Error obteniendo interacciones vencidas:', errorInteracciones);
    }

    // Newest-wins per client: several past interacciones can each carry
    // their own (by-now past-due) fecha_proxima_accion, but only the most
    // recently scheduled one is still the client's live next action — older
    // ones were superseded by the interaction that followed them. This also
    // keeps one repeat-heavy client from silently pinning a stale date.
    for (const row of (interacciones ?? []) as { cliente_id: string; fecha_proxima_accion: string }[]) {
      const actual = proximaPorCliente.get(row.cliente_id);
      if (!actual || row.fecha_proxima_accion > actual) {
        proximaPorCliente.set(row.cliente_id, row.fecha_proxima_accion);
      }
    }
  }

  let resultados: SeguimientoHoy[] = [];
  if (proximaPorCliente.size > 0) {
    const { data: clientesConAccion, error: errorClientes } = await supabase
      .schema('crm')
      .from('cliente')
      .select('id, nombre, estado_cliente, ultimo_contacto, proxima_accion, telefono')
      .in('id', Array.from(proximaPorCliente.keys()))
      .not('estado_cliente', 'in', '("desestimado","transferido")');

    if (errorClientes) {
      console.error('Error obteniendo clientes con acción vencida:', errorClientes);
    }

    resultados = ((clientesConAccion ?? []) as Array<Omit<SeguimientoHoy, 'fecha_proxima_accion'>>)
      .map((c) => ({ ...c, fecha_proxima_accion: proximaPorCliente.get(c.id) ?? null }))
      .sort((a, b) => (a.fecha_proxima_accion ?? '').localeCompare(b.fecha_proxima_accion ?? ''))
      .slice(0, SEGUIMIENTOS_DISPLAY_LIMIT);
  }

  // Si hay pocos con acción vencida, completar con clientes sin contacto reciente
  if (resultados.length < 5) {
    const idsExistentes = new Set(resultados.map(r => r.id));
    let queryFuera = supabase.schema('crm')
      .from('cliente')
      .select('id, nombre, estado_cliente, ultimo_contacto, proxima_accion, telefono')
      .not('estado_cliente', 'in', '("desestimado","transferido")')
      .or(`ultimo_contacto.is.null,ultimo_contacto.lt.${hace7Dias}`)
      .order('ultimo_contacto', { ascending: true, nullsFirst: true })
      .limit(SEGUIMIENTOS_DISPLAY_LIMIT - resultados.length);

    if (!esAdmin && !esGerente && username) {
      queryFuera = queryFuera.or(`created_by.eq.${userId},vendedor_username.eq.${username}`);
    }

    const { data: sinContacto } = await queryFuera;
    for (const c of (sinContacto ?? []) as Array<Omit<SeguimientoHoy, 'fecha_proxima_accion'>>) {
      if (!idsExistentes.has(c.id)) {
        resultados.push({ ...c, fecha_proxima_accion: null });
      }
    }
  }

  return resultados.slice(0, SEGUIMIENTOS_DISPLAY_LIMIT);
});

export function invalidateCache() {
  // Usar revalidatePath/revalidateTag desde Server Actions
}
