'use client';

import { useRealtimeSearch } from '@/hooks/useRealtimeSearch';
import { useSearchParams } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { Search, X, Clock, Trash2, TrendingUp, Filter, ChevronDown } from 'lucide-react';

interface LotesSearchBarRealtimeProps {
  proyectoId: string;
  totalLotes: number;
  lotesCount: number;
}

/**
 * Barra de búsqueda con funcionalidad en tiempo real para lotes
 *
 * Características:
 * - Búsqueda en tiempo real multi-campo (código, manzana, etapa)
 * - Filtros avanzados con rangos de precio y área
 * - Historial de búsquedas
 * - Indicador de carga
 * - Contador de resultados dinámico
 *
 * @example
 * ```tsx
 * <LotesSearchBarRealtime
 *   proyectoId="abc123"
 *   totalLotes={150}
 *   lotesCount={42}
 * />
 * ```
 */
export default function LotesSearchBarRealtime({
  proyectoId,
  totalLotes,
  lotesCount,
}: LotesSearchBarRealtimeProps) {
  const searchParams = useSearchParams();
  const [showHistory, setShowHistory] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  const {
    searchValue,
    setSearchValue,
    isSearching,
    searchHistory,
    clearHistory,
    removeFromHistory,
    searchNow,
  } = useRealtimeSearch({
    basePath: `/dashboard/proyectos/${proyectoId}`,
    debounceMs: 300,
    minChars: 1,
    preserveParams: ['estado', 'sort', 'precio_min', 'precio_max', 'area_min', 'area_max'],
    historyKey: `lotes-search-history-${proyectoId}`,
    enableHistory: true,
  });

  // Obtener filtros actuales
  const estado = searchParams.get('estado') || '';
  const sort = searchParams.get('sort') || 'codigo-asc';
  const precioMin = searchParams.get('precio_min') || '';
  const precioMax = searchParams.get('precio_max') || '';
  const areaMin = searchParams.get('area_min') || '';
  const areaMax = searchParams.get('area_max') || '';

  // Verificar si hay filtros avanzados activos
  const hasAdvancedFilters = precioMin || precioMax || areaMin || areaMax;
  const hasAnyFilter = searchValue || estado || hasAdvancedFilters;

  // Auto-expandir si hay filtros avanzados
  useEffect(() => {
    if (hasAdvancedFilters) {
      setShowAdvanced(true);
    }
  }, [hasAdvancedFilters]);

  // Cerrar historial al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        historyRef.current &&
        !historyRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowHistory(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClearSearch = () => {
    setSearchValue('');
    inputRef.current?.focus();
  };

  const handleSelectHistory = (query: string) => {
    setSearchValue(query);
    searchNow(query);
    setShowHistory(false);
  };

  const handleClearAllFilters = () => {
    setSearchValue('');
    window.location.href = `/dashboard/proyectos/${proyectoId}`;
  };

  const buildFilterUrl = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    return `/dashboard/proyectos/${proyectoId}?${params.toString()}`;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
      {/* Barra de búsqueda principal */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Input de búsqueda con historial */}
        <div className="flex-1 relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onFocus={() => searchHistory.length > 0 && setShowHistory(true)}
              placeholder="Buscar por código, manzana, etapa..."
              className="w-full pl-10 pr-20 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            {/* Indicador de carga y botón limpiar */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {isSearching && (
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
              )}
              {searchValue && !isSearching && (
                <button
                  onClick={handleClearSearch}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Dropdown de historial */}
          {showHistory && searchHistory.length > 0 && (
            <div
              ref={historyRef}
              className="absolute z-10 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">Búsquedas recientes</span>
                </div>
                <button
                  onClick={() => {
                    clearHistory();
                    setShowHistory(false);
                  }}
                  className="text-xs text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  Limpiar
                </button>
              </div>

              <ul className="py-1">
                {searchHistory.map((query, index) => (
                  <li key={index} className="group">
                    <div className="flex items-center hover:bg-gray-50">
                      <button
                        onClick={() => handleSelectHistory(query)}
                        className="flex-1 px-3 py-2 text-left text-sm text-gray-700 flex items-center gap-2"
                      >
                        <TrendingUp className="h-4 w-4 text-gray-400" />
                        {query}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromHistory(query);
                        }}
                        className="px-2 py-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Eliminar del historial"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Filtros rápidos */}
        <div className="flex gap-2">
          {/* Estado */}
          <select
            value={estado}
            onChange={(e) => {
              window.location.href = buildFilterUrl({ estado: e.target.value });
            }}
            className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Todos</option>
            <option value="disponible">Disponible</option>
            <option value="reservado">Reservado</option>
            <option value="vendido">Vendido</option>
          </select>

          {/* Ordenar */}
          <select
            value={sort}
            onChange={(e) => {
              window.location.href = buildFilterUrl({ sort: e.target.value });
            }}
            className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="codigo-asc">Código ↑</option>
            <option value="codigo-desc">Código ↓</option>
            <option value="precio-asc">Precio ↑</option>
            <option value="precio-desc">Precio ↓</option>
            <option value="sup_m2-asc">Área ↑</option>
            <option value="sup_m2-desc">Área ↓</option>
          </select>

          {/* Botón filtros avanzados */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-4 py-2.5 border rounded-lg font-medium transition-colors flex items-center gap-2 ${
              showAdvanced
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4" />
            Avanzado
            {hasAdvancedFilters && (
              <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {[precioMin, precioMax, areaMin, areaMax].filter(Boolean).length}
              </span>
            )}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Filtros avanzados */}
      {showAdvanced && (
        <div className="border-t border-gray-200 pt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Rango de Precio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rango de Precio
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Mínimo"
                  value={precioMin}
                  onChange={(e) => {
                    window.location.href = buildFilterUrl({ precio_min: e.target.value });
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <span className="flex items-center text-gray-500">-</span>
                <input
                  type="number"
                  placeholder="Máximo"
                  value={precioMax}
                  onChange={(e) => {
                    window.location.href = buildFilterUrl({ precio_max: e.target.value });
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Rango de Área */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rango de Área (m²)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Mínimo"
                  value={areaMin}
                  onChange={(e) => {
                    window.location.href = buildFilterUrl({ area_min: e.target.value });
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <span className="flex items-center text-gray-500">-</span>
                <input
                  type="number"
                  placeholder="Máximo"
                  value={areaMax}
                  onChange={(e) => {
                    window.location.href = buildFilterUrl({ area_max: e.target.value });
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Botón limpiar filtros avanzados */}
          {hasAdvancedFilters && (
            <div className="flex justify-end">
              <button
                onClick={() => {
                  window.location.href = buildFilterUrl({
                    precio_min: '',
                    precio_max: '',
                    area_min: '',
                    area_max: '',
                  });
                }}
                className="text-sm text-gray-600 hover:text-gray-800 underline"
              >
                Limpiar filtros avanzados
              </button>
            </div>
          )}
        </div>
      )}

      {/* Contador de resultados y acciones */}
      <div className="flex items-center justify-between text-sm border-t border-gray-100 pt-3">
        <div className="text-gray-600">
          {hasAnyFilter ? (
            <>
              Mostrando <span className="font-semibold text-gray-900">{lotesCount}</span> de{' '}
              <span className="font-semibold text-gray-900">{totalLotes}</span> lotes
              {searchValue && (
                <span className="text-gray-500 ml-1">
                  para &quot;{searchValue}&quot;
                </span>
              )}
            </>
          ) : (
            <>
              Total: <span className="font-semibold text-gray-900">{totalLotes}</span> lotes
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isSearching && (
            <div className="text-blue-600 flex items-center gap-2">
              <div className="animate-spin h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full" />
              Buscando...
            </div>
          )}

          {hasAnyFilter && (
            <button
              onClick={handleClearAllFilters}
              className="text-gray-600 hover:text-gray-800 underline"
            >
              Limpiar todo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
