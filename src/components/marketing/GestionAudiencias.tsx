"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Plus, Trash2, RefreshCw, Eye, AlertTriangle, X, Loader2 } from "lucide-react";
import { obtenerAudiencias, sincronizarAudiencia, eliminarAudiencia } from "@/app/dashboard/admin/marketing/_actions";
import type { MarketingAudiencia } from "@/types/whatsapp-marketing";
import toast from "react-hot-toast";
import ModalCrearAudiencia from "./ModalCrearAudiencia";

// ─────────────────────────────────────────────────────────
// Modal confirmación eliminar
// ─────────────────────────────────────────────────────────

function ModalConfirmarEliminar({
  nombre,
  onConfirmar,
  onCancelar,
}: {
  nombre: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onCancelar} />
      <div className="relative bg-crm-card border border-crm-border rounded-xl shadow-xl p-6 w-full max-w-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1">
            <h4 className="text-base font-semibold text-crm-text-primary">Eliminar audiencia</h4>
            <p className="text-sm text-crm-text-secondary mt-1">
              ¿Eliminar <strong>&quot;{nombre}&quot;</strong>? Esta acción no se puede deshacer.
            </p>
          </div>
          <button onClick={onCancelar} className="text-crm-text-muted hover:text-crm-text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancelar}
            className="px-4 py-2 text-sm text-crm-text-secondary border border-crm-border rounded-lg hover:bg-crm-card-hover transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────

export default function GestionAudiencias() {
  const [audiencias, setAudiencias] = useState<MarketingAudiencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalCrear, setModalCrear] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState<{ id: string; nombre: string } | null>(null);
  const [sincronizandoId, setSincronizandoId] = useState<string | null>(null);

  const cargarAudiencias = useCallback(async () => {
    setLoading(true);
    const result = await obtenerAudiencias();
    if (result.error) toast.error(result.error);
    else if (result.data) setAudiencias(result.data as MarketingAudiencia[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    cargarAudiencias();
  }, [cargarAudiencias]);

  const handleSincronizar = async (id: string) => {
    setSincronizandoId(id);
    const result = await sincronizarAudiencia(id);
    if (result.success) {
      toast.success("Audiencia sincronizada");
      cargarAudiencias();
    } else {
      toast.error(result.error || "Error sincronizando");
    }
    setSincronizandoId(null);
  };

  const handleEliminar = async () => {
    if (!confirmarEliminar) return;
    const result = await eliminarAudiencia(confirmarEliminar.id);
    if (result.success) {
      toast.success("Audiencia eliminada");
      cargarAudiencias();
    } else {
      toast.error(result.error || "Error eliminando");
    }
    setConfirmarEliminar(null);
  };

  return (
    <>
      {confirmarEliminar && (
        <ModalConfirmarEliminar
          nombre={confirmarEliminar.nombre}
          onConfirmar={handleEliminar}
          onCancelar={() => setConfirmarEliminar(null)}
        />
      )}

      <ModalCrearAudiencia
        open={modalCrear}
        onClose={() => setModalCrear(false)}
        onSuccess={cargarAudiencias}
      />

      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-crm-text-primary">Audiencias</h2>
            <p className="text-sm text-crm-text-secondary mt-1">
              Segmentos de clientes para tus campañas de marketing
            </p>
          </div>
          <button
            onClick={() => setModalCrear(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-crm-primary text-white rounded-xl text-sm font-medium hover:bg-crm-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nueva Audiencia
          </button>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-crm-card border border-crm-border rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-crm-border rounded w-3/4 mb-3" />
                <div className="h-3 bg-crm-border rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : audiencias.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-crm-primary/10 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-crm-primary" />
            </div>
            <h3 className="text-base font-semibold text-crm-text-primary mb-1">Sin audiencias</h3>
            <p className="text-sm text-crm-text-secondary max-w-xs mb-4">
              Crea audiencias para segmentar a tus clientes y usarlas en campañas.
            </p>
            <button
              onClick={() => setModalCrear(true)}
              className="flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-xl text-sm font-medium hover:bg-crm-primary/90"
            >
              <Plus className="w-4 h-4" />
              Crear primera audiencia
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {audiencias.map((a) => (
              <div key={a.id} className="bg-crm-card border border-crm-border rounded-xl p-5 hover:shadow-md transition-shadow">
                {/* Top */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-crm-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-crm-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-crm-text-primary leading-tight">{a.nombre}</p>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        a.tipo === "DINAMICO"
                          ? "bg-blue-100 text-blue-600"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {a.tipo === "DINAMICO" ? "Dinámico" : "Estático"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {a.tipo === "DINAMICO" && (
                      <button
                        onClick={() => handleSincronizar(a.id)}
                        disabled={sincronizandoId === a.id}
                        title="Recalcular audiencia"
                        className="p-1.5 text-crm-text-muted hover:text-crm-primary rounded-lg hover:bg-crm-card-hover transition-colors"
                      >
                        {sincronizandoId === a.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <RefreshCw className="w-3.5 h-3.5" />
                        }
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmarEliminar({ id: a.id, nombre: a.nombre })}
                      title="Eliminar audiencia"
                      className="p-1.5 text-crm-text-muted hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Descripción */}
                {a.descripcion && (
                  <p className="text-xs text-crm-text-muted mb-3 line-clamp-2">{a.descripcion}</p>
                )}

                {/* Contactos */}
                <div className="flex items-center gap-2 text-sm text-crm-text-secondary">
                  <Eye className="w-4 h-4" />
                  <span className="font-semibold text-crm-text-primary">{a.contactos_count ?? 0}</span>
                  <span>contactos</span>
                </div>

                {/* Última actualización */}
                {a.updated_at && (
                  <p className="text-[10px] text-crm-text-muted mt-2">
                    Actualizada {new Date(a.updated_at).toLocaleDateString("es-PE")}
                  </p>
                )}

                {/* Filtros resumen para dinámicas */}
                {a.tipo === "DINAMICO" && a.filtros && Object.keys(a.filtros).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-crm-border/50">
                    <p className="text-[10px] text-crm-text-muted font-medium mb-1">Filtros activos:</p>
                    <div className="flex flex-wrap gap-1">
                      {(a.filtros as any).estados?.map((e: string) => (
                        <span key={e} className="text-[10px] px-1.5 py-0.5 bg-crm-primary/10 text-crm-primary rounded">
                          {e}
                        </span>
                      ))}
                      {(a.filtros as any).soloConWhatsApp && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-600 rounded">WhatsApp</span>
                      )}
                      {(a.filtros as any).diasSinContacto && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded">
                          +{(a.filtros as any).diasSinContacto}d sin contacto
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
