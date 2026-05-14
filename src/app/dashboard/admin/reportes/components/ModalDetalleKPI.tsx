"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, Loader2, ExternalLink } from "lucide-react";
import {
  obtenerClientesPorEtapaFunnel,
  obtenerDetalleVentasPeriodo,
  type ClienteEtapaFunnel,
  type VentaDetalleKPI,
} from "../_actions";

export type TipoDetalleKPI = "leads" | "ventas";

interface ModalDetalleKPIProps {
  open: boolean;
  tipo: TipoDetalleKPI | null;
  titulo: string;
  periodo: string;
  fechaInicio?: string;
  fechaFin?: string;
  onClose: () => void;
}

function formatearMonedaPEN(valor: number, moneda: string | null = "PEN"): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: moneda === "USD" ? "USD" : "PEN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
}

export default function ModalDetalleKPI({
  open,
  tipo,
  titulo,
  periodo,
  fechaInicio,
  fechaFin,
  onClose,
}: ModalDetalleKPIProps) {
  const [leads, setLeads] = useState<ClienteEtapaFunnel[]>([]);
  const [ventas, setVentas] = useState<VentaDetalleKPI[]>([]);
  const [total, setTotal] = useState(0);
  const [montoTotal, setMontoTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !tipo) return;

    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);

    let cancelado = false;
    setLoading(true);
    setLeads([]);
    setVentas([]);
    setTotal(0);
    setMontoTotal(0);

    const fetcher = tipo === "leads"
      ? obtenerClientesPorEtapaFunnel("leads", periodo, fechaInicio, fechaFin)
      : obtenerDetalleVentasPeriodo(periodo, fechaInicio, fechaFin);

    fetcher
      .then((res: any) => {
        if (cancelado || !res.data) return;
        if (tipo === "leads") {
          setLeads(res.data.clientes);
          setTotal(res.data.total);
        } else {
          setVentas(res.data.ventas);
          setTotal(res.data.total);
          setMontoTotal(res.data.montoTotal);
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
  }, [open, tipo, periodo, fechaInicio, fechaFin, onClose]);

  if (!mounted || !open || !tipo) return null;

  const mostrados = tipo === "leads" ? leads.length : ventas.length;
  const hayTruncado = total > mostrados;
  const labelEntidad = tipo === "leads" ? "lead" : "venta";

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm sm:p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-detalle-kpi-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-4xl max-h-[92vh] sm:max-h-[80vh] flex flex-col rounded-t-2xl sm:rounded-2xl border-t sm:border border-crm-border bg-crm-card shadow-xl pb-[env(safe-area-inset-bottom)] sm:pb-0 animate-in slide-in-from-bottom-4 sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-200">
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <span className="h-1 w-10 rounded-full bg-crm-border" aria-hidden />
        </div>
        <div className="flex items-start justify-between gap-4 p-5 border-b border-crm-border">
          <div>
            <h2 id="modal-detalle-kpi-title" className="text-lg font-semibold text-crm-text-primary">
              {titulo}
            </h2>
            <p className="text-sm text-crm-text-secondary mt-1">
              {loading
                ? "Cargando..."
                : total === 0
                ? `Sin ${labelEntidad}s en este período.`
                : `${total} ${total === 1 ? labelEntidad : labelEntidad + "s"}${
                    hayTruncado ? ` (mostrando los primeros ${mostrados})` : ""
                  }`}
              {tipo === "ventas" && montoTotal > 0 && !loading && (
                <span className="ml-2 font-semibold text-crm-text-primary">
                  · {formatearMonedaPEN(montoTotal)}
                </span>
              )}
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
          ) : tipo === "leads" ? (
            leads.length === 0 ? (
              <EmptyState mensaje="No hay leads captados en este período." />
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-crm-card-hover text-xs font-semibold text-crm-text-secondary sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2.5">Cliente</th>
                    <th className="text-left px-4 py-2.5 hidden sm:table-cell">Contacto</th>
                    <th className="text-left px-4 py-2.5">Alta</th>
                    <th className="text-right px-4 py-2.5">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((c) => (
                    <tr key={c.id} className="border-t border-crm-border hover:bg-crm-card-hover/50">
                      <td className="px-4 py-2.5 text-crm-text-primary font-medium">{c.nombre}</td>
                      <td className="px-4 py-2.5 text-crm-text-secondary hidden sm:table-cell">
                        {c.telefono || c.email || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-crm-text-secondary tabular-nums">
                        {c.fechaEvento ? new Date(c.fechaEvento).toLocaleDateString("es-PE") : "—"}
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
            )
          ) : ventas.length === 0 ? (
            <EmptyState mensaje="No hay ventas registradas en este período." />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-crm-card-hover text-xs font-semibold text-crm-text-secondary sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2.5">Código</th>
                  <th className="text-left px-4 py-2.5">Cliente</th>
                  <th className="text-left px-4 py-2.5 hidden md:table-cell">Propiedad</th>
                  <th className="text-left px-4 py-2.5 hidden md:table-cell">Vendedor</th>
                  <th className="text-right px-4 py-2.5">Monto</th>
                  <th className="text-left px-4 py-2.5">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {ventas.map((v) => (
                  <tr key={v.id} className="border-t border-crm-border hover:bg-crm-card-hover/50">
                    <td className="px-4 py-2.5 text-crm-text-primary font-mono text-xs">
                      {v.codigoVenta || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-crm-text-primary font-medium">
                      {v.clienteNombre || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-crm-text-secondary hidden md:table-cell">
                      {v.propiedadLabel || "—"}
                      {v.proyectoNombre && (
                        <span className="text-xs text-crm-text-muted block">{v.proyectoNombre}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-crm-text-secondary hidden md:table-cell">
                      {v.vendedorNombre || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-crm-text-primary font-semibold tabular-nums">
                      {formatearMonedaPEN(v.precioTotal, v.moneda)}
                    </td>
                    <td className="px-4 py-2.5 text-crm-text-secondary tabular-nums">
                      {new Date(v.fechaVenta).toLocaleDateString("es-PE")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {hayTruncado && !loading && (
          <div className="px-5 py-3 border-t border-crm-border text-xs text-crm-text-muted bg-crm-card-hover/40">
            Lista truncada a {mostrados}. Use los filtros del módulo correspondiente para ver el detalle completo.
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function EmptyState({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex items-center justify-center py-16 px-6 text-center text-sm text-crm-text-muted">
      {mensaje}
    </div>
  );
}
