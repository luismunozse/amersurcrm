"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "reportes:savedViews:v1";
const MAX_VIEWS = 12;

export interface SavedReportView {
  id: string;
  nombre: string;
  /** Query string sin "?" (ej. "seccion=funnel&periodo=90"). */
  query: string;
  createdAt: number;
}

function leer(): SavedReportView[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is SavedReportView =>
        v && typeof v.id === "string" && typeof v.nombre === "string" && typeof v.query === "string",
    );
  } catch {
    return [];
  }
}

function escribir(views: SavedReportView[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(views.slice(0, MAX_VIEWS)));
  } catch {
    // Ignorar quota errors u otros — feature no-crítica.
  }
}

export interface UseSavedReportViewsResult {
  views: SavedReportView[];
  ready: boolean;
  guardar: (nombre: string, query: string) => SavedReportView | null;
  eliminar: (id: string) => void;
  renombrar: (id: string, nombre: string) => void;
}

export function useSavedReportViews(): UseSavedReportViewsResult {
  const [views, setViews] = useState<SavedReportView[]>([]);
  const [ready, setReady] = useState(false);

  // Hidratar tras mount (evita SSR mismatch)
  useEffect(() => {
    setViews(leer());
    setReady(true);
  }, []);

  // Sync entre tabs del mismo origen
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setViews(leer());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const guardar = useCallback((nombre: string, query: string): SavedReportView | null => {
    const trim = nombre.trim();
    if (!trim) return null;
    const nueva: SavedReportView = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      nombre: trim.slice(0, 60),
      query,
      createdAt: Date.now(),
    };
    setViews((prev) => {
      // Si ya existe una vista con la misma query, reemplazar nombre
      const filtradas = prev.filter((v) => v.query !== query);
      const next = [nueva, ...filtradas].slice(0, MAX_VIEWS);
      escribir(next);
      return next;
    });
    return nueva;
  }, []);

  const eliminar = useCallback((id: string) => {
    setViews((prev) => {
      const next = prev.filter((v) => v.id !== id);
      escribir(next);
      return next;
    });
  }, []);

  const renombrar = useCallback((id: string, nombre: string) => {
    const trim = nombre.trim().slice(0, 60);
    if (!trim) return;
    setViews((prev) => {
      const next = prev.map((v) => (v.id === id ? { ...v, nombre: trim } : v));
      escribir(next);
      return next;
    });
  }, []);

  return { views, ready, guardar, eliminar, renombrar };
}
