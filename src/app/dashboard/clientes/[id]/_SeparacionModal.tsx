"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { X, FileSignature, Loader2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import {
  obtenerLotesParaSeparacion,
  registrarSeparacion,
} from "./_actions-separacion";
import { descargarConstanciaSeparacion } from "@/components/separacion/generarConstanciaSeparacionPdf";
import FirmaDigitalCanvas from "@/components/FirmaDigitalCanvas";

type FormaPago =
  | "contado"
  | "transferencia"
  | "deposito"
  | "credito_hipotecario"
  | "credito_directo";

const FORMA_PAGO_OPTIONS: { value: FormaPago; label: string; saltaCalificacion: boolean }[] = [
  { value: "contado", label: "Contado", saltaCalificacion: true },
  { value: "transferencia", label: "Transferencia", saltaCalificacion: true },
  { value: "deposito", label: "Depósito", saltaCalificacion: true },
  { value: "credito_hipotecario", label: "Crédito Hipotecario", saltaCalificacion: false },
  { value: "credito_directo", label: "Crédito Directo", saltaCalificacion: false },
];

const METODO_PAGO_OPTIONS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "deposito", label: "Depósito" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "cheque", label: "Cheque" },
];

interface LoteOption {
  id: string;
  codigo: string;
  precio: number | null;
  moneda: string | null;
  sup_m2: number | null;
  proyecto_id: string;
  proyecto_nombre: string | null;
  es_interes: boolean;
}

interface ProformaPrefill {
  proformaId: string;
  loteId: string | null;
  montoSeparacion: number | null;
  moneda: "PEN" | "USD";
  formaPagoSugerida: FormaPago | null;
  notas: string | null;
  numero: string | null;
  proyectoNombre: string | null;
  loteCodigo: string | null;
}

interface Props {
  clienteId: string;
  onClose: () => void;
  onSuccess?: () => void;
  /** Si se pasa, prefilla los campos y enlaza la proforma al registrar. */
  proformaPrefill?: ProformaPrefill;
}

