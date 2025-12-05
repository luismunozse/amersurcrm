"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, PlusCircle } from "lucide-react";
import toast from "react-hot-toast";
import { agregarPropiedadInteres } from "@/app/dashboard/clientes/_actions_crm";
import { useRouter } from "next/navigation";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  clienteId: string;
};

type LoteOption = {
  id: string;
  numero_lote?: string | null;
  codigo?: string | null;
  sup_m2?: number | null;
  precio?: number | null;
};

type ProyectoOption = {
  id: string;
  nombre: string;
  lotes: LoteOption[];
};

type ProyectosResponse = {
  proyectos?: ProyectoOption[];
};

const PRIORIDAD_OPTIONS: Array<{ value: 1 | 2 | 3; label: string; description: string }> = [
  { value: 1, label: "Alta", description: "Cliente muy interesado" },
  { value: 2, label: "Media", description: "Opción a seguir" },
  { value: 3, label: "Baja", description: "Opcional / comparativo" },
];

function renderLoteLabel(lote: LoteOption) {
  const partes = [`Lote ${lote.numero_lote || lote.codigo || "s/c"}`];
  if (lote.sup_m2) {
    partes.push(`${lote.sup_m2} m²`);
  }
  if (typeof lote.precio === "number") {
    partes.push(`S/ ${lote.precio.toLocaleString("es-PE")}`);
  }
  return partes.join(" • ");
}

