"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Client-side cache for report data.
 * Prevents redundant server calls when switching between tabs.
 * Cache TTL: 2 minutes.
 */
const reportCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

function getCacheKey(action: string, params: Record<string, any>): string {
  return `${action}:${JSON.stringify(params)}`;
}

function getCached<T>(key: string): T | null {
  const entry = reportCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    reportCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: any): void {
  reportCache.set(key, { data, timestamp: Date.now() });
}

/** Clear all report caches (useful when period changes) */
export function clearReportCache(): void {
  reportCache.clear();
}

interface UseReporteDataOptions<T> {
  /** The server action to call */
  action: (...args: any[]) => Promise<{ data: T | null; error: string | null }>;
  /** Parameters to pass to the action */
  params: any[];
  /** Unique key prefix for caching */
  cacheKey: string;
  /** Whether to load automatically (default: true) */
  autoLoad?: boolean;
}

/**
 * Generic hook for loading report data with client-side caching.
 * Prevents redundant fetches when switching tabs and back.
 */
export function useReporteData<T>({
  action,
  params,
  cacheKey,
  autoLoad = true,
}: UseReporteDataOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fullCacheKey = getCacheKey(cacheKey, params.reduce((acc, p, i) => ({ ...acc, [i]: p }), {}));

  const cargarDatos = useCallback(async (skipCache = false) => {
    // Check cache first
    if (!skipCache) {
      const cached = getCached<T>(fullCacheKey);
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const result = await action(...params);

      if (!mountedRef.current) return;

      if (result.data) {
        setData(result.data);
        setCache(fullCacheKey, result.data);
      } else {
        setError(result.error || 'Error cargando datos');
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullCacheKey]);

  const recargar = useCallback(() => {
    void cargarDatos(true); // skip cache on manual reload
  }, [cargarDatos]);

  useEffect(() => {
    mountedRef.current = true;
    if (autoLoad) {
      void cargarDatos();
    }
    return () => { mountedRef.current = false; };
  }, [autoLoad, cargarDatos]);

  return { data, loading, error, recargar };
}
