"use client";

import { Trash2 } from "lucide-react";

interface EliminarVendedoresMultipleModalProps {
  open: boolean;
  onClose: () => void;
  cantidad: number;
  onConfirm: () => void;
}

export default function EliminarVendedoresMultipleModal({
  open,
  onClose,
  cantidad,
  onConfirm,
}: EliminarVendedoresMultipleModalProps) {
  if (!open) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black bg-opacity-30 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Icon */}
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <Trash2 className="h-6 w-6 text-red-600" />
          </div>

          {/* Content */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Eliminar Vendedores de la Lista
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              ¿Está seguro de que desea eliminar <strong>{cantidad} vendedor{cantidad !== 1 ? 'es' : ''}</strong> de la lista de asignación automática?
            </p>
            <p className="text-xs text-gray-500">
              Esta acción no se puede deshacer. Los vendedores no recibirán más leads automáticamente.
            </p>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Eliminar {cantidad}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