export default function AgregarPropiedadInteresModal({ isOpen, onClose, clienteId }: Props) {
  const router = useRouter();
  const [proyectos, setProyectos] = useState<ProyectoOption[]>([]);
  const [selectedProyectoId, setSelectedProyectoId] = useState<string>("");
  const [selectedLoteId, setSelectedLoteId] = useState<string>("");
  const [prioridad, setPrioridad] = useState<1 | 2 | 3>(2);
  const [notas, setNotas] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const controller = new AbortController();

    async function loadOptions() {
      setLoadingOptions(true);
      setOptionsError(null);
      try {
        const response = await fetch("/api/reservas/opciones", { signal: controller.signal });
        if (!response.ok) {
          throw new Error("No se pudieron cargar los proyectos");
        }
        const payload: ProyectosResponse = await response.json();
        if (cancelled) return;
        const proyectosData = (payload.proyectos || []).map((proyecto) => ({
          ...proyecto,
          lotes: proyecto.lotes || [],
        }));
        setProyectos(proyectosData);
        if (proyectosData.length > 0) {
          const proyectoConLote = proyectosData.find((p) => p.lotes.length > 0);
          setSelectedProyectoId((prev) => prev || proyectoConLote?.id || proyectosData[0].id);
          setSelectedLoteId(
            (prev) =>
              prev ||
              proyectoConLote?.lotes[0]?.id ||
              proyectosData.find((p) => p.lotes.length > 0)?.lotes[0]?.id ||
              ""
          );
        }
      } catch (error) {
        if (cancelled || (error as Error).name === "AbortError") return;
        console.error("Error cargando proyectos:", error);
        setOptionsError("No se pudieron cargar los proyectos/lotes disponibles");
      } finally {
        if (!cancelled) {
          setLoadingOptions(false);
        }
      }
    }

    void loadOptions();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setNotas("");
      setPrioridad(2);
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!selectedProyectoId) return;
    const proyecto = proyectos.find((p) => p.id === selectedProyectoId);
    if (!proyecto) {
      setSelectedLoteId("");
      return;
    }
    if (proyecto.lotes.length === 0) {
      setSelectedLoteId("");
      return;
    }
    if (!proyecto.lotes.some((lote) => lote.id === selectedLoteId)) {
      setSelectedLoteId(proyecto.lotes[0].id);
    }
  }, [selectedProyectoId, selectedLoteId, proyectos]);

  const selectedProyecto = useMemo(
    () => proyectos.find((p) => p.id === selectedProyectoId),
    [proyectos, selectedProyectoId]
  );
  const lotesDisponibles = selectedProyecto?.lotes ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProyectoId) {
      toast.error("Selecciona un proyecto");
      return;
    }
    if (!selectedLoteId) {
      toast.error("Selecciona un lote");
      return;
    }

    setSubmitting(true);
    try {
      const result = await agregarPropiedadInteres({
        clienteId,
        loteId: selectedLoteId,
        prioridad,
        notas: notas.trim() ? notas.trim() : undefined,
      });

      if (result.success) {
        toast.success("Propiedad agregada a la lista del cliente");
        onClose();
        router.refresh();
      } else {
        toast.error(result.error || "No se pudo agregar la propiedad");
      }
    } catch (error) {
      console.error("Error agregando propiedad de interés:", error);
      toast.error("Error inesperado al agregar propiedad");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-lg bg-crm-card border-2 border-crm-border rounded-2xl shadow-2xl p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-crm-text-primary flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-crm-primary" />
              Agregar a propiedades de interés
            </h2>
            <p className="text-sm text-crm-text-secondary mt-1">
              Selecciona el proyecto y lote que el cliente desea seguir.
            </p>
          </div>
          <button
            onClick={() => !submitting && onClose()}
            className="text-crm-text-muted hover:text-crm-text-primary transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Proyecto *
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedProyectoId}
                  onChange={(e) => setSelectedProyectoId(e.target.value)}
                  disabled={loadingOptions || submitting || proyectos.length === 0}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary disabled:opacity-50"
                >
                  <option value="">Seleccionar proyecto</option>
                  {proyectos.map((proyecto) => (
                    <option key={proyecto.id} value={proyecto.id}>
                      {proyecto.nombre}
                    </option>
                  ))}
                </select>
                {loadingOptions && <Loader2 className="h-4 w-4 text-crm-primary animate-spin" />}
              </div>
              {optionsError && <p className="text-xs text-red-500 mt-1">{optionsError}</p>}
              {!loadingOptions && proyectos.length === 0 && (
                <p className="text-xs text-crm-text-muted mt-1">
                  No hay proyectos disponibles para seleccionar.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Lote *
              </label>
              <select
                value={selectedLoteId}
                onChange={(e) => setSelectedLoteId(e.target.value)}
                disabled={
                  submitting ||
                  loadingOptions ||
                  !selectedProyectoId ||
                  lotesDisponibles.length === 0
                }
                className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary disabled:opacity-50"
              >
                <option value="">Seleccionar lote</option>
                {lotesDisponibles.map((lote) => (
                  <option key={lote.id} value={lote.id}>
                    {renderLoteLabel(lote)}
                  </option>
                ))}
              </select>
              {selectedProyectoId && !loadingOptions && lotesDisponibles.length === 0 && (
                <p className="text-xs text-crm-text-muted mt-1">
                  Este proyecto no tiene lotes disponibles para la lista de deseos.
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Prioridad
            </label>
            <div className="grid grid-cols-3 gap-3">
              {PRIORIDAD_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => setPrioridad(option.value)}
                  className={`border rounded-lg p-3 text-left transition-colors ${
                    prioridad === option.value
                      ? "border-crm-primary bg-crm-primary/10 text-crm-primary"
                      : "border-crm-border hover:border-crm-primary text-crm-text"
                  }`}
                >
                  <p className="text-sm font-semibold">{option.label}</p>
                  <p className="text-xs text-crm-text-muted mt-1">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Notas (opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              disabled={submitting}
              className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary resize-none disabled:opacity-50"
              placeholder="Ej: Cliente comparando con Proyecto Girasoles, priorizar este lote si se libera..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-crm-text-primary border border-crm-border rounded-lg hover:bg-crm-card-hover transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedLoteId}
              className="px-4 py-2 text-sm font-medium text-white bg-crm-primary rounded-lg hover:bg-crm-primary/90 transition-colors disabled:opacity-50"
            >
              {submitting ? "Agregando..." : "Agregar"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
