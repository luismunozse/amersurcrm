"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Wallet, CheckCircle, Clock, XCircle, Banknote, AlertCircle,
  ShieldCheck, AlertOctagon, Loader2, ExternalLink,
} from "lucide-react";
import {
  obtenerComisiones,
  obtenerResumenComisiones,
  aprobarComision,
  pagarComision,
  anularComision,
  type Comision,
  type EstadoComision,
  type ResumenComisiones,
} from "./_actions-comisiones";
import { formatearMoneda, METODOS_PAGO } from "@/lib/types/crm-flujo";
import toast from "react-hot-toast";
import ConfirmDialog from "@/components/ConfirmDialog";

interface Props {
  esAdmin?: boolean;
}

const ESTADO_BADGE: Record<EstadoComision, string> = {
  pendiente: "bg-gray-100 text-gray-700 border-gray-200",
  aprobada: "bg-blue-100 text-blue-700 border-blue-200",
  pagada: "bg-green-100 text-green-700 border-green-200",
  anulada: "bg-red-100 text-red-700 border-red-200",
};

const ESTADO_LABEL: Record<EstadoComision, string> = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  pagada: "Pagada",
  anulada: "Anulada",
};

export default function ComisionesList({ esAdmin = false }: Props) {
  const [items, setItems] = useState<Comision[]>([]);
  const [resumen, setResumen] = useState<ResumenComisiones | null>(null);
  const [filtro, setFiltro] = useState<EstadoComision | "">("");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Modal pago
  const [pagoModal, setPagoModal] = useState<Comision | null>(null);
  const [pagoForm, setPagoForm] = useState({
    metodoPago: "transferencia",
    comprobanteUrl: "",
    notas: "",
  });

  // Modal aprobar / anular
  const [aprobarTarget, setAprobarTarget] = useState<Comision | null>(null);
  const [anularTarget, setAnularTarget] = useState<Comision | null>(null);
  const [anularMotivo, setAnularMotivo] = useState("");

  useEffect(() => { loadData(); }, [filtro]);

  async function loadData() {
    setLoading(true);
    const [itemsRes, resumenRes] = await Promise.all([
      obtenerComisiones({ estado: filtro || undefined }),
      obtenerResumenComisiones(),
    ]);
    if (itemsRes.success) setItems(itemsRes.data ?? []);
    else toast.error(itemsRes.error || "Error cargando comisiones");
    if (resumenRes.success) setResumen(resumenRes.data ?? null);
    setLoading(false);
  }

  function handleAprobarConfirmado() {
    if (!aprobarTarget) return;
    const id = aprobarTarget.id;
    setAprobarTarget(null);
    startTransition(async () => {
      const res = await aprobarComision(id);
      if (res.success) {
        toast.success("Comisión aprobada");
        loadData();
      } else {
        toast.error(res.error || "Error");
      }
    });
  }

  function abrirModalPagar(c: Comision) {
    setPagoForm({ metodoPago: "transferencia", comprobanteUrl: "", notas: "" });
    setPagoModal(c);
  }

  function handleConfirmarPago() {
    if (!pagoModal) return;
    if (!pagoForm.metodoPago) {
      toast.error("Seleccione método de pago");
      return;
    }
    startTransition(async () => {
      const res = await pagarComision({
        comisionId: pagoModal.id,
        metodoPago: pagoForm.metodoPago,
        comprobanteUrl: pagoForm.comprobanteUrl || undefined,
        notas: pagoForm.notas || undefined,
      });
      if (res.success) {
        toast.success("Comisión pagada");
        setPagoModal(null);
        loadData();
      } else {
        toast.error(res.error || "Error");
      }
    });
  }

  function abrirModalAnular(c: Comision) {
    setAnularMotivo("");
    setAnularTarget(c);
  }

  function handleConfirmarAnular() {
    if (!anularTarget) return;
    const motivo = anularMotivo.trim();
    if (!motivo) {
      toast.error("Ingrese un motivo de anulación");
      return;
    }
    const id = anularTarget.id;
    setAnularTarget(null);
    setAnularMotivo("");
    startTransition(async () => {
      const res = await anularComision(id, motivo);
      if (res.success) {
        toast.success("Comisión anulada");
        loadData();
      } else {
        toast.error(res.error || "Error");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Resumen por estado */}
      {resumen && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-crm-card border border-crm-border rounded-lg p-4">
            <p className="text-xs text-crm-text-muted">Total</p>
            <p className="text-2xl font-bold text-crm-text">{resumen.total}</p>
          </div>
          <div className="bg-crm-card border border-crm-border rounded-lg p-4">
            <p className="text-xs text-crm-text-muted flex items-center gap-1">
              <Clock className="h-3 w-3" /> Pendientes
            </p>
            <p className="text-2xl font-bold text-gray-700">{resumen.pendiente.count}</p>
            <p className="text-xs text-crm-text-muted mt-0.5">
              {formatearMoneda(resumen.pendiente.monto, "PEN")}
            </p>
          </div>
          <div className="bg-crm-card border border-crm-border rounded-lg p-4">
            <p className="text-xs text-crm-text-muted flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Aprobadas
            </p>
            <p className="text-2xl font-bold text-blue-700">{resumen.aprobada.count}</p>
            <p className="text-xs text-crm-text-muted mt-0.5">
              {formatearMoneda(resumen.aprobada.monto, "PEN")}
            </p>
          </div>
          <div className="bg-crm-card border border-crm-border rounded-lg p-4">
            <p className="text-xs text-crm-text-muted flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Pagadas
            </p>
            <p className="text-2xl font-bold text-green-700">{resumen.pagada.count}</p>
            <p className="text-xs text-crm-text-muted mt-0.5">
              {formatearMoneda(resumen.pagada.monto, "PEN")}
            </p>
          </div>
          <div className="bg-crm-card border border-crm-border rounded-lg p-4">
            <p className="text-xs text-crm-text-muted flex items-center gap-1">
              <XCircle className="h-3 w-3" /> Anuladas
            </p>
            <p className="text-2xl font-bold text-red-700">{resumen.anulada.count}</p>
            <p className="text-xs text-crm-text-muted mt-0.5">
              {formatearMoneda(resumen.anulada.monto, "PEN")}
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {(["", "pendiente", "aprobada", "pagada", "anulada"] as Array<EstadoComision | "">).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              filtro === f
                ? "bg-crm-primary text-white"
                : "bg-crm-background border border-crm-border text-crm-text-muted hover:bg-crm-card"
            }`}
          >
            {f === "" ? "Todas" : ESTADO_LABEL[f as EstadoComision]}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-8 text-crm-text-muted">Cargando...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-crm-text-muted">
          <Wallet className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p>No hay comisiones con este filtro</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-crm-card border border-crm-border rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-crm-border text-left bg-crm-background">
                <th className="py-2.5 px-3 text-crm-text-muted font-medium">Código</th>
                <th className="py-2.5 px-3 text-crm-text-muted font-medium">Venta</th>
                <th className="py-2.5 px-3 text-crm-text-muted font-medium">Cliente</th>
                <th className="py-2.5 px-3 text-crm-text-muted font-medium">Proyecto / Lote</th>
                <th className="py-2.5 px-3 text-crm-text-muted font-medium">Beneficiario</th>
                <th className="py-2.5 px-3 text-crm-text-muted font-medium text-right">Base</th>
                <th className="py-2.5 px-3 text-crm-text-muted font-medium text-right">%</th>
                <th className="py-2.5 px-3 text-crm-text-muted font-medium text-right">Monto</th>
                <th className="py-2.5 px-3 text-crm-text-muted font-medium">Estado</th>
                <th className="py-2.5 px-3 text-crm-text-muted font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => {
                const moneda = (c.moneda || "PEN") as "PEN" | "USD";
                return (
                  <tr key={c.id} className="border-b border-crm-border/50 hover:bg-crm-background/50">
                    <td className="py-2 px-3 font-mono text-xs text-crm-text">{c.codigo}</td>
                    <td className="py-2 px-3 font-mono text-xs">
                      {c.venta?.codigo_venta ?? "—"}
                    </td>
                    <td className="py-2 px-3">
                      {c.venta?.cliente_id ? (
                        <a
                          href={`/dashboard/clientes/${c.venta.cliente_id}`}
                          className="text-crm-primary hover:underline"
                        >
                          {c.venta.cliente?.nombre ?? "—"}
                        </a>
                      ) : (
                        <span className="text-crm-text-muted">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-crm-text-muted text-xs">
                      {c.venta?.lote?.proyecto?.nombre ?? "—"}
                      {c.venta?.lote?.codigo ? ` / ${c.venta.lote.codigo}` : ""}
                    </td>
                    <td className="py-2 px-3 text-crm-text">{c.beneficiario_username}</td>
                    <td className="py-2 px-3 text-right text-crm-text-muted">
                      {formatearMoneda(Number(c.base_calculo), moneda)}
                    </td>
                    <td className="py-2 px-3 text-right text-crm-text-muted">
                      {Number(c.porcentaje).toFixed(2)}%
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-crm-text">
                      {formatearMoneda(Number(c.monto), moneda)}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${ESTADO_BADGE[c.estado]}`}>
                        {ESTADO_LABEL[c.estado]}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        {esAdmin && c.estado === "pendiente" && (
                          <>
                            <button
                              onClick={() => setAprobarTarget(c)}
                              disabled={isPending}
                              className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              <ShieldCheck className="h-3 w-3" /> Aprobar
                            </button>
                            <button
                              onClick={() => abrirModalAnular(c)}
                              disabled={isPending}
                              className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100 inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              <AlertOctagon className="h-3 w-3" /> Anular
                            </button>
                          </>
                        )}
                        {esAdmin && c.estado === "aprobada" && (
                          <>
                            <button
                              onClick={() => abrirModalPagar(c)}
                              disabled={isPending}
                              className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              <Banknote className="h-3 w-3" /> Pagar
                            </button>
                            <button
                              onClick={() => abrirModalAnular(c)}
                              disabled={isPending}
                              className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100 inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              <AlertOctagon className="h-3 w-3" /> Anular
                            </button>
                          </>
                        )}
                        {c.comprobante_url && (
                          <a
                            href={c.comprobante_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 text-xs bg-crm-background border border-crm-border text-crm-text-muted rounded hover:bg-crm-card inline-flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" /> Comp.
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Pagar */}
      {pagoModal && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150"
          onClick={() => setPagoModal(null)}
        >
          <div
            className="bg-crm-card rounded-t-xl sm:rounded-xl shadow-2xl w-full sm:max-w-md p-5 sm:p-6 space-y-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] sm:pb-6 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sm:hidden flex justify-center -mt-1">
              <span className="h-1 w-10 rounded-full bg-crm-border" aria-hidden />
            </div>
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-crm-text-primary flex items-center gap-2">
                <Banknote className="h-5 w-5 text-green-600" /> Pagar comisión
              </h4>
              <button
                onClick={() => setPagoModal(null)}
                className="text-crm-text-muted hover:text-crm-text-primary"
                aria-label="Cerrar"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-crm-background rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-crm-text-muted">Código</span>
                <span className="font-mono">{pagoModal.codigo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-crm-text-muted">Beneficiario</span>
                <span>{pagoModal.beneficiario_username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-crm-text-muted">Monto</span>
                <span className="font-bold">
                  {formatearMoneda(Number(pagoModal.monto), pagoModal.moneda as any)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-1">
                  Método de pago *
                </label>
                <select
                  value={pagoForm.metodoPago}
                  onChange={(e) => setPagoForm((f) => ({ ...f, metodoPago: e.target.value }))}
                  className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card text-crm-text-primary"
                >
                  {METODOS_PAGO.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-1">
                  URL comprobante (opcional)
                </label>
                <input
                  type="url"
                  value={pagoForm.comprobanteUrl}
                  onChange={(e) => setPagoForm((f) => ({ ...f, comprobanteUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card text-crm-text-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-1">
                  Notas (opcional)
                </label>
                <input
                  type="text"
                  value={pagoForm.notas}
                  onChange={(e) => setPagoForm((f) => ({ ...f, notas: e.target.value }))}
                  className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card text-crm-text-primary"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleConfirmarPago}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
                Confirmar pago
              </button>
              <button
                onClick={() => setPagoModal(null)}
                disabled={isPending}
                className="px-4 py-2.5 border border-crm-border rounded-lg text-sm text-crm-text-muted hover:bg-crm-background disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm aprobar */}
      <ConfirmDialog
        open={!!aprobarTarget}
        title="Aprobar comisión"
        description={
          aprobarTarget
            ? `¿Aprobar comisión ${aprobarTarget.codigo} por ${formatearMoneda(Number(aprobarTarget.monto), aprobarTarget.moneda as any)}?`
            : ""
        }
        confirmText="Aprobar"
        cancelText="Cancelar"
        disabled={isPending}
        onConfirm={handleAprobarConfirmado}
        onClose={() => setAprobarTarget(null)}
      />

      {/* Modal anular con motivo */}
      {anularTarget && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150"
          onClick={() => setAnularTarget(null)}
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
                <h4 className="text-lg font-semibold text-crm-text-primary">
                  Anular comisión {anularTarget.codigo}
                </h4>
                <p className="text-sm text-crm-text-muted mt-1">
                  Esta acción no se puede deshacer. Indique el motivo.
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
                placeholder="Ej: comisión calculada con porcentaje incorrecto"
                className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setAnularTarget(null)}
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
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertOctagon className="h-4 w-4" />}
                Anular comisión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
