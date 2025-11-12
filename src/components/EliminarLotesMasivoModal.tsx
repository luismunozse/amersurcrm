"use client";

import { useState } from "react";
import toast from "react-hot-toast";

interface Lote {
  id: string;
  codigo: string;
  sup_m2: number | null;
  precio: number | null;
  estado: string;
}

interface EliminarLotesMasivoModalProps {
  proyectoId: string;
  proyectoNombre: string;
  lotes: Lote[];
  onClose: () => void;
  onSuccess: () => void;
}

interface DeleteResult {
  success: boolean;
  total: number;
  deleted: number;
  errors: Array<{
    lote_id: string;
    codigo?: string;
    error: string;
  }>;
}

export default function EliminarLotesMasivoModal({
  proyectoId,
  proyectoNombre,
  lotes,
  onClose,
  onSuccess,
}: EliminarLotesMasivoModalProps) {
  const [selectedLotes, setSelectedLotes] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [result, setResult] = useState<DeleteResult | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Filtrar lotes por búsqueda
  const filteredLotes = lotes.filter((lote) =>
    lote.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleLote = (loteId: string) => {
    const newSelected = new Set(selectedLotes);
    if (newSelected.has(loteId)) {
      newSelected.delete(loteId);
    } else {
      newSelected.add(loteId);
    }
    setSelectedLotes(newSelected);
  };

  const toggleAll = () => {
    if (selectedLotes.size === filteredLotes.length) {
      setSelectedLotes(new Set());
    } else {
      setSelectedLotes(new Set(filteredLotes.map((l) => l.id)));
    }
  };

  const handleDeleteClick = () => {
    if (selectedLotes.size === 0) {
      toast.error("Debes seleccionar al menos un lote");
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirmDelete = async () => {
    setShowConfirmation(false);
    setIsDeleting(true);

    try {
      const response = await fetch("/api/lotes/eliminar-masivo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lote_ids: Array.from(selectedLotes),
          proyecto_id: proyectoId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al eliminar lotes");
      }

      setResult(data);

      if (data.success && data.deleted > 0) {
        toast.success(
          `Se eliminaron ${data.deleted} de ${data.total} lotes correctamente`
        );
        // Esperar un momento antes de cerrar para que el usuario vea el resultado
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        toast.error("No se pudo eliminar ningún lote. Revisa los errores.");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al eliminar lotes"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-crm-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-crm-border flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-crm-border">
          <div>
            <h2 className="text-xl font-bold text-crm-text-primary">
              Eliminar Lotes Masivamente
            </h2>
            <p className="text-sm text-crm-text-muted mt-1">
              Proyecto: {proyectoNombre}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-crm-text-muted hover:text-crm-text-primary transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Advertencia */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-red-900 dark:text-red-200">
                  Advertencia
                </h3>
                <p className="text-xs text-red-800 dark:text-red-300 mt-1">
                  Esta acción no se puede deshacer. Solo se pueden eliminar lotes que no tengan reservas o ventas asociadas.
                </p>
              </div>
            </div>
          </div>

          {/* Búsqueda y estadísticas */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar por código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
              />
            </div>
            <div className="text-sm text-crm-text-secondary">
              {selectedLotes.size} de {filteredLotes.length} seleccionados
            </div>
          </div>

          {/* Tabla de lotes */}
          <div className="border border-crm-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-crm-card-hover">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedLotes.size === filteredLotes.length && filteredLotes.length > 0}
                      onChange={toggleAll}
                      className="w-4 h-4 text-crm-primary focus:ring-crm-primary border-crm-border rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-crm-text-secondary uppercase">
                    Código
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-crm-text-secondary uppercase">
                    Superficie
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-crm-text-secondary uppercase">
                    Precio
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-crm-text-secondary uppercase">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-crm-border">
                {filteredLotes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-crm-text-muted">
                      No hay lotes disponibles
                    </td>
                  </tr>
                ) : (
                  filteredLotes.map((lote) => (
                    <tr
                      key={lote.id}
                      className={`hover:bg-crm-card-hover cursor-pointer ${
                        selectedLotes.has(lote.id) ? "bg-crm-primary/5" : ""
                      }`}
                      onClick={() => toggleLote(lote.id)}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedLotes.has(lote.id)}
                          onChange={() => toggleLote(lote.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-crm-primary focus:ring-crm-primary border-crm-border rounded"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-crm-text-primary">
                        {lote.codigo}
                      </td>
                      <td className="px-4 py-3 text-sm text-crm-text-secondary">
                        {lote.sup_m2 ? `${lote.sup_m2} m²` : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-crm-text-secondary">
                        {lote.precio ? `S/ ${lote.precio.toLocaleString()}` : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            lote.estado === "disponible"
                              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                              : lote.estado === "reservado"
                              ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                              : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                          }`}
                        >
                          {lote.estado.charAt(0).toUpperCase() + lote.estado.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Resultado de la eliminación */}
          {result && (
            <div className={`rounded-lg p-4 border ${
              result.success
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
            }`}>
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 ${
                  result.success ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                }`}>
                  {result.success ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className={`text-sm font-semibold ${
                    result.success
                      ? "text-green-900 dark:text-green-200"
                      : "text-red-900 dark:text-red-200"
                  }`}>
                    {result.success
                      ? `Eliminación completada: ${result.deleted}/${result.total} lotes`
                      : "Error en la eliminación"}
                  </h4>

                  {result.errors.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-crm-text-secondary">
                        Errores encontrados:
                      </p>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {result.errors.map((error, idx) => (
                          <div
                            key={idx}
                            className="text-xs bg-white/50 dark:bg-black/20 rounded p-2"
                          >
                            {error.codigo && (
                              <span className="font-medium">{error.codigo}: </span>
                            )}
                            <span className="text-red-600 dark:text-red-400">
                              {error.error}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-crm-border">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-crm-text-secondary bg-crm-card-hover hover:bg-crm-border rounded-lg transition-all"
            disabled={isDeleting}
          >
            {result?.success ? "Cerrar" : "Cancelar"}
          </button>
          {!result?.success && (
            <button
              onClick={handleDeleteClick}
              disabled={selectedLotes.size === 0 || isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isDeleting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Eliminando...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Eliminar {selectedLotes.size} lote(s)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Modal de confirmación */}
      {showConfirmation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-crm-card rounded-lg shadow-2xl max-w-md w-full border border-crm-border">
            {/* Header */}
            <div className="p-6 border-b border-crm-border">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-crm-text-primary">
                    Confirmar Eliminación
                  </h3>
                  <p className="text-sm text-crm-text-muted mt-1">
                    Esta acción no se puede deshacer
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-crm-text-primary">
                ¿Estás seguro de que deseas eliminar{" "}
                <span className="font-bold text-red-600 dark:text-red-400">
                  {selectedLotes.size} lote(s)
                </span>
                ?
              </p>
              <p className="text-sm text-crm-text-muted mt-3">
                Los lotes que tengan reservas o ventas asociadas no podrán ser eliminados.
              </p>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-crm-border bg-crm-card-hover/50">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-6 py-2 text-sm font-medium text-crm-text-secondary bg-crm-card hover:bg-crm-border rounded-lg transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Sí, Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
