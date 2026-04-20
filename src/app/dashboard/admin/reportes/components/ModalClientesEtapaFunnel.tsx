"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, Loader2, ExternalLink } from "lucide-react";
import {
  obtenerClientesPorEtapaFunnel,
  type EtapaFunnel,
  type ClienteEtapaFunnel,
} from "../_actions";

interface ModalClientesEtapaFunnelProps {
  open: boolean;
  etapa: EtapaFunnel | null;
  etapaLabel: string;
  periodo: string;
  fechaInicio?: string;
  fechaFin?: string;
  onClose: () => void;
}

export default function ModalClientesEtapaFunnel({
  open,
  etapa,
  etapaLabel,
  periodo,
  fechaInicio,
  fechaFin,
  onClose,
}: ModalClientesEtapaFunnelProps) {
  const [clientes, setClientes] = useState<ClienteEtapaFunnel[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !etapa) return;

    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);

    let cancelado = false;
    setLoading(true);
    setClientes([]);
    setTotal(0);

    obtenerClientesPorEtapaFunnel(etapa, periodo, fechaInicio, fechaFin)
      .then((res) => {
        if (cancelado) return;
        if (res.data) {
          setClientes(res.data.clientes);
          setTotal(res.data.total);
        }
      })
      .catch(() => {
        if (cancelado) return;
      })
      .finally(() => {
        if (cancelado) return;
        setLoading(false);
      });

    return () => {
      cancelado = true;
      document.documentElement.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [open, etapa, periodo, fechaInicio, fechaFin, onClose]);

  if (!mounted || !open || !etapa) return null;

  const mostrados = clientes.length;
  const hayTruncado = total > mostrados;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm sm:p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-etapa-funnel-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-3xl max-h-[92vh] sm:max-h-[80vh] flex flex-col rounded-t-2xl sm:rounded-2xl border-t sm:border border-crm-border bg-crm-card shadow-xl pb-[env(safe-area-inset-bottom)] sm:pb-0 animate-in slide-in-from-bottom-4 sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-200">
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <span className="h-1 w-10 rounded-full bg-crm-border" aria-hidden />
        </div>
        <div className="flex items-start justify-between gap-4 p-5 border-b border-crm-border">
          <div>
            <h2
              id="modal-etapa-funnel-title"
              className="text-lg font-semibold text-crm-text-primary"
            >
              {etapaLabel}
            </h2>
            <p className="text-sm text-crm-text-secondary mt-1">
              {loading
                ? "Cargando..."
                : total === 0
                  ? "Sin clientes en esta etapa para el período."
                  : `${total} ${total === 1 ? "cliente" : "clientes"}${
                      hayTruncado ? ` (mostrando los primeros ${mostrados})` : ""
                    }`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-crm-text-muted hover:bg-crm-card-hover hover:text-crm-text-primary transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-crm-text-muted" />
            </div>
          ) : clientes.length === 0 ? (
            <div className="flex items-center justify-center py-16 px-6 text-center text-sm text-crm-text-muted">
              No hay clientes registrados en esta etapa del período.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-crm-card-hover text-xs font-semibold text-crm-text-secondary sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2.5">Cliente</th>
                  <th className="text-left px-4 py-2.5 hidden sm:table-cell">Contacto</th>
                  <th className="text-left px-4 py-2.5">Fecha</th>
                  <th className="text-right px-4 py-2.5">Acción</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id} className="border-t border-crm-border hover:bg-crm-card-hover/50">
                    <td className="px-4 py-2.5 text-crm-text-primary font-medium">
                      {c.nombre}
                    </td>
                    <td className="px-4 py-2.5 text-crm-text-secondary hidden sm:table-cell">
                      {c.telefono || c.email || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-crm-text-secondary tabular-nums">
                      {c.fechaEvento
                        ? new Date(c.fechaEvento).toLocaleDateString("es-PE")
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        href={`/dashboard/clientes?q=${encodeURIComponent(c.nombre)}`}
                        onClick={onClose}
                        className="inline-flex items-center gap-1 text-crm-primary text-xs hover:underline"
                      >
                        Ver <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {hayTruncado && !loading && (
          <div className="px-5 py-3 border-t border-crm-border text-xs text-crm-text-muted bg-crm-card-hover/40">
            Para ver la lista completa usá los filtros de la página de clientes.
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
