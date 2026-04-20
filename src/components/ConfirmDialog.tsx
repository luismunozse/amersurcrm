"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

type Props = {
  open: boolean;
  title: string;
  description?: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  disabled?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  disabled = false,
  onConfirm,
  onClose,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Bloquea scroll y enfoca botón cancelar
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const t = setTimeout(() => cancelRef.current?.focus(), 0);

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

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="confirm-title"
      onMouseDown={(e) => {
        // cerrar al clickear overlay
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" />

      {/* Dialog — bottom sheet en mobile, centrado en desktop */}
      <div className="relative z-10 w-full sm:max-w-md bg-crm-card border-t-2 sm:border-2 border-crm-border rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 pb-[max(env(safe-area-inset-bottom),1.25rem)] sm:pb-6 animate-in slide-in-from-bottom-4 sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-200">
        {/* Handle visual en mobile */}
        <div className="sm:hidden flex justify-center mb-3">
          <span className="h-1 w-10 rounded-full bg-crm-border" aria-hidden />
        </div>

        {/* Icono de advertencia */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>

          <div className="flex-1 min-w-0">
            <h2 id="confirm-title" className="text-lg font-semibold text-crm-text-primary mb-2">
              {title}
            </h2>
            {description && (
              <div className="text-sm text-crm-text-secondary leading-relaxed">
                {description}
              </div>
            )}
          </div>
        </div>

        {/* Botones */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 mt-6">
          <button
            ref={cancelRef}
            type="button"
            className="w-full sm:w-auto h-11 sm:h-auto px-4 sm:py-2 text-sm font-medium text-crm-text-primary bg-crm-card-hover border border-crm-border rounded-lg hover:bg-crm-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onClose}
            disabled={disabled}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="w-full sm:w-auto h-11 sm:h-auto px-4 sm:py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-600/20"
            onClick={onConfirm}
            disabled={disabled}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
