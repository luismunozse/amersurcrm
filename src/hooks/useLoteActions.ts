/**
 * Custom hook for managing Lote operations
 */

import { useState, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import type {
  Lote,
  LoteFormData,
  LoteActionResponse,
  LoteCoordenadas,
} from '@/types/proyectos';
import { loteFormSchema, loteCoordinatesSchema, validateWithSchema, getZodErrorMessages } from '@/lib/validations/proyectos';

interface UseLoteActionsOptions {
  proyectoId: string;
  onSuccess?: (lote: Lote) => void;
  onError?: (error: string) => void;
}

interface UseLoteActionsReturn {
  isLoading: boolean;
  error: string | null;
  createLote: (data: LoteFormData) => Promise<Lote | null>;
  updateLote: (loteId: string, data: Partial<LoteFormData>) => Promise<Lote | null>;
  deleteLote: (loteId: string) => Promise<boolean>;
  updateCoordinates: (loteId: string, coordenadas: LoteCoordenadas) => Promise<boolean>;
  clearError: () => void;
}

/**
 * Hook para gestionar operaciones CRUD de lotes
 */
export function useLoteActions(options: UseLoteActionsOptions): UseLoteActionsReturn {
  const { proyectoId, onSuccess, onError } = options;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const buildCreateFormData = useCallback((data: LoteFormData) => {
    const fd = new FormData();
    fd.set('proyecto_id', proyectoId);
    fd.set('codigo', data.numero_lote);
    fd.set('estado', data.estado ?? 'disponible');
    fd.set('moneda', 'PEN');
    if (typeof data.area === 'number') {
      fd.set('sup_m2', data.area.toString());
    }
    if (typeof data.precio_lista === 'number') {
      fd.set('precio', data.precio_lista.toString());
    }
    if (data.coordenadas) {
      fd.set('plano_poligono', JSON.stringify(data.coordenadas.coordinates));
    }

    const extra: Record<string, unknown> = {};
    if (data.etapa) extra.etapa = data.etapa;
    if (data.manzana) extra.manzana = data.manzana;
    if (data.descripcion) extra.descripcion = data.descripcion;
    if (typeof data.precio_venta === 'number') extra.precio_venta = data.precio_venta;
    if (data.caracteristicas) extra.caracteristicas = data.caracteristicas;
    if (Object.keys(extra).length > 0) {
      fd.set('data', JSON.stringify(extra));
    }

    return fd;
  }, [proyectoId]);

  const buildUpdateFormData = useCallback((data: Partial<LoteFormData>) => {
    const fd = new FormData();
    fd.set('proyecto_id', proyectoId);
    if (data.numero_lote !== undefined) {
      fd.set('codigo', data.numero_lote ?? '');
    }
    if (data.area !== undefined) {
      if (data.area === null) {
        fd.set('sup_m2', '');
      } else {
        fd.set('sup_m2', data.area.toString());
      }
    }
    if (data.precio_lista !== undefined) {
      if (data.precio_lista === null) {
        fd.set('precio', '');
      } else {
        fd.set('precio', data.precio_lista.toString());
      }
    }
    if (data.estado !== undefined) {
      fd.set('estado', data.estado ?? 'disponible');
    }
    if (data.coordenadas) {
      fd.set('plano_poligono', JSON.stringify(data.coordenadas.coordinates));
    }

    const extra: Record<string, unknown> = {};
    if (data.etapa !== undefined) extra.etapa = data.etapa;
    if (data.manzana !== undefined) extra.manzana = data.manzana;
    if (data.descripcion !== undefined) extra.descripcion = data.descripcion;
    if (data.precio_venta !== undefined) extra.precio_venta = data.precio_venta;
    if (data.caracteristicas !== undefined) extra.caracteristicas = data.caracteristicas;
    if (Object.keys(extra).length > 0) {
      fd.set('data', JSON.stringify(extra));
    }

    return fd;
  }, [proyectoId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const createLote = useCallback(
    async (data: LoteFormData): Promise<Lote | null> => {
      return new Promise((resolve) => {
        startTransition(async () => {
          try {
            setError(null);

            // Validate data
            const validation = validateWithSchema(loteFormSchema, data);
            if (!validation.success) {
              const errorMessages = getZodErrorMessages(validation.error);
              const errorMsg = errorMessages.join(', ');
              setError(errorMsg);
              toast.error(errorMsg);
              onError?.(errorMsg);
              resolve(null);
              return;
            }

            const { crearLote } = await import('@/app/dashboard/proyectos/[id]/_actions');

            const formData = buildCreateFormData(validation.data);
            const result = await crearLote(formData);

            if (!result?.success || !result.lote) {
              const errorMsg = (result as { message?: string })?.message || 'Error al crear el lote';
              setError(errorMsg);
              toast.error(errorMsg);
              onError?.(errorMsg);
              resolve(null);
              return;
            }

            toast.success('Lote creado exitosamente');
            onSuccess?.(result.lote as Lote);
            router.refresh();
            resolve(result.lote as Lote);
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Error inesperado al crear lote';
            setError(errorMsg);
            toast.error(errorMsg);
            onError?.(errorMsg);
            resolve(null);
          }
        });
      });
    },
    [proyectoId, onSuccess, onError, router, buildCreateFormData]
  );

  const updateLote = useCallback(
    async (loteId: string, data: Partial<LoteFormData>): Promise<Lote | null> => {
      return new Promise((resolve) => {
        startTransition(async () => {
          try {
            setError(null);

            // Import the action dynamically
            const { actualizarLote } = await import('@/app/dashboard/proyectos/[id]/_actions');

            const formData = buildUpdateFormData(data);
            const result = await actualizarLote(loteId, formData);

            toast.success('Lote actualizado exitosamente');
            router.refresh();
            onSuccess?.(result?.lote as Lote);
            resolve((result?.lote as Lote) ?? null);
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Error inesperado al actualizar lote';
            setError(errorMsg);
            toast.error(errorMsg);
            onError?.(errorMsg);
            resolve(null);
          }
        });
      });
    },
    [onSuccess, onError, router, buildUpdateFormData]
  );

  const deleteLote = useCallback(
    async (loteId: string): Promise<boolean> => {
      return new Promise((resolve) => {
        startTransition(async () => {
          try {
            setError(null);

            // Import the action dynamically
            const { eliminarLote } = await import('@/app/dashboard/proyectos/[id]/_actions');

            const result = await eliminarLote(loteId, proyectoId);

            if (!result?.success) {
              const errorMsg = (result as { message?: string })?.message || 'Error al eliminar el lote';
              setError(errorMsg);
              toast.error(errorMsg);
              onError?.(errorMsg);
              resolve(false);
              return;
            }

            toast.success('Lote eliminado exitosamente');
            router.refresh();
            resolve(true);
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Error inesperado al eliminar lote';
            setError(errorMsg);
            toast.error(errorMsg);
            onError?.(errorMsg);
            resolve(false);
          }
        });
      });
    },
    [onError, router]
  );

  const updateCoordinates = useCallback(
    async (loteId: string, coordenadas: LoteCoordenadas): Promise<boolean> => {
      return new Promise((resolve) => {
        startTransition(async () => {
          try {
            setError(null);

            // Validate coordinates
            const validation = validateWithSchema(loteCoordinatesSchema, {
              lote_id: loteId,
              coordenadas,
            });

            if (!validation.success) {
              const errorMessages = getZodErrorMessages(validation.error);
              const errorMsg = errorMessages.join(', ');
              setError(errorMsg);
              toast.error(errorMsg);
              onError?.(errorMsg);
              resolve(false);
              return;
            }

            // Import the action dynamically
            const { guardarCoordenadasLote } = await import('@/app/dashboard/proyectos/[id]/_actions');

            const result = await guardarCoordenadasLote(loteId, coordenadas);

            if (!result.success) {
              const errorMsg = result.message || 'Error al guardar coordenadas';
              setError(errorMsg);
              toast.error(errorMsg);
              onError?.(errorMsg);
              resolve(false);
              return;
            }

            toast.success('Coordenadas guardadas exitosamente');
            router.refresh();
            resolve(true);
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Error inesperado al guardar coordenadas';
            setError(errorMsg);
            toast.error(errorMsg);
            onError?.(errorMsg);
            resolve(false);
          }
        });
      });
    },
    [onError, router]
  );

  return {
    isLoading: isPending,
    error,
    createLote,
    updateLote,
    deleteLote,
    updateCoordinates,
    clearError,
  };
}

/**
 * Hook para gestionar el estado de selección y hover de lotes
 */
export function useLoteSelection() {
  const [selectedLoteId, setSelectedLoteId] = useState<string | null>(null);
  const [hoveredLoteId, setHoveredLoteId] = useState<string | null>(null);

  const selectLote = useCallback((loteId: string | null) => {
    setSelectedLoteId(loteId);
  }, []);

  const hoverLote = useCallback((loteId: string | null) => {
    setHoveredLoteId(loteId);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedLoteId(null);
    setHoveredLoteId(null);
  }, []);

  return {
    selectedLoteId,
    hoveredLoteId,
    selectLote,
    hoverLote,
    clearSelection,
  };
}

/**
 * Hook para gestionar filtros de lotes
 */
export function useLoteFilters(initialLotes: Lote[]) {
  const [filteredLotes, setFilteredLotes] = useState<Lote[]>(initialLotes);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string[]>([]);
  const [etapaFilter, setEtapaFilter] = useState<string[]>([]);

  const applyFilters = useCallback(() => {
    let result = [...initialLotes];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (lote) =>
          lote.numero_lote.toLowerCase().includes(term) ||
          lote.manzana?.toLowerCase().includes(term) ||
          lote.etapa?.toLowerCase().includes(term)
      );
    }

    // Filter by estado
    if (estadoFilter.length > 0) {
      result = result.filter((lote) => estadoFilter.includes(lote.estado));
    }

    // Filter by etapa
    if (etapaFilter.length > 0) {
      result = result.filter((lote) => lote.etapa && etapaFilter.includes(lote.etapa));
    }

    setFilteredLotes(result);
  }, [initialLotes, searchTerm, estadoFilter, etapaFilter]);

  // Apply filters whenever dependencies change
  useState(() => {
    applyFilters();
  });

  const updateSearchTerm = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const updateEstadoFilter = useCallback((estados: string[]) => {
    setEstadoFilter(estados);
  }, []);

  const updateEtapaFilter = useCallback((etapas: string[]) => {
    setEtapaFilter(etapas);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setEstadoFilter([]);
    setEtapaFilter([]);
  }, []);

  return {
    filteredLotes,
    searchTerm,
    estadoFilter,
    etapaFilter,
    updateSearchTerm,
    updateEstadoFilter,
    updateEtapaFilter,
    clearFilters,
    applyFilters,
  };
}

/**
 * Hook para ordenar lotes
 */
export function useLoteSort(lotes: Lote[]) {
  const [sortedLotes, setSortedLotes] = useState<Lote[]>(lotes);
  const [sortField, setSortField] = useState<keyof Lote>('numero_lote');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const sortLotes = useCallback(
    (field: keyof Lote, order: 'asc' | 'desc' = sortOrder) => {
      const sorted = [...lotes].sort((a, b) => {
        const aValue = a[field];
        const bValue = b[field];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return order === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return order === 'asc' ? aValue - bValue : bValue - aValue;
        }

        return 0;
      });

      setSortedLotes(sorted);
      setSortField(field);
      setSortOrder(order);
    },
    [lotes, sortOrder]
  );

  const toggleSort = useCallback(
    (field: keyof Lote) => {
      const newOrder = field === sortField && sortOrder === 'asc' ? 'desc' : 'asc';
      sortLotes(field, newOrder);
    },
    [sortField, sortOrder, sortLotes]
  );

  return {
    sortedLotes,
    sortField,
    sortOrder,
    sortLotes,
    toggleSort,
  };
}
