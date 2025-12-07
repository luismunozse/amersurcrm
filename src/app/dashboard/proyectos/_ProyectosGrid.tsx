'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BuildingOffice2Icon,
  MapPinIcon,
  ArrowRightIcon,
  PhotoIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import QuickActions from './QuickActions';
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
    disponibles: number;
  };
};

interface ProyectosGridProps {
  proyectos: ProyectoConStats[];
  totalProyectos: number;
}

export default function ProyectosGrid({ proyectos, totalProyectos }: ProyectosGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filtrado en vivo
  const proyectosFiltrados = useMemo(() => {
    let resultado = proyectos;

    // Filtro por búsqueda de texto
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      resultado = resultado.filter(
        (p) =>
          p.nombre.toLowerCase().includes(query) ||
          p.ubicacion?.toLowerCase().includes(query)
      );
    }

    // Filtro por estado
    if (estadoFilter) {
      resultado = resultado.filter((p) => p.estado === estadoFilter);
    }

    // Filtro por tipo
    if (tipoFilter) {
      resultado = resultado.filter((p) => p.tipo === tipoFilter);
    }

    return resultado;
  }, [proyectos, searchQuery, estadoFilter, tipoFilter]);

  const hasActiveFilters = searchQuery || estadoFilter || tipoFilter;

  const clearFilters = () => {
    setSearchQuery('');
    setEstadoFilter('');
    setTipoFilter('');
  };

  return (
    <>
      {/* Barra de búsqueda y filtros */}
      <div className="crm-card p-3 md:p-5 space-y-3" data-tour="search-filter">
        {/* Búsqueda principal */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-4 w-4 md:h-5 md:w-5 text-crm-text-muted" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar proyecto..."
              className="w-full pl-9 md:pl-10 pr-3 md:pr-4 py-2 md:py-2.5 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary placeholder-crm-text-muted transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-crm-text-muted hover:text-crm-text-primary"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 md:px-4 md:py-2.5 border rounded-lg text-sm font-medium transition-colors flex items-center gap-2 relative ${
              showFilters
                ? 'bg-crm-primary text-white border-crm-primary'
                : 'bg-crm-card border-crm-border text-crm-text-primary hover:bg-crm-card-hover'
            }`}
            aria-label="Filtros"
          >
            <FunnelIcon className="h-4 w-4" />
            <span className="hidden md:inline">Filtros</span>
            {(estadoFilter || tipoFilter) && !showFilters && (
              <span className="absolute -top-1 -right-1 bg-crm-accent text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                !
              </span>
            )}
          </button>
        </div>

        {/* Panel de filtros */}
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 pt-3 border-t border-crm-border">
            <div>
              <label className="block text-[10px] md:text-xs font-medium text-crm-text-muted mb-1">
                Estado
              </label>
              <select
                value={estadoFilter}
                onChange={(e) => setEstadoFilter(e.target.value)}
                className="w-full px-2 md:px-3 py-1.5 md:py-2 border border-crm-border rounded-lg text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
              >
                <option value="">Todos</option>
                <option value="activo">Activo</option>
                <option value="pausado">Pausado</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] md:text-xs font-medium text-crm-text-muted mb-1">
                Tipo
              </label>
              <select
                value={tipoFilter}
                onChange={(e) => setTipoFilter(e.target.value)}
                className="w-full px-2 md:px-3 py-1.5 md:py-2 border border-crm-border rounded-lg text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
              >
                <option value="">Todos</option>
                <option value="propio">Propio</option>
                <option value="corretaje">Corretaje</option>
              </select>
            </div>

            <div className="flex items-end col-span-2 md:col-span-1">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="w-full px-2 md:px-4 py-1.5 md:py-2 border border-crm-border rounded-lg text-xs md:text-sm font-medium text-crm-text-secondary hover:bg-crm-card-hover transition-colors flex items-center justify-center gap-1"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                  Limpiar
                </button>
              )}
            </div>
          </div>
        )}

        {/* Indicador de resultados */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between text-xs pt-2 border-t border-crm-border">
            <div className="text-crm-text-muted flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-crm-primary/10 text-crm-primary rounded-full text-[10px] font-medium">
                {proyectosFiltrados.length} de {totalProyectos}
              </span>
              {searchQuery && (
                <span className="text-crm-text-secondary truncate max-w-[150px]">
                  "{searchQuery}"
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Grid de proyectos */}
      <div className="flex flex-col gap-4 md:grid md:grid-cols-2 xl:grid-cols-3 md:gap-6">
        {proyectosFiltrados.length === 0 && hasActiveFilters && (
          <div className="col-span-full crm-card text-center py-10 md:py-16 rounded-xl md:rounded-2xl border-2 border-dashed border-crm-border">
            <div className="w-14 h-14 md:w-20 md:h-20 bg-gradient-to-br from-crm-primary/10 to-crm-primary/5 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6">
              <MagnifyingGlassIcon className="w-7 h-7 md:w-10 md:h-10 text-crm-primary" />
            </div>
            <h4 className="text-base md:text-xl font-bold text-crm-text-primary mb-2 md:mb-3">
              Sin resultados
            </h4>
            <p className="text-xs md:text-base text-crm-text-secondary max-w-md mx-auto mb-3 md:mb-4 px-4">
              No hay proyectos que coincidan con tu búsqueda.
            </p>
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary/90 transition-colors text-sm"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {proyectosFiltrados.length === 0 && !hasActiveFilters && (
          <div className="col-span-full crm-card text-center py-10 md:py-16 rounded-xl md:rounded-2xl border-2 border-dashed border-crm-border">
            <div className="w-14 h-14 md:w-20 md:h-20 bg-gradient-to-br from-crm-primary/10 to-crm-primary/5 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6">
              <BuildingOffice2Icon className="w-7 h-7 md:w-10 md:h-10 text-crm-primary" />
            </div>
            <h4 className="text-base md:text-xl font-bold text-crm-text-primary mb-2 md:mb-3">
              Sin proyectos
            </h4>
            <p className="text-xs md:text-base text-crm-text-secondary max-w-md mx-auto px-4">
              Crea tu primer proyecto inmobiliario.
            </p>
          </div>
        )}

        {proyectosFiltrados.map((p) => {
          const { stats } = p;
          const vendidoPct = stats.total > 0 ? Math.round((stats.vendidos / stats.total) * 100) : 0;
          const galeriaItems = p.galeria_imagenes || [];
          const galeriaCount = galeriaItems.length;

          return (
            <div
              key={p.id}
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
                    <span className="md:hidden">
                      {p.estado === 'activo' ? '●' : p.estado === 'pausado' ? '⏸' : '✕'}
                    </span>
                    <span className="hidden md:inline">
                      {p.estado === 'activo' ? '● Activo' : p.estado === 'pausado' ? '● Pausado' : '● Cerrado'}
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
                  {p.tipo === 'propio' ? '📋 Propio' : '🤝 Corretaje'}
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
                    <span className="font-semibold text-crm-accent">{stats.disponibles}</span> disp.
                  </span>
                  <span className="text-crm-text-muted">
                    <span className="font-semibold text-crm-primary">{stats.vendidos}</span>/{stats.total} vendidos
                  </span>
                </div>

                {/* Estadísticas grid en desktop */}
                <div className="hidden md:grid grid-cols-3 gap-3 py-4 border-y border-crm-border mb-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-crm-text-primary">{stats.total}</p>
                    <p className="text-xs text-crm-text-muted font-medium mt-1">Total Lotes</p>
                  </div>
                  <div className="text-center border-x border-crm-border">
                    <p className="text-2xl font-bold text-crm-primary">{stats.vendidos}</p>
                    <p className="text-xs text-crm-text-muted font-medium mt-1">Vendidos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-crm-accent">{stats.disponibles}</p>
                    <p className="text-xs text-crm-text-muted font-medium mt-1">Disponibles</p>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="mb-2 md:mb-3">
                  <div className="flex items-center justify-between text-[10px] md:text-xs mb-1">
                    <span className="text-crm-text-muted font-medium hidden md:inline">Progreso</span>
                    <span className="text-crm-primary font-bold">{vendidoPct}%</span>
                  </div>
                  <div className="h-1.5 md:h-2.5 rounded-full bg-crm-border/30 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-crm-primary to-crm-accent transition-all duration-500"
                      style={{ width: `${vendidoPct}%` }}
                    />
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
          );
        })}
      </div>
    </>
  );
}

