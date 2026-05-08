"use client";

import { useEffect, useState } from "react";
import { Receipt } from "lucide-react";
import { obtenerSeparaciones } from "./_actions-adquisicion";
import { ESTADOS_RESERVA, TIPOS_SEPARACION, formatearMoneda } from "@/lib/types/crm-flujo";
import type { Moneda } from "@/lib/types/crm-flujo";

export default function SeparacionesList() {
  const [items, setItems] = useState<any[]>([]);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadData(); }, [filtro]);

  async function loadData() {
    setLoading(true);
    setError(null);
    const result = await obtenerSeparaciones({ estado: filtro || undefined });
    if (result.success) {
      setItems(result.data || []);
    } else {
      setError(result.error || 'Error desconocido cargando separaciones');
      console.error('[SeparacionesList] error:', result);
    }
    setLoading(false);
  }

  function getEstadoBadge(estado: string) {
    const e = ESTADOS_RESERVA.find(ec => ec.value === estado);
    const colors: Record<string, string> = {
      green: 'bg-green-100 text-green-700', red: 'bg-red-100 text-red-700',
      gray: 'bg-gray-100 text-gray-700', blue: 'bg-blue-100 text-blue-700',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[e?.color || 'gray']}`}>{e?.label || estado}</span>;
  }

  function getTipoLabel(tipo?: string) {
    if (!tipo) return null;
    const t = TIPOS_SEPARACION.find(ts => ts.value === tipo);
    return t ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{t.label}</span> : null;
  }

  function diasRestantes(fechaVencimiento: string) {
    const diff = new Date(fechaVencimiento).getTime() - Date.now();
    const dias = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (dias < 0) return <span className="text-red-600 text-xs font-medium">Vencida hace {Math.abs(dias)}d</span>;
    if (dias <= 3) return <span className="text-orange-600 text-xs font-medium">Vence en {dias}d</span>;
    return <span className="text-crm-text-muted text-xs">{dias}d restantes</span>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {[{ value: '', label: 'Todas' }, ...ESTADOS_RESERVA].map(e => (
          <button key={e.value} onClick={() => setFiltro(e.value)} className={`px-3 py-1.5 rounded-lg text-sm ${filtro === e.value ? 'bg-crm-primary text-white' : 'bg-crm-background border border-crm-border text-crm-text-muted'}`}>
            {e.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-crm-text-muted">Cargando separaciones...</div>
      ) : error ? (
        <div className="text-center py-8">
          <div className="inline-block px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 max-w-2xl">
            <strong>Error cargando separaciones:</strong>
            <pre className="mt-2 text-xs whitespace-pre-wrap break-all">{error}</pre>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-crm-text-muted">
          <Receipt className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p>No hay separaciones registradas</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-crm-border text-left">
                <th className="py-3 px-3 text-crm-text-muted font-medium">Código</th>
                <th className="py-3 px-3 text-crm-text-muted font-medium">Cliente</th>
                <th className="py-3 px-3 text-crm-text-muted font-medium">Proyecto / Lote</th>
                <th className="py-3 px-3 text-crm-text-muted font-medium">Tipo</th>
                <th className="py-3 px-3 text-crm-text-muted font-medium text-right">Monto</th>
                <th className="py-3 px-3 text-crm-text-muted font-medium">Vencimiento</th>
                <th className="py-3 px-3 text-crm-text-muted font-medium">Estado</th>
                <th className="py-3 px-3 text-crm-text-muted font-medium">Vendedor</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => (
                <tr key={item.id} className="border-b border-crm-border/50 hover:bg-crm-background/50">
                  <td className="py-3 px-3 font-mono text-xs font-semibold text-crm-text">{item.codigo_reserva}</td>
                  <td className="py-3 px-3">
                    <a href={`/dashboard/clientes/${item.cliente?.id}`} className="text-crm-primary hover:underline font-medium">
                      {item.cliente?.nombre}
                    </a>
                  </td>
                  <td className="py-3 px-3 text-crm-text-muted">
                    {item.lote?.proyecto?.nombre && <span>{item.lote.proyecto.nombre}</span>}
                    {item.lote?.codigo && <span className="text-crm-text"> / {item.lote.codigo}</span>}
                  </td>
                  <td className="py-3 px-3">{getTipoLabel(item.tipo_separacion)}</td>
                  <td className="py-3 px-3 text-right font-medium text-crm-text">{formatearMoneda(item.monto_reserva, item.moneda as Moneda)}</td>
                  <td className="py-3 px-3">
                    <div>{new Date(item.fecha_vencimiento).toLocaleDateString('es-PE')}</div>
                    {item.estado === 'activa' && diasRestantes(item.fecha_vencimiento)}
                  </td>
                  <td className="py-3 px-3">{getEstadoBadge(item.estado)}</td>
                  <td className="py-3 px-3 text-crm-text-muted text-xs">{item.vendedor_username}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
