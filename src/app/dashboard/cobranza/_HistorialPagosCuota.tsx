"use client";

import { useEffect, useState, useTransition } from "react";
import { History, X, Trash2, AlertCircle, ExternalLink, Loader2, AlertOctagon } from "lucide-react";
import toast from "react-hot-toast";
import {
  obtenerPagosCuota,
  anularPago,
  type PagoCuota,
} from "../clientes/_actions-cuotas";
import { formatearMoneda } from "@/lib/types/crm-flujo";

interface Props {
  cuotaId: string;
  numeroCuota: number;
  moneda: string;
  esAdmin: boolean;
  onClose: () => void;
  onChange?: () => void;
}

const METODO_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  cheque: "Cheque",
  deposito: "Depósito",
};

export default function HistorialPagosCuota({
  cuotaId,
  numeroCuota,
  moneda,
  esAdmin,
  onClose,
  onChange,
}: Props) {
  const [pagos, setPagos] = useState<PagoCuota[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [anularTargetId, setAnularTargetId] = useState<string | null>(null);
  const [anularMotivo, setAnularMotivo] = useState("");

  const monedaTyped = (moneda || "PEN") as "PEN" | "USD";

  useEffect(() => { load(); }, [cuotaId]);

  async function load() {
    setLoading(true);
    const res = await obtenerPagosCuota(cuotaId);
    if (res.success) setPagos(res.data ?? []);
    else toast.error(res.error || "Error cargando pagos");
    setLoading(false);
  }

  function abrirAnular(pagoId: string) {
    setAnularMotivo("");
    setAnularTargetId(pagoId);
  }

  function handleConfirmarAnular() {
    if (!anularTargetId) return;
    const motivo = anularMotivo.trim();
    if (!motivo) {
      toast.error("Ingrese un motivo de anulación");
      return;
    }
    const id = anularTargetId;
    setAnularTargetId(null);
    setAnularMotivo("");
    startTransition(async () => {
      const res = await anularPago(id, motivo);
      if (res.success) {
        toast.success("Pago anulado");
        await load();
        onChange?.();
      } else {
        toast.error(res.error || "Error anulando pago");
      }
    });
  }

  const activos = pagos.filter((p) => !p.anulado);
  const anulados = pagos.filter((p) => p.anulado);
  const totalActivo = activos.reduce((sum, p) => sum + Number(p.monto), 0);

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-crm-card rounded-t-xl sm:rounded-xl shadow-2xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col pb-[env(safe-area-inset-bottom)] sm:pb-0 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <span className="h-1 w-10 rounded-full bg-crm-border" aria-hidden />
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border">
          <h4 className="text-lg font-semibold text-crm-text-primary flex items-center gap-2">
            <History className="h-5 w-5" /> Pagos de cuota #{numeroCuota}
          </h4>
          <button onClick={onClose} className="text-crm-text-muted hover:text-crm-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-crm-text-muted">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando…
            </div>
          ) : pagos.length === 0 ? (
            <div className="text-center py-10 text-crm-text-muted">
              <History className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Esta cuota aún no registra pagos</p>
            </div>
          ) : (
            <>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2 text-sm flex justify-between">
                <span className="text-green-800 dark:text-green-300">Total pagado (no anulado)</span>
                <span className="font-bold text-green-800 dark:text-green-300">
                  {formatearMoneda(totalActivo, monedaTyped)}
                </span>
              </div>

              <div className="space-y-2">
                {activos.map((p) => (
                  <PagoRow
                    key={p.id}
                    pago={p}
                    moneda={monedaTyped}
                    esAdmin={esAdmin}
                    isPending={isPending}
                    onAnular={() => abrirAnular(p.id)}
                  />
                ))}
              </div>

              {anulados.length > 0 && (
                <details className="border border-crm-border rounded-lg p-3 text-sm">
                  <summary className="cursor-pointer text-crm-text-muted font-medium">
                    Pagos anulados ({anulados.length})
                  </summary>
                  <div className="space-y-2 mt-3">
                    {anulados.map((p) => (
                      <PagoRow
                        key={p.id}
                        pago={p}
                        moneda={monedaTyped}
                        esAdmin={false}
                        isPending={isPending}
                        onAnular={() => {}}
                      />
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end px-6 py-3 border-t border-crm-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-crm-text-secondary hover:text-crm-text-primary"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Modal anular pago con motivo */}
      {anularTargetId && (
        <div
          className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150"
          onClick={() => setAnularTargetId(null)}
        >
          <div
            className="bg-crm-card rounded-t-xl sm:rounded-xl shadow-2xl w-full sm:max-w-md p-5 sm:p-6 space-y-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] sm:pb-6 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sm:hidden flex justify-center -mt-1">
              <span className="h-1 w-10 rounded-full bg-crm-border" aria-hidden />
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertOctagon className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-lg font-semibold text-crm-text-primary">Anular pago</h4>
                <p className="text-sm text-crm-text-muted mt-1">
                  El monto se revertirá en cuota y venta. Indique el motivo.
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-1">
                Motivo *
              </label>
              <textarea
                value={anularMotivo}
                onChange={(e) => setAnularMotivo(e.target.value)}
                rows={3}
                autoFocus
                placeholder="Ej: pago duplicado, cliente solicitó devolución"
                className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setAnularTargetId(null)}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 border border-crm-border rounded-lg text-sm text-crm-text-primary hover:bg-crm-background disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarAnular}
                disabled={isPending || !anularMotivo.trim()}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Anular pago
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PagoRow({
  pago,
  moneda,
  esAdmin,
  isPending,
  onAnular,
}: {
  pago: PagoCuota;
  moneda: "PEN" | "USD";
  esAdmin: boolean;
  isPending: boolean;
  onAnular: () => void;
}) {
  return (
    <div
      className={`border rounded-lg p-3 ${
        pago.anulado
          ? "border-red-200 bg-red-50/30 dark:bg-red-900/10 opacity-70"
          : "border-crm-border"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold ${pago.anulado ? "line-through text-crm-text-muted" : "text-crm-text-primary"}`}>
              {formatearMoneda(Number(pago.monto), moneda)}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-crm-background text-crm-text-muted border border-crm-border">
              {METODO_LABEL[pago.metodo_pago ?? ""] ?? pago.metodo_pago ?? "—"}
            </span>
            {pago.anulado && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Anulado
              </span>
            )}
          </div>
          <div className="text-xs text-crm-text-muted mt-1 space-y-0.5">
            <div>
              {new Date(pago.fecha_pago).toLocaleString("es-PE")} · por {pago.registrado_por}
            </div>
            {(pago.banco || pago.numero_operacion) && (
              <div>
                {pago.banco && <span>{pago.banco}</span>}
                {pago.banco && pago.numero_operacion && <span> · </span>}
                {pago.numero_operacion && <span>Op. {pago.numero_operacion}</span>}
              </div>
            )}
            {pago.notas && <div className="italic">{pago.notas}</div>}
            {pago.comprobante_url && (
              <a
                href={pago.comprobante_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-crm-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> Ver comprobante
              </a>
            )}
            {pago.anulado && (
              <div className="mt-1 pt-1 border-t border-red-200/50 text-red-700">
                <strong>Anulado por {pago.anulado_por}</strong>
                {pago.fecha_anulacion && (
                  <> · {new Date(pago.fecha_anulacion).toLocaleString("es-PE")}</>
                )}
                {pago.motivo_anulacion && <div className="italic">"{pago.motivo_anulacion}"</div>}
              </div>
            )}
          </div>
        </div>
        {esAdmin && !pago.anulado && (
          <button
            onClick={onAnular}
            disabled={isPending}
            title="Anular pago"
            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
