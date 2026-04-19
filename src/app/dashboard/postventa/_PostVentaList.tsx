"use client";

import { useEffect, useState } from "react";
import { Headphones } from "lucide-react";
import { obtenerSolicitudesPostVenta } from "./_actions-postventa";
import { TIPOS_SOLICITUD_PV, PRIORIDADES_SOLICITUD, ESTADOS_SOLICITUD_PV } from "@/lib/types/postventa";

export default function PostVentaList() {
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [filtroEstado]);

  async function loadData() {
    setLoading(true);
    const result = await obtenerSolicitudesPostVenta({ estado: filtroEstado || undefined });
    if (result.success) setSolicitudes(result.data || []);
    setLoading(false);
  }

  function getBadge(value: string, catalog: { value: string; label: string; color: string }[]) {
    const e = catalog.find(c => c.value === value);
    const colors: Record<string, string> = {
      gray: 'bg-gray-100 text-gray-700', blue: 'bg-blue-100 text-blue-700', green: 'bg-green-100 text-green-700',
      red: 'bg-red-100 text-red-700', orange: 'bg-orange-100 text-orange-700', purple: 'bg-purple-100 text-purple-700',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[e?.color || 'gray']}`}>{e?.label || value}</span>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {[{ value: '', label: 'Todas' }, ...ESTADOS_SOLICITUD_PV].map(e => (
          <button key={e.value} onClick={() => setFiltroEstado(e.value)} className={`px-3 py-1.5 rounded-lg text-sm ${filtroEstado === e.value ? 'bg-crm-primary text-white' : 'bg-crm-background border border-crm-border text-crm-text-muted'}`}>
            {e.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-crm-text-muted">Cargando...</div>
      ) : solicitudes.length === 0 ? (
        <div className="text-center py-8 text-crm-text-muted">
          <Headphones className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p>No hay solicitudes de post-venta</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {solicitudes.map((sol: any) => (
            <div key={sol.id} className="bg-crm-card border border-crm-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-semibold">{sol.codigo_solicitud}</span>
                  {getBadge(sol.tipo, TIPOS_SOLICITUD_PV)}
                  {getBadge(sol.prioridad, PRIORIDADES_SOLICITUD)}
                  {getBadge(sol.estado, ESTADOS_SOLICITUD_PV)}
                </div>
                <span className="text-xs text-crm-text-muted">{new Date(sol.created_at).toLocaleDateString('es-PE')}</span>
              </div>
              <p className="text-sm font-medium text-crm-text">{sol.asunto}</p>
              <p className="text-sm text-crm-text-muted mt-1">
                <a href={`/dashboard/clientes/${sol.cliente_id}`} className="text-crm-primary hover:underline">{sol.cliente?.nombre}</a>
                {sol.venta?.codigo_venta && <span> | {sol.venta.codigo_venta}</span>}
                {sol.asignado_a && <span> | Asignado: {sol.asignado_a}</span>}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
