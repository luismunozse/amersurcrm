"use client";

import { useEffect, useState, useTransition } from "react";
import { Headphones, Plus, Star } from "lucide-react";
import { obtenerSolicitudesPostVentaCliente, crearSolicitudPostVenta, actualizarSolicitudPostVenta } from "../../postventa/_actions-postventa";
import { TIPOS_SOLICITUD_PV, PRIORIDADES_SOLICITUD, ESTADOS_SOLICITUD_PV } from "@/lib/types/postventa";
import toast from "react-hot-toast";

interface Props {
  clienteId: string;
  clienteNombre: string;
  ventas: any[];
}

export default function TabPostVenta({ clienteId, clienteNombre, ventas }: Props) {
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({ ventaId: '', tipo: 'consulta', prioridad: 'media', asunto: '', descripcion: '' });

  useEffect(() => { loadSolicitudes(); }, [clienteId]);

  async function loadSolicitudes() {
    const result = await obtenerSolicitudesPostVentaCliente(clienteId);
    if (result.success) setSolicitudes(result.data || []);
    setLoading(false);
  }

  async function handleCrear() {
    if (!formData.ventaId || !formData.asunto) { toast.error('Completa los campos requeridos'); return; }
    startTransition(async () => {
      const result = await crearSolicitudPostVenta({
        ventaId: formData.ventaId,
        clienteId,
        tipo: formData.tipo,
        prioridad: formData.prioridad,
        asunto: formData.asunto,
        descripcion: formData.descripcion,
      });
      if (result.success) {
        toast.success('Solicitud creada');
        setShowForm(false);
        setFormData({ ventaId: '', tipo: 'consulta', prioridad: 'media', asunto: '', descripcion: '' });
        loadSolicitudes();
      } else toast.error(result.error || 'Error');
    });
  }

  async function handleCambiarEstado(id: string, estado: string) {
    startTransition(async () => {
      const result = await actualizarSolicitudPostVenta(id, { estado, clienteId });
      if (result.success) { toast.success('Estado actualizado'); loadSolicitudes(); }
      else toast.error(result.error || 'Error');
    });
  }

  function getBadge(value: string, catalog: { value: string; label: string; color: string }[]) {
    const e = catalog.find(c => c.value === value);
    const colors: Record<string, string> = {
      gray: 'bg-gray-100 text-gray-700', blue: 'bg-blue-100 text-blue-700', green: 'bg-green-100 text-green-700',
      red: 'bg-red-100 text-red-700', orange: 'bg-orange-100 text-orange-700', purple: 'bg-purple-100 text-purple-700',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[e?.color || 'gray']}`}>{e?.label || value}</span>;
  }

  if (loading) return <div className="text-center py-8 text-crm-text-muted">Cargando solicitudes...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-crm-text flex items-center gap-2">
          <Headphones className="h-5 w-5" /> Post-Venta
        </h3>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-1.5 bg-crm-primary text-white rounded-lg text-sm hover:bg-crm-primary/90">
          <Plus className="h-4 w-4" /> Nueva Solicitud
        </button>
      </div>

      {showForm && (
        <div className="bg-crm-background border border-crm-border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-crm-text mb-1">Venta *</label>
              <select value={formData.ventaId} onChange={e => setFormData(prev => ({ ...prev, ventaId: e.target.value }))} className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card">
                <option value="">Seleccionar venta</option>
                {ventas.map((v: any) => <option key={v.id} value={v.id}>{v.codigo_venta}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-crm-text mb-1">Tipo *</label>
              <select value={formData.tipo} onChange={e => setFormData(prev => ({ ...prev, tipo: e.target.value }))} className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card">
                {TIPOS_SOLICITUD_PV.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-crm-text mb-1">Prioridad</label>
              <select value={formData.prioridad} onChange={e => setFormData(prev => ({ ...prev, prioridad: e.target.value }))} className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card">
                {PRIORIDADES_SOLICITUD.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-crm-text mb-1">Asunto *</label>
              <input type="text" value={formData.asunto} onChange={e => setFormData(prev => ({ ...prev, asunto: e.target.value }))} className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card" placeholder="Describe brevemente la solicitud" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-crm-text mb-1">Descripción</label>
            <textarea value={formData.descripcion} onChange={e => setFormData(prev => ({ ...prev, descripcion: e.target.value }))} className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card" rows={3} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCrear} disabled={isPending} className="px-4 py-2 bg-crm-primary text-white rounded-lg text-sm disabled:opacity-50">{isPending ? 'Creando...' : 'Crear Solicitud'}</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-crm-border rounded-lg text-sm text-crm-text-muted">Cancelar</button>
          </div>
        </div>
      )}

      {solicitudes.length === 0 ? (
        <div className="text-center py-8 text-crm-text-muted">
          <Headphones className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p>No hay solicitudes de post-venta</p>
        </div>
      ) : (
        <div className="space-y-3">
          {solicitudes.map((sol: any) => (
            <div key={sol.id} className="border border-crm-border rounded-lg p-4 bg-crm-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-semibold text-crm-text">{sol.codigo_solicitud}</span>
                  {getBadge(sol.tipo, TIPOS_SOLICITUD_PV)}
                  {getBadge(sol.prioridad, PRIORIDADES_SOLICITUD)}
                  {getBadge(sol.estado, ESTADOS_SOLICITUD_PV)}
                </div>
                {sol.estado === 'registrada' && (
                  <button onClick={() => handleCambiarEstado(sol.id, 'en_proceso')} disabled={isPending} className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100">Iniciar</button>
                )}
                {sol.estado === 'en_proceso' && (
                  <button onClick={() => handleCambiarEstado(sol.id, 'resuelta')} disabled={isPending} className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100">Resolver</button>
                )}
                {sol.estado === 'resuelta' && (
                  <button onClick={() => handleCambiarEstado(sol.id, 'cerrada')} disabled={isPending} className="px-2 py-1 text-xs bg-gray-50 text-gray-700 rounded hover:bg-gray-100">Cerrar</button>
                )}
              </div>
              <p className="text-sm font-medium text-crm-text">{sol.asunto}</p>
              {sol.descripcion && <p className="text-sm text-crm-text-muted mt-1">{sol.descripcion}</p>}
              {sol.calificacion_cliente && (
                <div className="mt-2 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} className={`h-4 w-4 ${i <= sol.calificacion_cliente ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                  ))}
                </div>
              )}
              <div className="mt-2 text-xs text-crm-text-muted">
                {new Date(sol.created_at).toLocaleDateString('es-PE')} {sol.asignado_a && <span>| Asignado a: {sol.asignado_a}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
