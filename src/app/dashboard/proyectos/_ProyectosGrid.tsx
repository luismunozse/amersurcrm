'use client';

import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Building2 as BuildingOffice2Icon,
  MapPin as MapPinIcon,
  ArrowRight as ArrowRightIcon,
  ImageIcon as PhotoIcon,
  Search as MagnifyingGlassIcon,
  X as XMarkIcon,
  Circle as CircleIcon,
  Pause as PauseIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import QuickActions from './QuickActions';
import StatsPopover from './_StatsPopover';
import ExportButton from '@/components/export/ExportButton';
import type { ProyectoMediaItem } from '@/types/proyectos';

type ProyectoConStats = {
  id: string;
  nombre: string;
  ubicacion: string | null;
  estado: string;
  tipo: string | null;
  imagen_url: string | null;
  logo_url: string | null;
  latitud: number | null;
  longitud: number | null;
  descripcion: string | null;
  galeria_imagenes?: ProyectoMediaItem[];
  stats: {
    total: number;
    vendidos: number;
    reservados: number;
    disponibles: number;
    ingresosVendidosPEN: number;
    ingresosProyectadosPEN: number;
  };
};

interface ProyectosGridProps {
  data: ProyectoConStats[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE_OPTIONS = [12, 24, 48];

/**
 * NOTA: La exportación funciona sobre la página actual (ya filtrada server-side).
 * Para exportar todos los proyectos que coinciden con los filtros sería necesaria
 * otra consulta sin paginación.
 */
export default function ProyectosGrid({ data, total, page, pageSize }: ProyectosGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get('q') || '';
  const estado = searchParams.get('estado') || '';
  const tipo = searchParams.get('tipo') || '';

  const hasActiveFilters = Boolean(q || estado || tipo);
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));
  const desde = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const hasta = Math.min(page * pageSize, total);