export default function SeparacionModal({ clienteId, onClose, onSuccess, proformaPrefill }: Props) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lotes, setLotes] = useState<LoteOption[]>([]);
  const [loteId, setLoteId] = useState<string>(proformaPrefill?.loteId ?? "");
  const [monto, setMonto] = useState<string>(
    proformaPrefill?.montoSeparacion ? String(proformaPrefill.montoSeparacion) : "",
  );
  const [moneda, setMoneda] = useState<"PEN" | "USD">(proformaPrefill?.moneda ?? "PEN");
  const [formaPago, setFormaPago] = useState<FormaPago>(proformaPrefill?.formaPagoSugerida ?? "contado");
  const [metodoPago, setMetodoPago] = useState<string>("efectivo");
  const [fechaVencimiento, setFechaVencimiento] = useState<string>("");
  const [notas, setNotas] = useState<string>(proformaPrefill?.notas ?? "");
  const [firmaBase64, setFirmaBase64] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await obtenerLotesParaSeparacion(clienteId);
      if (cancelled) return;
      if (!res.success || !res.data) {
        setLoadError(res.error ?? "No se pudieron cargar los lotes");
      } else {
        setLotes(res.data);
        // Preseleccionar primer lote de interés si existe.
        const primerInteres = res.data.find((l) => l.es_interes);
        if (primerInteres) setLoteId(primerInteres.id);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [clienteId]);

  const loteSeleccionado = useMemo(
    () => lotes.find((l) => l.id === loteId) || null,
    [lotes, loteId],
  );

  useEffect(() => {
    // Cuando cambia el lote, alinear moneda con la del lote si está definida.
    if (loteSeleccionado?.moneda === "PEN" || loteSeleccionado?.moneda === "USD") {
      setMoneda(loteSeleccionado.moneda);
    }
  }, [loteSeleccionado]);

  const infoFormaPago = FORMA_PAGO_OPTIONS.find((o) => o.value === formaPago);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!loteId) {
      toast.error("Seleccione una unidad");
      return;
    }
    const montoNum = Number(monto);
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      toast.error("Ingrese un monto válido");
      return;
    }
    if (!firmaBase64) {
      toast.error("Debe firmar antes de registrar la separación");
      return;
    }

    startTransition(async () => {
      const res = await registrarSeparacion({
        clienteId,
        loteId,
        montoSeparacion: montoNum,
        moneda,
        formaPago,
        metodoPago,
        fechaVencimiento: fechaVencimiento || undefined,
        notas: notas || undefined,
        proformaId: proformaPrefill?.proformaId,
        firmaVendedorBase64: firmaBase64 ?? undefined,
      });

      if (!res.success) {
        toast.error(res.error ?? "Error registrando la separación");
        return;
      }

      toast.success(
        res.data?.codigoReserva
          ? `Separación ${res.data.codigoReserva} registrada`
          : "Separación registrada",
      );

      // Descargar constancia automáticamente para que el vendedor
      // pueda entregarla al cliente al instante.
      if (res.data?.constancia) {
        try {
          const c = res.data.constancia;
          await descargarConstanciaSeparacion({
            comprador: {
              nombre: c.compradorNombre,
              dni: c.compradorDni ?? "—",
            },
            compradorDomicilio: c.compradorDomicilio,
            montoSeparacion: c.montoSeparacion,
            moneda: c.moneda,
            metodoPago: c.metodoPago ?? "transferencia",
            numeroOperacion: c.numeroOperacion,
            loteNumero: c.loteNumero,
            loteArea: c.loteArea,
            proyectoNombre: c.proyectoNombre,
            fechaDocumento: c.fechaDocumento,
            observaciones: c.observaciones,
            firmaVendedorBase64: c.firmaVendedorBase64,
          });
          toast.success("Constancia descargada");
        } catch (e) {
          console.error("[SeparacionModal] Error descargando constancia:", e);
          toast.error("Separación creada, pero falló la descarga de la constancia. Use el botón verde en la lista.");
        }
      }

      onSuccess?.();
      onClose();
    });
  }

  const lotesInteres = lotes.filter((l) => l.es_interes);
  const lotesOtros = lotes.filter((l) => !l.es_interes);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-crm-card rounded-t-xl sm:rounded-xl shadow-2xl w-full sm:max-w-2xl max-h-[95vh] flex flex-col pb-[env(safe-area-inset-bottom)] sm:pb-0 animate-in slide-in-from-bottom-4 sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <span className="h-1 w-10 rounded-full bg-crm-border" aria-hidden />
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <FileSignature className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-crm-text-primary">Registrar Separación</h2>
              <p className="text-xs text-crm-text-muted">
                {proformaPrefill
                  ? `Desde proforma ${proformaPrefill.numero ?? ""} · ${proformaPrefill.proyectoNombre ?? ""} ${proformaPrefill.loteCodigo ?? ""}`.trim()
                  : "Inicia el proceso de adquisición del cliente"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-crm-text-muted hover:text-crm-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-crm-text-muted">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando lotes…
            </div>
          ) : loadError ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800 dark:text-red-200">{loadError}</div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-1">
                  Unidad a separar
                </label>
                <select
                  value={loteId}
                  onChange={(e) => setLoteId(e.target.value)}
                  required
                  className="w-full border border-crm-border rounded-lg px-3 py-2 bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Seleccionar…</option>
                  {lotesInteres.length > 0 && (
                    <optgroup label="Propiedades de interés del cliente">
                      {lotesInteres.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.codigo} — {l.proyecto_nombre ?? "sin proyecto"}
                          {l.precio ? ` (${l.moneda ?? ""} ${l.precio.toLocaleString()})` : ""}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {lotesOtros.length > 0 && (
                    <optgroup label="Otros lotes disponibles">
                      {lotesOtros.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.codigo} — {l.proyecto_nombre ?? "sin proyecto"}
                          {l.precio ? ` (${l.moneda ?? ""} ${l.precio.toLocaleString()})` : ""}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {lotesInteres.length === 0 && (
                  <p className="text-xs text-crm-text-muted mt-1">
                    Este cliente no tiene propiedades marcadas como interés.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-crm-text-primary mb-1">
                    Monto de separación
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    required
                    className="w-full border border-crm-border rounded-lg px-3 py-2 bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-crm-text-primary mb-1">
                    Moneda
                  </label>
                  <select
                    value={moneda}
                    onChange={(e) => setMoneda(e.target.value as "PEN" | "USD")}
                    className="w-full border border-crm-border rounded-lg px-3 py-2 bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="PEN">PEN</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-1">
                  Forma de pago de la operación
                </label>
                <select
                  value={formaPago}
                  onChange={(e) => setFormaPago(e.target.value as FormaPago)}
                  className="w-full border border-crm-border rounded-lg px-3 py-2 bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {FORMA_PAGO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {infoFormaPago?.saltaCalificacion && (
                  <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                    Esta forma de pago saltea la etapa de Calificación Bancaria.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-crm-text-primary mb-1">
                    Método de pago de la seña
                  </label>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    className="w-full border border-crm-border rounded-lg px-3 py-2 bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {METODO_PAGO_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-crm-text-primary mb-1">
                    Vence (opcional)
                  </label>
                  <input
                    type="date"
                    value={fechaVencimiento}
                    onChange={(e) => setFechaVencimiento(e.target.value)}
                    className="w-full border border-crm-border rounded-lg px-3 py-2 bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-crm-text-muted mt-1">
                    No debe superar los 3 días hábiles.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-1">
                  Notas (opcional)
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={2}
                  className="w-full border border-crm-border rounded-lg px-3 py-2 bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Ej: incluir arras confirmatorias, titulares adicionales, etc."
                />
              </div>

              <FirmaDigitalCanvas
                value={firmaBase64}
                onChange={setFirmaBase64}
                label="Firma del vendedor"
                helpText="El vendedor debe firmar antes de registrar la separación."
                required
              />
            </>
          )}
        </form>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-crm-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-crm-text-secondary hover:text-crm-text-primary"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isPending || loading || !!loadError}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Registrar separación
          </button>
        </div>
      </div>
    </div>
  );
}
