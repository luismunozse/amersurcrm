"use client";

import { useState } from "react";
import { DollarSign, FileText, Calendar, CreditCard, TrendingUp, AlertCircle } from "lucide-react";
import Link from "next/link";
import { formatearMoneda } from "@/lib/types/crm-flujo";

interface Props {
  clienteId: string;
  ventas: any[];
}

export default function TabVentas({ clienteId, ventas }: Props) {
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
        <div className="text-center py-12 bg-crm-background rounded-lg">
          <DollarSign className="h-12 w-12 mx-auto mb-3 text-crm-text-muted opacity-50" />
          <p className="text-crm-text-muted">No hay ventas registradas</p>
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
                      <span className={`px-2 py-1 text-xs font-medium rounded bg-${estadoColor}-100 dark:bg-${estadoColor}-900/30 text-${estadoColor}-700 dark:text-${estadoColor}-300`}>
                        {estadoLabel}
                      </span>
                    </div>

                    {venta.lote && (
                      <Link
                        href={`/dashboard/proyectos/${venta.lote.proyecto?.id}`}
                        className="text-sm text-crm-text-muted hover:text-crm-primary transition-colors"
                      >
                        Lote {venta.lote.numero_lote} - {venta.lote.proyecto?.nombre}
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
                      {venta.pagos.map((pago: any) => (
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
                <div className="mt-4 pt-3 border-t border-crm-border text-xs text-crm-text-muted">
                  Vendedor: {venta.vendedor?.username || 'desconocido'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
