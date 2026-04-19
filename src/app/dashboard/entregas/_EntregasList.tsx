"use client";

import { useEffect, useState } from "react";
import { Truck } from "lucide-react";
import { obtenerEntregas } from "./_actions-entregas";
import { ESTADOS_ENTREGA } from "@/lib/types/entrega";

export default function EntregasList() {
  const [entregas, setEntregas] = useState<any[]>([]);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [filtro]);

  async function loadData() {
    setLoading(true);
    const result = await obtenerEntregas({ estado: filtro || undefined });
    if (result.success) setEntregas(result.data || []);
    setLoading(false);
  }

  function getEstadoBadge(estado: string) {
    const e = ESTADOS_ENTREGA.find(ec => ec.value === estado);
    const colors: Record<string, string> = {
      gray: 'bg-gray-100 text-gray-700', blue: 'bg-blue-100 text-blue-700',
      purple: 'bg-purple-100 text-purple-700', orange: 'bg-orange-100 text-orange-700',
      green: 'bg-green-100 text-green-700',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[e?.color || 'gray']}`}>{e?.label || estado}</span>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {[{ value: '', label: 'Todas' }, ...ESTADOS_ENTREGA].map(e => (
          <button key={e.value} onClick={() => setFiltro(e.value)} className={`px-3 py-1.5 rounded-lg text-sm ${filtro === e.value ? 'bg-crm-primary text-white' : 'bg-crm-background border border-crm-border text-crm-text-muted'}`}>
            {e.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-crm-text-muted">Cargando...</div>
      ) : entregas.length === 0 ? (
        <div className="text-center py-8 text-crm-text-muted">
          <Truck className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p>No hay entregas registradas</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {entregas.map((ent: any) => (
            <div key={ent.id} className="bg-crm-card border border-crm-border rounded-lg p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm font-semibold">{ent.codigo_entrega}</span>
                  {getEstadoBadge(ent.estado)}
                </div>
                <p className="text-sm text-crm-text">
                  <a href={`/dashboard/clientes/${ent.cliente?.id || ''}`} className="text-crm-primary hover:underline">{ent.cliente?.nombre}</a>
                  {ent.lote?.codigo && <span className="text-crm-text-muted"> | Lote {ent.lote.codigo}</span>}
                  {ent.venta?.codigo_venta && <span className="text-crm-text-muted"> | {ent.venta.codigo_venta}</span>}
                </p>
              </div>
              <div className="text-right text-sm text-crm-text-muted">
                {ent.fecha_programada && <p>Programada: {new Date(ent.fecha_programada).toLocaleDateString('es-PE')}</p>}
                {ent.fecha_entrega && <p className="text-green-600 font-medium">Entregada: {new Date(ent.fecha_entrega).toLocaleDateString('es-PE')}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
