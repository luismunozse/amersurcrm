import { createServerOnlyClient } from "@/lib/supabase.server";
import PropiedadesList from "./_PropiedadesList";
import NewPropiedadForm from "./_NewPropiedadForm";
import FiltrosPropiedades from "./_FiltrosPropiedades";
import EstadisticasPropiedades from "./_EstadisticasPropiedades";

const ITEMS_PER_PAGE = 20;

export default async function PropiedadesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string; estado?: string; proyecto?: string; page?: string }>;
}) {
  const supabase = await createServerOnlyClient();
  const params = await searchParams;

  // Extraer parámetros de búsqueda
  const busqueda = params.q || "";
  const tipoFiltro = params.tipo || "";
  const estadoFiltro = params.estado || "";
  const proyectoFiltro = params.proyecto || "";
  const page = parseInt(params.page || "1");
  
  // Query para propiedades con filtros
  let propiedadesQuery = supabase
    .from("propiedad")
    .select(`
      id,
      codigo,
      tipo,
      identificacion_interna,
      ubicacion,
      superficie,
      estado_comercial,
      precio,
      moneda,
      marketing,
      data,
      created_at,
      proyecto_id,
      proyecto:proyecto_id (
        id,
        nombre,
        ubicacion,
        estado
      )
    `, { count: 'exact' });

  // Aplicar filtros a propiedades
  if (busqueda) {
    propiedadesQuery = propiedadesQuery.or(`codigo.ilike.%${busqueda}%,identificacion_interna.ilike.%${busqueda}%`);
  }
  if (tipoFiltro) {
    propiedadesQuery = propiedadesQuery.eq('tipo', tipoFiltro);
  }
  if (estadoFiltro) {
    propiedadesQuery = propiedadesQuery.eq('estado_comercial', estadoFiltro);
  }
  if (proyectoFiltro) {
    if (proyectoFiltro === 'independientes') {
      propiedadesQuery = propiedadesQuery.is('proyecto_id', null);
    } else {
      propiedadesQuery = propiedadesQuery.eq('proyecto_id', proyectoFiltro);
    }
  }

  propiedadesQuery = propiedadesQuery.order("created_at", { ascending: false });

  const { data: propiedades, error: ePropiedades, count: propiedadesCount } = await propiedadesQuery;

  // Query para lotes con filtros
  let lotesQuery = supabase
    .from("lote")
    .select(`
      id,
      codigo,
      sup_m2,
      precio,
      moneda,
      estado,
      data,
      created_at,
      proyecto_id,
      proyecto:proyecto_id (
        id,
        nombre,
        ubicacion,
        estado
      )
    `, { count: 'exact' });

  // Aplicar filtros a lotes
  if (busqueda) {
    lotesQuery = lotesQuery.ilike('codigo', `%${busqueda}%`);
  }
  if (tipoFiltro && tipoFiltro !== 'lote') {
    // Si filtran por tipo que no es lote, no traer lotes
    lotesQuery = lotesQuery.eq('id', '00000000-0000-0000-0000-000000000000'); // ID imposible
  }
  if (estadoFiltro) {
    lotesQuery = lotesQuery.eq('estado', estadoFiltro);
  }
  if (proyectoFiltro && proyectoFiltro !== 'independientes') {
    lotesQuery = lotesQuery.eq('proyecto_id', proyectoFiltro);
  } else if (proyectoFiltro === 'independientes') {
    // Si filtran independientes, no traer lotes (que siempre tienen proyecto)
    lotesQuery = lotesQuery.eq('id', '00000000-0000-0000-0000-000000000000');
  }

  lotesQuery = lotesQuery.order("created_at", { ascending: false });

  const { data: lotes, error: eLotes, count: lotesCount } = await lotesQuery;

  if (eLotes) throw eLotes;

  if (ePropiedades) throw ePropiedades;

  // Obtener todos los proyectos para el selector
  const { data: proyectos, error: eProyectos } = await supabase
    .from("proyecto")
    .select("id,nombre,ubicacion,estado")
    .order("nombre", { ascending: true });

  if (eProyectos) throw eProyectos;

  // Combinar propiedades y lotes en un solo array
  type ProyectoRef = { id: any; nombre: any; ubicacion: any; estado: any };
  type PropiedadListItem = {
    id: string;
    codigo: string;
    tipo: string;
    identificacion_interna: string;
    ubicacion: { ciudad?: string; direccion?: string } | null;
    superficie: { total?: number; construida?: number } | null;
    estado_comercial: string;
    precio: number | null;
    moneda: string;
    marketing: { fotos?: string[]; renders?: string[]; links3D?: string[]; etiquetas?: string[] } | null;
    data: Record<string, unknown> | null;
    created_at: string;
    proyecto_id: string | null;
    proyecto: { id: string; nombre: string; ubicacion: string | null; estado: string } | null;
    es_lote?: boolean;
  };
  type LoteWithProyecto = {
    id: any;
    codigo: any;
    sup_m2: any;
    precio: any;
    moneda: any;
    estado: any;
    data: any;
    created_at: any;
    proyecto_id: any;
    proyecto: ProyectoRef | ProyectoRef[] | null;
  };
  const todasLasPropiedades: PropiedadListItem[] = [
    // Propiedades de la tabla propiedad
    ...(propiedades || []).map((propRaw) => {
      const prop: any = propRaw as any;
      const proyectoObj = Array.isArray(prop.proyecto) ? prop.proyecto[0] : prop.proyecto;
      return {
        id: String(prop.id),
        codigo: String(prop.codigo),
        tipo: String(prop.tipo),
        identificacion_interna: String(prop.identificacion_interna),
        ubicacion: (prop.ubicacion as any) ?? null,
        superficie: (prop.superficie as any) ?? null,
        estado_comercial: String(prop.estado_comercial),
        precio: prop.precio === null || prop.precio === undefined ? null : Number(prop.precio),
        moneda: String(prop.moneda),
        marketing: (prop.marketing as any) ?? null,
        data: (prop.data as any) ?? null,
        created_at: String(prop.created_at),
        proyecto_id: prop.proyecto_id ? String(prop.proyecto_id) : null,
        proyecto: proyectoObj
          ? {
              id: String(proyectoObj.id),
              nombre: String(proyectoObj.nombre),
              ubicacion: proyectoObj.ubicacion !== undefined && proyectoObj.ubicacion !== null ? String(proyectoObj.ubicacion) : null,
              estado: String(proyectoObj.estado),
            }
          : null,
        es_lote: false,
      } as PropiedadListItem;
    }),
    // Lotes de la tabla lote
    ...(lotes || []).map((loteRaw) => {
      const lote = loteRaw as LoteWithProyecto;
      const proyectoObj = Array.isArray(lote.proyecto) ? lote.proyecto[0] : lote.proyecto;
      return {
        id: String(lote.id),
        codigo: String(lote.codigo),
        tipo: "lote",
        identificacion_interna: String(lote.codigo),
        ubicacion: proyectoObj?.ubicacion ? { ciudad: String(proyectoObj.ubicacion) } : null,
        superficie: lote.sup_m2 !== null && lote.sup_m2 !== undefined ? { total: Number(lote.sup_m2) } : null,
        estado_comercial: String(lote.estado),
        precio: lote.precio === null || lote.precio === undefined ? null : Number(lote.precio),
        moneda: String(lote.moneda),
        marketing: { etiquetas: [] },
        data: (lote.data as any) ?? null,
        created_at: String(lote.created_at),
        proyecto_id: lote.proyecto_id ? String(lote.proyecto_id) : null,
        proyecto: proyectoObj
          ? {
              id: String(proyectoObj.id),
              nombre: String(proyectoObj.nombre),
              ubicacion: proyectoObj.ubicacion !== undefined && proyectoObj.ubicacion !== null ? String(proyectoObj.ubicacion) : null,
              estado: String(proyectoObj.estado),
            }
          : null,
        es_lote: true,
      } as PropiedadListItem;
    })
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Calcular paginación
  const totalItems = (propiedadesCount || 0) + (lotesCount || 0);
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const propiedadesPaginadas = todasLasPropiedades.slice(startIndex, endIndex);

  return (
    <div className="w-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-crm-text-primary">Propiedades</h1>
          <p className="text-crm-text-muted mt-1">
            Gestiona propiedades de proyectos y propiedades independientes
          </p>
        </div>
      </div>

      {/* Estadísticas */}
      <EstadisticasPropiedades propiedades={todasLasPropiedades} />

      {/* Filtros y búsqueda */}
      <FiltrosPropiedades proyectos={proyectos || []} />

      {/* Formulario de nueva propiedad */}
      <NewPropiedadForm proyectos={proyectos || []} />

      {/* Lista de propiedades */}
      <PropiedadesList propiedades={propiedadesPaginadas || []} />

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between crm-card p-4">
          <div className="text-sm text-crm-text-muted">
            Mostrando {startIndex + 1} - {Math.min(endIndex, totalItems)} de {totalItems} propiedades
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/dashboard/propiedades?${new URLSearchParams({
                ...(busqueda && { q: busqueda }),
                ...(tipoFiltro && { tipo: tipoFiltro }),
                ...(estadoFiltro && { estado: estadoFiltro }),
                ...(proyectoFiltro && { proyecto: proyectoFiltro }),
                page: Math.max(1, page - 1).toString()
              }).toString()}`}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                page <= 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none'
                  : 'bg-crm-primary text-white hover:bg-crm-primary-dark'
              }`}
            >
              Anterior
            </a>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNumber;
                if (totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (page <= 3) {
                  pageNumber = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i;
                } else {
                  pageNumber = page - 2 + i;
                }

                return (
                  <a
                    key={pageNumber}
                    href={`/dashboard/propiedades?${new URLSearchParams({
                      ...(busqueda && { q: busqueda }),
                      ...(tipoFiltro && { tipo: tipoFiltro }),
                      ...(estadoFiltro && { estado: estadoFiltro }),
                      ...(proyectoFiltro && { proyecto: proyectoFiltro }),
                      page: pageNumber.toString()
                    }).toString()}`}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      page === pageNumber
                        ? 'bg-crm-primary text-white'
                        : 'bg-gray-100 text-crm-text-primary hover:bg-gray-200'
                    }`}
                  >
                    {pageNumber}
                  </a>
                );
              })}
            </div>
            <a
              href={`/dashboard/propiedades?${new URLSearchParams({
                ...(busqueda && { q: busqueda }),
                ...(tipoFiltro && { tipo: tipoFiltro }),
                ...(estadoFiltro && { estado: estadoFiltro }),
                ...(proyectoFiltro && { proyecto: proyectoFiltro }),
                page: Math.min(totalPages, page + 1).toString()
              }).toString()}`}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                page >= totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none'
                  : 'bg-crm-primary text-white hover:bg-crm-primary-dark'
              }`}
            >
              Siguiente
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
