"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  title: string;
  description?: string;
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
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
      aria-labelledby="confirm-title"
      onMouseDown={(e) => {
        // cerrar al clickear overlay
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm bg-bg-card border rounded-2xl shadow-card p-5">
        <h2 id="confirm-title" className="text-base font-semibold mb-1">{title}</h2>
        {description && (
          <p className="text-sm text-text-muted mb-4">{description}</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            className="border rounded-xl px-3 py-1.5 text-sm hover:bg-neutral-50"
            onClick={onClose}
            disabled={disabled}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="rounded-xl px-3 py-1.5 text-sm text-white bg-danger hover:opacity-90 disabled:opacity-50"
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
