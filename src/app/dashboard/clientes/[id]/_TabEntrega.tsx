"use client";

import { useEffect, useState, useTransition } from "react";
import { Truck, Plus, CheckCircle, AlertTriangle } from "lucide-react";
import { obtenerEntregasCliente, crearEntrega, actualizarEntrega } from "../../entregas/_actions-entregas";
import { ESTADOS_ENTREGA } from "@/lib/types/entrega";
import toast from "react-hot-toast";

interface Props {
  clienteId: string;
  clienteNombre: string;
  ventas: any[];
}

export default function TabEntrega({ clienteId, clienteNombre: _clienteNombre, ventas }: Props) {
  const [entregas, setEntregas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({ ventaId: '', fechaProgramada: '', notas: '' });

  useEffect(() => { loadEntregas(); }, [clienteId]);

  async function loadEntregas() {
    const result = await obtenerEntregasCliente(clienteId);
    if (result.success) setEntregas(result.data || []);
    setLoading(false);
  }

  async function handleCrear() {
    if (!formData.ventaId) { toast.error('Selecciona una venta'); return; }
    startTransition(async () => {
      const venta = ventas.find((v: any) => v.id === formData.ventaId);
      const result = await crearEntrega({
        ventaId: formData.ventaId,
        clienteId,
        loteId: venta?.lote_id,
        fechaProgramada: formData.fechaProgramada || undefined,
        notas: formData.notas,
      });
      if (result.success) {
        toast.success('Entrega creada');
        setShowForm(false);
        setFormData({ ventaId: '', fechaProgramada: '', notas: '' });
        loadEntregas();
      } else toast.error(result.error || 'Error');
    });
  }

  async function handleCambiarEstado(id: string, estado: string) {
    startTransition(async () => {
      const payload: any = { estado, clienteId };
      if (estado === 'entregada') payload.fechaEntrega = new Date().toISOString().split('T')[0];
      const result = await actualizarEntrega(id, payload);
      if (result.success) { toast.success('Estado actualizado'); loadEntregas(); }
      else toast.error(result.error || 'Error');
    });
  }

  function getEstadoBadge(estado: string) {
    const e = ESTADOS_ENTREGA.find(ec => ec.value === estado);
    const colors: Record<string, string> = {
      gray: 'bg-gray-100 text-gray-700', blue: 'bg-blue-100 text-blue-700',
      purple: 'bg-purple-100 text-purple-700', orange: 'bg-orange-100 text-orange-700',
      green: 'bg-green-100 text-green-700',
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[e?.color || 'gray']}`}>{e?.label || estado}</span>;
  }

  const siguienteEstado: Record<string, string> = {
    pendiente: 'programada', programada: 'en_inspeccion', en_inspeccion: 'entregada', observada: 'en_inspeccion',
  };

  if (loading) return <div className="text-center py-8 text-crm-text-muted">Cargando entregas...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-crm-text flex items-center gap-2">
          <Truck className="h-5 w-5" /> Entregas
        </h3>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-1.5 bg-crm-primary text-white rounded-lg text-sm hover:bg-crm-primary/90">
          <Plus className="h-4 w-4" /> Nueva Entrega
        </button>
      </div>

      {showForm && (
        <div className="bg-crm-background border border-crm-border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-crm-text mb-1">Venta *</label>
              <select value={formData.ventaId} onChange={e => setFormData(prev => ({ ...prev, ventaId: e.target.value }))} className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card">
                <option value="">Seleccionar venta</option>
                {ventas.filter((v: any) => v.estado !== 'cancelada').map((v: any) => (
                  <option key={v.id} value={v.id}>{v.codigo_venta}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-crm-text mb-1">Fecha Programada</label>
              <input type="date" value={formData.fechaProgramada} onChange={e => setFormData(prev => ({ ...prev, fechaProgramada: e.target.value }))} className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card" />
            </div>
            <div>
              <label className="block text-sm font-medium text-crm-text mb-1">Notas</label>
              <input type="text" value={formData.notas} onChange={e => setFormData(prev => ({ ...prev, notas: e.target.value }))} className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCrear} disabled={isPending} className="px-4 py-2 bg-crm-primary text-white rounded-lg text-sm disabled:opacity-50">{isPending ? 'Creando...' : 'Crear Entrega'}</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-crm-border rounded-lg text-sm text-crm-text-muted">Cancelar</button>
          </div>
        </div>
      )}

      {entregas.length === 0 ? (
        <div className="text-center py-10 sm:py-12 px-4 bg-crm-background rounded-lg">
          <Truck className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-crm-text-muted opacity-50" aria-hidden />
          <p className="text-sm sm:text-base font-semibold text-crm-text-primary mb-1">No hay entregas registradas</p>
          <p className="text-xs sm:text-sm text-crm-text-muted mb-4 max-w-sm mx-auto">
            Cuando se programe la entrega del lote, quedará registrada aquí con fecha y estado.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 h-10 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-dark transition-colors font-medium text-sm"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Crear primera entrega
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {entregas.map((ent: any) => (
            <div key={ent.id} className="border border-crm-border rounded-lg p-4 bg-crm-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-crm-text">{ent.codigo_entrega}</span>
                  {getEstadoBadge(ent.estado)}
                </div>
                {siguienteEstado[ent.estado] && (
                  <button onClick={() => handleCambiarEstado(ent.id, siguienteEstado[ent.estado])} disabled={isPending} className="px-3 py-1 text-xs bg-crm-primary/10 text-crm-primary rounded hover:bg-crm-primary/20">
                    Avanzar a {ESTADOS_ENTREGA.find(e => e.value === siguienteEstado[ent.estado])?.label}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {ent.fecha_programada && <div><span className="text-crm-text-muted">Programada:</span> <span className="text-crm-text">{new Date(ent.fecha_programada).toLocaleDateString('es-PE')}</span></div>}
                {ent.fecha_entrega && <div><span className="text-crm-text-muted">Entregada:</span> <span className="text-crm-text">{new Date(ent.fecha_entrega).toLocaleDateString('es-PE')}</span></div>}
                {ent.responsable_username && <div><span className="text-crm-text-muted">Responsable:</span> <span className="text-crm-text">{ent.responsable_username}</span></div>}
              </div>
              {/* Checklist */}
              {ent.checklist && ent.checklist.length > 0 && (
                <div className="mt-3 border-t border-crm-border/50 pt-2">
                  <p className="text-xs font-medium text-crm-text-muted mb-1">Checklist ({ent.checklist.filter((c: any) => c.aprobado).length}/{ent.checklist.length})</p>
                  <div className="space-y-1">
                    {ent.checklist.map((item: any) => (
                      <div key={item.id} className={`flex items-center gap-2 text-sm ${item.aprobado ? 'text-green-600' : 'text-crm-text'}`}>
                        <CheckCircle className={`h-4 w-4 ${item.aprobado ? 'text-green-500' : 'text-gray-300'}`} />
                        {item.item}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Observaciones */}
              {ent.observaciones && ent.observaciones.filter((o: any) => o.estado !== 'resuelta').length > 0 && (
                <div className="mt-2 p-2 bg-orange-50 rounded text-sm text-orange-700 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" /> {ent.observaciones.filter((o: any) => o.estado !== 'resuelta').length} observaciones pendientes
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
