"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Spinner } from '@/components/ui/Spinner';

type Props = {
  open: boolean;
  userName: string;
  currentState: boolean;
  onConfirm: (motivo: string) => Promise<void>;
  onClose: () => void;
};

export default function EstadoUsuarioModal({
  open,
  userName,
  currentState,
  onConfirm,
  onClose,
}: Props) {
  const [motivo, setMotivo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const newState = !currentState;
  const action = newState ? "activar" : "desactivar";

  useEffect(() => {
    if (!open) {
      setMotivo("");
      setIsLoading(false);
      return;
    }
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const t = setTimeout(() => textareaRef.current?.focus(), 100);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (motivo.trim().length < 10) {
      return;
    }
    setIsLoading(true);
    try {
      await onConfirm(motivo.trim());
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = motivo.trim().length >= 10;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="estado-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" />

      {/* Dialog */}
      <div className="relative z-10 w-full sm:max-w-md bg-crm-card border-t-2 sm:border-2 border-crm-border rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 pb-[max(env(safe-area-inset-bottom),1.25rem)] sm:pb-6 animate-in slide-in-from-bottom-4 sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-200">
        <div className="sm:hidden flex justify-center -mt-1 mb-3">
          <span className="h-1 w-10 rounded-full bg-crm-border" aria-hidden />
        </div>
        {/* Icono de advertencia */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`flex-shrink-0 w-12 h-12 rounded-full ${
            newState
              ? 'bg-green-100 dark:bg-green-900/30'
              : 'bg-red-100 dark:bg-red-900/30'
          } flex items-center justify-center`}>
            {newState ? (
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h2 id="estado-title" className="text-lg font-semibold text-crm-text-primary mb-1">
              {action.charAt(0).toUpperCase() + action.slice(1)} Usuario
            </h2>
            <p className="text-sm text-crm-text-secondary">
              {userName}
            </p>
          </div>
        </div>

        {/* Motivo */}
        <div className="mb-6">
          <label htmlFor="motivo" className="block text-sm font-medium text-crm-text-primary mb-2">
            Motivo del cambio de estado *
          </label>
          <textarea
            ref={textareaRef}
            id="motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder={`Ingrese el motivo para ${action} este usuario (mínimo 10 caracteres)...`}
            className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary resize-none"
            rows={4}
            maxLength={500}
            disabled={isLoading}
          />
          <p className={`text-xs mt-1 ${
            motivo.length === 0
              ? 'text-crm-text-muted'
              : isValid
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {motivo.length}/10 caracteres mínimos
          </p>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            className="px-4 py-2 text-sm font-medium text-crm-text-primary bg-crm-card-hover border border-crm-border rounded-lg hover:bg-crm-border transition-colors disabled:opacity-50"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!isValid || isLoading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-lg ${
              newState
                ? 'bg-green-600 hover:bg-green-700 shadow-green-600/20 disabled:bg-green-400'
                : 'bg-red-600 hover:bg-red-700 shadow-red-600/20 disabled:bg-red-400'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            onClick={handleSubmit}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" color="white" />
                {newState ? 'Activando...' : 'Desactivando...'}
              </div>
            ) : (
              action.charAt(0).toUpperCase() + action.slice(1)
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
