"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type Size = "sm" | "md" | "lg" | "xl" | "full";

const SIZE_CLASS: Record<Size, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  full: "sm:max-w-4xl",
};

interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: Size;
  /** Altura máxima del sheet/modal. Default 90vh. */
  maxHeight?: string;
  /** Ocultar botón de cerrar (X). Default false. */
  hideClose?: boolean;
  /** Cerrar al clickear overlay. Default true. */
  closeOnOverlayClick?: boolean;
  /** Label accesible si no hay title. */
  ariaLabel?: string;
  /** Clases extra para el contenedor. */
  className?: string;
}

/**
 * Modal responsivo que se muestra como bottom-sheet en mobile y como modal
 * centrado en desktop. Incluye overlay, ESC, bloqueo de scroll, safe-area,
 * handle visual en mobile y X opcional.
 */
export default function ResponsiveModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  maxHeight = "90vh",
  hideClose = false,
  closeOnOverlayClick = true,
  ariaLabel,
  className = "",
}: ResponsiveModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.documentElement.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof window === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={!title && ariaLabel ? ariaLabel : undefined}
      onMouseDown={(e) => {
        if (!closeOnOverlayClick) return;
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" />

      {/* Contenedor */}
      <div
        ref={contentRef}
        className={[
          "relative z-10 w-full bg-crm-card border-t sm:border border-crm-border",
          "rounded-t-2xl sm:rounded-2xl shadow-2xl",
          "animate-in slide-in-from-bottom-4 sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-200",
          "flex flex-col",
          SIZE_CLASS[size],
          className,
        ].join(" ")}
        style={{ maxHeight }}
      >
        {/* Handle visual mobile */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <span className="h-1 w-10 rounded-full bg-crm-border" aria-hidden />
        </div>

        {/* Header */}
        {(title || !hideClose) && (
          <div className="flex items-start justify-between gap-3 px-5 pt-3 sm:pt-5 pb-3 border-b border-crm-border shrink-0">
            <div className="flex-1 min-w-0">
              {title && (
                <h2 className="text-base sm:text-lg font-semibold text-crm-text-primary leading-tight">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-xs sm:text-sm text-crm-text-muted mt-1">{description}</p>
              )}
            </div>
            {!hideClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                title="Cerrar"
                className="shrink-0 -mr-1 grid place-items-center w-9 h-9 rounded-lg text-crm-text-muted hover:text-crm-text-primary hover:bg-crm-card-hover transition-colors"
              >
                <X className="w-5 h-5" aria-hidden />
              </button>
            )}
          </div>
        )}

        {/* Cuerpo scrolleable */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 border-t border-crm-border px-5 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:pb-3 bg-crm-card rounded-b-2xl">
            {footer}
          </div>
        )}
        {!footer && (
          <div className="shrink-0 pb-[max(env(safe-area-inset-bottom),0px)] sm:pb-0" />
        )}
      </div>
    </div>,
    document.body,
  );
}