  const buildHref = (overrides: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (value === null || value === '' || value === undefined) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const goToPage = (next: number) => {
    const target = Math.min(Math.max(1, next), totalPaginas);
    if (target === page) return;
    router.push(buildHref({ page: target === 1 ? null : target }), { scroll: false });
  };

  const changePageSize = (next: number) => {
    if (next === pageSize) return;
    // Al cambiar pageSize, reseteamos a página 1
    router.push(buildHref({ pageSize: next === 12 ? null : next, page: null }), { scroll: false });
  };

  const clearFilters = () => {
    router.push(pathname, { scroll: false });
  };

  return (
    <>
      {/* Resumen + Export */}
      <div className="crm-card p-3 md:p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="text-xs md:text-sm text-crm-text-muted flex items-center gap-2 flex-wrap">
          {hasActiveFilters ? (
            <>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-crm-primary/10 text-crm-primary rounded-full text-[10px] md:text-xs font-medium">
                {total} resultado{total === 1 ? '' : 's'}
              </span>
              {q && (
                <span className="text-crm-text-secondary truncate max-w-[160px] md:max-w-[240px]">
                  &quot;{q}&quot;
                </span>
              )}
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-crm-text-secondary hover:text-crm-text-primary underline text-[11px] md:text-xs"
              >
                <XMarkIcon className="h-3 w-3" />
                Limpiar filtros
              </button>
            </>
          ) : (
            <span>
              Total: <strong className="text-crm-text-primary">{total}</strong> proyectos
            </span>
          )}
        </div>
        <div className="hidden md:block">
          <ExportButton
            type="proyectos"
            data={data}
            filters={{ q, estado, tipo }}
            fileName={hasActiveFilters ? 'proyectos-filtrados' : 'proyectos'}
            label={hasActiveFilters ? `Exportar página (${data.length})` : `Exportar página (${data.length})`}
            size="sm"
          />
        </div>
      </div>

      {/* Grid de proyectos */}
      <div className="flex flex-col gap-4 md:grid md:grid-cols-2 xl:grid-cols-3 md:gap-6">
        {data.length === 0 && hasActiveFilters && (
          <div className="col-span-full crm-card text-center py-10 md:py-16 rounded-xl md:rounded-2xl border-2 border-dashed border-crm-border">
            <div className="w-14 h-14 md:w-20 md:h-20 bg-gradient-to-br from-crm-primary/10 to-crm-primary/5 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6">
              <MagnifyingGlassIcon className="w-7 h-7 md:w-10 md:h-10 text-crm-primary" />
            </div>
            <h4 className="text-base md:text-xl font-bold text-crm-text-primary mb-2 md:mb-3">
              Sin resultados
            </h4>
            <p className="text-xs md:text-base text-crm-text-secondary max-w-md mx-auto mb-3 md:mb-4 px-4">
              No hay proyectos que coincidan con su búsqueda.
            </p>
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary/90 transition-colors text-sm"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {data.length === 0 && !hasActiveFilters && (
          <div className="col-span-full crm-card text-center py-10 md:py-16 rounded-xl md:rounded-2xl border-2 border-dashed border-crm-border">
            <div className="w-14 h-14 md:w-20 md:h-20 bg-gradient-to-br from-crm-primary/10 to-crm-primary/5 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6">
              <BuildingOffice2Icon className="w-7 h-7 md:w-10 md:h-10 text-crm-primary" />
            </div>
            <h4 className="text-base md:text-xl font-bold text-crm-text-primary mb-2 md:mb-3">
              Sin proyectos
            </h4>
            <p className="text-xs md:text-base text-crm-text-secondary max-w-md mx-auto px-4">
              Cree su primer proyecto inmobiliario.
            </p>
          </div>
        )}

        {data.map((p) => {
          const { stats } = p;
          const vendidoPct = stats.total > 0 ? Math.round((stats.vendidos / stats.total) * 100) : 0;
          const galeriaItems = p.galeria_imagenes || [];
          const galeriaCount = galeriaItems.length;

          return (
            <StatsPopover key={p.id} stats={stats} nombreProyecto={p.nombre}>
            <div
              className="crm-card rounded-xl md:rounded-2xl overflow-hidden hover:shadow-crm-xl transition-all duration-300 group relative flex flex-row md:flex-col"
            >
              {/* Imagen */}
              <Link
                href={`/dashboard/proyectos/${p.id}`}
                className="relative block w-28 h-28 md:w-full md:h-56 shrink-0 overflow-hidden bg-gradient-to-br from-crm-primary/15 to-crm-primary/8 focus-visible:outline-none"
                aria-label={`Ver proyecto ${p.nombre}`}
              >
                {p.imagen_url ? (
                  <img
                    src={p.imagen_url}
                    alt={p.nombre}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="h-full w-full grid place-items-center">
                    <BuildingOffice2Icon className="h-10 w-10 md:h-20 md:w-20 text-crm-primary/40" />
                  </div>
                )}

                {/* Badge estado */}
                <div className="absolute top-2 right-2 md:top-4 md:right-4">
                  <span
                    className={`px-2 py-0.5 md:px-3 md:py-1.5 rounded-full text-[10px] md:text-xs font-semibold shadow-lg backdrop-blur-sm border ${
                      p.estado === 'activo'
                        ? 'bg-green-500/90 text-white border-green-400'
                        : p.estado === 'pausado'
                        ? 'bg-yellow-500/90 text-white border-yellow-400'
                        : 'bg-red-500/90 text-white border-red-400'
                    }`}
                  >
                    <span className="md:hidden inline-flex items-center">
                      {p.estado === 'activo' ? (
                        <CircleIcon className="w-2.5 h-2.5 fill-current" />
                      ) : p.estado === 'pausado' ? (
                        <PauseIcon className="w-3 h-3 fill-current" />
                      ) : (
                        <XMarkIcon className="w-3 h-3" />
                      )}
                    </span>
                    <span className="hidden md:inline-flex items-center gap-1.5">
                      <CircleIcon className="w-2 h-2 fill-current" />
                      {p.estado === 'activo' ? 'Activo' : p.estado === 'pausado' ? 'Pausado' : 'Cerrado'}
                    </span>
                  </span>
                </div>

                {/* Logo y galería solo en desktop */}
                {p.logo_url && (
                  <div className="hidden md:block absolute bottom-4 left-4 rounded-2xl bg-white/90 dark:bg-white px-4 py-2 shadow-lg border border-black/5 backdrop-blur">
                    <img src={p.logo_url} alt={`Logo ${p.nombre}`} className="h-10 w-auto object-contain" />
                  </div>
                )}
                {galeriaCount > 0 && (
                  <div className="hidden md:inline-flex absolute bottom-4 right-4 items-center gap-1 rounded-full bg-black/60 text-white text-xs font-semibold px-3 py-1 backdrop-blur">
                    <PhotoIcon className="w-4 h-4" />
                    <span>{galeriaCount}</span>
                  </div>
                )}

                {/* Tipo badge solo en desktop */}
                <span
                  className={`hidden md:inline absolute top-16 right-4 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm border ${
                    p.tipo === 'propio'
                      ? 'bg-blue-500/90 text-white border-blue-400'
                      : 'bg-purple-500/90 text-white border-purple-400'
                  }`}
                >
                  {p.tipo === 'propio' ? 'Propio' : 'Corretaje'}
                </span>
              </Link>

              {/* Contenido */}
              <div className="flex-1 p-3 md:p-5 flex flex-col min-w-0">
                {/* Título y ubicación */}
                <div className="mb-2 md:mb-3">
                  <h3 className="font-bold text-sm md:text-xl text-crm-text-primary line-clamp-1 transition-colors group-hover:text-crm-primary">
                    <Link href={`/dashboard/proyectos/${p.id}`} className="block">
                      {p.nombre}
                    </Link>
                  </h3>
                  {p.ubicacion && (
                    <div className="flex items-center gap-1 text-[11px] md:text-sm text-crm-text-secondary mt-0.5">
                      <MapPinIcon className="h-3 w-3 md:h-4 md:w-4 text-crm-accent shrink-0" />
                      <span className="truncate">{p.ubicacion}</span>
                    </div>
                  )}
                </div>

                {/* Stats inline en mobile */}
                <div className="flex items-center gap-3 text-[11px] md:hidden mb-2">
                  <span className="text-crm-text-muted">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{stats.disponibles}</span> disp.
                  </span>
                  {stats.reservados > 0 && (
                    <span className="text-crm-text-muted">
                      <span className="font-semibold text-amber-600 dark:text-amber-400">{stats.reservados}</span> res.
                    </span>
                  )}
                  <span className="text-crm-text-muted">
                    <span className="font-semibold text-rose-600 dark:text-rose-400">{stats.vendidos}</span>/{stats.total} vend.
                  </span>
                </div>

                {/* Estadísticas grid en desktop */}
                <div className="hidden md:grid grid-cols-4 gap-3 py-4 border-y border-crm-border mb-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-crm-text-primary">{stats.total}</p>
                    <p className="text-xs text-crm-text-muted font-medium mt-1">Total</p>
                  </div>
                  <div className="text-center border-l border-crm-border">
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.disponibles}</p>
                    <p className="text-xs text-crm-text-muted font-medium mt-1">Disponibles</p>
                  </div>
                  <div className="text-center border-l border-crm-border">
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.reservados}</p>
                    <p className="text-xs text-crm-text-muted font-medium mt-1">Reservados</p>
                  </div>
                  <div className="text-center border-l border-crm-border">
                    <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.vendidos}</p>
                    <p className="text-xs text-crm-text-muted font-medium mt-1">Vendidos</p>
                  </div>
                </div>

                {/* Barra de progreso stacked */}
                <div className="mb-2 md:mb-3">
                  <div className="flex items-center justify-between text-[10px] md:text-xs mb-1">
                    <span className="text-crm-text-muted font-medium hidden md:inline">Avance</span>
                    <span className="text-crm-text-primary font-bold">{vendidoPct}% vendido</span>
                  </div>
                  <div
                    className="flex h-1.5 md:h-2.5 rounded-full bg-crm-border/30 overflow-hidden"
                    title={`Disponibles: ${stats.disponibles} · Reservados: ${stats.reservados} · Vendidos: ${stats.vendidos}`}
                  >
                    {stats.total > 0 && (
                      <>
                        <div
                          className="h-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${(stats.disponibles / stats.total) * 100}%` }}
                          title={`Disponibles: ${stats.disponibles}`}
                        />
                        <div
                          className="h-full bg-amber-500 transition-all duration-500"
                          style={{ width: `${(stats.reservados / stats.total) * 100}%` }}
                          title={`Reservados: ${stats.reservados}`}
                        />
                        <div
                          className="h-full bg-rose-500 transition-all duration-500"
                          style={{ width: `${(stats.vendidos / stats.total) * 100}%` }}
                          title={`Vendidos: ${stats.vendidos}`}
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* QuickActions solo en desktop */}
                <div className="hidden md:block mt-auto">
                  <QuickActions
                    id={p.id}
                    nombre={p.nombre}
                    ubicacion={p.ubicacion || undefined}
                    lotesCount={stats.total}
                    proyecto={{
                      id: p.id,
                      nombre: p.nombre,
                      tipo: p.tipo || 'propio',
                      estado: p.estado,
                      ubicacion: p.ubicacion,
                      latitud: p.latitud,
                      longitud: p.longitud,
                      descripcion: p.descripcion,
                      imagen_url: p.imagen_url,
                      logo_url: p.logo_url,
                      galeria_imagenes: galeriaItems,
                    }}
                  />
                </div>

                {/* Botón */}
                <Link
                  className="mt-auto crm-button-primary inline-flex items-center justify-center gap-1.5 py-2 md:py-2.5 px-3 rounded-lg text-xs md:text-sm font-semibold transition-all active:scale-[0.98]"
                  href={`/dashboard/proyectos/${p.id}`}
                >
                  Ver Lotes
                  <ArrowRightIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </Link>
              </div>
            </div>
            </StatsPopover>
          );
        })}
      </div>

