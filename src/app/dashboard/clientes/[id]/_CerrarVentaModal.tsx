"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { X, DollarSign, Loader2, AlertCircle, Receipt, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import {
  cerrarProcesoYCrearVenta,
  obtenerContextoCierreVenta,
} from "../../adquisicion/_actions-proceso";
import ConfirmDialog from "@/components/ConfirmDialog";

interface Props {
  procesoId: string;
  onClose: () => void;
  onSuccess?: (codigoVenta: string) => void;
}

interface Contexto {
  procesoCodigo: string;
  loteCodigo: string;
  proyectoNombre: string | null;
  precioSugerido: number | null;
  moneda: string;
  montoSeparacion: number | null;
  formaPagoReserva: string | null;
  tasaEfectivaMensual: number;
  maxCuotasSaldo: number;
  porcentajeCuotaInicial: number;
}

const FORMA_PAGO_LABEL: Record<string, string> = {
  contado: "Contado",
  transferencia: "Transferencia",
  deposito: "Depósito",
  credito_hipotecario: "Crédito Hipotecario",
  credito_directo: "Crédito Directo",
};

function esPagoCash(forma: string | null | undefined): boolean {
  return forma === "contado" || forma === "transferencia" || forma === "deposito";
}

function calcularCuotaFrancesa(saldo: number, tasaMensual: number, n: number): number {
  if (saldo <= 0 || n <= 0) return 0;
  if (tasaMensual <= 0) return saldo / n;
  const factor = Math.pow(1 + tasaMensual, n);
  return (saldo * tasaMensual * factor) / (factor - 1);
}

function formatearMoneda(valor: number, moneda: string): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: moneda === "USD" ? "USD" : "PEN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

function fechaEnDias(dias: number): string {
  const f = new Date();
  f.setDate(f.getDate() + dias);
  return f.toISOString().slice(0, 10);
}

