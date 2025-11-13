"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface DeleteAllLotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  lotesCount: number;
  proyectoNombre?: string;
}

export default function DeleteAllLotesModal({
  isOpen,
  onClose,
  onConfirm,
  lotesCount,
  proyectoNombre,
}: DeleteAllLotesModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const [step, setStep] = useState<1 | 2>(1);

  if (!isOpen) return null;

  const handleFirstConfirm = () => {
    setStep(2);
  };

  const handleFinalConfirm = () => {
    if (confirmText === "ELIMINAR") {
      onConfirm();
      handleClose();
    }
  };

  const handleClose = () => {
    setStep(1);
    setConfirmText("");
    onClose();
  };

  const isValidConfirmation = confirmText === "ELIMINAR";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-crm-card rounded-xl shadow-2xl border border-crm-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border bg-crm-danger/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-crm-danger/10 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-crm-danger" />
            </div>
            <h3 className="text-lg font-semibold text-crm-text-primary">
              Eliminar todos los lotes
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-crm-card-hover rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-crm-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {step === 1 ? (
            <>
              <div className="space-y-4">
                <div className="p-4 bg-crm-danger/5 border border-crm-danger/20 rounded-lg">
                  <p className="text-sm font-medium text-crm-danger mb-2">
                    ⚠️ ADVERTENCIA: Acción irreversible
                  </p>
                  <p className="text-sm text-crm-text-secondary">
                    Estás a punto de eliminar permanentemente <strong className="text-crm-text-primary">{lotesCount} lote{lotesCount !== 1 ? 's' : ''}</strong>
                    {proyectoNombre && (
                      <> del proyecto <strong className="text-crm-text-primary">{proyectoNombre}</strong></>
                    )}.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-crm-text-primary font-medium">
                    Esto eliminará:
                  </p>
                  <ul className="space-y-1 text-sm text-crm-text-secondary ml-4">
                    <li className="flex items-start gap-2">
                      <span className="text-crm-danger mt-0.5">•</span>
                      <span>Todos los datos de los {lotesCount} lotes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-crm-danger mt-0.5">•</span>
                      <span>Polígonos y ubicaciones en el mapa</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-crm-danger mt-0.5">•</span>
                      <span>Información de precios y superficies</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-crm-danger mt-0.5">•</span>
                      <span>Cualquier dato adicional asociado</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    <strong>Nota:</strong> Esta acción NO se puede deshacer. Los datos eliminados no podrán ser recuperados.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <p className="text-sm text-crm-text-primary">
                  Para confirmar la eliminación de <strong>{lotesCount} lote{lotesCount !== 1 ? 's' : ''}</strong>, escribe la palabra:
                </p>

                <div className="p-4 bg-crm-card-hover rounded-lg border border-crm-border">
                  <p className="text-center text-xl font-bold text-crm-text-primary tracking-wider">
                    ELIMINAR
                  </p>
                </div>

                <div>
                  <label htmlFor="confirm-text" className="block text-sm font-medium text-crm-text-secondary mb-2">
                    Escribe "ELIMINAR" (en mayúsculas)
                  </label>
                  <input
                    id="confirm-text"
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Escribe aquí..."
                    autoFocus
                    className="w-full px-4 py-2.5 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-danger focus:border-transparent bg-crm-card text-crm-text-primary placeholder-crm-text-muted"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && isValidConfirmation) {
                        handleFinalConfirm();
                      }
                    }}
                  />
                  {confirmText && !isValidConfirmation && (
                    <p className="mt-2 text-xs text-crm-danger">
                      Debe escribir exactamente "ELIMINAR" en mayúsculas
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-crm-border bg-crm-card-hover flex items-center justify-between gap-3">
          <Button
            onClick={handleClose}
            variant="outline"
            className="flex-1"
          >
            Cancelar
          </Button>

          {step === 1 ? (
            <Button
              onClick={handleFirstConfirm}
              className="flex-1 bg-crm-danger hover:bg-crm-danger/90 text-white"
            >
              Continuar
            </Button>
          ) : (
            <Button
              onClick={handleFinalConfirm}
              disabled={!isValidConfirmation}
              className="flex-1 bg-crm-danger hover:bg-crm-danger/90 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar {lotesCount} lotes
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
