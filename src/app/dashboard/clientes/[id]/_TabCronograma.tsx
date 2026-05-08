"use client";

import { useEffect, useState, useTransition } from "react";
import { CalendarCheck, RefreshCw, CreditCard, History } from "lucide-react";
import { obtenerCronogramaVenta, generarCronogramaPagos } from "../_actions-cuotas";
import { ESTADOS_CUOTA } from "@/lib/types/cuotas";
import type { Cuota } from "@/lib/types/cuotas";
import { formatearMoneda } from "@/lib/types/crm-flujo";
import toast from "react-hot-toast";
import RegistrarPagoModal from "../../cobranza/_RegistrarPagoModal";
import HistorialPagosCuota from "../../cobranza/_HistorialPagosCuota";

interface Props {
  clienteId: string;
  ventas: any[];
  esAdmin?: boolean;
}

export default function TabCronograma({ clienteId, ventas, esAdmin = false }: Props) {
  const [selectedVentaId, setSelectedVentaId] = useState('');
  const [cuotas, setCuotas] = useState<Cuota[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [pagarCuota, setPagarCuota] = useState<Cuota | null>(null);
  const [historialCuota, setHistorialCuota] = useState<Cuota | null>(null);

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
  const moneda = (cuotas[0]?.moneda as any) || 'PEN';

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
                  <th className="py-2 px-3 text-crm-text-muted font-medium text-right">Acciones</th>
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
                      <td className="py-2 px-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          {puedePagar && (
                            <button
                              onClick={() => setPagarCuota(cuota)}
                              className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 inline-flex items-center gap-1"
                            >
                              <CreditCard className="h-3 w-3" /> Pagar
                            </button>
                          )}
                          {cuota.monto_pagado > 0 && (
                            <button
                              onClick={() => setHistorialCuota(cuota)}
                              className="px-2 py-1 text-xs bg-crm-background border border-crm-border text-crm-text-muted rounded hover:bg-crm-card inline-flex items-center gap-1"
                            >
                              <History className="h-3 w-3" /> Pagos
                            </button>
                          )}
                        </div>
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

      {pagarCuota && (
        <RegistrarPagoModal
          cuota={{
            cuotaId: pagarCuota.id,
            ventaId: selectedVentaId,
            clienteId,
            numeroCuota: pagarCuota.numero_cuota,
            estado: pagarCuota.estado,
            montoProgramado: Number(pagarCuota.monto_programado) || 0,
            montoPagado: Number(pagarCuota.monto_pagado) || 0,
            montoMora: Number(pagarCuota.monto_mora) || 0,
            moneda: (pagarCuota.moneda as string) || 'PEN',
          }}
          onClose={() => setPagarCuota(null)}
          onSuccess={() => loadCronograma()}
        />
      )}

      {historialCuota && (
        <HistorialPagosCuota
          cuotaId={historialCuota.id}
          numeroCuota={historialCuota.numero_cuota}
          moneda={(historialCuota.moneda as string) || 'PEN'}
          esAdmin={esAdmin}
          onClose={() => setHistorialCuota(null)}
          onChange={() => loadCronograma()}
        />
      )}
    </div>
  );
}
