import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { esAdmin } from "@/lib/auth/roles";
import NewLoteForm from "./_NewLoteForm";
import LotesList from "./_LotesList";
import MapeoLotesMejorado from "./_MapeoLotesMejorado";
import MapeoLotesVisualizacion from "./_MapeoLotesVisualizacion";
import DeleteProjectButton from "./_DeleteProjectButton";
import { PaginationClient } from "./_PaginationClient";
import ProjectTabs from "./_ProjectTabs";
import ProyectoGaleria from "./_ProyectoGaleria";
import type { ProyectoMediaItem } from "@/types/proyectos";
import type { OverlayLayerConfig } from "@/types/overlay-layers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Tipos para Next 15: params/searchParams como Promises
type ParamsP = Promise<{ id: string }>;
type SPP = Promise<{ q?: string | string[]; page?: string | string[]; estado?: string | string[] }>;

const parseGaleria = (value: unknown): ProyectoMediaItem[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ProyectoMediaItem =>
      !!item &&
      typeof item === "object" &&
      typeof (item as ProyectoMediaItem).url === "string",
  );
};

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

  // Obtener usuario y perfil para verificar rol
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const isAdmin = user ? await esAdmin() : false;

  // Proyecto (para título/404)
  const proyectoSelectBase = "id,nombre,estado,ubicacion,latitud,longitud,descripcion,imagen_url,logo_url,galeria_imagenes,planos_url,overlay_bounds,overlay_rotation,overlay_opacity,overlay_layers,created_at,tipo";
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

  // Lotes para mapeo (todos)
  const { data: lotesParaMapeo, error: eLotesMap } = await supabase
    .from("lote")
    .select("id,codigo,estado,data,plano_poligono")
    .eq("proyecto_id", id)
    .order("codigo", { ascending: true });
  if (eLotesMap) throw eLotesMap;

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

  const parseOverlayBounds = (value: unknown): [[number, number], [number, number]] | [[number, number], [number, number], [number, number], [number, number]] | undefined => {
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
      } else if ('0' in obj && '1' in obj && '2' in obj && '3' in obj) {
        // Formato de 4 puntos (nuevo)
        candidate = [obj['0'], obj['1'], obj['2'], obj['3']];
      } else if ('0' in obj && '1' in obj) {
        // Formato de 2 puntos (antiguo)
        candidate = [obj['0'], obj['1']];
      }
    }

    // Aceptar arrays de 2 puntos (formato antiguo) o 4 puntos (formato nuevo)
    if (!Array.isArray(candidate)) return undefined;

    if (candidate.length === 4) {
      // Formato nuevo: 4 esquinas independientes [NW, NE, SE, SW]
      const nw = toLatLngTuple(candidate[0]);
      const ne = toLatLngTuple(candidate[1]);
      const se = toLatLngTuple(candidate[2]);
      const sw = toLatLngTuple(candidate[3]);
      if (!nw || !ne || !se || !sw) return undefined;
      return [nw, ne, se, sw];
    } else if (candidate.length === 2) {
      // Formato antiguo: 2 esquinas opuestas [SW, NE]
      const sw = toLatLngTuple(candidate[0]);
      const ne = toLatLngTuple(candidate[1]);
      if (!sw || !ne) return undefined;
      return [sw, ne];
    }

    return undefined;
  };

  const overlayBoundsValue = parseOverlayBounds((proyecto as { overlay_bounds?: unknown } | null)?.overlay_bounds);

  // Normalizar bounds al formato de 2 puntos [[lat, lng], [lat, lng]]
  const normalizeBoundsTo2Points = (
    bounds: unknown
  ): [[number, number], [number, number]] | null | undefined => {
    if (!bounds) return bounds as null | undefined;
    if (!Array.isArray(bounds)) return undefined;

    // Si ya tiene 2 puntos, retornar tal cual
    if (bounds.length === 2) {
      return bounds as [[number, number], [number, number]];
    }

    // Si tiene 4 puntos, extraer SW (punto 0) y NE (punto 2)
    if (bounds.length === 4) {
      return [bounds[0], bounds[2]] as [[number, number], [number, number]];
    }

    return undefined;
  };

  const overlayRotationRaw = (proyecto as { overlay_rotation?: unknown } | null)?.overlay_rotation;
  const overlayRotationValue = typeof overlayRotationRaw === 'number'
    ? overlayRotationRaw
    : typeof overlayRotationRaw === 'string'
      ? Number(overlayRotationRaw)
      : undefined;

  const overlayOpacityRaw = (proyecto as { overlay_opacity?: unknown } | null)?.overlay_opacity;
  const overlayOpacityValue = typeof overlayOpacityRaw === 'number'
    ? overlayOpacityRaw
    : typeof overlayOpacityRaw === 'string'
      ? Number(overlayOpacityRaw)
      : null;

  const parseOverlayLayers = (value: unknown): OverlayLayerConfig[] | undefined => {
    if (!Array.isArray(value)) return undefined;
    const parsed = value
      .map((item, index) => {
        if (!item || typeof item !== 'object') return null;
        const candidate = item as Record<string, unknown>;
        const url = typeof candidate.url === 'string' ? candidate.url : null;
        if (!url) return null;
        const boundsValue = 'bounds' in candidate ? candidate.bounds : undefined;
        const bounds = parseOverlayBounds(boundsValue);
        return {
          id: typeof candidate.id === 'string' ? candidate.id : `layer-${index}`,
          name: typeof candidate.name === 'string' ? candidate.name : `Capa ${index + 1}`,
          url,
          bounds,
          opacity: typeof candidate.opacity === 'number' ? candidate.opacity : null,
          visible: typeof candidate.visible === 'boolean' ? candidate.visible : true,
          isPrimary: typeof candidate.isPrimary === 'boolean' ? candidate.isPrimary : index === 0,
          order: typeof candidate.order === 'number' ? candidate.order : index,
        } as OverlayLayerConfig;
      })
      .filter((layer): layer is OverlayLayerConfig => Boolean(layer));
    return parsed.length ? parsed : undefined;
  };

  const rawOverlayLayers = parseOverlayLayers(
    (proyecto as { overlay_layers?: unknown } | null)?.overlay_layers
  );
  const planosUrl = (proyecto as { planos_url?: string | null } | null)?.planos_url ?? null;
  const overlayLayers: OverlayLayerConfig[] =
    rawOverlayLayers && rawOverlayLayers.length
      ? rawOverlayLayers
      : planosUrl
        ? [
            {
              id: 'layer-default',
              name: 'Plano principal',
              url: planosUrl,
              bounds: overlayBoundsValue,
              opacity: overlayOpacityValue ?? 0.7,
              visible: true,
              isPrimary: true,
              order: 0,
            },
          ]
        : [];
  const primaryOverlayLayer =
    overlayLayers.find((layer) => layer.isPrimary) ?? overlayLayers[0] ?? null;
  const primaryOverlayBounds = primaryOverlayLayer?.bounds ?? overlayBoundsValue;

  const galeriaItems = parseGaleria((proyecto as { galeria_imagenes?: unknown } | null)?.galeria_imagenes);

  const lotesMapeoSource = lotesParaMapeo ?? [];
  const lotesForMapeo = lotesMapeoSource.map((lote) => {
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
    <div className="w-full p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header mejorado */}
      <div className="crm-card p-4 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 flex-1">
            <Link
              href="/dashboard/proyectos"
              className="flex-shrink-0 flex items-center justify-center w-10 h-10 text-crm-text-secondary bg-crm-card-hover hover:bg-crm-border rounded-lg transition-colors"
              title="Volver a proyectos"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
            </Link>

            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-xl md:text-2xl font-bold text-crm-text-primary">{proyecto.nombre}</h1>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    proyecto.estado === 'activo'
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : proyecto.estado === 'pausado'
                      ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                      : 'bg-red-100 text-red-700 border border-red-300'
                  }`}>
                    {proyecto.estado === 'activo' ? '● Activo' : proyecto.estado === 'pausado' ? '● Pausado' : '● Cerrado'}
                  </span>

                  {proyecto.tipo && (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      proyecto.tipo === 'propio'
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-purple-100 text-purple-700 border border-purple-300'
                    }`}>
                      {proyecto.tipo === 'propio' ? '📋 Propio' : '🤝 Corretaje'}
                    </span>
                  )}
                </div>
              </div>

              {proyecto.ubicacion && (
                <div className="flex items-center gap-2 text-sm text-crm-text-secondary flex-wrap">
                  <svg className="w-4 h-4 text-crm-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  <span>{proyecto.ubicacion}</span>
                </div>
              )}
            </div>
          </div>

          {/* Botón de eliminar proyecto */}
          <DeleteProjectButton
            className="w-full sm:w-auto"
            proyectoId={proyecto.id}
            proyectoNombre={proyecto.nombre}
            lotesCount={total}
          />
        </div>
      </div>

      <ProyectoGaleria
        nombre={proyecto.nombre}
        imagenUrl={proyecto.imagen_url}
        logoUrl={proyecto.logo_url}
        galeriaItems={galeriaItems}
      />

      {/* Tabs Navigation */}
      <ProjectTabs
        lotesSection={
          <>
            {/* Filtros compactos */}
            <div key="filtros-lotes" className="crm-card p-4 md:p-5">
              <form action={`/dashboard/proyectos/${proyecto.id}`} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 min-w-0">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-crm-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                      </svg>
                    </div>
                    <input
                      name="q"
                      defaultValue={q}
                      className="w-full pl-10 pr-4 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
                      placeholder="Buscar por código de lote..."
                    />
                  </div>
                </div>

                <div className="w-full sm:w-48">
                  <select
                    name="estado"
                    defaultValue={estado || "all"}
                    className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="disponible">✅ Disponible</option>
                    <option value="reservado">🔒 Reservado</option>
                    <option value="vendido">💰 Vendido</option>
                  </select>
                </div>

                <button className="crm-button-primary px-6 py-2 rounded-lg text-sm font-medium whitespace-nowrap">
                  Buscar
                </button>
              </form>
            </div>

            <NewLoteForm
              key="new-lote-form"
              proyectoId={proyecto.id}
              proyectos={todosLosProyectos || []}
              lotes={lotesConProyecto || []}
            />

            <LotesList
              key="lotes-list"
              proyectoId={proyecto.id}
              lotes={lotesConProyecto}
              totalLotes={total}
            />

            {/* Paginación mejorada */}
            {total > perPage && (
              <PaginationClient
                key="pagination-lotes"
                currentPage={page}
                totalPages={lastPage}
                proyectoId={proyecto.id}
                q={q}
                estado={estado}
              />
            )}
          </>
        }
        mapeoSection={
          isAdmin ? (
            <MapeoLotesMejorado
              key="mapeo-mejorado"
              proyectoId={proyecto.id}
              planosUrl={primaryOverlayLayer?.url ?? planosUrl}
              proyectoNombre={proyecto.nombre}
              proyectoLatitud={proyecto.latitud}
              proyectoLongitud={proyecto.longitud}
              initialBounds={normalizeBoundsTo2Points(primaryOverlayBounds ?? overlayBoundsValue)}
              initialRotation={overlayRotationValue}
              initialOpacity={primaryOverlayLayer?.opacity ?? overlayOpacityValue}
              initialOverlayLayers={overlayLayers}
              lotes={lotesForMapeo}
            />
          ) : (
            <MapeoLotesVisualizacion
              key="mapeo-visualizacion"
              proyectoNombre={proyecto.nombre}
              planosUrl={primaryOverlayLayer?.url ?? planosUrl}
              proyectoLatitud={proyecto.latitud}
              proyectoLongitud={proyecto.longitud}
              overlayBounds={primaryOverlayBounds ?? overlayBoundsValue}
              overlayRotation={overlayRotationValue}
              overlayLayers={overlayLayers}
              lotes={lotesForMapeo}
            />
          )
        }
      />
    </div>
  );
}
