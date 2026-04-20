"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { crearReserva } from "@/app/dashboard/clientes/_actions_crm";
import { MONEDAS, type Moneda } from "@/lib/types/crm-flujo";
import { Spinner } from "@/components/ui/Spinner";
import DateTimePicker from "@/components/DateTimePicker";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  clienteId: string;
  clienteNombre: string;
  loteId?: string;
  loteNombre?: string;
}

type LoteOption = {
  id: string;
  numero_lote?: string | null;
  codigo?: string | null;
  precio?: number | null;
  sup_m2?: number | null;
};

type ProyectoOption = {
  id: string;
  nombre: string;
  ubicacion?: string | null;
  estado?: string | null;
  lotes: LoteOption[];
};

type ProyectosResponse = {
  proyectos?: ProyectoOption[];
};

export default function CrearReservaModal({
  isOpen,
  onClose,
  clienteId,
  clienteNombre,
  loteId,
  loteNombre,
}: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [montoReserva, setMontoReserva] = useState("");
  const [moneda, setMoneda] = useState<Moneda>("PEN");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [notas, setNotas] = useState("");

  const [proyectos, setProyectos] = useState<ProyectoOption[]>([]);
  const [selectedProyectoId, setSelectedProyectoId] = useState<string>("");
  const [selectedLoteId, setSelectedLoteId] = useState<string>(loteId || "");
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  // Calcular fecha de vencimiento por defecto (30 días)
  const calcularFechaVencimiento = () => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 30);
    fecha.setSeconds(0, 0);
    return fecha.toISOString();
  };

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const controller = new AbortController();

    async function loadOptions() {
      setOptionsLoading(true);
      setOptionsError(null);
      try {
        const response = await fetch("/api/reservas/opciones", { signal: controller.signal });
        if (!response.ok) {
          throw new Error("No se pudieron cargar los proyectos");
        }
        const payload: ProyectosResponse = await response.json();
        if (cancelled) return;
        const proyectosData: ProyectoOption[] = (payload.proyectos || []).map((proyecto) => ({
          ...proyecto,
          lotes: proyecto.lotes || [],
        }));
        setProyectos(proyectosData);
      } catch (error) {
        if ((error as Error).name === "AbortError" || cancelled) {
          return;
        }
        console.error("Error cargando proyectos para reserva:", error);
        setOptionsError("No se pudieron cargar los proyectos o lotes disponibles");
      } finally {
        if (!cancelled) {
          setOptionsLoading(false);
        }
      }
    }

    void loadOptions();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isOpen]);

  const renderLoteLabel = (lote: LoteOption) => {
    const partes = [`Lote ${lote.numero_lote || lote.codigo || "sin código"}`];
    if (lote.sup_m2) {
      partes.push(`${lote.sup_m2} m²`);
    }
    if (typeof lote.precio === "number") {
      partes.push(`S/ ${lote.precio.toLocaleString("es-PE")}`);
    }
    return partes.join(" • ");
  };

  useEffect(() => {
    if (!isOpen) return;

    if (!proyectos.length) {
      setSelectedProyectoId("");
      setSelectedLoteId("");
      return;
    }

    if (loteId) {
      const proyectoConLote = proyectos.find((proyecto) =>
        proyecto.lotes?.some((lote) => lote.id === loteId)
      );
      if (proyectoConLote) {
        setSelectedProyectoId(proyectoConLote.id);
        setSelectedLoteId(loteId);
        return;
      }
    }

    if (!selectedProyectoId) {
      const proyectoDefault =
        proyectos.find((proyecto) => proyecto.lotes.length > 0) || proyectos[0];
      setSelectedProyectoId(proyectoDefault?.id || "");
      if (proyectoDefault?.lotes.length) {
        setSelectedLoteId(proyectoDefault.lotes[0].id);
      } else {
        setSelectedLoteId("");
      }
    }
  }, [isOpen, proyectos, loteId, selectedProyectoId]);

  useEffect(() => {
    if (!selectedProyectoId) return;
    const proyecto = proyectos.find((p) => p.id === selectedProyectoId);
    if (!proyecto) {
      setSelectedLoteId("");
      return;
    }

    if (!proyecto.lotes.length) {
      setSelectedLoteId("");
      return;
    }

    if (!proyecto.lotes.some((lote) => lote.id === selectedLoteId)) {
      setSelectedLoteId(proyecto.lotes[0].id);
    }
  }, [selectedProyectoId, selectedLoteId, proyectos]);

  useEffect(() => {
    if (isOpen) {
      setFechaVencimiento((prev) => prev || calcularFechaVencimiento());
    }
  }, [isOpen]);

  const selectedProyecto = proyectos.find((p) => p.id === selectedProyectoId) || null;
  const lotesDisponibles = selectedProyecto?.lotes ?? [];
  const loteSeleccionado = lotesDisponibles.find((lote) => lote.id === selectedLoteId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProyectoId) {
      toast.error("Selecciona un proyecto para la reserva");
      return;
    }

    if (!selectedLoteId) {
      toast.error("Selecciona un lote disponible");
      return;
    }

    if (!montoReserva || parseFloat(montoReserva) <= 0) {
      toast.error("Ingrese un monto válido");
      return;
    }

    if (!fechaVencimiento) {
      toast.error("Seleccione fecha de vencimiento");
      return;
    }

    const vencimientoDate = new Date(fechaVencimiento);
    if (Number.isNaN(vencimientoDate.getTime())) {
      toast.error("Fecha de vencimiento inválida");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await crearReserva({
        clienteId,
        loteId: selectedLoteId,
        montoReserva: parseFloat(montoReserva),
        moneda: moneda === "PEN" || moneda === "USD" ? moneda : undefined,
        fechaVencimiento: vencimientoDate.toISOString(),
        metodoPago: metodoPago || undefined,
        notas: notas || undefined,
      });

      if (result.success) {
        toast.success(`Reserva ${result.data?.codigo_reserva} creada exitosamente`);
        resetForm();
        onClose();
        router.refresh();
      } else {
        toast.error(result.error || "Error al crear reserva");
      }
    } catch (error) {
      console.error("Error creando reserva:", error);
      toast.error("Error inesperado al crear reserva");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setMontoReserva("");
    setMoneda("PEN");
    setFechaVencimiento(calcularFechaVencimiento());
    setMetodoPago("");
    setNotas("");
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-full sm:max-w-lg max-h-[92vh] sm:max-h-[90vh] bg-crm-card border-t-2 sm:border-2 border-crm-border rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col pb-[env(safe-area-inset-bottom)] sm:pb-0 animate-in slide-in-from-bottom-4 sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-200">
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <span className="h-1 w-10 rounded-full bg-crm-border" aria-hidden />
        </div>
        {/* Header */}
        <div className="flex items-start justify-between p-5 sm:p-6 pt-3 sm:pt-6 pb-4 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-crm-text-primary">
              Crear Reserva
            </h2>
            <p className="text-sm text-crm-text-secondary mt-1">
              Cliente: {clienteNombre}
            </p>
            {loteNombre && (
              <p className="text-sm text-crm-text-secondary">
                Lote: {loteNombre}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-crm-text-muted hover:text-crm-text-primary transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto px-6 pb-6 flex-1 min-h-0">
          {/* Proyecto y Lote */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Proyecto *
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedProyectoId}
                  onChange={(e) => setSelectedProyectoId(e.target.value)}
                  disabled={optionsLoading || proyectos.length === 0 || isSubmitting}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary disabled:opacity-60"
                >
                  <option value="">Seleccionar proyecto</option>
                  {proyectos.map((proyecto) => (
                    <option key={proyecto.id} value={proyecto.id}>
                      {proyecto.nombre}
                    </option>
                  ))}
                </select>
                {optionsLoading && (
                  <Spinner size="sm" color="primary" />
                )}
              </div>
              {optionsError && (
                <p className="text-xs text-red-500 mt-1">{optionsError}</p>
              )}
              {!optionsLoading && proyectos.length === 0 && (
                <p className="text-xs text-crm-text-muted mt-1">
                  No hay proyectos activos con lotes disponibles.
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
                  optionsLoading ||
                  !selectedProyectoId ||
                  lotesDisponibles.length === 0 ||
                  isSubmitting
                }
                className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary disabled:opacity-60"
              >
                <option value="">Seleccionar lote</option>
                {lotesDisponibles.map((lote) => (
                  <option key={lote.id} value={lote.id}>
                    {renderLoteLabel(lote)}
                  </option>
                ))}
              </select>
              {selectedProyectoId && !optionsLoading && lotesDisponibles.length === 0 && (
                <p className="text-xs text-crm-text-muted mt-1">
                  Este proyecto no tiene lotes disponibles para reservar.
                </p>
              )}
              {loteSeleccionado && (
                <p className="text-xs text-crm-text-muted mt-1">
                  {loteSeleccionado.sup_m2 ? `${loteSeleccionado.sup_m2} m²` : "Área no registrada"}
                  {typeof loteSeleccionado.precio === "number"
                    ? ` • Ref.: S/ ${loteSeleccionado.precio.toLocaleString("es-PE")}`
                    : ""}
                </p>
              )}
            </div>
          </div>

          {/* Monto y Moneda */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Monto de Reserva *
              </label>
              <input
                type="number"
                value={montoReserva}
                onChange={(e) => setMontoReserva(e.target.value)}
                required
                min="0"
                step="0.01"
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary disabled:opacity-60"
                placeholder="5000.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Moneda *
              </label>
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value as Moneda)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary disabled:opacity-60"
              >
                {MONEDAS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.symbol} {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fecha de Vencimiento */}
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Fecha de Vencimiento *
            </label>
            <input
              type="date"
              value={fechaVencimiento ? fechaVencimiento.split('T')[0] : ''}
              onChange={(e) => setFechaVencimiento(e.target.value ? new Date(e.target.value + 'T12:00:00').toISOString() : '')}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setFechaVencimiento(calcularFechaVencimiento())}
              className="text-xs text-crm-primary hover:underline disabled:opacity-50 mt-1"
              disabled={isSubmitting}
            >
              +30 días
            </button>
          </div>

          {/* Método de Pago */}
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Método de Pago
            </label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary disabled:opacity-60"
            >
              <option value="">Seleccionar método</option>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="cheque">Cheque</option>
              <option value="deposito">Depósito</option>
            </select>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Notas
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary resize-none disabled:opacity-60"
              placeholder="Observaciones sobre la reserva..."
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              ℹ️ Al crear la reserva, el lote seleccionado cambiará automáticamente a estado <strong>&ldquo;Reservado&rdquo;</strong>
            </p>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-crm-text-primary border border-crm-border rounded-lg hover:bg-crm-card-hover transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedLoteId}
              className="px-4 py-2 text-sm font-medium text-white bg-crm-primary rounded-lg hover:bg-crm-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Creando..." : "Crear Reserva"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
