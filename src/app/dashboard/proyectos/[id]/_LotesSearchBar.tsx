/**
 * Buscador Avanzado de Lotes con filtros y ordenamiento
 *
 * Características:
 * - Búsqueda multi-campo (código, manzana, etapa, descripción)
 * - Filtros avanzados (rangos de precio y área)
 * - Ordenamiento dinámico
 * - Contador de resultados
 * - Responsive
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';

interface LotesSearchBarProps {
  proyectoId: string;
  totalLotes: number;
  lotesCount: number; // Después de filtros
}

export default function LotesSearchBar({ proyectoId, totalLotes, lotesCount }: LotesSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Valores actuales de los parámetros
  const currentQ = searchParams.get('q') || '';
  const currentEstado = searchParams.get('estado') || '';
  const currentPrecioMin = searchParams.get('precio_min') || '';
  const currentPrecioMax = searchParams.get('precio_max') || '';
  const currentAreaMin = searchParams.get('area_min') || '';
  const currentAreaMax = searchParams.get('area_max') || '';
  const currentSort = searchParams.get('sort') || 'codigo-asc';
  const _currentPage = searchParams.get('page') || '1';

  const handleSearch = (formData: FormData) => {
    const q = formData.get('q') as string;
    const estado = formData.get('estado') as string;
    const precioMin = formData.get('precio_min') as string;
    const precioMax = formData.get('precio_max') as string;
    const areaMin = formData.get('area_min') as string;
    const areaMax = formData.get('area_max') as string;
    const sort = formData.get('sort') as string;

    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (estado && estado !== 'all') params.set('estado', estado);
    if (precioMin) params.set('precio_min', precioMin);
    if (precioMax) params.set('precio_max', precioMax);
    if (areaMin) params.set('area_min', areaMin);
    if (areaMax) params.set('area_max', areaMax);
    if (sort && sort !== 'codigo-asc') params.set('sort', sort);

    startTransition(() => {
      router.push(`/dashboard/proyectos/${proyectoId}?${params.toString()}`);
    });
  };

  const handleClearFilters = () => {
    startTransition(() => {
      router.push(`/dashboard/proyectos/${proyectoId}`);
    });
  };

  // Manejar cambio de estado inmediato
  const handleEstadoChange = (estado: string) => {
    const params = new URLSearchParams(searchParams.toString());

    // Mantener otros filtros
    if (currentQ) params.set('q', currentQ);
    if (estado && estado !== 'all') {
      params.set('estado', estado);
    } else {
      params.delete('estado');
    }
    if (currentPrecioMin) params.set('precio_min', currentPrecioMin);
    if (currentPrecioMax) params.set('precio_max', currentPrecioMax);
    if (currentAreaMin) params.set('area_min', currentAreaMin);
    if (currentAreaMax) params.set('area_max', currentAreaMax);
    if (currentSort && currentSort !== 'codigo-asc') params.set('sort', currentSort);

    startTransition(() => {
      router.push(`/dashboard/proyectos/${proyectoId}?${params.toString()}`);
    });
  };

  // Manejar cambio de ordenamiento inmediato
  const handleSortChange = (sort: string) => {
    const params = new URLSearchParams(searchParams.toString());

    // Mantener otros filtros
    if (currentQ) params.set('q', currentQ);
    if (currentEstado && currentEstado !== 'all') params.set('estado', currentEstado);
    if (currentPrecioMin) params.set('precio_min', currentPrecioMin);
    if (currentPrecioMax) params.set('precio_max', currentPrecioMax);
    if (currentAreaMin) params.set('area_min', currentAreaMin);
    if (currentAreaMax) params.set('area_max', currentAreaMax);
    if (sort && sort !== 'codigo-asc') {
      params.set('sort', sort);
    } else {
      params.delete('sort');
    }

    startTransition(() => {
      router.push(`/dashboard/proyectos/${proyectoId}?${params.toString()}`);
    });
  };

  const hasActiveFilters =
    currentQ ||
    (currentEstado && currentEstado !== 'all') ||
    currentPrecioMin ||
    currentPrecioMax ||
    currentAreaMin ||
    currentAreaMax ||
    (currentSort && currentSort !== 'codigo-asc');

  const hasAdvancedFilters = currentPrecioMin || currentPrecioMax || currentAreaMin || currentAreaMax;

  return (
    <div className="crm-card p-4 md:p-5 space-y-4">
      <form action={(formData) => handleSearch(formData)} className="space-y-4">
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
              placeholder="Buscar por código, manzana, etapa..."
              className="w-full pl-10 pr-4 py-2.5 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary placeholder-crm-text-muted"
            />
          </div>

          <div className="w-full sm:w-48">
            <select
              name="estado"
              value={currentEstado || 'all'}
              onChange={(e) => handleEstadoChange(e.target.value)}
              className="w-full px-3 py-2.5 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
            >
              <option value="all">Todos los estados</option>
              <option value="disponible">✅ Disponible</option>
              <option value="reservado">🔒 Reservado</option>
              <option value="vendido">💰 Vendido</option>
            </select>
          </div>

          <div className="w-full sm:w-56">
            <select
              name="sort"
              value={currentSort}
              onChange={(e) => handleSortChange(e.target.value)}
              className="w-full px-3 py-2.5 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
            >
              <option value="codigo-asc">Código (A-Z)</option>
              <option value="codigo-desc">Código (Z-A)</option>
              <option value="precio-asc">Precio (menor a mayor)</option>
              <option value="precio-desc">Precio (mayor a menor)</option>
              <option value="sup_m2-asc">Área (menor a mayor)</option>
              <option value="sup_m2-desc">Área (mayor a menor)</option>
              <option value="created_at-desc">Más recientes</option>
              <option value="created_at-asc">Más antiguos</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                showAdvanced
                  ? 'bg-crm-primary text-white border-crm-primary'
                  : 'bg-crm-card border-crm-border text-crm-text-primary hover:bg-crm-card-hover'
              }`}
              title="Filtros avanzados"
            >
              <AdjustmentsHorizontalIcon className="h-4 w-4" />
              {hasAdvancedFilters && (
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

        {/* Panel de filtros avanzados */}
        {showAdvanced && (
          <div className="pt-3 border-t border-crm-border space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-crm-text-primary">
              <FunnelIcon className="h-4 w-4" />
              Filtros Avanzados
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Rango de precios */}
              <div>
                <label className="block text-xs font-medium text-crm-text-muted mb-1.5">
                  Precio Mínimo
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-crm-text-muted text-sm">
                    S/
                  </span>
                  <input
                    type="number"
                    name="precio_min"
                    defaultValue={currentPrecioMin}
                    placeholder="0"
                    min="0"
                    className="w-full pl-8 pr-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-crm-text-muted mb-1.5">
                  Precio Máximo
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-crm-text-muted text-sm">
                    S/
                  </span>
                  <input
                    type="number"
                    name="precio_max"
                    defaultValue={currentPrecioMax}
                    placeholder="999999"
                    min="0"
                    className="w-full pl-8 pr-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
                  />
                </div>
              </div>

              {/* Rango de áreas */}
              <div>
                <label className="block text-xs font-medium text-crm-text-muted mb-1.5">
                  Área Mínima (m²)
                </label>
                <input
                  type="number"
                  name="area_min"
                  defaultValue={currentAreaMin}
                  placeholder="0"
                  min="0"
                  className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-crm-text-muted mb-1.5">
                  Área Máxima (m²)
                </label>
                <input
                  type="number"
                  name="area_max"
                  defaultValue={currentAreaMax}
                  placeholder="9999"
                  min="0"
                  className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
                />
              </div>
            </div>

            {/* Botón limpiar filtros */}
            {hasActiveFilters && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-4 py-2 border border-crm-border rounded-lg text-sm font-medium text-crm-text-secondary hover:bg-crm-card-hover transition-colors flex items-center gap-2"
                >
                  <XMarkIcon className="h-4 w-4" />
                  Limpiar todos los filtros
                </button>
              </div>
            )}
          </div>
        )}
      </form>

      {/* Contador de resultados */}
      <div className="flex items-center justify-between text-sm pt-2 border-t border-crm-border">
        <div className="text-crm-text-muted">
          {hasActiveFilters ? (
            <>
              Mostrando{' '}
              <strong className="text-crm-text-primary">{lotesCount}</strong>{' '}
              de{' '}
              <strong className="text-crm-text-primary">{totalLotes}</strong>{' '}
              lotes
              {currentQ && (
                <span className="ml-2">
                  · Búsqueda: <strong className="text-crm-text-primary">"{currentQ}"</strong>
                </span>
              )}
            </>
          ) : (
            <>
              Total: <strong className="text-crm-text-primary">{totalLotes}</strong> lotes
            </>
          )}
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-crm-primary/10 text-crm-primary rounded text-xs font-medium">
              Filtros activos
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
