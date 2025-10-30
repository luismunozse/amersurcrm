'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Configuración para el hook de búsqueda en tiempo real
 */
export interface UseRealtimeSearchOptions {
  /** Tiempo de espera en ms antes de ejecutar la búsqueda (default: 300ms) */
  debounceMs?: number;
  /** Número mínimo de caracteres para activar la búsqueda (default: 2) */
  minChars?: number;
  /** Ruta base para la navegación */
  basePath: string;
  /** Parámetros adicionales a preservar en la URL */
  preserveParams?: string[];
  /** Callback cuando la búsqueda se ejecuta */
  onSearch?: (query: string) => void;
  /** Habilitar historial de búsquedas (default: true) */
  enableHistory?: boolean;
  /** Clave para el historial en localStorage */
  historyKey?: string;
}

/**
 * Resultado del hook useRealtimeSearch
 */
export interface UseRealtimeSearchReturn {
  /** Valor actual de la búsqueda */
  searchValue: string;
  /** Función para actualizar el valor de búsqueda */
  setSearchValue: (value: string) => void;
  /** Indica si hay una búsqueda en progreso */
  isSearching: boolean;
  /** Historial de búsquedas recientes */
  searchHistory: string[];
  /** Limpiar el historial de búsquedas */
  clearHistory: () => void;
  /** Eliminar un elemento del historial */
  removeFromHistory: (query: string) => void;
  /** Ejecutar búsqueda inmediata sin debounce */
  searchNow: (query?: string) => void;
}

/**
 * Custom hook para búsqueda en tiempo real con debouncing
 *
 * @example
 * ```tsx
 * const { searchValue, setSearchValue, isSearching, searchHistory } = useRealtimeSearch({
 *   basePath: '/dashboard/proyectos',
 *   debounceMs: 300,
 *   minChars: 2,
 *   historyKey: 'proyectos-search-history'
 * });
 *
 * return (
 *   <input
 *     value={searchValue}
 *     onChange={(e) => setSearchValue(e.target.value)}
 *     placeholder="Buscar..."
 *   />
 * );
 * ```
 */
export function useRealtimeSearch(options: UseRealtimeSearchOptions): UseRealtimeSearchReturn {
  const {
    debounceMs = 300,
    minChars = 2,
    basePath,
    preserveParams = [],
    onSearch,
    enableHistory = true,
    historyKey = 'default-search-history',
  } = options;

  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(() => searchParams.get('q') || '');
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cargar historial de búsquedas desde localStorage
  useEffect(() => {
    if (enableHistory && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(historyKey);
        if (stored) {
          const history = JSON.parse(stored);
          setSearchHistory(Array.isArray(history) ? history : []);
        }
      } catch (error) {
        console.error('Error loading search history:', error);
      }
    }
  }, [enableHistory, historyKey]);

  /**
   * Guardar búsqueda en el historial
   */
  const saveToHistory = useCallback((query: string) => {
    if (!enableHistory || !query.trim() || query.length < minChars) return;

    setSearchHistory((prev) => {
      // Eliminar duplicados y agregar al inicio
      const updated = [query, ...prev.filter((item) => item !== query)];
      // Limitar a 10 elementos
      const limited = updated.slice(0, 10);

      // Guardar en localStorage
      try {
        localStorage.setItem(historyKey, JSON.stringify(limited));
      } catch (error) {
        console.error('Error saving search history:', error);
      }

      return limited;
    });
  }, [enableHistory, historyKey, minChars]);

  /**
   * Limpiar todo el historial
   */
  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    try {
      localStorage.removeItem(historyKey);
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  }, [historyKey]);

  /**
   * Eliminar un elemento específico del historial
   */
  const removeFromHistory = useCallback((query: string) => {
    setSearchHistory((prev) => {
      const updated = prev.filter((item) => item !== query);
      try {
        localStorage.setItem(historyKey, JSON.stringify(updated));
      } catch (error) {
        console.error('Error removing from search history:', error);
      }
      return updated;
    });
  }, [historyKey]);

  /**
   * Ejecutar la búsqueda navegando a la URL con los parámetros
   */
  const executeSearch = useCallback((query: string) => {
    const params = new URLSearchParams();

    // Preservar parámetros especificados
    preserveParams.forEach((param) => {
      const value = searchParams.get(param);
      if (value) params.set(param, value);
    });

    // Agregar query si cumple con el mínimo de caracteres
    const trimmedQuery = query.trim();
    if (trimmedQuery && trimmedQuery.length >= minChars) {
      params.set('q', trimmedQuery);
      saveToHistory(trimmedQuery);
    }

    // Navegar a la nueva URL
    const queryString = params.toString();
    const newPath = queryString ? `${basePath}?${queryString}` : basePath;

    router.push(newPath);
    setIsSearching(false);

    // Callback opcional
    if (onSearch) {
      onSearch(trimmedQuery);
    }
  }, [basePath, preserveParams, searchParams, router, minChars, onSearch, saveToHistory]);

  /**
   * Búsqueda inmediata sin debounce
   */
  const searchNow = useCallback((query?: string) => {
    const searchQuery = query !== undefined ? query : searchValue;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setIsSearching(true);
    executeSearch(searchQuery);
  }, [searchValue, executeSearch]);

  /**
   * Effect para manejar el debouncing de la búsqueda
   */
  useEffect(() => {
    // Limpiar timeout anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Si el valor está vacío, ejecutar inmediatamente
    if (searchValue === '') {
      executeSearch('');
      return;
    }

    // Si cumple con el mínimo de caracteres, iniciar el debounce
    if (searchValue.length >= minChars) {
      setIsSearching(true);
      debounceTimerRef.current = setTimeout(() => {
        executeSearch(searchValue);
      }, debounceMs);
    }

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchValue, debounceMs, minChars, executeSearch]);

  return {
    searchValue,
    setSearchValue,
    isSearching,
    searchHistory,
    clearHistory,
    removeFromHistory,
    searchNow,
  };
}

/**
 * Hook simplificado para búsqueda en tiempo real sin opciones avanzadas
 */
export function useSimpleRealtimeSearch(basePath: string, debounceMs = 300) {
  return useRealtimeSearch({
    basePath,
    debounceMs,
    minChars: 1,
    enableHistory: false,
  });
}
