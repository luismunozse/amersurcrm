"use client";

import { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import { obtenerVentasGlobal } from "./_actions-adquisicion";
import { ESTADOS_VENTA, FORMAS_PAGO, formatearMoneda } from "@/lib/types/crm-flujo";
import type { Moneda } from "@/lib/types/crm-flujo";

export default function VentasList() {
  const [items, setItems] = useState<any[]>([]);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [filtroEstado]);

  async function loadData() {
    setLoading(true);
    const result = await obtenerVentasGlobal({ estado: filtroEstado || undefined });
    if (result.success) setItems(result.data || []);
    setLoading(false);
  }

  function getEstadoBadge(estado: string) {
    const e = ESTADOS_VENTA.find(ec => ec.value === estado);
    const colors: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-700', green: 'bg-green-100 text-green-700',
      red: 'bg-red-100 text-red-700', orange: 'bg-orange-100 text-orange-700',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[e?.color || 'gray']}`}>{e?.label || estado}</span>;
  }

  function getFormaPagoLabel(fp: string) {
    return FORMAS_PAGO.find(f => f.value === fp)?.label || fp;
  }

  function calcPorcentaje(total: number, saldo: number) {
    if (total <= 0) return 0;
    return Math.round(((total - saldo) / total) * 100);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {[{ value: '', label: 'Todas' }, ...ESTADOS_VENTA].map(e => (
          <button key={e.value} onClick={() => setFiltroEstado(e.value)} className={`px-3 py-1.5 rounded-lg text-sm ${filtroEstado === e.value ? 'bg-crm-primary text-white' : 'bg-crm-background border border-crm-border text-crm-text-muted'}`}>
            {e.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-crm-text-muted">Cargando ventas...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-crm-text-muted">
          <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p>No hay ventas registradas</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-crm-border text-left">
                <th className="py-3 px-3 text-crm-text-muted font-medium">Código</th>
                <th className="py-3 px-3 text-crm-text-muted font-medium">Cliente</th>
                <th className="py-3 px-3 text-crm-text-muted font-medium">Proyecto / Lote</th>
                <th className="py-3 px-3 text-crm-text-muted font-medium">Forma Pago</th>
                <th className="py-3 px-3 text-crm-text-muted font-medium text-right">Precio Total</th>
                <th className="py-3 px-3 text-crm-text-muted font-medium text-right">Saldo</th>
                <th className="py-3 px-3 text-crm-text-muted font-medium">Progreso</th>
                <th className="py-3 px-3 text-crm-text-muted font-medium">Estado</th>
                <th className="py-3 px-3 text-crm-text-muted font-medium">Vendedor</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => {
                const pct = calcPorcentaje(item.precio_total, item.saldo_pendiente);
                return (
                  <tr key={item.id} className="border-b border-crm-border/50 hover:bg-crm-background/50">
                    <td className="py-3 px-3 font-mono text-xs font-semibold text-crm-text">{item.codigo_venta}</td>
                    <td className="py-3 px-3">
                      <a href={`/dashboard/clientes/${item.cliente?.id}`} className="text-crm-primary hover:underline font-medium">
                        {item.cliente?.nombre}
                      </a>
                    </td>
                    <td className="py-3 px-3 text-crm-text-muted">
                      {item.lote?.proyecto?.nombre && <span>{item.lote.proyecto.nombre}</span>}
                      {item.lote?.codigo && <span className="text-crm-text"> / {item.lote.codigo}</span>}
                    </td>
                    <td className="py-3 px-3 text-crm-text">{getFormaPagoLabel(item.forma_pago)}</td>
                    <td className="py-3 px-3 text-right font-semibold text-crm-text">{formatearMoneda(item.precio_total, item.moneda as Moneda)}</td>
                    <td className="py-3 px-3 text-right text-orange-600">{formatearMoneda(item.saldo_pendiente, item.moneda as Moneda)}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                          <div className="bg-green-500 rounded-full h-1.5" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-crm-text-muted">{pct}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">{getEstadoBadge(item.estado)}</td>
                    <td className="py-3 px-3 text-crm-text-muted text-xs">{item.vendedor_username}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
