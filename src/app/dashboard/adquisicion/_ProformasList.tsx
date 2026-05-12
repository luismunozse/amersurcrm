"use client";

import { useEffect, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { obtenerProformasGlobal } from "./_actions-adquisicion";
import { formatearMoneda } from "@/lib/types/crm-flujo";
import type { Moneda } from "@/lib/types/crm-flujo";

const ESTADOS_PROFORMA = [
  { value: 'borrador', label: 'Borrador', color: 'gray' },
  { value: 'enviada', label: 'Enviada', color: 'blue' },
  { value: 'aprobada', label: 'Aprobada', color: 'green' },
  { value: 'rechazada', label: 'Rechazada', color: 'red' },
  { value: 'anulada', label: 'Anulada', color: 'gray' },
  { value: 'convertida', label: 'Convertida', color: 'purple' },
];

const TIPOS_OPERACION = [
  { value: 'cotizacion', label: 'Proforma' },
  { value: 'reserva', label: 'Separación' },
  { value: 'venta', label: 'Venta' },
];

export default function ProformasList() {
  const [items, setItems] = useState<any[]>([]);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [filtroEstado]);

  async function loadData() {
    setLoading(true);
    try {
      const result = await obtenerProformasGlobal({ estado: filtroEstado || undefined });
      if (result.success) setItems(result.data || []);
    } catch (err) {
      console.error('Error cargando proformas:', err);
    } finally {
      setLoading(false);
    }
  }

  function getEstadoBadge(estado: string) {
    const e = ESTADOS_PROFORMA.find(ec => ec.value === estado);
    const colors: Record<string, string> = {
      gray: 'bg-gray-100 text-gray-700', blue: 'bg-blue-100 text-blue-700',
      green: 'bg-green-100 text-green-700', red: 'bg-red-100 text-red-700',
      purple: 'bg-purple-100 text-purple-700',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[e?.color || 'gray']}`}>{e?.label || estado}</span>;
  }

  function getTipoBadge(tipo: string) {
    const t = TIPOS_OPERACION.find(to => to.value === tipo);
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{t?.label || tipo}</span>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {[{ value: '', label: 'Todas' }, ...ESTADOS_PROFORMA].map(e => (
          <button key={e.value} onClick={() => setFiltroEstado(e.value)} className={`px-3 py-1.5 rounded-lg text-sm ${filtroEstado === e.value ? 'bg-crm-primary text-white' : 'bg-crm-background border border-crm-border text-crm-text-muted'}`}>
            {e.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-crm-text-muted">Cargando proformas...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-crm-text-muted">
          <FileSpreadsheet className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p>No hay proformas registradas</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-crm-border text-left">
                <th className="py-3 px-3 text-crm-text-muted font-medium">Número</th>
                <th className="py-3 px-3 text-crm-text-muted font-medium">Cliente</th>
                <th className="py-3 px-3 text-crm-text-muted font-medium">Lote</th>
                <th className="py-3 px-3 text-crm-text-muted font-medium">Tipo</th>
                <th className="py-3 px-3 text-crm-text-muted font-medium text-right">Total</th>
                <th className="py-3 px-3 text-crm-text-muted font-medium">Estado</th>
                <th className="py-3 px-3 text-crm-text-muted font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => (
                <tr key={item.id} className="border-b border-crm-border/50 hover:bg-crm-background/50">
                  <td className="py-3 px-3 font-mono text-xs font-semibold text-crm-text">{item.numero}</td>
                  <td className="py-3 px-3">
                    <a href={`/dashboard/clientes/${item.cliente?.id}`} className="text-crm-primary hover:underline font-medium">
                      {item.cliente?.nombre}
                    </a>
                  </td>
                  <td className="py-3 px-3 text-crm-text-muted">{item.lote?.codigo || '-'}</td>
                  <td className="py-3 px-3">{getTipoBadge(item.tipo_operacion)}</td>
                  <td className="py-3 px-3 text-right font-medium text-crm-text">
                    {item.total ? formatearMoneda(item.total, (item.moneda || 'PEN') as Moneda) : '-'}
                  </td>
                  <td className="py-3 px-3">{getEstadoBadge(item.estado)}</td>
                  <td className="py-3 px-3 text-crm-text-muted text-xs">{new Date(item.created_at).toLocaleDateString('es-PE')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
