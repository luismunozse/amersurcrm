/**
 * Buscador y filtros para la página principal de Proyectos
 *
 * Características:
 * - Búsqueda por nombre y ubicación
 * - Filtro por estado (activo, pausado, completado)
 * - Filtro por tipo (propio, corretaje)
 * - Ordenamiento
 * - Responsive
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ProyectosSearchBarProps {
  totalProyectos: number;
}

export default function ProyectosSearchBar({ totalProyectos }: ProyectosSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [showFilters, setShowFilters] = useState(false);

  // Valores actuales de los parámetros
  const currentQ = searchParams.get('q') || '';
  const currentEstado = searchParams.get('estado') || '';
  const currentTipo = searchParams.get('tipo') || '';
  const currentSort = searchParams.get('sort') || 'nombre-asc';

  const handleSearch = (formData: FormData) => {
    const q = formData.get('q') as string;
    const estado = formData.get('estado') as string;
    const tipo = formData.get('tipo') as string;
    const sort = formData.get('sort') as string;

    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (estado) params.set('estado', estado);
    if (tipo) params.set('tipo', tipo);
    if (sort && sort !== 'nombre-asc') params.set('sort', sort);

    startTransition(() => {
      router.push(`/dashboard/proyectos?${params.toString()}`);
    });
  };

  const handleClearFilters = () => {
    startTransition(() => {
      router.push('/dashboard/proyectos');
    });
  };

  const hasActiveFilters = currentQ || currentEstado || currentTipo || (currentSort && currentSort !== 'nombre-asc');

  return (
    <div className="crm-card p-4 md:p-5 space-y-4" data-tour="search-filter">
      <form
        action={(formData) => handleSearch(formData)}
        className="space-y-4"
      >
        {/* Barra de búsqueda principal */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-crm-text-muted" />
            </div>
            <input
              type="text"
              name="q"
              defaultValue={currentQ}
              placeholder="Buscar por nombre o ubicación del proyecto..."
              className="w-full pl-10 pr-4 py-2.5 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary placeholder-crm-text-muted"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                showFilters
                  ? 'bg-crm-primary text-white border-crm-primary'
                  : 'bg-crm-card border-crm-border text-crm-text-primary hover:bg-crm-card-hover'
              }`}
            >
              <FunnelIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Filtros</span>
              {hasActiveFilters && !showFilters && (
                <span className="bg-crm-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  !
                </span>
              )}
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="crm-button-primary px-6 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap disabled:opacity-50"
            >
              {isPending ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </div>

        {/* Panel de filtros expandible */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-crm-border">
            {/* Filtro por estado */}
            <div>
              <label className="block text-xs font-medium text-crm-text-muted mb-1.5">
                Estado del Proyecto
              </label>
              <select
                name="estado"
                defaultValue={currentEstado}
                className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
              >
                <option value="">Todos los estados</option>
                <option value="activo">✅ Activo</option>
                <option value="pausado">⏸️ Pausado</option>
                <option value="cerrado">❌ Cerrado</option>
              </select>
            </div>

            {/* Filtro por tipo */}
            <div>
              <label className="block text-xs font-medium text-crm-text-muted mb-1.5">
                Tipo de Proyecto
              </label>
              <select
                name="tipo"
                defaultValue={currentTipo}
                className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
              >
                <option value="">Todos los tipos</option>
                <option value="propio">📋 Propio</option>
                <option value="corretaje">🤝 Corretaje</option>
              </select>
            </div>

            {/* Ordenamiento */}
            <div>
              <label className="block text-xs font-medium text-crm-text-muted mb-1.5">
                Ordenar por
              </label>
              <select
                name="sort"
                defaultValue={currentSort}
                className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
              >
                <option value="nombre-asc">Nombre (A-Z)</option>
                <option value="nombre-desc">Nombre (Z-A)</option>
                <option value="created_at-desc">Más recientes</option>
                <option value="created_at-asc">Más antiguos</option>
                <option value="updated_at-desc">Actualizados recientemente</option>
              </select>
            </div>

            {/* Botón limpiar filtros */}
            <div className="flex items-end">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="w-full px-4 py-2 border border-crm-border rounded-lg text-sm font-medium text-crm-text-secondary hover:bg-crm-card-hover transition-colors flex items-center justify-center gap-2"
                >
                  <XMarkIcon className="h-4 w-4" />
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        )}
      </form>

      {/* Indicador de resultados */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between text-sm pt-2 border-t border-crm-border">
          <div className="text-crm-text-muted">
            Mostrando resultados filtrados
            {currentQ && (
              <span className="ml-2 text-crm-text-primary">
                para: <strong>"{currentQ}"</strong>
              </span>
            )}
          </div>
          <div className="text-crm-text-primary font-medium">
            {totalProyectos} {totalProyectos === 1 ? 'proyecto' : 'proyectos'}
          </div>
        </div>
      )}
    </div>
  );
}
