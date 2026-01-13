"use client";

import { useState } from "react";
import { crearEvento } from "@/app/dashboard/agenda/actions";
import { EventoFormState } from "@/lib/types/agenda";
import DateTimePicker from "@/components/ui/DateTimePicker";
import toast from "react-hot-toast";

interface EventoFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  eventoInicial?: Partial<EventoFormState>;
}

const TIPOS_EVENTO = [
  { value: 'cita', label: 'Cita', icon: '📅' },
  { value: 'llamada', label: 'Llamada', icon: '📞' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'visita', label: 'Visita', icon: '🏠' },
  { value: 'seguimiento', label: 'Seguimiento', icon: '👥' },
  { value: 'recordatorio', label: 'Recordatorio', icon: '⏰' },
  { value: 'tarea', label: 'Tarea', icon: '✅' }
];

const PRIORIDADES = [
  { value: 'baja', label: 'Baja', color: 'text-gray-600' },
  { value: 'media', label: 'Media', color: 'text-blue-600' },
  { value: 'alta', label: 'Alta', color: 'text-orange-600' },
  { value: 'urgente', label: 'Urgente', color: 'text-red-600' }
];

export default function EventoForm({ onSuccess, onCancel, eventoInicial }: EventoFormProps) {
  const [formData, setFormData] = useState<EventoFormState>({
    titulo: eventoInicial?.titulo || '',
    descripcion: eventoInicial?.descripcion || '',
    tipo: eventoInicial?.tipo || 'cita',
    prioridad: eventoInicial?.prioridad || 'media',
    fecha_inicio: eventoInicial?.fecha_inicio || '',
    fecha_fin: eventoInicial?.fecha_fin || '',
    duracion_minutos: eventoInicial?.duracion_minutos || 60,
    todo_el_dia: eventoInicial?.todo_el_dia || false,
    cliente_id: eventoInicial?.cliente_id || '',
    propiedad_id: eventoInicial?.propiedad_id || '',
    ubicacion: eventoInicial?.ubicacion || '',
    direccion: eventoInicial?.direccion || '',
    recordar_antes_minutos: eventoInicial?.recordar_antes_minutos || 30,
    notificar_email: eventoInicial?.notificar_email || true,
    notificar_push: eventoInicial?.notificar_push || false,
    es_recurrente: eventoInicial?.es_recurrente || false,
    patron_recurrencia: eventoInicial?.patron_recurrencia,
    notas: eventoInicial?.notas || '',
    etiquetas: eventoInicial?.etiquetas || [],
    color: eventoInicial?.color || '#3B82F6'
  });

  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo || !formData.fecha_inicio) {
      toast.error("Título y fecha de inicio son requeridos");
      return;
    }

    setCargando(true);
    try {
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (typeof value === 'object') {
            formDataToSend.append(key, JSON.stringify(value));
          } else {
            formDataToSend.append(key, String(value));
          }
        }
      });

      const result = await crearEvento(formDataToSend);
      if (result?.success) {
        toast.success(result.message || "Evento creado exitosamente");
        onSuccess();
      } else {
        toast.error(result?.message || "No se pudo crear el evento");
      }
    } catch (error) {
      console.error("Error creando evento:", error);
      toast.error("Error creando evento");
    } finally {
      setCargando(false);
    }
  };

  const handleChange = (field: keyof EventoFormState, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-crm-text-primary">
              {eventoInicial ? 'Editar Evento' : 'Crear Nuevo Evento'}
            </h2>
            <button
              onClick={onCancel}
              className="text-crm-text-muted hover:text-crm-text-primary transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Título y Tipo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => handleChange('titulo', e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
                  placeholder="Ej: Llamar a Juan mañana"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Tipo de Evento
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => handleChange('tipo', e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
                >
                  {TIPOS_EVENTO.map(tipo => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.icon} {tipo.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Descripción
              </label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => handleChange('descripcion', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
                placeholder="Detalles adicionales del evento..."
              />
            </div>

            {/* Fechas y Hora */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Fecha de Inicio *
                </label>
                <DateTimePicker
                  value={formData.fecha_inicio}
                  onChange={(value) => handleChange('fecha_inicio', value)}
                  placeholder="Seleccionar fecha y hora"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Fecha de Fin
                </label>
                <DateTimePicker
                  value={formData.fecha_fin}
                  onChange={(value) => handleChange('fecha_fin', value)}
                  placeholder="Seleccionar fecha y hora"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Duración (min)
                </label>
                <input
                  type="number"
                  value={formData.duracion_minutos}
                  onChange={(e) => handleChange('duracion_minutos', Number(e.target.value))}
                  min="15"
                  max="1440"
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
                />
              </div>
            </div>

            {/* Todo el día y Prioridad */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="todo_el_dia"
                  checked={formData.todo_el_dia}
                  onChange={(e) => handleChange('todo_el_dia', e.target.checked)}
                  className="w-4 h-4 text-crm-primary bg-crm-card border-crm-border rounded focus:ring-crm-primary"
                />
                <label htmlFor="todo_el_dia" className="text-sm font-medium text-crm-text-primary">
                  Todo el día
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Prioridad
                </label>
                <select
                  value={formData.prioridad}
                  onChange={(e) => handleChange('prioridad', e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
                >
                  {PRIORIDADES.map(prioridad => (
                    <option key={prioridad.value} value={prioridad.value}>
                      {prioridad.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ubicación y Dirección */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Ubicación
                </label>
                <input
                  type="text"
                  value={formData.ubicacion}
                  onChange={(e) => handleChange('ubicacion', e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
                  placeholder="Ej: Oficina AMERSUR"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Dirección
                </label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) => handleChange('direccion', e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
                  placeholder="Dirección específica"
                />
              </div>
            </div>

            {/* Recordatorios */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-crm-text-primary">Recordatorios</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-crm-text-primary mb-2">
                    Recordar antes (minutos)
                  </label>
                  <select
                    value={formData.recordar_antes_minutos}
                    onChange={(e) => handleChange('recordar_antes_minutos', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
                  >
                    <option value={0}>No recordar</option>
                    <option value={15}>15 minutos antes</option>
                    <option value={30}>30 minutos antes</option>
                    <option value={60}>1 hora antes</option>
                    <option value={120}>2 horas antes</option>
                    <option value={1440}>1 día antes</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="notificar_email"
                      checked={formData.notificar_email}
                      onChange={(e) => handleChange('notificar_email', e.target.checked)}
                      className="w-4 h-4 text-crm-primary bg-crm-card border-crm-border rounded focus:ring-crm-primary"
                    />
                    <label htmlFor="notificar_email" className="text-sm font-medium text-crm-text-primary">
                      Notificar por email
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="notificar_push"
                      checked={formData.notificar_push}
                      onChange={(e) => handleChange('notificar_push', e.target.checked)}
                      className="w-4 h-4 text-crm-primary bg-crm-card border-crm-border rounded focus:ring-crm-primary"
                    />
                    <label htmlFor="notificar_push" className="text-sm font-medium text-crm-text-primary">
                      Notificar push
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Notas Adicionales
              </label>
              <textarea
                value={formData.notas}
                onChange={(e) => handleChange('notas', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
                placeholder="Información adicional o recordatorios especiales..."
              />
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-crm-border">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 text-crm-text-muted hover:text-crm-text-primary transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={cargando}
                className="crm-button-primary px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cargando ? 'Creando...' : (eventoInicial ? 'Actualizar' : 'Crear Evento')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
