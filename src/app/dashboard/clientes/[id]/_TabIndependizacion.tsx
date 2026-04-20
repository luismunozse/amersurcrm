"use client";

import { useEffect, useState, useTransition } from "react";
import { Building, Plus } from "lucide-react";
import { obtenerIndependizacionesCliente, crearIndependizacion, actualizarIndependizacion } from "../../independizacion/_actions-independizacion";
import { ESTADOS_INDEPENDIZACION } from "@/lib/types/independizacion";
import toast from "react-hot-toast";

interface Props {
  clienteId: string;
  clienteNombre: string;
  ventas: any[];
}

export default function TabIndependizacion({ clienteId, clienteNombre, ventas }: Props) {
  const [independizaciones, setIndependizaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({ ventaId: '', notaria: '', partidaMatriz: '', notas: '' });

  useEffect(() => { loadData(); }, [clienteId]);

  async function loadData() {
    const result = await obtenerIndependizacionesCliente(clienteId);
    if (result.success) setIndependizaciones(result.data || []);
    setLoading(false);
  }

  async function handleCrear() {
    if (!formData.ventaId) { toast.error('Selecciona una venta'); return; }
    startTransition(async () => {
      const venta = ventas.find((v: any) => v.id === formData.ventaId);
      if (!venta?.lote_id) { toast.error('La venta no tiene lote asociado'); return; }
      const result = await crearIndependizacion({
        ventaId: formData.ventaId,
        loteId: venta.lote_id,
        clienteId,
        notaria: formData.notaria,
        partidaRegistralMatriz: formData.partidaMatriz,
        notas: formData.notas,
      });
      if (result.success) {
        toast.success('Independización creada');
        setShowForm(false);
        setFormData({ ventaId: '', notaria: '', partidaMatriz: '', notas: '' });
        loadData();
      } else toast.error(result.error || 'Error');
    });
  }

  async function handleCambiarEstado(id: string, estado: string) {
    startTransition(async () => {
      const result = await actualizarIndependizacion(id, { estado, clienteId });
      if (result.success) { toast.success('Estado actualizado'); loadData(); }
      else toast.error(result.error || 'Error');
    });
  }

  function getEstadoBadge(estado: string) {
    const e = ESTADOS_INDEPENDIZACION.find(ec => ec.value === estado);
    const colors: Record<string, string> = {
      gray: 'bg-gray-100 text-gray-700', blue: 'bg-blue-100 text-blue-700',
      orange: 'bg-orange-100 text-orange-700', green: 'bg-green-100 text-green-700',
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[e?.color || 'gray']}`}>{e?.label || estado}</span>;
  }

  const siguienteEstado: Record<string, string> = {
    pendiente: 'en_tramite', en_tramite: 'completada', observada: 'en_tramite',
  };

  if (loading) return <div className="text-center py-8 text-crm-text-muted">Cargando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-crm-text flex items-center gap-2">
          <Building className="h-5 w-5" /> Independización
        </h3>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-1.5 bg-crm-primary text-white rounded-lg text-sm hover:bg-crm-primary/90">
          <Plus className="h-4 w-4" /> Nueva Independización
        </button>
      </div>

      {showForm && (
        <div className="bg-crm-background border border-crm-border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              <label className="block text-sm font-medium text-crm-text mb-1">Notaría</label>
              <input type="text" value={formData.notaria} onChange={e => setFormData(prev => ({ ...prev, notaria: e.target.value }))} className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card" />
            </div>
            <div>
              <label className="block text-sm font-medium text-crm-text mb-1">Partida Registral Matriz</label>
              <input type="text" value={formData.partidaMatriz} onChange={e => setFormData(prev => ({ ...prev, partidaMatriz: e.target.value }))} className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card" />
            </div>
            <div>
              <label className="block text-sm font-medium text-crm-text mb-1">Notas</label>
              <input type="text" value={formData.notas} onChange={e => setFormData(prev => ({ ...prev, notas: e.target.value }))} className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCrear} disabled={isPending} className="px-4 py-2 bg-crm-primary text-white rounded-lg text-sm disabled:opacity-50">{isPending ? 'Creando...' : 'Crear'}</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-crm-border rounded-lg text-sm text-crm-text-muted">Cancelar</button>
          </div>
        </div>
      )}

      {independizaciones.length === 0 ? (
        <div className="text-center py-10 sm:py-12 px-4 bg-crm-background rounded-lg">
          <Building className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-crm-text-muted opacity-50" aria-hidden />
          <p className="text-sm sm:text-base font-semibold text-crm-text-primary mb-1">No hay independizaciones registradas</p>
          <p className="text-xs sm:text-sm text-crm-text-muted mb-4 max-w-sm mx-auto">
            Una vez iniciado el trámite de independización del lote, su avance quedará registrado acá.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 h-10 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-dark transition-colors font-medium text-sm"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Crear primera independización
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {independizaciones.map((ind: any) => (
            <div key={ind.id} className="border border-crm-border rounded-lg p-4 bg-crm-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-crm-text">{ind.codigo_independizacion}</span>
                  {getEstadoBadge(ind.estado)}
                </div>
                {siguienteEstado[ind.estado] && (
                  <button onClick={() => handleCambiarEstado(ind.id, siguienteEstado[ind.estado])} disabled={isPending} className="px-3 py-1 text-xs bg-crm-primary/10 text-crm-primary rounded hover:bg-crm-primary/20">
                    Avanzar a {ESTADOS_INDEPENDIZACION.find(e => e.value === siguienteEstado[ind.estado])?.label}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {ind.notaria && <div><span className="text-crm-text-muted">Notaría:</span> <span className="text-crm-text">{ind.notaria}</span></div>}
                {ind.partida_registral_matriz && <div><span className="text-crm-text-muted">Partida Matriz:</span> <span className="text-crm-text">{ind.partida_registral_matriz}</span></div>}
                {ind.partida_registral_independizada && <div><span className="text-crm-text-muted">Partida Independizada:</span> <span className="text-crm-text font-semibold text-green-600">{ind.partida_registral_independizada}</span></div>}
                {ind.numero_titulo && <div><span className="text-crm-text-muted">N.Titulo:</span> <span className="text-crm-text">{ind.numero_titulo}</span></div>}
                {ind.fecha_inscripcion && <div><span className="text-crm-text-muted">Inscripción:</span> <span className="text-crm-text">{new Date(ind.fecha_inscripcion).toLocaleDateString('es-PE')}</span></div>}
              </div>
              {ind.observacion_sunarp && (
                <div className="mt-2 p-2 bg-orange-50 rounded text-sm text-orange-700">{ind.observacion_sunarp}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
