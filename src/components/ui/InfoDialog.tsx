"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { ExclamationTriangleIcon, InformationCircleIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";

type Tone = "info" | "warning" | "danger" | "success";

const toneConfig: Record<Tone, { bg: string; border: string; icon: React.ReactElement }> = {
  info: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800",
    icon: <InformationCircleIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
  },
  warning: {
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    border: "border-yellow-200 dark:border-yellow-700",
    icon: <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-300" />,
  },
  danger: {
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-700",
    icon: <XCircleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />,
  },
  success: {
    bg: "bg-green-50 dark:bg-green-900/20",
    border: "border-green-200 dark:border-green-700",
    icon: <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />,
  },
};

export interface InfoDialogProps {
  open: boolean;
  title: string;
  description?: string | React.ReactNode;
  tone?: Tone;
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
}

export function InfoDialog({
  open,
  title,
  description,
  tone = "info",
  actionLabel = "Entendido",
  onAction,
  onClose,
}: InfoDialogProps) {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.documentElement.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const config = toneConfig[tone];

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-dialog-title"
    >
      <div
        className={`w-full max-w-md rounded-2xl border ${config.border} ${config.bg} shadow-xl transition`}
      >
        <div className="flex items-start gap-4 p-6">
          <span aria-hidden="true">{config.icon}</span>
          <div className="flex-1">
            <h2 id="info-dialog-title" className="text-lg font-semibold text-crm-text-primary">
              {title}
            </h2>
            {description && (
              <div className="mt-2 text-sm leading-relaxed text-crm-text-secondary">{description}</div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-white/40 px-6 py-4">
          <button
            type="button"
            onClick={() => {
              onAction?.();
              onClose();
            }}
            className="inline-flex items-center rounded-lg bg-crm-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-crm-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-crm-primary/60"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
