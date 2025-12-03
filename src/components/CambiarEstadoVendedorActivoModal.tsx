"use client";

interface CambiarEstadoVendedorActivoModalProps {
  open: boolean;
  onClose: () => void;
  vendedorNombre: string;
  estadoActual: boolean; // true = activo, false = inactivo
  onConfirm: () => void;
}

export default function CambiarEstadoVendedorActivoModal({
  open,
  onClose,
  vendedorNombre,
  estadoActual,
  onConfirm,
}: CambiarEstadoVendedorActivoModalProps) {
  if (!open) return null;

  const nuevoEstado = !estadoActual;
  const accion = nuevoEstado ? "Activar" : "Desactivar";
  const colorIcon = nuevoEstado ? "bg-green-100" : "bg-yellow-100";
  const colorIconText = nuevoEstado ? "text-green-600" : "text-yellow-600";
  const colorBtn = nuevoEstado ? "bg-green-600 hover:bg-green-700" : "bg-yellow-600 hover:bg-yellow-700";

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
          <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${colorIcon} mb-4`}>
            {nuevoEstado ? (
              <svg
                className={`h-6 w-6 ${colorIconText}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg
                className={`h-6 w-6 ${colorIconText}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.732 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            )}
          </div>

          {/* Content */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {accion} Vendedor
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              ¿Estás seguro de que deseas {accion.toLowerCase()} a <strong>{vendedorNombre}</strong>?
            </p>
            {nuevoEstado ? (
              <p className="text-xs text-gray-500">
                El vendedor comenzará a recibir leads automáticamente según el orden de rotación.
              </p>
            ) : (
              <p className="text-xs text-gray-500">
                El vendedor dejará de recibir leads automáticamente hasta que sea activado nuevamente.
              </p>
            )}
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
              className={`flex-1 px-4 py-2 text-white ${colorBtn} rounded-lg transition-colors font-medium`}
            >
              {accion}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
