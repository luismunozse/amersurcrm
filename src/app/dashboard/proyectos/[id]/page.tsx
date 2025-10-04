import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerOnlyClient } from "@/lib/supabase.server";
import NewLoteForm from "./_NewLoteForm";
import LotesList from "./_LotesList";
import MapeoLotes from "./_MapeoLotes";
import DeleteProjectButton from "./_DeleteProjectButton";
import GoogleMapsDebug from "@/components/GoogleMapsDebug";

// Tipos para Next 15: params/searchParams como Promises
type ParamsP = Promise<{ id: string }>;
type SPP = Promise<{ q?: string | string[]; page?: string | string[]; estado?: string | string[] }>;

export default async function ProyLotesPage({
  params,
  searchParams,
}: {
  params: ParamsP;
  searchParams: SPP;
}) {
  // ✅ Desestructurar con await (Next 15)
  const { id } = await params;
  const sp = await searchParams;

  const qRaw = sp.q;
  const pageRaw = sp.page;
  const estadoRaw = sp.estado;

  const q = (Array.isArray(qRaw) ? qRaw[0] : qRaw ?? "").trim();
  const estado = (Array.isArray(estadoRaw) ? estadoRaw[0] : estadoRaw ?? "").trim();
  const page = Math.max(
    1,
    parseInt(Array.isArray(pageRaw) ? pageRaw[0] : pageRaw || "1", 10) || 1
  );

  const perPage = 10;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const supabase = await createServerOnlyClient();

  // Proyecto (para título/404)
  const proyectoSelectBase = "id,nombre,estado,ubicacion,descripcion,imagen_url,planos_url,overlay_bounds,overlay_rotation,created_at";
  const { data: proyectoWithPolygon, error: eProyectoWithPolygon } = await supabase
    .from("proyecto")
    .select(`${proyectoSelectBase},poligono`)
    .eq("id", id)
    .maybeSingle();

  let proyecto = proyectoWithPolygon;
  let eProyecto = eProyectoWithPolygon;

  if (eProyectoWithPolygon?.code === "42703") {
    const fallback = await supabase
      .from("proyecto")
      .select(proyectoSelectBase)
      .eq("id", id)
      .maybeSingle();
    proyecto = fallback.data as typeof proyecto;
    eProyecto = fallback.error;
  }

  if (eProyecto) throw eProyecto;
  if (!proyecto) return notFound();

  // Obtener todos los proyectos para el selector
  const { data: todosLosProyectos, error: eProyectos } = await supabase
    .from("proyecto")
    .select("id,nombre,ubicacion,estado")
    .order("nombre", { ascending: true });

  if (eProyectos) throw eProyectos;

  // Lotes: lista (con filtros) + paginación
  let listQuery = supabase
    .from("lote")
    .select("*")
    .eq("proyecto_id", id)
    .order("codigo", { ascending: true })
    .range(from, to);

  if (q) listQuery = listQuery.ilike("codigo", `%${q}%`);
  if (estado && estado !== "all") listQuery = listQuery.eq("estado", estado as unknown);

  const { data: lotes, error: eLotes } = await listQuery;
  if (eLotes) throw eLotes;




  // Agregar información del proyecto a cada lote
  const lotesConProyecto = lotes?.map(lote => {
    // Buscar el proyecto real al que pertenece el lote
    const proyectoReal = todosLosProyectos?.find(p => p.id === lote.proyecto_id);
    return {
      ...lote,
      proyecto: {
        id: lote.proyecto_id,
        nombre: proyectoReal?.nombre || "Proyecto no encontrado"
      }
    };
  }) || [];


  // Conteo total (mismos filtros)
  let countQuery = supabase
    .from("lote")
    .select("*", { count: "exact", head: true })
    .eq("proyecto_id", id);

  if (q) countQuery = countQuery.ilike("codigo", `%${q}%`);
  if (estado && estado !== "all") countQuery = countQuery.eq("estado", estado as unknown);

  const { count, error: eCount } = await countQuery;
  if (eCount) throw eCount;

  const total = count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / perPage));

  const isLatLngTupleArray = (value: unknown): value is [number, number][] =>
    Array.isArray(value) &&
    value.every(
      (pair) =>
        Array.isArray(pair) &&
        pair.length === 2 &&
        typeof pair[0] === 'number' &&
        typeof pair[1] === 'number'
    );

  const isLatLngObjectArray = (value: unknown): value is { lat: number; lng: number }[] =>
    Array.isArray(value) &&
    value.every(
      (point) =>
        typeof point === 'object' &&
        point !== null &&
        typeof (point as { lat?: unknown }).lat === 'number' &&
        typeof (point as { lng?: unknown }).lng === 'number'
    );

  const proyectoPolygon = isLatLngObjectArray((proyecto as { poligono?: unknown } | null)?.poligono)
    ? (proyecto as { poligono: { lat: number; lng: number }[] }).poligono
    : undefined;

  const toLatLngTuple = (value: unknown): [number, number] | undefined => {
    if (Array.isArray(value) && value.length === 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
      return [value[0], value[1]];
    }
    if (value && typeof value === 'object') {
      const candidate = value as { lat?: unknown; lng?: unknown };
      if (typeof candidate.lat === 'number' && typeof candidate.lng === 'number') {
        return [candidate.lat, candidate.lng];
      }
    }
    return undefined;
  };

  const parseOverlayBounds = (value: unknown): [[number, number], [number, number]] | undefined => {
    let candidate: unknown = value;
    if (typeof candidate === 'string') {
      try {
        candidate = JSON.parse(candidate);
      } catch {
        return undefined;
      }
    }

    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      const obj = candidate as Record<string, unknown>;
      if ('bounds' in obj) {
        candidate = obj.bounds;
      } else if ('sw' in obj && 'ne' in obj) {
        candidate = [obj.sw, obj.ne];
      } else if ('southWest' in obj && 'northEast' in obj) {
        candidate = [obj.southWest, obj.northEast];
      } else if ('0' in obj && '1' in obj) {
        candidate = [obj['0'], obj['1']];
      }
    }

    if (!Array.isArray(candidate) || candidate.length !== 2) return undefined;
    const sw = toLatLngTuple(candidate[0]);
    const ne = toLatLngTuple(candidate[1]);
    if (!sw || !ne) return undefined;
    return [sw, ne];
  };

  const overlayBoundsValue = parseOverlayBounds((proyecto as { overlay_bounds?: unknown } | null)?.overlay_bounds);

  const overlayRotationRaw = (proyecto as { overlay_rotation?: unknown } | null)?.overlay_rotation;
  const overlayRotationValue = typeof overlayRotationRaw === 'number'
    ? overlayRotationRaw
    : typeof overlayRotationRaw === 'string'
      ? Number(overlayRotationRaw)
      : undefined;

  const lotesForMapeo = (lotesConProyecto || []).map((lote) => {
    const planoPoligonoRaw = (lote as { plano_poligono?: unknown }).plano_poligono;
    const planoPoligono = isLatLngTupleArray(planoPoligonoRaw) ? planoPoligonoRaw : undefined;

    let ubicacion: { lat: number; lng: number } | null = null;
    if (planoPoligono && planoPoligono.length > 0) {
      const [sumLat, sumLng] = planoPoligono.reduce(
        (acc, pair) => [acc[0] + pair[0], acc[1] + pair[1]],
        [0, 0]
      );
      ubicacion = {
        lat: sumLat / planoPoligono.length,
        lng: sumLng / planoPoligono.length,
      };
    }

    return {
      id: lote.id,
      codigo: lote.codigo,
      estado: lote.estado,
      data: lote.data,
      plano_poligono: planoPoligono,
      ubicacion,
    };
  });

  // Helper de URLs
  const makeHref = (p: number) => {
    const usp = new URLSearchParams();
    if (q) usp.set("q", q);
    if (estado && estado !== "all") usp.set("estado", estado);
    if (p > 1) usp.set("page", String(p));
    const qs = usp.toString();
    return qs ? `/dashboard/proyectos/${proyecto.id}?${qs}` : `/dashboard/proyectos/${proyecto.id}`;
  };

  return (
    <div className="w-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/proyectos" 
            className="flex items-center gap-2 px-4 py-2 text-crm-text-secondary bg-crm-card-hover hover:bg-crm-border rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            Volver
          </Link>
          <div>
            <h1 className="text-3xl font-display font-bold text-crm-text-primary">Proyecto: {proyecto.nombre}</h1>
            <p className="text-crm-text-muted mt-1">
              {proyecto.ubicacion && `${proyecto.ubicacion} • `}
              Estado: <span className={`font-medium ${
                proyecto.estado === 'activo' ? 'text-crm-success' :
                proyecto.estado === 'pausado' ? 'text-crm-warning' :
                'text-crm-danger'
              }`}>{proyecto.estado}</span>
            </p>
          </div>
        </div>
        
        {/* Botón de eliminar proyecto */}
        <DeleteProjectButton 
          proyectoId={proyecto.id}
          proyectoNombre={proyecto.nombre}
          lotesCount={lotesConProyecto?.length || 0}
        />
      </div>

      {/* Filtros */}
      <div className="crm-card p-6">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-8 h-8 bg-crm-info/10 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-crm-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-crm-text-primary">Filtros de Búsqueda</h3>
        </div>
        
        <form action={`/dashboard/proyectos/${proyecto.id}`} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div className="sm:col-span-2 space-y-2">
            <label className="block text-sm font-medium text-crm-text-primary">Buscar por código</label>
            <input 
              name="q" 
              defaultValue={q} 
              className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary" 
              placeholder="Ej: MzA-01" 
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-crm-text-primary">Estado</label>
            <select 
              name="estado" 
              defaultValue={estado || "all"} 
              className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
            >
              <option value="all">Todos los estados</option>
              <option value="disponible">Disponible</option>
              <option value="reservado">Reservado</option>
              <option value="vendido">Vendido</option>
            </select>
          </div>
          <button className="crm-button-primary px-4 py-2 rounded-lg text-sm font-medium">
            Filtrar
          </button>
        </form>
      </div>

      {/* Mapeo de Lotes */}
      <MapeoLotes 
        proyectoId={proyecto.id}
        planosUrl={proyecto.planos_url}
        proyectoNombre={proyecto.nombre}
        initialBounds={overlayBoundsValue}
        initialRotation={overlayRotationValue}
        lotes={lotesForMapeo}
        ubigeo={undefined}
        initialPolygon={proyectoPolygon}
      />

      <NewLoteForm 
        proyectoId={proyecto.id} 
        proyectos={todosLosProyectos || []} 
      />

      <LotesList proyectoId={proyecto.id} lotes={lotesConProyecto} />

      {/* Paginación */}
      <div className="crm-card p-4">
        <div className="flex items-center justify-between">
          <Link
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              page <= 1 
                ? "pointer-events-none opacity-50 bg-crm-card-hover text-crm-text-muted border-crm-border" 
                : "bg-crm-card text-crm-text-primary border-crm-border hover:bg-crm-card-hover"
            }`}
            href={makeHref(page - 1)}
          >
            ← Anterior
          </Link>
          <div className="text-sm text-crm-text-muted">
            Página {page} de {lastPage} · {total} lotes
          </div>
          <Link
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              page >= lastPage 
                ? "pointer-events-none opacity-50 bg-crm-card-hover text-crm-text-muted border-crm-border" 
                : "bg-crm-card text-crm-text-primary border-crm-border hover:bg-crm-card-hover"
            }`}
            href={makeHref(page + 1)}
          >
            Siguiente →
          </Link>
        </div>
      </div>
      
      {/* Debug component */}
      <GoogleMapsDebug />
    </div>
  );
}
