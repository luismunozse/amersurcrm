'use client';

import { useRealtimeSearch } from '@/hooks/useRealtimeSearch';
import { useSearchParams } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { Search, X, Clock, Trash2, TrendingUp, Filter } from 'lucide-react';

interface ProyectosSearchBarRealtimeProps {
  totalProyectos: number;
  resultCount?: number;
}

/**
 * Barra de búsqueda con funcionalidad en tiempo real para proyectos
 *
 * Características:
 * - Búsqueda en tiempo real con debouncing (300ms)
 * - Historial de búsquedas guardado en localStorage
 * - Indicador de carga mientras busca
 * - Autocompletado con historial
 * - Limpieza rápida de búsqueda
 *
 * @example
 * ```tsx
 * <ProyectosSearchBarRealtime
 *   totalProyectos={50}
 *   resultCount={12}
 * />
 * ```
 */
export default function ProyectosSearchBarRealtime({
  totalProyectos,
  resultCount,
}: ProyectosSearchBarRealtimeProps) {
  const searchParams = useSearchParams();
  const [showHistory, setShowHistory] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
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
    basePath: '/dashboard/proyectos',
    debounceMs: 300,
    minChars: 2,
    preserveParams: ['estado', 'tipo', 'sort'],
    historyKey: 'proyectos-search-history',
    enableHistory: true,
  });

  // Obtener filtros actuales
  const estado = searchParams.get('estado') || '';
  const tipo = searchParams.get('tipo') || '';
  const sort = searchParams.get('sort') || 'nombre-asc';

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

  const hasActiveFilters = estado || tipo || searchValue;
  const displayResultCount = resultCount !== undefined ? resultCount : totalProyectos;

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
              placeholder="Buscar proyectos en tiempo real..."
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

        {/* Botón de filtros */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2.5 border rounded-lg font-medium transition-colors flex items-center gap-2 ${
            showFilters
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Filter className="h-4 w-4" />
          Filtros
          {hasActiveFilters && (
            <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              {[estado, tipo, searchValue].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Panel de filtros expandible */}
      {showFilters && (
        <div className="border-t border-gray-200 pt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Filtro Estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={estado}
                onChange={(e) => {
                  const params = new URLSearchParams(searchParams.toString());
                  if (e.target.value) {
                    params.set('estado', e.target.value);
                  } else {
                    params.delete('estado');
                  }
                  window.location.href = `/dashboard/proyectos?${params.toString()}`;
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los estados</option>
                <option value="activo">Activo</option>
                <option value="pausado">Pausado</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>

            {/* Filtro Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <select
                value={tipo}
                onChange={(e) => {
                  const params = new URLSearchParams(searchParams.toString());
                  if (e.target.value) {
                    params.set('tipo', e.target.value);
                  } else {
                    params.delete('tipo');
                  }
                  window.location.href = `/dashboard/proyectos?${params.toString()}`;
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los tipos</option>
                <option value="propio">Propio</option>
                <option value="corretaje">Corretaje</option>
              </select>
            </div>

            {/* Ordenamiento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ordenar por
              </label>
              <select
                value={sort}
                onChange={(e) => {
                  const params = new URLSearchParams(searchParams.toString());
                  if (e.target.value !== 'nombre-asc') {
                    params.set('sort', e.target.value);
                  } else {
                    params.delete('sort');
                  }
                  window.location.href = `/dashboard/proyectos?${params.toString()}`;
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="nombre-asc">Nombre (A-Z)</option>
                <option value="nombre-desc">Nombre (Z-A)</option>
                <option value="ubicacion-asc">Ubicación (A-Z)</option>
                <option value="ubicacion-desc">Ubicación (Z-A)</option>
                <option value="created_at-desc">Más recientes</option>
                <option value="created_at-asc">Más antiguos</option>
              </select>
            </div>
          </div>

          {/* Botón limpiar filtros */}
          {hasActiveFilters && (
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setSearchValue('');
                  window.location.href = '/dashboard/proyectos';
                }}
                className="text-sm text-gray-600 hover:text-gray-800 underline"
              >
                Limpiar todos los filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* Contador de resultados */}
      <div className="flex items-center justify-between text-sm text-gray-600 border-t border-gray-100 pt-3">
        <div>
          {searchValue || estado || tipo ? (
            <>
              Mostrando <span className="font-semibold text-gray-900">{displayResultCount}</span> de{' '}
              <span className="font-semibold text-gray-900">{totalProyectos}</span> proyectos
            </>
          ) : (
            <>
              Total: <span className="font-semibold text-gray-900">{totalProyectos}</span> proyectos
            </>
          )}
        </div>

        {isSearching && (
          <div className="text-blue-600 flex items-center gap-2">
            <div className="animate-spin h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full" />
            Buscando...
          </div>
        )}
      </div>
    </div>
  );
}
