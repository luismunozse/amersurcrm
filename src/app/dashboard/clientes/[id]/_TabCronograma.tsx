"use client";

import { useEffect, useState, useTransition } from "react";
import { CalendarCheck, RefreshCw, CreditCard, X } from "lucide-react";
import { obtenerCronogramaVenta, generarCronogramaPagos, registrarPagoCuota } from "../_actions-cuotas";
import { ESTADOS_CUOTA } from "@/lib/types/cuotas";
import type { Cuota } from "@/lib/types/cuotas";
import { formatearMoneda, METODOS_PAGO } from "@/lib/types/crm-flujo";
import toast from "react-hot-toast";

interface Props {
  clienteId: string;
  ventas: any[];
}

export default function TabCronograma({ clienteId, ventas }: Props) {
  const [selectedVentaId, setSelectedVentaId] = useState('');
  const [cuotas, setCuotas] = useState<Cuota[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Modal de pago
  const [pagoModal, setPagoModal] = useState<Cuota | null>(null);
  const [pagoForm, setPagoForm] = useState({ monto: '', metodoPago: 'transferencia', banco: '', numeroOperacion: '', notas: '' });

  const ventasActivas = ventas.filter((v: any) => v.estado !== 'cancelada');

  useEffect(() => {
    if (ventasActivas.length > 0 && !selectedVentaId) {
      setSelectedVentaId(ventasActivas[0].id);
    }
  }, [ventas]);

  useEffect(() => {
    if (selectedVentaId) loadCronograma();
  }, [selectedVentaId]);

  async function loadCronograma() {
    setLoading(true);
    const result = await obtenerCronogramaVenta(selectedVentaId);
    if (result.success) setCuotas(result.data as Cuota[]);
    setLoading(false);
  }

  async function handleGenerar() {
    startTransition(async () => {
      const result = await generarCronogramaPagos(selectedVentaId, clienteId);
      if (result.success) {
        toast.success(`Cronograma generado: ${result.data?.cuotas_generadas} cuotas`);
        loadCronograma();
      } else {
        toast.error(result.error || 'Error al generar cronograma');
      }
    });
  }

  function abrirPagoModal(cuota: Cuota) {
    const saldo = cuota.monto_programado - cuota.monto_pagado + cuota.monto_mora;
    setPagoForm({ monto: saldo.toFixed(2), metodoPago: 'transferencia', banco: '', numeroOperacion: '', notas: '' });
    setPagoModal(cuota);
  }

  async function handleRegistrarPago() {
    if (!pagoModal) return;
    const monto = parseFloat(pagoForm.monto);
    if (!monto || monto <= 0) { toast.error('Ingresa un monto válido'); return; }

    startTransition(async () => {
      const result = await registrarPagoCuota({
        ventaId: selectedVentaId,
        cuotaId: pagoModal.id,
        monto,
        metodoPago: pagoForm.metodoPago,
        banco: pagoForm.banco || undefined,
        numeroOperacion: pagoForm.numeroOperacion || undefined,
        notas: pagoForm.notas || undefined,
        clienteId,
      });
      if (result.success) {
        toast.success('Pago registrado');
        setPagoModal(null);
        loadCronograma();
      } else {
        toast.error(result.error || 'Error al registrar pago');
      }
    });
  }

  function getEstadoBadge(estado: string) {
    const e = ESTADOS_CUOTA.find(ec => ec.value === estado);
    const colors: Record<string, string> = {
      gray: 'bg-gray-100 text-gray-700', green: 'bg-green-100 text-green-700',
      red: 'bg-red-100 text-red-700', orange: 'bg-orange-100 text-orange-700',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[e?.color || 'gray']}`}>{e?.label || estado}</span>;
  }

  const totalProgramado = cuotas.reduce((sum, c) => sum + c.monto_programado, 0);
  const totalPagado = cuotas.reduce((sum, c) => sum + c.monto_pagado, 0);
  const totalMora = cuotas.reduce((sum, c) => sum + c.monto_mora, 0);
  const porcentajePagado = totalProgramado > 0 ? Math.round((totalPagado / totalProgramado) * 100) : 0;
  const moneda = cuotas[0]?.moneda as any || 'PEN';

  if (ventasActivas.length === 0) {
    return (
      <div className="text-center py-8 text-crm-text-muted">
        <CalendarCheck className="h-12 w-12 mx-auto mb-2 opacity-30" />
        <p>No hay ventas activas para mostrar cronograma</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold text-crm-text flex items-center gap-2">
          <CalendarCheck className="h-5 w-5" /> Cronograma de Pagos
        </h3>
        <div className="flex items-center gap-2">
          <select value={selectedVentaId} onChange={e => setSelectedVentaId(e.target.value)} className="border border-crm-border rounded-lg px-3 py-1.5 text-sm bg-crm-card">
            {ventasActivas.map((v: any) => (
              <option key={v.id} value={v.id}>{v.codigo_venta}</option>
            ))}
          </select>
          {cuotas.length === 0 && (
            <button onClick={handleGenerar} disabled={isPending} className="flex items-center gap-1 px-3 py-1.5 bg-crm-primary text-white rounded-lg text-sm hover:bg-crm-primary/90 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} /> Generar Cronograma
            </button>
          )}
        </div>
      </div>

      {/* Resumen */}
      {cuotas.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-crm-background border border-crm-border rounded-lg p-3">
              <p className="text-xs text-crm-text-muted">Total Programado</p>
              <p className="text-lg font-bold text-crm-text">{formatearMoneda(totalProgramado, moneda)}</p>
            </div>
            <div className="bg-crm-background border border-crm-border rounded-lg p-3">
              <p className="text-xs text-crm-text-muted">Total Pagado</p>
              <p className="text-lg font-bold text-green-600">{formatearMoneda(totalPagado, moneda)}</p>
            </div>
            <div className="bg-crm-background border border-crm-border rounded-lg p-3">
              <p className="text-xs text-crm-text-muted">Mora Acumulada</p>
              <p className={`text-lg font-bold ${totalMora > 0 ? 'text-red-600' : 'text-crm-text'}`}>{formatearMoneda(totalMora, moneda)}</p>
            </div>
            <div className="bg-crm-background border border-crm-border rounded-lg p-3">
              <p className="text-xs text-crm-text-muted">Progreso</p>
              <p className="text-lg font-bold text-crm-text">{porcentajePagado}%</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div className="bg-green-500 rounded-full h-2 transition-all" style={{ width: `${porcentajePagado}%` }} />
              </div>
            </div>
          </div>

          {/* Tabla de cuotas */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-crm-border text-left">
                  <th className="py-2 px-3 text-crm-text-muted font-medium">#</th>
                  <th className="py-2 px-3 text-crm-text-muted font-medium">Tipo</th>
                  <th className="py-2 px-3 text-crm-text-muted font-medium">Vencimiento</th>
                  <th className="py-2 px-3 text-crm-text-muted font-medium text-right">Programado</th>
                  <th className="py-2 px-3 text-crm-text-muted font-medium text-right">Pagado</th>
                  <th className="py-2 px-3 text-crm-text-muted font-medium text-right">Mora</th>
                  <th className="py-2 px-3 text-crm-text-muted font-medium">Estado</th>
                  <th className="py-2 px-3 text-crm-text-muted font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {cuotas.map((cuota) => {
                  const saldoCuota = cuota.monto_programado - cuota.monto_pagado;
                  const puedePagar = cuota.estado !== 'pagada' && saldoCuota > 0;
                  return (
                    <tr key={cuota.id} className="border-b border-crm-border/50 hover:bg-crm-background/50">
                      <td className="py-2 px-3 text-crm-text">{cuota.numero_cuota}</td>
                      <td className="py-2 px-3 text-crm-text capitalize">{cuota.tipo.replace('_', ' ')}</td>
                      <td className="py-2 px-3 text-crm-text">{new Date(cuota.fecha_vencimiento).toLocaleDateString('es-PE')}</td>
                      <td className="py-2 px-3 text-crm-text text-right">{formatearMoneda(cuota.monto_programado, cuota.moneda as any)}</td>
                      <td className="py-2 px-3 text-right font-medium text-green-600">{cuota.monto_pagado > 0 ? formatearMoneda(cuota.monto_pagado, cuota.moneda as any) : '-'}</td>
                      <td className="py-2 px-3 text-right text-red-600">{cuota.monto_mora > 0 ? formatearMoneda(cuota.monto_mora, cuota.moneda as any) : '-'}</td>
                      <td className="py-2 px-3">{getEstadoBadge(cuota.estado)}</td>
                      <td className="py-2 px-3">
                        {puedePagar && (
                          <button
                            onClick={() => abrirPagoModal(cuota)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
                          >
                            <CreditCard className="h-3 w-3" /> Pagar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {loading && <div className="text-center py-4 text-crm-text-muted">Cargando cronograma...</div>}
      {!loading && cuotas.length === 0 && (
        <div className="text-center py-8 text-crm-text-muted">
          <CalendarCheck className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p>No hay cronograma generado para esta venta</p>
          <p className="text-xs mt-1">Haz clic en &quot;Generar Cronograma&quot; para crear las cuotas automáticamente</p>
        </div>
      )}

      {/* ========== Modal de Pago ========== */}
      {pagoModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150" onClick={() => setPagoModal(null)}>
          <div className="bg-crm-card border-t sm:border border-crm-border rounded-t-xl sm:rounded-xl shadow-2xl w-full sm:max-w-md p-5 sm:p-6 space-y-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] sm:pb-6 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-200" onClick={e => e.stopPropagation()}>
            <div className="sm:hidden flex justify-center -mt-1">
              <span className="h-1 w-10 rounded-full bg-crm-border" aria-hidden />
            </div>
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-crm-text flex items-center gap-2">
                <CreditCard className="h-5 w-5" /> Registrar Pago
              </h4>
              <button onClick={() => setPagoModal(null)} className="text-crm-text-muted hover:text-crm-text">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-crm-background rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-crm-text-muted">Cuota #{pagoModal.numero_cuota}</span>
                {getEstadoBadge(pagoModal.estado)}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-crm-text-muted">Programado:</span>
                <span className="font-medium">{formatearMoneda(pagoModal.monto_programado, pagoModal.moneda as any)}</span>
              </div>
              {pagoModal.monto_pagado > 0 && (
                <div className="flex justify-between">
                  <span className="text-crm-text-muted">Ya pagado:</span>
                  <span className="text-green-600">{formatearMoneda(pagoModal.monto_pagado, pagoModal.moneda as any)}</span>
                </div>
              )}
              {pagoModal.monto_mora > 0 && (
                <div className="flex justify-between">
                  <span className="text-crm-text-muted">Mora:</span>
                  <span className="text-red-600">{formatearMoneda(pagoModal.monto_mora, pagoModal.moneda as any)}</span>
                </div>
              )}
              <div className="flex justify-between mt-1 pt-1 border-t border-crm-border/50 font-semibold">
                <span>Saldo a pagar:</span>
                <span>{formatearMoneda(pagoModal.monto_programado - pagoModal.monto_pagado + pagoModal.monto_mora, pagoModal.moneda as any)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-crm-text mb-1">Monto *</label>
                <input
                  type="number"
                  step="0.01"
                  value={pagoForm.monto}
                  onChange={e => setPagoForm(prev => ({ ...prev, monto: e.target.value }))}
                  className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-crm-text mb-1">Método de Pago *</label>
                <select
                  value={pagoForm.metodoPago}
                  onChange={e => setPagoForm(prev => ({ ...prev, metodoPago: e.target.value }))}
                  className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card"
                >
                  {METODOS_PAGO.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              {(pagoForm.metodoPago === 'transferencia' || pagoForm.metodoPago === 'deposito' || pagoForm.metodoPago === 'cheque') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-crm-text mb-1">Banco</label>
                    <input
                      type="text"
                      value={pagoForm.banco}
                      onChange={e => setPagoForm(prev => ({ ...prev, banco: e.target.value }))}
                      className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-crm-text mb-1">N. Operación</label>
                    <input
                      type="text"
                      value={pagoForm.numeroOperacion}
                      onChange={e => setPagoForm(prev => ({ ...prev, numeroOperacion: e.target.value }))}
                      className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-crm-text mb-1">Notas</label>
                <input
                  type="text"
                  value={pagoForm.notas}
                  onChange={e => setPagoForm(prev => ({ ...prev, notas: e.target.value }))}
                  className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card"
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleRegistrarPago}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CreditCard className="h-4 w-4" />
                {isPending ? 'Registrando...' : 'Registrar Pago'}
              </button>
              <button
                onClick={() => setPagoModal(null)}
                className="px-4 py-2.5 border border-crm-border rounded-lg text-sm text-crm-text-muted hover:bg-crm-background"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
