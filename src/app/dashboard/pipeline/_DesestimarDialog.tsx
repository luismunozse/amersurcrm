"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { XCircle as XCircleIcon } from "lucide-react";

const MOTIVOS_SUGERIDOS = [
  "Precio fuera de presupuesto",
  "Ubicación no conviene",
  "No responde",
  "Compró con la competencia",
  "Cambió de plan",
  "Datos incompletos / lead falso",
];

interface Props {
  open: boolean;
  clienteNombre: string;
  onConfirm: (motivo: string) => void;
  onCancel: () => void;
  pending?: boolean;
}

export default function DesestimarDialog({
  open,
  clienteNombre,
  onConfirm,
  onCancel,
  pending,
}: Props) {
  const [motivo, setMotivo] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) {
      setMotivo("");
      return;
    }
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onCancel();
    };
    window.addEventListener("keydown", onKey);
    setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      document.documentElement.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onCancel, pending]);

  if (!open) return null;

  const motivoLimpio = motivo.trim();
  const puedeConfirmar = motivoLimpio.length > 0 && !pending;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="desestimar-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 shadow-xl">
        <div className="flex items-start gap-3 p-6">
          <XCircleIcon className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <h2 id="desestimar-title" className="text-lg font-semibold text-crm-text-primary">
              Desestimar a {clienteNombre}
            </h2>
            <p className="mt-1 text-sm text-crm-text-secondary">
              Indicá el motivo. Esta nota queda registrada en el historial del cliente.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {MOTIVOS_SUGERIDOS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMotivo(m)}
                  disabled={pending}
                  className="text-xs px-2.5 py-1 rounded-full border border-crm-border bg-crm-bg-elevated hover:border-red-400 hover:bg-red-100/50 dark:hover:bg-red-900/30 transition disabled:opacity-50"
                >
                  {m}
                </button>
              ))}
            </div>
            <textarea
              ref={inputRef}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Detalle del motivo (obligatorio)"
              rows={3}
              disabled={pending}
              className="mt-3 w-full rounded-lg border border-crm-border bg-crm-card px-3 py-2 text-sm text-crm-text-primary placeholder:text-crm-text-muted focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none disabled:opacity-50"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-white/40 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-crm-text-secondary hover:bg-crm-bg-elevated transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => puedeConfirmar && onConfirm(motivoLimpio)}
            disabled={!puedeConfirmar}
            className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 disabled:bg-red-300 disabled:cursor-not-allowed"
          >
            {pending ? "Desestimando…" : "Desestimar"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
