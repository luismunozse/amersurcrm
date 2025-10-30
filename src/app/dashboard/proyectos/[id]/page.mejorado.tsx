/**
 * Página de Detalle de Proyecto - VERSIÓN MEJORADA
 *
 * Mejoras implementadas:
 * - Búsqueda multi-campo (código, manzana, etapa, descripción)
 * - Filtros avanzados (rangos de precio y área)
 * - Ordenamiento dinámico
 * - Contador de resultados
 * - Mensaje mejorado de "sin resultados"
 *
 * Para usar esta versión:
 * 1. Renombrar page.tsx a page.old.tsx
 * 2. Renombrar page.mejorado.tsx a page.tsx
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { esAdmin } from "@/lib/auth/roles";
import NewLoteForm from "./_NewLoteForm";
import LotesList from "./_LotesList";
import LotesSearchBar from "./_LotesSearchBar";
import MapeoLotesMejorado from "./_MapeoLotesMejorado";
import MapeoLotesVisualizacion from "./_MapeoLotesVisualizacion";
import DeleteProjectButton from "./_DeleteProjectButton";
import GoogleMapsDebug from "@/components/GoogleMapsDebug";
import { PaginationClient } from "./_PaginationClient";
import ProjectTabs from "./_ProjectTabs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ParamsP = Promise<{ id: string }>;
type SPP = Promise<{
  q?: string | string[];
  page?: string | string[];
  estado?: string | string[];
  precio_min?: string | string[];
  precio_max?: string | string[];
  area_min?: string | string[];
  area_max?: string | string[];
  sort?: string | string[];
}>;

export default async function ProyLotesPage({
  params,
  searchParams,
}: {
  params: ParamsP;
  searchParams: SPP;
}) {
  const { id } = await params;
  const sp = await searchParams;

  // Extraer parámetros
  const qRaw = sp.q;
  const pageRaw = sp.page;
  const estadoRaw = sp.estado;
  const precioMinRaw = sp.precio_min;
  const precioMaxRaw = sp.precio_max;
  const areaMinRaw = sp.area_min;
  const areaMaxRaw = sp.area_max;
  const sortRaw = sp.sort;

  const q = (Array.isArray(qRaw) ? qRaw[0] : qRaw ?? "").trim();
  const estado = (Array.isArray(estadoRaw) ? estadoRaw[0] : estadoRaw ?? "").trim();
  const precioMin = parseFloat(Array.isArray(precioMinRaw) ? precioMinRaw[0] : precioMinRaw || "0") || 0;
  const precioMax = parseFloat(Array.isArray(precioMaxRaw) ? precioMaxRaw[0] : precioMaxRaw || "0") || 0;
  const areaMin = parseFloat(Array.isArray(areaMinRaw) ? areaMinRaw[0] : areaMinRaw || "0") || 0;
  const areaMax = parseFloat(Array.isArray(areaMaxRaw) ? areaMaxRaw[0] : areaMaxRaw || "0") || 0;
  const sort = (Array.isArray(sortRaw) ? sortRaw[0] : sortRaw ?? "codigo-asc").trim();

  const page = Math.max(
    1,
    parseInt(Array.isArray(pageRaw) ? pageRaw[0] : pageRaw || "1", 10) || 1
  );

  const perPage = 10;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const supabase = await createServerOnlyClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdmin = user ? await esAdmin() : false;

  // Obtener proyecto
  const proyectoSelectBase =
    "id,nombre,estado,ubicacion,descripcion,imagen_url,planos_url,overlay_bounds,overlay_rotation,overlay_opacity,created_at,tipo";
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

  // Construir query de lotes con filtros avanzados
  let listQuery = supabase
    .from("lote")
    .select("*")
    .eq("proyecto_id", id);

  // BÚSQUEDA MULTI-CAMPO: código, manzana, etapa
  if (q) {
    // Buscar en código (directo) o en data->manzana, data->etapa
    listQuery = listQuery.or(
      `codigo.ilike.%${q}%,data->>manzana.ilike.%${q}%,data->>etapa.ilike.%${q}%`
    );
  }

  // Filtro por estado
  if (estado && estado !== "all") {
    listQuery = listQuery.eq("estado", estado as unknown);
  }

  // Filtro por rango de precios
  if (precioMin > 0) {
    listQuery = listQuery.gte("precio", precioMin);
  }
  if (precioMax > 0) {
    listQuery = listQuery.lte("precio", precioMax);
  }

  // Filtro por rango de áreas
  if (areaMin > 0) {
    listQuery = listQuery.gte("sup_m2", areaMin);
  }
  if (areaMax > 0) {
    listQuery = listQuery.lte("sup_m2", areaMax);
  }

  // Aplicar ordenamiento
  const [sortField, sortOrder] = sort.split("-") as [string, "asc" | "desc"];
  listQuery = listQuery.order(sortField, { ascending: sortOrder === "asc" });

  // Aplicar paginación
  listQuery = listQuery.range(from, to);

  const { data: lotes, error: eLotes } = await listQuery;
  if (eLotes) throw eLotes;

  // Agregar información del proyecto a cada lote
  const lotesConProyecto =
    lotes?.map((lote) => {
      const proyectoReal = todosLosProyectos?.find((p) => p.id === lote.proyecto_id);
      return {
        ...lote,
        proyecto: {
          id: lote.proyecto_id,
          nombre: proyectoReal?.nombre || "Proyecto no encontrado",
        },
      };
    }) || [];

  // Conteo total (mismos filtros pero sin paginación)
  let countQuery = supabase
    .from("lote")
    .select("*", { count: "exact", head: true })
    .eq("proyecto_id", id);

  if (q) {
    countQuery = countQuery.or(
      `codigo.ilike.%${q}%,data->>manzana.ilike.%${q}%,data->>etapa.ilike.%${q}%`
    );
  }
  if (estado && estado !== "all") countQuery = countQuery.eq("estado", estado as unknown);
  if (precioMin > 0) countQuery = countQuery.gte("precio", precioMin);
  if (precioMax > 0) countQuery = countQuery.lte("precio", precioMax);
  if (areaMin > 0) countQuery = countQuery.gte("sup_m2", areaMin);
  if (areaMax > 0) countQuery = countQuery.lte("sup_m2", areaMax);

  const { count, error: eCount } = await countQuery;
  if (eCount) throw eCount;

  // Obtener total de lotes sin filtros (para el contador)
  const { count: totalSinFiltros } = await supabase
    .from("lote")
    .select("*", { count: "exact", head: true })
    .eq("proyecto_id", id);

  const total = count ?? 0;
  const totalGeneral = totalSinFiltros ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / perPage));

  const hasFilters =
    q || (estado && estado !== "all") || precioMin > 0 || precioMax > 0 || areaMin > 0 || areaMax > 0;

  // Helpers para mapeo
  const isLatLngTupleArray = (value: unknown): value is [number, number][] =>
    Array.isArray(value) &&
    value.every(
      (pair) =>
        Array.isArray(pair) &&
        pair.length === 2 &&
        typeof pair[0] === "number" &&
        typeof pair[1] === "number"
    );

  const isLatLngObjectArray = (
    value: unknown
  ): value is { lat: number; lng: number }[] =>
    Array.isArray(value) &&
    value.every(
      (point) =>
        typeof point === "object" &&
        point !== null &&
        typeof (point as { lat?: unknown }).lat === "number" &&
        typeof (point as { lng?: unknown }).lng === "number"
    );

  const proyectoPolygon = isLatLngObjectArray(
    (proyecto as { poligono?: unknown } | null)?.poligono
  )
    ? (proyecto as { poligono: { lat: number; lng: number }[] }).poligono
    : undefined;

  const toLatLngTuple = (value: unknown): [number, number] | undefined => {
    if (
      Array.isArray(value) &&
      value.length === 2 &&
      typeof value[0] === "number" &&
      typeof value[1] === "number"
    ) {
      return [value[0], value[1]];
    }
    if (value && typeof value === "object") {
      const candidate = value as { lat?: unknown; lng?: unknown };
      if (typeof candidate.lat === "number" && typeof candidate.lng === "number") {
        return [candidate.lat, candidate.lng];
      }
    }
    return undefined;
  };

  const parseOverlayBounds = (
    value: unknown
  ): [[number, number], [number, number]] | undefined => {
    let candidate: unknown = value;
    if (typeof candidate === "string") {
      try {
        candidate = JSON.parse(candidate);
      } catch {
        return undefined;
      }
    }

    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      const obj = candidate as Record<string, unknown>;
      if ("bounds" in obj) {
        candidate = obj.bounds;
      } else if ("sw" in obj && "ne" in obj) {
        candidate = [obj.sw, obj.ne];
      } else if ("southWest" in obj && "northEast" in obj) {
        candidate = [obj.southWest, obj.northEast];
      } else if ("0" in obj && "1" in obj) {
        candidate = [obj["0"], obj["1"]];
      }
    }

    if (!Array.isArray(candidate) || candidate.length !== 2) return undefined;
    const sw = toLatLngTuple(candidate[0]);
    const ne = toLatLngTuple(candidate[1]);
    if (!sw || !ne) return undefined;
    return [sw, ne];
  };

  const overlayBoundsValue = parseOverlayBounds(
    (proyecto as { overlay_bounds?: unknown } | null)?.overlay_bounds
  );

  const overlayRotationRaw = (proyecto as { overlay_rotation?: unknown } | null)
    ?.overlay_rotation;
  const overlayRotationValue =
    typeof overlayRotationRaw === "number"
      ? overlayRotationRaw
      : typeof overlayRotationRaw === "string"
      ? Number(overlayRotationRaw)
      : undefined;

  const overlayOpacityRaw = (proyecto as { overlay_opacity?: unknown } | null)
    ?.overlay_opacity;
  const overlayOpacityValue =
    typeof overlayOpacityRaw === "number"
      ? overlayOpacityRaw
      : typeof overlayOpacityRaw === "string"
      ? Number(overlayOpacityRaw)
      : null;

  const lotesForMapeo = (lotesConProyecto || []).map((lote) => {
    const planoPoligonoRaw = (lote as { plano_poligono?: unknown }).plano_poligono;
    const planoPoligono = isLatLngTupleArray(planoPoligonoRaw)
      ? planoPoligonoRaw
      : undefined;

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

  // Helper de URLs con soporte para todos los filtros
  const makeHref = (p: number) => {
    const usp = new URLSearchParams();
    if (q) usp.set("q", q);
    if (estado && estado !== "all") usp.set("estado", estado);
    if (precioMin > 0) usp.set("precio_min", precioMin.toString());
    if (precioMax > 0) usp.set("precio_max", precioMax.toString());
    if (areaMin > 0) usp.set("area_min", areaMin.toString());
    if (areaMax > 0) usp.set("area_max", areaMax.toString());
    if (sort && sort !== "codigo-asc") usp.set("sort", sort);
    if (p > 1) usp.set("page", String(p));
    const qs = usp.toString();
    return qs ? `/dashboard/proyectos/${proyecto.id}?${qs}` : `/dashboard/proyectos/${proyecto.id}`;
  };

  return (
    <div className="w-full p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header mejorado */}
      <div className="crm-card p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link
              href="/dashboard/proyectos"
              className="flex-shrink-0 flex items-center justify-center w-10 h-10 text-crm-text-secondary bg-crm-card-hover hover:bg-crm-border rounded-lg transition-colors"
              title="Volver a proyectos"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-xl md:text-2xl font-bold text-crm-text-primary">
                  {proyecto.nombre}
                </h1>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      proyecto.estado === "activo"
                        ? "bg-green-100 text-green-700 border border-green-300"
                        : proyecto.estado === "pausado"
                        ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                        : "bg-red-100 text-red-700 border border-red-300"
                    }`}
                  >
                    {proyecto.estado === "activo"
                      ? "● Activo"
                      : proyecto.estado === "pausado"
                      ? "● Pausado"
                      : "● Cerrado"}
                  </span>

                  {proyecto.tipo && (
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        proyecto.tipo === "propio"
                          ? "bg-blue-100 text-blue-700 border border-blue-300"
                          : "bg-purple-100 text-purple-700 border border-purple-300"
                      }`}
                    >
                      {proyecto.tipo === "propio" ? "📋 Propio" : "🤝 Corretaje"}
                    </span>
                  )}
                </div>
              </div>

              {proyecto.ubicacion && (
                <div className="flex items-center gap-2 text-sm text-crm-text-secondary">
                  <svg
                    className="w-4 h-4 text-crm-accent flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span>{proyecto.ubicacion}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex-shrink-0">
            <DeleteProjectButton
              proyectoId={proyecto.id}
              proyectoNombre={proyecto.nombre}
              lotesCount={totalGeneral}
            />
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <ProjectTabs
        lotesSection={
          <>
            {/* Buscador avanzado de lotes */}
            <LotesSearchBar
              key="lotes-search"
              proyectoId={proyecto.id}
              totalLotes={totalGeneral}
              lotesCount={total}
            />

            <NewLoteForm
              key="new-lote-form"
              proyectoId={proyecto.id}
              proyectos={todosLosProyectos || []}
            />

            {/* Mensaje mejorado cuando no hay resultados */}
            {lotesConProyecto.length === 0 && hasFilters ? (
              <div className="crm-card text-center py-16 rounded-2xl border-2 border-dashed border-crm-border">
                <div className="w-20 h-20 bg-gradient-to-br from-crm-accent/10 to-crm-accent/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="w-10 h-10 text-crm-accent"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-crm-text-primary mb-3">
                  No se encontraron lotes
                </h4>
                <p className="text-crm-text-secondary max-w-md mx-auto mb-6">
                  {q ? (
                    <>
                      No se encontraron lotes que coincidan con <strong>"{q}"</strong> y
                      los filtros seleccionados
                    </>
                  ) : (
                    <>No hay lotes que coincidan con los filtros seleccionados</>
                  )}
                </p>
                <Link
                  href={`/dashboard/proyectos/${proyecto.id}`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-crm-primary text-white rounded-lg hover:bg-crm-primary/90 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Ver todos los lotes
                </Link>
              </div>
            ) : (
              <LotesList
                key="lotes-list"
                proyectoId={proyecto.id}
                lotes={lotesConProyecto}
              />
            )}

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
              planosUrl={proyecto.planos_url}
              proyectoNombre={proyecto.nombre}
              initialBounds={overlayBoundsValue}
              initialRotation={overlayRotationValue}
              initialOpacity={overlayOpacityValue}
              lotes={lotesForMapeo}
            />
          ) : (
            <MapeoLotesVisualizacion
              key="mapeo-visualizacion"
              proyectoNombre={proyecto.nombre}
              planosUrl={proyecto.planos_url}
              overlayBounds={overlayBoundsValue}
              overlayRotation={overlayRotationValue}
              lotes={lotesForMapeo}
            />
          )
        }
      />

      <GoogleMapsDebug />
    </div>
  );
}
