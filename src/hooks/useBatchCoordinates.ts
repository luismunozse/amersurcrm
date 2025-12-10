/**
 * Hook for batch coordinate updates
 *
 * Provides functionality to update coordinates for multiple lotes in a single operation.
 * Useful for bulk import/update scenarios.
 */

import { useState, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import type { LoteCoordenadas as _LoteCoordenadas, BatchCoordinateUpdate } from '@/types/proyectos';
import { batchCoordinatesSchema, validateWithSchema, getZodErrorMessages } from '@/lib/validations/proyectos';

interface UseBatchCoordinatesOptions {
  proyectoId: string;
  onSuccess?: (successCount: number) => void;
  onError?: (error: string) => void;
  onProgress?: (current: number, total: number) => void;
}

interface BatchUpdateResult {
  successCount: number;
  failedCount: number;
  errors: Array<{ loteId: string; error: string }>;
}

interface UseBatchCoordinatesReturn {
  isProcessing: boolean;
  progress: { current: number; total: number } | null;
  updateBatch: (updates: BatchCoordinateUpdate) => Promise<BatchUpdateResult>;
  updateSequential: (updates: BatchCoordinateUpdate) => Promise<BatchUpdateResult>;
  cancelBatch: () => void;
}

/**
 * Hook for managing batch coordinate updates
 */
export function useBatchCoordinates(options: UseBatchCoordinatesOptions): UseBatchCoordinatesReturn {
  const { proyectoId: _proyectoId, onSuccess, onError, onProgress } = options;
  const [isPending, startTransition] = useTransition();
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [isCancelled, setIsCancelled] = useState(false);
  const router = useRouter();

  /**
   * Updates all coordinates in a single batch operation
   * More efficient but all-or-nothing
   */
  const updateBatch = useCallback(
    async (updates: BatchCoordinateUpdate): Promise<BatchUpdateResult> => {
      return new Promise((resolve) => {
        startTransition(async () => {
          try {
            setIsCancelled(false);
            setProgress({ current: 0, total: updates.updates.length });

            // Validate the batch
            const validation = validateWithSchema(batchCoordinatesSchema, updates);
            if (!validation.success) {
              const errorMessages = getZodErrorMessages(validation.error);
              const errorMsg = `Errores de validación: ${errorMessages.join(', ')}`;
              toast.error(errorMsg);
              onError?.(errorMsg);
              setProgress(null);
              resolve({
                successCount: 0,
                failedCount: updates.updates.length,
                errors: [{ loteId: 'all', error: errorMsg }],
              });
              return;
            }

            // Import the action dynamically
            const { actualizarCoordenadasBatch } = await import('@/app/dashboard/proyectos/[id]/_actionsBatch');

            setProgress({ current: 1, total: updates.updates.length });
            onProgress?.(1, updates.updates.length);

            const result = await actualizarCoordenadasBatch(updates.updates);

            setProgress(null);

            if (!result.success) {
              const errorMsg = `Error en actualización por lotes: ${result.errors.join(', ')}`;
              toast.error(errorMsg);
              onError?.(errorMsg);
              resolve({
                successCount: result.successCount,
                failedCount: updates.updates.length - result.successCount,
                errors: result.errors.map((err) => ({ loteId: 'unknown', error: err })),
              });
              return;
            }

            toast.success(`${result.successCount} lotes actualizados exitosamente`);
            onSuccess?.(result.successCount);
            router.refresh();

            resolve({
              successCount: result.successCount,
              failedCount: result.errors.length,
              errors: result.errors.map((err) => ({ loteId: 'unknown', error: err })),
            });
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Error inesperado en actualización por lotes';
            toast.error(errorMsg);
            onError?.(errorMsg);
            setProgress(null);
            resolve({
              successCount: 0,
              failedCount: updates.updates.length,
              errors: [{ loteId: 'all', error: errorMsg }],
            });
          }
        });
      });
    },
    [onSuccess, onError, onProgress, router]
  );

  /**
   * Updates coordinates sequentially with progress tracking
   * Slower but provides better error handling and progress feedback
   */
  const updateSequential = useCallback(
    async (updates: BatchCoordinateUpdate): Promise<BatchUpdateResult> => {
      return new Promise((resolve) => {
        startTransition(async () => {
          try {
            setIsCancelled(false);
            const total = updates.updates.length;
            setProgress({ current: 0, total });

            // Validate the batch
            const validation = validateWithSchema(batchCoordinatesSchema, updates);
            if (!validation.success) {
              const errorMessages = getZodErrorMessages(validation.error);
              const errorMsg = `Errores de validación: ${errorMessages.join(', ')}`;
              toast.error(errorMsg);
              onError?.(errorMsg);
              setProgress(null);
              resolve({
                successCount: 0,
                failedCount: total,
                errors: [{ loteId: 'all', error: errorMsg }],
              });
              return;
            }

            // Import the action dynamically
            const { guardarCoordenadasLote } = await import('@/app/dashboard/proyectos/[id]/_actions');

            let successCount = 0;
            const errors: Array<{ loteId: string; error: string }> = [];

            // Process each update sequentially
            for (let i = 0; i < updates.updates.length; i++) {
              if (isCancelled) {
                toast('Operación cancelada por el usuario', { icon: '⚠️' });
                break;
              }

              const update = updates.updates[i];
              setProgress({ current: i + 1, total });
              onProgress?.(i + 1, total);

              try {
                const result = await guardarCoordenadasLote(update.lote_id, update.coordenadas);

                if (result.success) {
                  successCount++;
                } else {
                  errors.push({
                    loteId: update.lote_id,
                    error: 'Error desconocido',
                  });
                }
              } catch (err) {
                errors.push({
                  loteId: update.lote_id,
                  error: err instanceof Error ? err.message : 'Error desconocido',
                });
              }

              // Small delay to avoid overwhelming the server
              if (i < updates.updates.length - 1) {
                await new Promise((r) => setTimeout(r, 100));
              }
            }

            setProgress(null);

            if (successCount > 0) {
              toast.success(`${successCount} de ${total} lotes actualizados exitosamente`);
              onSuccess?.(successCount);
              router.refresh();
            }

            if (errors.length > 0) {
              const errorMsg = `${errors.length} lotes fallaron`;
              toast.error(errorMsg);
              onError?.(errorMsg);
            }

            resolve({
              successCount,
              failedCount: errors.length,
              errors,
            });
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Error inesperado en actualización secuencial';
            toast.error(errorMsg);
            onError?.(errorMsg);
            setProgress(null);
            resolve({
              successCount: 0,
              failedCount: updates.updates.length,
              errors: [{ loteId: 'all', error: errorMsg }],
            });
          }
        });
      });
    },
    [isCancelled, onSuccess, onError, onProgress, router]
  );

  const cancelBatch = useCallback(() => {
    setIsCancelled(true);
  }, []);

  return {
    isProcessing: isPending,
    progress,
    updateBatch,
    updateSequential,
    cancelBatch,
  };
}

/**
 * Helper function to create batch update from CSV/Excel data
 */
export function createBatchFromData(
  data: Array<{
    lote_id: string;
    coordinates: number[][] | string;
  }>
): BatchCoordinateUpdate {
  const updates = data.map((row) => {
    let coordinates: number[][];

    if (typeof row.coordinates === 'string') {
      try {
        coordinates = JSON.parse(row.coordinates);
      } catch {
        throw new Error(`Invalid coordinates format for lote ${row.lote_id}`);
      }
    } else {
      coordinates = row.coordinates;
    }

    // Ensure polygon is closed
    if (coordinates.length > 0) {
      const first = coordinates[0];
      const last = coordinates[coordinates.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        coordinates.push([...first]);
      }
    }

    return {
      lote_id: row.lote_id,
      coordenadas: {
        type: 'polygon' as const,
        coordinates: [coordinates],
      },
    };
  });

  return { updates };
}

/**
 * Helper function to validate batch before processing
 */
export function validateBatchData(
  updates: BatchCoordinateUpdate
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!updates.updates || updates.updates.length === 0) {
    errors.push('No updates provided');
    return { valid: false, errors };
  }

  updates.updates.forEach((update, index) => {
    if (!update.lote_id) {
      errors.push(`Update ${index + 1}: Missing lote_id`);
    }

    if (!update.coordenadas) {
      errors.push(`Update ${index + 1}: Missing coordenadas`);
    } else {
      if (update.coordenadas.type !== 'polygon') {
        errors.push(`Update ${index + 1}: Invalid coordinate type (must be 'polygon')`);
      }

      if (
        !update.coordenadas.coordinates ||
        !Array.isArray(update.coordenadas.coordinates) ||
        update.coordenadas.coordinates.length === 0
      ) {
        errors.push(`Update ${index + 1}: Invalid coordinates array`);
      } else {
        const coords = update.coordenadas.coordinates[0];
        if (!coords || coords.length < 3) {
          errors.push(`Update ${index + 1}: Polygon must have at least 3 points`);
        }
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
