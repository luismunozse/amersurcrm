"use client";

import { useState, useRef } from "react";
import { obtenerUltimoCambioLote, type UltimoCambioLote } from "./_auditoria-actions";

interface Props {
  loteId: string;
  children: React.ReactNode;
  enabled?: boolean;
}

const fmtFecha = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("es-PE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

const labelAccion = (accion: string) =>
  accion === "insert" ? "Creado" : accion === "delete" ? "Eliminado" : "Modificado";

function resumenCambios(cambios: unknown): string | null {
  if (!cambios || typeof cambios !== "object") return null;
  const obj = cambios as Record<string, unknown>;
  // En UPDATE viene como {col: {old, new}}
  const keys = Object.keys(obj);
  const updateKeys = keys.filter((k) => {
    const v = obj[k];
    return v && typeof v === "object" && "old" in (v as object) && "new" in (v as object);
  });
  if (updateKeys.length === 0) return null;
  if (updateKeys.length === 1) {
    const k = updateKeys[0];
    const cf = obj[k] as { old: unknown; new: unknown };
    return `${k}: ${String(cf.old ?? "—")} → ${String(cf.new ?? "—")}`;
  }
  return `${updateKeys.length} campos modificados`;
}

export default function EstadoBadgeAuditoria({ loteId, children, enabled = true }: Props) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<UltimoCambioLote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const handleEnter = async () => {
    if (!enabled) return;
    setOpen(true);
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);
    try {
      const res = await obtenerUltimoCambioLote(loteId);
      if (res.error) setError(res.error);
      else setData(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <span
      className="relative inline-block"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setOpen(false)}
      onFocus={handleEnter}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && enabled && (
        <span
          role="tooltip"
          className="hidden md:block absolute z-40 left-0 top-full mt-2 w-64 rounded-lg border border-crm-border bg-crm-card shadow-xl p-3 text-[11px] pointer-events-none animate-in fade-in zoom-in-95 duration-150"
        >
          {loading && <span className="text-crm-text-muted">Cargando auditoría…</span>}
          {!loading && error && (
            <span className="text-crm-text-muted italic">{error}</span>
          )}
          {!loading && !error && !data && (
            <span className="text-crm-text-muted italic">Sin registro de auditoría</span>
          )}
          {!loading && !error && data && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-crm-text-primary">{labelAccion(data.accion)}</span>
                <span className="text-[10px] text-crm-text-muted">{fmtFecha(data.created_at)}</span>
              </div>
              <div className="text-crm-text-secondary">
                Por: <span className="font-medium text-crm-text-primary">{data.usuario_username ?? "Sistema"}</span>
              </div>
              {data.accion === "update" && resumenCambios(data.cambios) && (
                <div className="text-crm-text-muted truncate" title={resumenCambios(data.cambios) ?? undefined}>
                  {resumenCambios(data.cambios)}
                </div>
              )}
            </div>
          )}
        </span>
      )}
    </span>
  );
}
