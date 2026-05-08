"use client";

import { useEffect, useMemo, useState } from "react";
import {
  History,
  Search,
  Filter,
  ExternalLink,
  CheckCircle,
  Reply,
  XCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  listarHistorialEnvios,
  actualizarEstadoEnvio,
} from "@/app/dashboard/admin/marketing/_actions";
import { buildWhatsAppUrl } from "@/lib/marketing/whatsapp";
import type { MarketingEnvioLog, EstadoEnvioLog } from "@/types/whatsapp-marketing";

const ESTADO_BADGE: Record<
  EstadoEnvioLog,
  { label: string; cls: string }
> = {
  abierto: { label: "Abierto", cls: "bg-crm-info/10 text-crm-info" },
  enviado: { label: "Enviado", cls: "bg-crm-success/10 text-crm-success" },
  respondido: {
    label: "Respondido",
    cls: "bg-crm-primary/10 text-crm-primary",
  },
  descartado: {
    label: "Descartado",
    cls: "bg-crm-card-hover text-crm-text-secondary",
  },
};

export default function HistorialEnvios() {
  const [envios, setEnvios] = useState<MarketingEnvioLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoEnvioLog | "">("");

  const cargar = async () => {
    setLoading(true);
    const result = await listarHistorialEnvios({ limit: 200 });
    if (result.error) {
      toast.error(result.error);
    } else if (result.data) {
      setEnvios(result.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargar();
  }, []);

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return envios.filter((e) => {
      if (estadoFiltro && e.estado !== estadoFiltro) return false;
      if (!q) return true;
      const hay = [
        e.cliente?.nombre,
        e.template?.nombre,
        e.campana?.nombre,
        e.telefono,
        e.vendedor_username,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [envios, busqueda, estadoFiltro]);

  const handleMarcar = async (
    log: MarketingEnvioLog,
    estado: EstadoEnvioLog,
  ) => {
    const result = await actualizarEstadoEnvio(log.id, estado);
    if (result.success) {
      toast.success("Actualizado");
      cargar();
    } else {
      toast.error(result.error || "Error");
    }
  };

  const handleReenviar = (log: MarketingEnvioLog) => {
    try {
      const url = buildWhatsAppUrl(log.telefono, log.mensaje_renderizado);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Teléfono inválido");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-crm-text-primary flex items-center gap-2">
            <History className="w-5 h-5 text-crm-primary" />
            Historial de envíos
          </h2>
          <p className="text-sm text-crm-text-secondary mt-1">
            Registro de plantillas enviadas vía WhatsApp Web.
          </p>
        </div>
        <button
          onClick={cargar}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-crm-border rounded-lg hover:bg-crm-card-hover disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Recargar
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crm-text-muted" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar cliente, plantilla, vendedor, teléfono…"
            className="w-full pl-10 pr-3 py-2 bg-crm-card border border-crm-border rounded-lg text-sm text-crm-text-primary"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crm-text-muted pointer-events-none" />
          <select
            value={estadoFiltro}
            onChange={(e) =>
              setEstadoFiltro(e.target.value as EstadoEnvioLog | "")
            }
            className="pl-10 pr-3 py-2 bg-crm-card border border-crm-border rounded-lg text-sm text-crm-text-primary"
          >
            <option value="">Todos los estados</option>
            <option value="abierto">Abierto</option>
            <option value="enviado">Enviado</option>
            <option value="respondido">Respondido</option>
            <option value="descartado">Descartado</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-crm-card border border-crm-border rounded-lg p-4 animate-pulse h-20"
            />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-crm-card border border-crm-border rounded-xl p-12 text-center">
          <History className="w-12 h-12 text-crm-text-muted mx-auto mb-3" />
          <p className="text-sm text-crm-text-secondary">
            {envios.length === 0
              ? "Aún no hay envíos registrados."
              : "Sin resultados con los filtros aplicados."}
          </p>
        </div>
      ) : (
        <div className="bg-crm-card border border-crm-border rounded-xl overflow-hidden">
          <div className="divide-y divide-crm-border">
            {filtrados.map((log) => {
              const badge = ESTADO_BADGE[log.estado];
              return (
                <div
                  key={log.id}
                  className="p-4 hover:bg-crm-card-hover transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-crm-text-primary truncate">
                          {log.cliente?.nombre ?? "Cliente eliminado"}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-xs text-crm-text-muted mt-0.5">
                        {log.template?.nombre ?? "Plantilla eliminada"}
                        {log.campana?.nombre ? ` · ${log.campana.nombre}` : ""}{" "}
                        · {log.telefono} ·{" "}
                        {log.vendedor_username ?? "vendedor"}
                      </p>
                      <p className="text-xs text-crm-text-muted">
                        {new Date(log.created_at).toLocaleString("es-PE")}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-crm-text-secondary line-clamp-2 mb-2">
                    {log.mensaje_renderizado}
                  </p>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleReenviar(log)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-crm-primary border border-crm-primary/30 rounded hover:bg-crm-primary/10"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Reabrir WhatsApp
                    </button>
                    {log.estado === "abierto" && (
                      <button
                        onClick={() => handleMarcar(log, "enviado")}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-crm-success border border-crm-success/30 rounded hover:bg-crm-success/10"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Marcar enviado
                      </button>
                    )}
                    {(log.estado === "enviado" || log.estado === "abierto") && (
                      <button
                        onClick={() => handleMarcar(log, "respondido")}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-crm-primary border border-crm-primary/30 rounded hover:bg-crm-primary/10"
                      >
                        <Reply className="w-3 h-3" />
                        Marcar respondido
                      </button>
                    )}
                    {log.estado !== "descartado" && (
                      <button
                        onClick={() => handleMarcar(log, "descartado")}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-crm-text-muted border border-crm-border rounded hover:bg-crm-card-hover ml-auto"
                      >
                        <XCircle className="w-3 h-3" />
                        Descartar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
