"use client";

import { useState } from "react";
import { X, AlertTriangle, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Spinner } from "@/components/ui/Spinner";

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
      toast.error("Debe seleccionar al menos un lote");
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
        toast.error("No se pudo eliminar ningún lote. Revise los errores.");
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4 animate-in fade-in duration-150">
      <div className="bg-crm-card rounded-t-lg sm:rounded-lg shadow-xl sm:max-w-4xl w-full max-h-[92vh] sm:max-h-[90vh] overflow-hidden border-t sm:border border-crm-border flex flex-col pb-[env(safe-area-inset-bottom)] sm:pb-0 animate-in slide-in-from-bottom-4 sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-200">
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <span className="h-1 w-10 rounded-full bg-crm-border" aria-hidden />
        </div>
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
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Advertencia */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-red-900 dark:text-red-200">
                  Advertencia
                </h3>
                <p className="text-xs text-red-800 dark:text-red-300 mt-1">
                  Esta acción no se puede deshacer. Solo se pueden eliminar lotes que no tengan separaciones o ventas asociadas.
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
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
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
                  <Spinner size="sm" color="white" />
                  <span>Eliminando...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar {selectedLotes.size} lote(s)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Modal de confirmación */}
      {showConfirmation && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm sm:p-4 animate-in fade-in duration-150">
          <div className="bg-crm-card rounded-t-lg sm:rounded-lg shadow-2xl sm:max-w-md w-full border-t sm:border border-crm-border pb-[env(safe-area-inset-bottom)] sm:pb-0 animate-in slide-in-from-bottom-4 sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-200">
            <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
              <span className="h-1 w-10 rounded-full bg-crm-border" aria-hidden />
            </div>
            {/* Header */}
            <div className="p-6 border-b border-crm-border">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
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
                ¿Está seguro de que desea eliminar{" "}
                <span className="font-bold text-red-600 dark:text-red-400">
                  {selectedLotes.size} lote(s)
                </span>
                ?
              </p>
              <p className="text-sm text-crm-text-muted mt-3">
                Los lotes que tengan separaciones o ventas asociadas no podrán ser eliminados.
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
                <Trash2 className="w-4 h-4" />
                <span>Sí, Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
