"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Spinner } from '@/components/ui/Spinner';

type CambioEntry = {
  id: number;
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  modificado_por: string;
  created_at: string;
};

interface Props {
  open: boolean;
  userId: string;
  userName: string;
  onClose: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  username: "Username",
  nombre_completo: "Nombre Completo",
  dni: "DNI",
  telefono: "Teléfono",
  email: "Email",
  rol_id: "Rol",
  meta_mensual: "Meta Mensual",
  comision_porcentaje: "Comisión (%)",
  activo: "Estado",
};

function formatValue(campo: string, value: string | null): string {
  if (value === null || value === "null") return "-";
  if (campo === "activo") return value === "true" ? "Activo" : "Inactivo";
  return value;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "Hace un momento";
  if (mins < 60) return `Hace ${mins} min`;
  if (hours < 24) return `Hace ${hours}h`;
  if (days < 7) return `Hace ${days}d`;
  return date.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

export default function HistorialCambiosUsuario({ open, userId, userName, onClose }: Props) {
  const [cambios, setCambios] = useState<CambioEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !userId) return;

    setIsLoading(true);
    setError("");

    fetch(`/api/admin/usuarios?historial=${userId}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCambios(data.historial || []);
        } else {
          setError(data.error || "Error cargando historial");
        }
      })
      .catch(() => setError("Error de conexión"))
      .finally(() => setIsLoading(false));
  }, [open, userId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  // Group by date
  const grouped = cambios.reduce<Record<string, CambioEntry[]>>((acc, cambio) => {
    const date = new Date(cambio.created_at).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(cambio);
    return acc;
  }, {});

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/30 animate-in fade-in duration-200" />

      {/* Drawer panel */}
      <div className="relative z-10 w-full max-w-md h-full bg-crm-card border-l border-crm-border shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-crm-text-primary">Historial de Cambios</h2>
            <p className="text-sm text-crm-text-muted">{userName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-crm-text-muted hover:text-crm-text-primary transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" color="primary" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          ) : cambios.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-crm-text-muted mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-crm-text-muted">No hay cambios registrados</p>
              <p className="text-xs text-crm-text-muted mt-1">Los cambios futuros aparecerán aquí</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([date, entries]) => (
                <div key={date}>
                  <div className="sticky top-0 bg-crm-card py-1 mb-3">
                    <span className="text-xs font-medium text-crm-text-muted uppercase tracking-wide">
                      {date}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="relative pl-6 border-l-2 border-crm-border"
                      >
                        <div className="absolute left-[-5px] top-1 w-2 h-2 rounded-full bg-crm-primary" />
                        <div className="bg-crm-card-hover rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-crm-text-primary">
                              {FIELD_LABELS[entry.campo] || entry.campo}
                            </span>
                            <span className="text-xs text-crm-text-muted">
                              {timeAgo(entry.created_at)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-red-500 line-through">
                              {formatValue(entry.campo, entry.valor_anterior)}
                            </span>
                            <svg className="w-3 h-3 text-crm-text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                            <span className="text-green-600 font-medium">
                              {formatValue(entry.campo, entry.valor_nuevo)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
