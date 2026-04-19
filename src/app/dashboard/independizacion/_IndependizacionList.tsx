"use client";

import { useEffect, useState } from "react";
import { Building } from "lucide-react";
import { obtenerIndependizaciones } from "./_actions-independizacion";
import { ESTADOS_INDEPENDIZACION } from "@/lib/types/independizacion";

export default function IndependizacionList() {
  const [items, setItems] = useState<any[]>([]);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [filtro]);

  async function loadData() {
    setLoading(true);
    const result = await obtenerIndependizaciones({ estado: filtro || undefined });
    if (result.success) setItems(result.data || []);
    setLoading(false);
  }

  function getEstadoBadge(estado: string) {
    const e = ESTADOS_INDEPENDIZACION.find(ec => ec.value === estado);
    const colors: Record<string, string> = {
      gray: 'bg-gray-100 text-gray-700', blue: 'bg-blue-100 text-blue-700',
      orange: 'bg-orange-100 text-orange-700', green: 'bg-green-100 text-green-700',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[e?.color || 'gray']}`}>{e?.label || estado}</span>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {[{ value: '', label: 'Todas' }, ...ESTADOS_INDEPENDIZACION].map(e => (
          <button key={e.value} onClick={() => setFiltro(e.value)} className={`px-3 py-1.5 rounded-lg text-sm ${filtro === e.value ? 'bg-crm-primary text-white' : 'bg-crm-background border border-crm-border text-crm-text-muted'}`}>
            {e.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-crm-text-muted">Cargando...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-crm-text-muted">
          <Building className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p>No hay independizaciones registradas</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((ind: any) => (
            <div key={ind.id} className="bg-crm-card border border-crm-border rounded-lg p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm font-semibold">{ind.codigo_independizacion}</span>
                  {getEstadoBadge(ind.estado)}
                </div>
                <p className="text-sm text-crm-text">
                  <a href={`/dashboard/clientes/${ind.cliente_id}`} className="text-crm-primary hover:underline">{ind.cliente?.nombre}</a>
                  {ind.lote?.codigo && <span className="text-crm-text-muted"> | Lote {ind.lote.codigo}</span>}
                </p>
              </div>
              <div className="text-right text-sm text-crm-text-muted">
                {ind.fecha_inscripcion && <p className="text-green-600 font-medium">Inscrita: {new Date(ind.fecha_inscripcion).toLocaleDateString('es-PE')}</p>}
                {ind.notaria && <p>{ind.notaria}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
