"use client";

import { Fragment } from "react";

type Lote = {
  id: string;
  codigo: string;
  sup_m2: number | null;
  precio: number | null;
  moneda: string | null;
  estado: "disponible" | "reservado" | "vendido";
  created_at?: string;
  proyecto?: { id: string; nombre: string } | null;
  data?: any;
};

export default function LoteDetailModal({
  open,
  onClose,
  lote,
}: {
  open: boolean;
  onClose: () => void;
  lote: Lote | null;
}) {
  if (!open || !lote) return null;

  const d = parseData(lote.data);
  const precioFmt = (precio: number | null, moneda: string | null) => {
    if (!precio) return "No especificado";
    try {
      const f = new Intl.NumberFormat("es-PE", { style: "currency", currency: (moneda || "PEN") as any, minimumFractionDigits: 0 });
      return f.format(precio).replace("PEN", "S/");
    } catch {
      return `S/ ${precio.toLocaleString("es-PE")}`;
    }
  };

  const info: Array<{ label: string; value: string | number | null | undefined }> = [
    { label: "Proyecto", value: lote.proyecto?.nombre || d?.proyecto || "No especificado" },
    { label: "Estado", value: capitalize(lote.estado) },
    { label: "Superficie", value: lote.sup_m2 ? `${lote.sup_m2} m²` : "No especificado" },
    { label: "Precio", value: precioFmt(lote.precio, lote.moneda) },
    { label: "Manzana", value: d?.manzana },
    { label: "Número", value: d?.numero },
    { label: "Etapa", value: d?.etapa },
    { label: "Ubicación", value: d?.ubicacion },
    { label: "Identificador", value: d?.identificador },
    { label: "Condiciones", value: d?.condiciones },
  ];

  const foto = Array.isArray(d?.fotos) && d.fotos.length > 0 ? (d.fotos[0] as string) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl mx-4 bg-crm-card border border-crm-border rounded-xl shadow-crm-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border">
          <h3 className="text-lg font-semibold text-crm-text-primary">Detalle del Lote {lote.codigo}</h3>
          <button onClick={onClose} className="text-crm-text-muted hover:text-crm-text-primary">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {/* Imagen / placeholder */}
          <div className="w-full h-56 bg-crm-card-hover rounded-lg overflow-hidden flex items-center justify-center">
            {foto ? (
              <img src={foto} alt={`Lote ${lote.codigo}`} className="w-full h-full object-cover" />
            ) : (
              <div className="text-center text-crm-text-muted">
                <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                Sin imagen disponible
              </div>
            )}
          </div>

          {/* Información */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {info.map((it, idx) => (
              <Fragment key={idx}>
                <div className="space-y-1">
                  <div className="text-xs text-crm-text-muted">{it.label}</div>
                  <div className="text-sm text-crm-text-primary">{it.value ?? "-"}</div>
                </div>
              </Fragment>
            ))}
          </div>

          {/* Notas / extras */}
          {d?.notas && (
            <div className="space-y-1">
              <div className="text-xs text-crm-text-muted">Notas</div>
              <div className="text-sm text-crm-text-primary whitespace-pre-wrap">{d.notas}</div>
            </div>
          )}

          {/* Acciones rápidas */}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-crm-text-muted hover:text-crm-text-primary border border-crm-border rounded-lg transition-colors">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function parseData(data: any) {
  if (!data) return null;
  if (typeof data === "string") {
    try { return JSON.parse(data); } catch { return null; }
  }
  return data;
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