export default function CerrarVentaModal({ procesoId, onClose, onSuccess }: Props) {
  const [ctx, setCtx] = useState<Contexto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [precioTotal, setPrecioTotal] = useState<string>("");
  const [montoInicial, setMontoInicial] = useState<string>("");
  const [numeroCuotas, setNumeroCuotas] = useState<string>("0");
  const [fechaPrimeraCuota, setFechaPrimeraCuota] = useState<string>(fechaEnDias(30));
  const [notas, setNotas] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await obtenerContextoCierreVenta(procesoId);
      if (cancelled) return;
      if (!res.success || !res.data) {
        setLoadError(res.error ?? "No se pudo cargar el proceso");
      } else {
        setCtx(res.data);
        // Defaults inteligentes segun forma de pago.
        const precio = res.data.precioSugerido ?? 0;
        const sena = res.data.montoSeparacion ?? 0;
        const cash = esPagoCash(res.data.formaPagoReserva);

        setPrecioTotal(precio > 0 ? String(precio) : "");
        if (cash) {
          // Pago contado: inicial = precio total, sin cuotas de saldo.
          setMontoInicial(precio > 0 ? String(precio) : String(sena));
          setNumeroCuotas("0");
        } else {
          // Credito: inicial = max(seña, % sugerido del precio).
          const inicialSugerido = Math.max(
            sena,
            (precio * res.data.porcentajeCuotaInicial) / 100,
          );
          setMontoInicial(inicialSugerido > 0 ? inicialSugerido.toFixed(2) : String(sena));
          setNumeroCuotas(String(res.data.maxCuotasSaldo));
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [procesoId]);

  const precio = Number(precioTotal) || 0;
  const inicial = Number(montoInicial) || 0;
  const cuotas = Math.max(0, parseInt(numeroCuotas, 10) || 0);
  const saldo = Math.max(0, precio - inicial);

  const cuotaMensual = useMemo(() => {
    if (!ctx) return 0;
    return calcularCuotaFrancesa(saldo, ctx.tasaEfectivaMensual, cuotas);
  }, [ctx, saldo, cuotas]);

  const totalAPagar = inicial + cuotaMensual * cuotas;
  const intereses = Math.max(0, totalAPagar - precio);

  const errores = useMemo(() => {
    const e: string[] = [];
    if (precio <= 0) e.push("Precio total debe ser mayor a 0");
    if (inicial < 0) e.push("Monto inicial no puede ser negativo");
    if (inicial > precio) e.push("Monto inicial no puede superar el precio total");
    if (cuotas < 0) e.push("Número de cuotas inválido");
    if (saldo > 0 && cuotas === 0) e.push("Si hay saldo a financiar, debe haber al menos 1 cuota");
    if (saldo === 0 && cuotas > 0) e.push("No hay saldo para financiar — ajustar cuotas a 0");
    return e;
  }, [precio, inicial, cuotas, saldo]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (errores.length > 0) {
      toast.error(errores[0]);
      return;
    }
    setConfirmOpen(true);
  }

  function handleConfirmarVenta() {
    setConfirmOpen(false);
    startTransition(async () => {
      const res = await cerrarProcesoYCrearVenta({
        procesoId,
        precioTotal: precio,
        montoInicial: inicial,
        numeroCuotas: cuotas,
        fechaPrimeraCuota: cuotas > 0 ? fechaPrimeraCuota : undefined,
        notas: notas || undefined,
      });

      if (!res.success || !res.data) {
        toast.error(res.error ?? "Error cerrando la venta");
        return;
      }

      toast.success(`Venta ${res.data.codigoVenta} registrada (${res.data.totalCuotas} cuotas)`);
      onSuccess?.(res.data.codigoVenta);
      onClose();
    });
  }

  return (
    <>
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-crm-card rounded-t-xl sm:rounded-xl shadow-2xl w-full sm:max-w-3xl max-h-[95vh] flex flex-col pb-[env(safe-area-inset-bottom)] sm:pb-0 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <span className="h-1 w-10 rounded-full bg-crm-border" aria-hidden />
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-crm-text-primary">Cerrar Venta</h2>
              <p className="text-xs text-crm-text-muted">
                {ctx ? `${ctx.procesoCodigo} · ${ctx.proyectoNombre ?? ""} ${ctx.loteCodigo}` : "Cargando…"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-crm-text-muted hover:text-crm-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-crm-text-muted">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando datos…
            </div>
          ) : loadError ? (
            <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">{loadError}</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x divide-crm-border">
              {/* ============ Form ============ */}
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-crm-text-primary mb-1">
                    Precio total
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-2 bg-crm-background text-crm-text-muted text-sm rounded-lg border border-crm-border">
                      {ctx?.moneda}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={precioTotal}
                      onChange={(e) => setPrecioTotal(e.target.value)}
                      required
                      className="flex-1 border border-crm-border rounded-lg px-3 py-2 bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  {ctx?.precioSugerido && (
                    <p className="text-xs text-crm-text-muted mt-1">
                      Sugerido (precio del lote): {formatearMoneda(ctx.precioSugerido, ctx.moneda)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-crm-text-primary mb-1">
                    {esPagoCash(ctx?.formaPagoReserva) ? "Monto al contado" : "Cuota inicial"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={montoInicial}
                    onChange={(e) => setMontoInicial(e.target.value)}
                    required
                    className="w-full border border-crm-border rounded-lg px-3 py-2 bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  {ctx?.montoSeparacion && (
                    <p className="text-xs text-crm-text-muted mt-1">
                      Monto de separación pagado: {formatearMoneda(ctx.montoSeparacion, ctx.moneda)}
                    </p>
                  )}
                </div>

                {!esPagoCash(ctx?.formaPagoReserva) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-crm-text-primary mb-1">
                        N° cuotas saldo
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max={ctx?.maxCuotasSaldo ?? 120}
                        value={numeroCuotas}
                        onChange={(e) => setNumeroCuotas(e.target.value)}
                        className="w-full border border-crm-border rounded-lg px-3 py-2 bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <p className="text-xs text-crm-text-muted mt-1">
                        Máx config. proyecto: {ctx?.maxCuotasSaldo}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-crm-text-primary mb-1">
                        Primera cuota
                      </label>
                      <input
                        type="date"
                        value={fechaPrimeraCuota}
                        onChange={(e) => setFechaPrimeraCuota(e.target.value)}
                        disabled={cuotas === 0}
                        min={new Date().toISOString().slice(0, 10)}
                        className="w-full border border-crm-border rounded-lg px-3 py-2 bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-crm-text-primary mb-1">
                    Notas (opcional)
                  </label>
                  <textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    rows={2}
                    placeholder="Ej: contrato firmado en notaría XYZ, banco BCP, etc."
                    className="w-full border border-crm-border rounded-lg px-3 py-2 bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* ============ Resumen ============ */}
              <div className="px-6 py-5 bg-crm-background space-y-3">
                <h3 className="text-sm font-semibold text-crm-text-primary flex items-center gap-1.5">
                  <Receipt className="h-4 w-4" /> Resumen
                </h3>

                {ctx?.formaPagoReserva && (
                  <div className="flex justify-between text-sm">
                    <span className="text-crm-text-muted">Forma de pago</span>
                    <span className="font-medium text-crm-text-primary">
                      {FORMA_PAGO_LABEL[ctx.formaPagoReserva] ?? ctx.formaPagoReserva}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-crm-text-muted">Precio total</span>
                  <span className="font-medium text-crm-text-primary">{formatearMoneda(precio, ctx?.moneda ?? "PEN")}</span>
                </div>

                {esPagoCash(ctx?.formaPagoReserva) ? (
                  <div className="flex justify-between text-sm bg-green-50 dark:bg-green-900/20 -mx-2 px-2 py-1.5 rounded">
                    <span className="text-green-800 dark:text-green-300 font-medium">Pago al contado</span>
                    <span className="font-bold text-green-800 dark:text-green-300">
                      {formatearMoneda(inicial, ctx?.moneda ?? "PEN")}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-crm-text-muted">Cuota inicial</span>
                      <span className="font-medium text-crm-text-primary">{formatearMoneda(inicial, ctx?.moneda ?? "PEN")}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-crm-border">
                      <span className="text-crm-text-muted">Saldo a financiar</span>
                      <span className="font-medium text-crm-text-primary">{formatearMoneda(saldo, ctx?.moneda ?? "PEN")}</span>
                    </div>
                  </>
                )}

                {cuotas > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-crm-text-muted">N° cuotas</span>
                      <span className="font-medium text-crm-text-primary">{cuotas}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-crm-text-muted">TEM aplicable</span>
                      <span className="font-medium text-crm-text-primary">
                        {((ctx?.tasaEfectivaMensual ?? 0) * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm bg-green-50 dark:bg-green-900/20 -mx-2 px-2 py-1.5 rounded">
                      <span className="text-green-800 dark:text-green-300 font-medium flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" /> Cuota mensual
                      </span>
                      <span className="font-bold text-green-800 dark:text-green-300">
                        {formatearMoneda(cuotaMensual, ctx?.moneda ?? "PEN")}
                      </span>
                    </div>
                    {intereses > 0.01 && (
                      <div className="flex justify-between text-xs text-crm-text-muted">
                        <span>Intereses estimados</span>
                        <span>{formatearMoneda(intereses, ctx?.moneda ?? "PEN")}</span>
                      </div>
                    )}
                  </>
                )}

                {errores.length > 0 && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 space-y-1">
                    {errores.map((err, i) => (
                      <div key={i} className="flex items-start gap-1">
                        <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </form>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-crm-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-sm text-crm-text-secondary hover:text-crm-text-primary disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isPending || loading || !!loadError || errores.length > 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Cerrar venta
          </button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      open={confirmOpen}
      title={`Cerrar venta por ${formatearMoneda(precio, ctx?.moneda ?? "PEN")}`}
      description="Esta acción no se puede deshacer: el lote pasa a vendido y se genera el cronograma de cuotas."
      confirmText="Cerrar venta"
      cancelText="Cancelar"
      disabled={isPending}
      onConfirm={handleConfirmarVenta}
      onClose={() => setConfirmOpen(false)}
    />
    </>
  );
}