      {/* Controles de paginación */}
      {total > 0 && (
        <div className="crm-card p-3 md:p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-xs md:text-sm text-crm-text-secondary">
            {total === 0 ? (
              'Sin resultados'
            ) : (
              <>
                Mostrando <strong className="text-crm-text-primary">{desde}-{hasta}</strong> de{' '}
                <strong className="text-crm-text-primary">{total}</strong> · Página{' '}
                <strong className="text-crm-text-primary">{page}</strong> de{' '}
                <strong className="text-crm-text-primary">{totalPaginas}</strong>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Selector de tamaño de página */}
            <label className="flex items-center gap-1.5 text-xs md:text-sm text-crm-text-secondary">
              <span className="hidden md:inline">Por página:</span>
              <select
                value={pageSize}
                onChange={(e) => changePageSize(Number(e.target.value))}
                className="px-2 py-1 border border-crm-border rounded-md bg-crm-card text-crm-text-primary text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary"
                aria-label="Tamaño de página"
              >
                {PAGE_SIZE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>

            {/* Botones anterior / siguiente */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-crm-border rounded-md text-xs md:text-sm font-medium text-crm-text-primary hover:bg-crm-card-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden md:inline">Anterior</span>
              </button>
              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPaginas}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-crm-border rounded-md text-xs md:text-sm font-medium text-crm-text-primary hover:bg-crm-card-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Página siguiente"
              >
                <span className="hidden md:inline">Siguiente</span>
                <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
