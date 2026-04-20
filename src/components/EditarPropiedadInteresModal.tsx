"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { actualizarPropiedadInteres } from "@/app/dashboard/clientes/_actions_crm";
import type { PropiedadResumen } from "@/types/propiedades-interes";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  propiedad: PropiedadResumen | null;
};

const PRIORIDAD_OPTIONS: Array<{ value: 1 | 2 | 3; label: string; description: string }> = [
  { value: 1, label: "Alta", description: "Cliente muy interesado" },
  { value: 2, label: "Media", description: "Seguimiento regular" },
  { value: 3, label: "Baja", description: "Comparativo / opcional" },
];

export default function EditarPropiedadInteresModal({ isOpen, onClose, propiedad }: Props) {
  const router = useRouter();
  const [prioridad, setPrioridad] = useState<1 | 2 | 3>(2);
  const [notas, setNotas] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && propiedad) {
      setPrioridad(propiedad.prioridad);
      setNotas(propiedad.notas || "");
    }
  }, [isOpen, propiedad]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!propiedad) return;
    setSubmitting(true);
    try {
      const result = await actualizarPropiedadInteres({
        interesId: propiedad.id,
        prioridad,
        notas: notas.trim() ? notas.trim() : null,
      });

      if (result.success) {
        toast.success("Propiedad actualizada");
        router.refresh();
        onClose();
      } else {
        toast.error(result.error || "No se pudo actualizar la propiedad");
      }
    } catch (error) {
      console.error("Error actualizando propiedad de interés:", error);
      toast.error("Error inesperado al actualizar");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !propiedad) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150"
      onClick={(event) => {
        if (event.target === event.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full sm:max-w-md max-h-[92vh] overflow-y-auto bg-crm-card border-t sm:border border-crm-border rounded-t-2xl sm:rounded-2xl shadow-xl p-5 sm:p-6 pb-[max(env(safe-area-inset-bottom),1.25rem)] sm:pb-6 animate-in slide-in-from-bottom-4 sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-200">
        <div className="sm:hidden flex justify-center -mt-1 mb-3">
          <span className="h-1 w-10 rounded-full bg-crm-border" aria-hidden />
        </div>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-crm-text">Editar propiedad</h2>
            <p className="text-sm text-crm-text-muted">
              Ajusta la prioridad o las notas internas del cliente.
            </p>
          </div>
          <button
            onClick={() => !submitting && onClose()}
            className="text-crm-text-muted hover:text-crm-text transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-crm-border bg-crm-background p-3 text-sm">
          <p className="font-semibold text-crm-text">
            {propiedad.lote
              ? `Lote ${propiedad.lote.numero_lote || propiedad.lote.codigo || "s/c"}`
              : "Propiedad sin datos"}
          </p>
          {propiedad.lote?.proyecto?.nombre && (
            <p className="text-crm-text-muted">{propiedad.lote.proyecto.nombre}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-crm-text mb-2">
              Prioridad
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORIDAD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPrioridad(option.value)}
                  className={`rounded-lg border px-2 py-2 text-sm transition-colors ${
                    prioridad === option.value
                      ? "border-crm-primary bg-crm-primary/10 text-crm-primary"
                      : "border-crm-border text-crm-text-muted hover:text-crm-text"
                  }`}
                >
                  <span className="block font-semibold">{option.label}</span>
                  <span className="text-xs">{option.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-crm-text mb-2">
              Notas internas
            </label>
            <textarea
              value={notas}
              onChange={(event) => setNotas(event.target.value)}
              rows={4}
              className="w-full rounded-lg border border-crm-border bg-crm-card px-3 py-2 text-sm text-crm-text focus:ring-2 focus:ring-crm-primary"
              placeholder="Ej. Priorizar si libera lote contiguo"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-crm-primary text-white py-2 font-medium disabled:opacity-60"
          >
            {submitting && <Spinner size="sm" />}
            Guardar cambios
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
