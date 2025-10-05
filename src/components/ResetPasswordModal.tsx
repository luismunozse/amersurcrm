"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  userName: string;
  passwordTemporal: string | null;
  onClose: () => void;
};

export default function ResetPasswordModal({
  open,
  userName,
  passwordTemporal,
  onClose,
}: Props) {
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      return;
    }
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const t = setTimeout(() => closeRef.current?.focus(), 100);

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

  if (!open || !passwordTemporal) return null;

  const copiarPassword = async () => {
    try {
      await navigator.clipboard.writeText(passwordTemporal);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copiando:', err);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="reset-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md bg-crm-card border-2 border-crm-border rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
        {/* Icono de éxito */}
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <h2 id="reset-title" className="text-lg font-semibold text-crm-text-primary mb-1">
              Contraseña Reseteada
            </h2>
            <p className="text-sm text-crm-text-secondary">
              {userName}
            </p>
          </div>
        </div>

        {/* Información */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-crm-text-primary mb-3">
            Se ha generado una nueva contraseña temporal. El usuario deberá cambiarla en su próximo inicio de sesión.
          </p>

          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 bg-crm-card border border-crm-border rounded font-mono text-lg text-crm-text-primary">
              {passwordTemporal}
            </div>
            <button
              onClick={copiarPassword}
              className="px-3 py-2 bg-crm-primary text-white rounded hover:bg-crm-primary/90 transition-colors"
              title="Copiar contraseña"
            >
              {copied ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
              )}
            </button>
          </div>

          <p className="text-xs text-crm-text-muted mt-2">
            Asegúrate de compartir esta contraseña de forma segura con el usuario.
          </p>
        </div>

        {/* Botón cerrar */}
        <div className="flex justify-end">
          <button
            ref={closeRef}
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-crm-primary rounded-lg hover:bg-crm-primary/90 transition-colors"
            onClick={onClose}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
