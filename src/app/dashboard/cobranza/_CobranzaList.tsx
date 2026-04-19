"use client";

import { useEffect, useState, useTransition } from "react";
import { Banknote, AlertTriangle, Clock, CheckCircle, RefreshCw } from "lucide-react";
import { obtenerCobranza, obtenerResumenCobranza, ejecutarActualizacionMora } from "./_actions-cobranza";
import { formatearMoneda } from "@/lib/types/crm-flujo";
import toast from "react-hot-toast";

type EstadoFiltro = '' | 'por_vencer_3d' | 'por_vencer_7d' | 'por_vencer_15d' | 'vencida' | 'en_mora' | 'al_dia';

export default function CobranzaList() {
  const [items, setItems] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any>(null);
  const [filtro, setFiltro] = useState<EstadoFiltro>('');
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => { loadData(); }, [filtro]);

  async function loadData() {
    setLoading(true);
    const [itemsRes, resumenRes] = await Promise.all([
      obtenerCobranza({ estadoCobranza: filtro || undefined }),
      obtenerResumenCobranza(),
    ]);
    if (itemsRes.success) setItems(itemsRes.data || []);
    if (resumenRes.success) setResumen(resumenRes.data);
    setLoading(false);
  }

  async function handleActualizarMora() {
    startTransition(async () => {
      const result = await ejecutarActualizacionMora();
      if (result.success) {
        toast.success(`${result.data?.cuotas_actualizadas || 0} cuotas actualizadas`);
        loadData();
      } else toast.error(result.error || 'Error');
    });
  }

  function getEstadoColor(estado: string) {
    const colors: Record<string, string> = {
      al_dia: 'bg-green-100 text-green-700',
      por_vencer_3d: 'bg-orange-100 text-orange-700',
      por_vencer_7d: 'bg-yellow-100 text-yellow-700',
      por_vencer_15d: 'bg-blue-100 text-blue-700',
      vencida: 'bg-red-100 text-red-700',
      en_mora: 'bg-red-200 text-red-800',
    };
    return colors[estado] || 'bg-gray-100 text-gray-700';
  }

  function getEstadoLabel(estado: string) {
    const labels: Record<string, string> = {
      al_dia: 'Al Día', por_vencer_3d: 'Vence en 3 días', por_vencer_7d: 'Vence en 7 días',
      por_vencer_15d: 'Vence en 15 días', vencida: 'Vencida', en_mora: 'En Mora',
    };
    return labels[estado] || estado;
  }

  return (
    <div className="space-y-4">
      {/* Resumen */}
      {resumen && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-crm-card border border-crm-border rounded-lg p-4">
            <p className="text-xs text-crm-text-muted">Total Cuotas Pendientes</p>
            <p className="text-2xl font-bold text-crm-text">{resumen.total_cuotas}</p>
          </div>
          <div className="bg-crm-card border border-crm-border rounded-lg p-4">
            <p className="text-xs text-crm-text-muted flex items-center gap-1"><Clock className="h-3 w-3" /> Por Vencer</p>
            <p className="text-2xl font-bold text-orange-600">{resumen.por_vencer}</p>
          </div>
          <div className="bg-crm-card border border-crm-border rounded-lg p-4">
            <p className="text-xs text-crm-text-muted flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Vencidas</p>
            <p className="text-2xl font-bold text-red-600">{resumen.vencidas}</p>
          </div>
          <div className="bg-crm-card border border-crm-border rounded-lg p-4">
            <p className="text-xs text-crm-text-muted">En Mora</p>
            <p className="text-2xl font-bold text-red-700">{resumen.en_mora}</p>
          </div>
          <div className="bg-crm-card border border-crm-border rounded-lg p-4">
            <p className="text-xs text-crm-text-muted">Monto por Cobrar</p>
            <p className="text-xl font-bold text-crm-text">{formatearMoneda(resumen.monto_por_cobrar, 'PEN')}</p>
            {resumen.monto_mora_total > 0 && (
              <p className="text-xs text-red-600">+ {formatearMoneda(resumen.monto_mora_total, 'PEN')} mora</p>
            )}
          </div>
        </div>
      )}

      {/* Filtros y acciones */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          {(['', 'por_vencer_3d', 'vencida', 'en_mora', 'al_dia'] as EstadoFiltro[]).map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-lg text-sm ${filtro === f ? 'bg-crm-primary text-white' : 'bg-crm-background border border-crm-border text-crm-text-muted hover:bg-crm-card'}`}
            >
              {f === '' ? 'Todas' : getEstadoLabel(f)}
            </button>
          ))}
        </div>
        <button
          onClick={handleActualizarMora}
          disabled={isPending}
          className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} /> Recalcular Mora
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-8 text-crm-text-muted">Cargando...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-crm-text-muted">
          <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p>No hay cuotas pendientes con este filtro</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-crm-border text-left">
                <th className="py-2 px-3 text-crm-text-muted font-medium">Cliente</th>
                <th className="py-2 px-3 text-crm-text-muted font-medium">Venta</th>
                <th className="py-2 px-3 text-crm-text-muted font-medium">Proyecto</th>
                <th className="py-2 px-3 text-crm-text-muted font-medium">Cuota #</th>
                <th className="py-2 px-3 text-crm-text-muted font-medium">Vencimiento</th>
                <th className="py-2 px-3 text-crm-text-muted font-medium text-right">Monto</th>
                <th className="py-2 px-3 text-crm-text-muted font-medium text-right">Mora</th>
                <th className="py-2 px-3 text-crm-text-muted font-medium">Estado</th>
                <th className="py-2 px-3 text-crm-text-muted font-medium">Días</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => (
                <tr key={item.cuota_id} className="border-b border-crm-border/50 hover:bg-crm-background/50">
                  <td className="py-2 px-3">
                    <a href={`/dashboard/clientes/${item.cliente_id}`} className="text-crm-primary hover:underline font-medium">{item.cliente_nombre}</a>
                  </td>
                  <td className="py-2 px-3 font-mono text-xs">{item.codigo_venta}</td>
                  <td className="py-2 px-3 text-crm-text-muted">{item.proyecto_nombre}</td>
                  <td className="py-2 px-3 text-crm-text">{item.numero_cuota}</td>
                  <td className="py-2 px-3 text-crm-text">{new Date(item.fecha_vencimiento).toLocaleDateString('es-PE')}</td>
                  <td className="py-2 px-3 text-right font-medium">{formatearMoneda(item.monto_programado - item.monto_pagado, item.moneda)}</td>
                  <td className="py-2 px-3 text-right text-red-600">{item.monto_mora > 0 ? formatearMoneda(item.monto_mora, item.moneda) : '-'}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(item.estado_cobranza)}`}>
                      {getEstadoLabel(item.estado_cobranza)}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    {item.dias_atraso > 0 && <span className="text-red-600 font-medium">{item.dias_atraso}d</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
