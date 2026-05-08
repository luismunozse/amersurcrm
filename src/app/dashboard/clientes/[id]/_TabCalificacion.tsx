"use client";

import { useEffect, useState, useTransition } from "react";
import { Landmark, Plus, FileCheck, AlertCircle } from "lucide-react";
import { obtenerCalificacionesCliente, crearCalificacionBancaria, actualizarCalificacionBancaria } from "../_actions-calificacion";
import { ESTADOS_CALIFICACION, BANCOS_PERU } from "@/lib/types/calificacion-bancaria";
import type { CalificacionBancaria } from "@/lib/types/calificacion-bancaria";
import toast from "react-hot-toast";

interface Props {
  clienteId: string;
  clienteNombre: string;
  ventas: any[];
  reservas: any[];
}

export default function TabCalificacion({ clienteId, clienteNombre, ventas, reservas }: Props) {
  const [calificaciones, setCalificaciones] = useState<CalificacionBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    reservaId: '',
    banco: '',
    montoSolicitado: '',
    notas: '',
  });

  useEffect(() => {
    loadCalificaciones();
  }, [clienteId]);

  async function loadCalificaciones() {
    const result = await obtenerCalificacionesCliente(clienteId);
    if (result.success) {
      setCalificaciones(result.data as CalificacionBancaria[]);
    }
    setLoading(false);
  }

  async function handleCrear() {
    startTransition(async () => {
      const reserva = reservas.find((r: any) => r.id === formData.reservaId);
      const result = await crearCalificacionBancaria({
        clienteId,
        reservaId: formData.reservaId || undefined,
        loteId: reserva?.lote_id,
        banco: formData.banco,
        montoSolicitado: formData.montoSolicitado ? parseFloat(formData.montoSolicitado) : undefined,
        notas: formData.notas,
      });

      if (result.success) {
        toast.success('Calificación bancaria creada');
        setShowForm(false);
        setFormData({ reservaId: '', banco: '', montoSolicitado: '', notas: '' });
        loadCalificaciones();
      } else {
        toast.error(result.error || 'Error al crear calificación');
      }
    });
  }

  async function handleCambiarEstado(id: string, estado: string) {
    startTransition(async () => {
      const result = await actualizarCalificacionBancaria(id, { estado, clienteId });
      if (result.success) {
        toast.success(`Estado actualizado a ${estado}`);
        loadCalificaciones();
      } else {
        toast.error(result.error || 'Error');
      }
    });
  }

  function getEstadoBadge(estado: string) {
    const e = ESTADOS_CALIFICACION.find(ec => ec.value === estado);
    const colors: Record<string, string> = {
      gray: 'bg-gray-100 text-gray-700',
      blue: 'bg-blue-100 text-blue-700',
      green: 'bg-green-100 text-green-700',
      red: 'bg-red-100 text-red-700',
      orange: 'bg-orange-100 text-orange-700',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[e?.color || 'gray']}`}>
        {e?.label || estado}
      </span>
    );
  }

  if (loading) {
    return <div className="text-center py-8 text-crm-text-muted">Cargando calificaciones...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-crm-text flex items-center gap-2">
          <Landmark className="h-5 w-5" /> Calificación Bancaria
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 px-3 py-1.5 bg-crm-primary text-white rounded-lg text-sm hover:bg-crm-primary/90"
        >
          <Plus className="h-4 w-4" /> Nueva Calificación
        </button>
      </div>

      {showForm && (
        <div className="bg-crm-background border border-crm-border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-crm-text mb-1">Separación</label>
              <select
                value={formData.reservaId}
                onChange={e => setFormData(prev => ({ ...prev, reservaId: e.target.value }))}
                className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card"
              >
                <option value="">Sin separación vinculada</option>
                {reservas.filter((r: any) => r.estado === 'activa').map((r: any) => (
                  <option key={r.id} value={r.id}>{r.codigo_reserva}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-crm-text mb-1">Banco</label>
              <select
                value={formData.banco}
                onChange={e => setFormData(prev => ({ ...prev, banco: e.target.value }))}
                className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card"
              >
                <option value="">Seleccionar banco</option>
                {BANCOS_PERU.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-crm-text mb-1">Monto Solicitado</label>
              <input
                type="number"
                value={formData.montoSolicitado}
                onChange={e => setFormData(prev => ({ ...prev, montoSolicitado: e.target.value }))}
                className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-crm-text mb-1">Notas</label>
              <input
                type="text"
                value={formData.notas}
                onChange={e => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCrear} disabled={isPending} className="px-4 py-2 bg-crm-primary text-white rounded-lg text-sm hover:bg-crm-primary/90 disabled:opacity-50">
              {isPending ? 'Creando...' : 'Crear Calificación'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-crm-border rounded-lg text-sm text-crm-text-muted">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {calificaciones.length === 0 ? (
        <div className="text-center py-10 sm:py-12 px-4 bg-crm-background rounded-lg">
          <Landmark className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-crm-text-muted opacity-50" aria-hidden />
          <p className="text-sm sm:text-base font-semibold text-crm-text-primary mb-1">No hay calificaciones bancarias</p>
          <p className="text-xs sm:text-sm text-crm-text-muted mb-4 max-w-sm mx-auto">
            Si el cliente evalúa financiamiento bancario, carga aquí la calificación para hacer seguimiento.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 h-10 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-dark transition-colors font-medium text-sm"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Crear primera calificación
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {calificaciones.map((cal) => (
            <div key={cal.id} className="border border-crm-border rounded-lg p-4 bg-crm-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-crm-text">{cal.codigo_calificacion}</span>
                  {getEstadoBadge(cal.estado)}
                </div>
                <div className="flex gap-1">
                  {cal.estado === 'pendiente' && (
                    <button onClick={() => handleCambiarEstado(cal.id, 'en_evaluacion')} className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100">
                      Enviar a Evaluación
                    </button>
                  )}
                  {cal.estado === 'en_evaluacion' && (
                    <>
                      <button onClick={() => handleCambiarEstado(cal.id, 'aprobada')} className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100">
                        Aprobar
                      </button>
                      <button onClick={() => handleCambiarEstado(cal.id, 'rechazada')} className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100">
                        Rechazar
                      </button>
                      <button onClick={() => handleCambiarEstado(cal.id, 'observada')} className="px-2 py-1 text-xs bg-orange-50 text-orange-700 rounded hover:bg-orange-100">
                        Observar
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                {cal.banco && <div><span className="text-crm-text-muted">Banco:</span> <span className="text-crm-text">{cal.banco}</span></div>}
                {cal.monto_solicitado && <div><span className="text-crm-text-muted">Solicitado:</span> <span className="text-crm-text">S/ {cal.monto_solicitado.toLocaleString()}</span></div>}
                {cal.monto_aprobado && <div><span className="text-crm-text-muted">Aprobado:</span> <span className="text-crm-text font-semibold text-green-600">S/ {cal.monto_aprobado.toLocaleString()}</span></div>}
                {cal.ejecutivo_bancario && <div><span className="text-crm-text-muted">Ejecutivo:</span> <span className="text-crm-text">{cal.ejecutivo_bancario}</span></div>}
              </div>
              {cal.motivo_rechazo && (
                <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" /> {cal.motivo_rechazo}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
