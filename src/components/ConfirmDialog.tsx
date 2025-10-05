"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
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

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md bg-crm-card border-2 border-crm-border rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
        {/* Icono de advertencia */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
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
        <div className="flex justify-end gap-3 mt-6">
          <button
            ref={cancelRef}
            type="button"
            className="px-4 py-2 text-sm font-medium text-crm-text-primary bg-crm-card-hover border border-crm-border rounded-lg hover:bg-crm-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onClose}
            disabled={disabled}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-600/20"
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
