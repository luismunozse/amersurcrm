"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DollarSign, FileText, Calendar, CreditCard, TrendingUp, AlertCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { formatearMoneda } from "@/lib/types/crm-flujo";
import type { Pago } from "@/lib/types/crm-flujo";
import type { VentaConRelaciones } from "@/lib/types/cliente-detail";
import { getSmallBadgeClasses } from "@/lib/utils/badge";
import { eliminarVenta } from "../_actions-ventas";

interface Props {
  ventas: VentaConRelaciones[];
  isAdmin?: boolean;
}

export default function TabVentas({ ventas, isAdmin = false }: Props) {
  const router = useRouter();
  const [ventaAEliminar, setVentaAEliminar] = useState<VentaConRelaciones | null>(null);
  const [motivo, setMotivo] = useState("");
  const [isPending, startTransition] = useTransition();

  const confirmarEliminar = () => {
    if (!ventaAEliminar) return;
    startTransition(async () => {
      const res = await eliminarVenta(ventaAEliminar.id, motivo.trim() || undefined);
      if (res.success) {
        toast.success(`Venta ${ventaAEliminar.codigo_venta} eliminada`);
        setVentaAEliminar(null);
        setMotivo("");
        router.refresh();
      } else {
        toast.error(res.error || "No se pudo eliminar la venta");
      }
    });
  };
  const getEstadoColor = (estado: string) => {
    const colores = {
      'en_proceso': 'blue',
      'finalizada': 'green',
      'cancelada': 'red',
      'suspendida': 'yellow',
    };
    return colores[estado as keyof typeof colores] || 'gray';
  };

  const getEstadoLabel = (estado: string) => {
    const labels = {
      'en_proceso': 'En Proceso',
      'finalizada': 'Finalizada',
      'cancelada': 'Cancelada',
      'suspendida': 'Suspendida',
    };
    return labels[estado as keyof typeof labels] || estado;
  };

  const getFormaPagoLabel = (formaPago: string) => {
    const labels = {
      'contado': 'Contado',
      'financiado': 'Financiado',
      'credito_bancario': 'Crédito Bancario',
      'mixto': 'Mixto',
    };
    return labels[formaPago as keyof typeof labels] || formaPago;
  };

  const calcularPorcentajePagado = (precioTotal: number, saldoPendiente: number) => {
    const pagado = precioTotal - saldoPendiente;
    const porcentaje = (pagado / precioTotal) * 100;
    return Math.round(porcentaje);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-crm-text">Ventas y Pagos</h3>
        <p className="text-sm text-crm-text-muted">{ventas.length} ventas</p>
      </div>

      {!ventas || ventas.length === 0 ? (
        <div className="text-center py-10 sm:py-12 px-4 bg-crm-background rounded-lg">
          <DollarSign className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-crm-text-muted opacity-50" aria-hidden />
          <p className="text-sm sm:text-base font-semibold text-crm-text-primary mb-1">No hay ventas registradas</p>
          <p className="text-xs sm:text-sm text-crm-text-muted max-w-sm mx-auto">
            Cuando se concrete una venta a este cliente, aparecerá aquí con el detalle del lote, pagos y saldos.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {ventas.map((venta) => {
            const estadoColor = getEstadoColor(venta.estado);
            const estadoLabel = getEstadoLabel(venta.estado);
            const formaPagoLabel = getFormaPagoLabel(venta.forma_pago);
            const porcentajePagado = calcularPorcentajePagado(venta.precio_total, venta.saldo_pendiente);

            return (
              <div
                key={venta.id}
                className="p-5 bg-crm-background rounded-lg border border-crm-border hover:border-crm-primary transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-mono text-lg font-bold text-crm-text">
                        {venta.codigo_venta}
                      </p>
                      <span className={getSmallBadgeClasses(estadoColor)}>
                        {estadoLabel}
                      </span>
                    </div>

                    {venta.lote && (
                      <Link
                        href={`/dashboard/proyectos/${venta.lote.proyecto?.id}`}
                        className="text-sm text-crm-text-muted hover:text-crm-primary transition-colors"
                      >
                        Lote {venta.lote.codigo} - {venta.lote.proyecto?.nombre}
                      </Link>
                    )}
                  </div>

                  <div className="text-right ml-4">
                    <p className="text-2xl font-bold text-crm-text">
                      {formatearMoneda(venta.precio_total, venta.moneda)}
                    </p>
                    <p className="text-sm text-crm-text-muted mt-1">
                      {formaPagoLabel}
                    </p>
                  </div>
                </div>

                {/* Barra de Progreso */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-crm-text-muted">Progreso de Pago</span>
                    <span className="text-sm font-semibold text-crm-text">{porcentajePagado}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${porcentajePagado}%` }}
                    />
                  </div>
                </div>

                {/* Información Financiera */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {venta.monto_inicial && (
                    <div className="p-3 bg-crm-card rounded-lg">
                      <p className="text-xs text-crm-text-muted mb-1 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Inicial
                      </p>
                      <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                        {formatearMoneda(venta.monto_inicial, venta.moneda)}
                      </p>
                    </div>
                  )}

                  <div className="p-3 bg-crm-card rounded-lg">
                    <p className="text-xs text-crm-text-muted mb-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Saldo Pendiente
                    </p>
                    <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                      {formatearMoneda(venta.saldo_pendiente, venta.moneda)}
                    </p>
                  </div>

                  {venta.numero_cuotas && (
                    <div className="p-3 bg-crm-card rounded-lg">
                      <p className="text-xs text-crm-text-muted mb-1 flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Cuotas
                      </p>
                      <p className="text-sm font-semibold text-crm-text">
                        {venta.numero_cuotas} cuotas
                      </p>
                    </div>
                  )}

                  {venta.comision_vendedor && (
                    <div className="p-3 bg-crm-card rounded-lg">
                      <p className="text-xs text-crm-text-muted mb-1">Comisión</p>
                      <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        {formatearMoneda(venta.comision_vendedor, venta.moneda)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Información Adicional */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-crm-border">
                  <div className="text-sm">
                    <p className="text-crm-text-muted text-xs mb-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Fecha de Venta
                    </p>
                    <p className="text-crm-text">
                      {new Date(venta.created_at).toLocaleDateString('es-PE', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>

                  {venta.fecha_entrega && (
                    <div className="text-sm">
                      <p className="text-crm-text-muted text-xs mb-1">Fecha de Entrega</p>
                      <p className="text-crm-text">
                        {new Date(venta.fecha_entrega).toLocaleDateString('es-PE', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                </div>

                {/* Historial de Pagos */}
                {venta.pagos && venta.pagos.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-crm-border">
                    <p className="text-sm font-semibold text-crm-text mb-3 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Historial de Pagos ({venta.pagos.length})
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {venta.pagos.map((pago: Pago) => (
                        <div
                          key={pago.id}
                          className="flex items-center justify-between p-2 bg-crm-card rounded text-sm"
                        >
                          <div className="flex items-center gap-3">
                            {pago.numero_cuota && (
                              <span className="px-2 py-1 bg-crm-primary/10 text-crm-primary rounded text-xs font-medium">
                                Cuota #{pago.numero_cuota}
                              </span>
                            )}
                            <span className="text-crm-text-muted">
                              {new Date(pago.fecha_pago).toLocaleDateString('es-PE', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                            <span className="text-crm-text-muted capitalize">
                              {pago.metodo_pago}
                            </span>
                          </div>
                          <span className="font-semibold text-green-600 dark:text-green-400">
                            {formatearMoneda(pago.monto, pago.moneda)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notas */}
                {venta.notas && (
                  <div className="mt-4 pt-4 border-t border-crm-border">
                    <p className="text-sm text-crm-text-muted">{venta.notas}</p>
                  </div>
                )}

                {/* Footer */}
                <div className="mt-4 pt-3 border-t border-crm-border flex items-center justify-between">
                  <div className="text-xs text-crm-text-muted">
                    Vendedor: {venta.vendedor?.username || 'desconocido'}
                  </div>
                  {isAdmin && venta.estado !== 'cancelada' && (
                    <button
                      onClick={() => {
                        setVentaAEliminar(venta);
                        setMotivo("");
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors"
                      title="Eliminar venta (revierte todo)"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar venta
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal confirmar eliminación */}
      {ventaAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-crm-text">Eliminar venta</h3>
                <p className="text-xs text-crm-text-muted">{ventaAEliminar.codigo_venta}</p>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 text-sm text-red-800 dark:text-red-300">
              <p className="font-semibold mb-1">Esta acción revierte:</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                <li>Cuotas y pagos anulados</li>
                <li>Comisiones del vendedor</li>
                <li>Lote vuelve a disponible o reservado</li>
                <li>Reserva (si existía) vuelve a activa</li>
                <li>Proceso vuelve a etapa de pago pendiente</li>
                <li>Cliente vuelve a en_proceso o potencial</li>
              </ul>
              <p className="mt-2 text-xs italic">
                Si hay pagos no anulados, debes anularlos primero.
              </p>
            </div>

            <label className="block text-sm font-medium text-crm-text mb-1">
              Motivo (opcional)
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Ej: error en datos de venta, cliente desistió, etc."
              className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:ring-2 focus:ring-crm-primary focus:border-transparent"
            />

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setVentaAEliminar(null);
                  setMotivo("");
                }}
                disabled={isPending}
                className="flex-1 px-4 py-2 border border-crm-border text-crm-text rounded-lg hover:bg-crm-background transition-colors disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminar}
                disabled={isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60 font-medium"
              >
                {isPending ? "Eliminando..." : "Eliminar venta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
