"use client";

import { useState, useEffect } from "react";
import { Evento, EventoFormData, TIPOS_EVENTO_OPTIONS, PRIORIDADES_OPTIONS, COLORES_EVENTO } from "@/lib/types/agenda";
import { crearEvento, actualizarEvento } from "./actions";
import toast from "react-hot-toast";
import { XMarkIcon, CalendarIcon, ClockIcon, UserIcon, HomeIcon, MapPinIcon } from "@heroicons/react/24/outline";

interface EventoModalProps {
  evento?: Evento | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientes?: Array<{ id: string; nombre: string; telefono?: string; email?: string }>;
  propiedades?: Array<{ id: string; identificacion_interna: string; tipo: string }>;
}

export default function EventoModal({ 
  evento, 
  isOpen, 
  onClose, 
  onSuccess, 
  clientes = [], 
  propiedades = [] 
}: EventoModalProps) {
  const [formData, setFormData] = useState<EventoFormData>({
    titulo: "",
    descripcion: "",
    tipo: "cita",
    prioridad: "media",
    fecha_inicio: "",
    fecha_fin: "",
    duracion_minutos: 60,
    todo_el_dia: false,
    cliente_id: "",
    propiedad_id: "",
    ubicacion: "",
    direccion: "",
    recordar_antes_minutos: 15,
    notificar_email: true,
    notificar_push: false,
    es_recurrente: false,
    patron_recurrencia: undefined,
    notas: "",
    etiquetas: [],
    color: "#3B82F6"
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (evento) {
      setFormData({
        titulo: evento.titulo,
        descripcion: evento.descripcion || "",
        tipo: evento.tipo,
        prioridad: evento.prioridad,
        fecha_inicio: evento.fecha_inicio,
        fecha_fin: evento.fecha_fin || "",
        duracion_minutos: evento.duracion_minutos,
        todo_el_dia: evento.todo_el_dia,
        cliente_id: evento.cliente_id || "",
        propiedad_id: evento.propiedad_id || "",
        ubicacion: evento.ubicacion || "",
        direccion: evento.direccion || "",
        recordar_antes_minutos: evento.recordar_antes_minutos,
        notificar_email: evento.notificar_email,
        notificar_push: evento.notificar_push,
        es_recurrente: evento.es_recurrente,
        patron_recurrencia: evento.patron_recurrencia,
        notas: evento.notas || "",
        etiquetas: evento.etiquetas,
        color: evento.color
      });
    } else {
      // Reset form for new event
      setFormData({
        titulo: "",
        descripcion: "",
        tipo: "cita",
        prioridad: "media",
        fecha_inicio: "",
        fecha_fin: "",
        duracion_minutos: 60,
        todo_el_dia: false,
        cliente_id: "",
        propiedad_id: "",
        ubicacion: "",
        direccion: "",
        recordar_antes_minutos: 15,
        notificar_email: true,
        notificar_push: false,
        es_recurrente: false,
        patron_recurrencia: undefined,
        notas: "",
        etiquetas: [],
        color: "#3B82F6"
      });
    }
  }, [evento, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formDataObj = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (typeof value === 'object') {
            formDataObj.append(key, JSON.stringify(value));
          } else {
            formDataObj.append(key, String(value));
          }
        }
      });

      let result;
      if (evento) {
        result = await actualizarEvento(evento.id, formDataObj);
      } else {
        result = await crearEvento(formDataObj);
      }

      if (result.success) {
        toast.success(result.message);
        onSuccess();
        onClose();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error("Error al procesar el formulario");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof EventoFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-crm-text-primary">
              {evento ? "Editar Evento" : "Nuevo Evento"}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-crm-border rounded-lg transition-colors"
            >
              <XMarkIcon className="w-6 h-6 text-crm-text-muted" />
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
                  onChange={(e) => handleInputChange("titulo", e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Tipo *
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => handleInputChange("tipo", e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
                  required
                >
                  {TIPOS_EVENTO_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.icon} {option.label}
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
                onChange={(e) => handleInputChange("descripcion", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
              />
            </div>

            {/* Fecha y Hora */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Fecha y Hora de Inicio *
                </label>
                <input
                  type="datetime-local"
                  value={formData.fecha_inicio}
                  onChange={(e) => handleInputChange("fecha_inicio", e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Duración (minutos)
                </label>
                <input
                  type="number"
                  value={formData.duracion_minutos}
                  onChange={(e) => handleInputChange("duracion_minutos", parseInt(e.target.value))}
                  min="1"
                  max="1440"
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
                />
              </div>
            </div>

            {/* Cliente y Propiedad */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Cliente
                </label>
                <select
                  value={formData.cliente_id}
                  onChange={(e) => handleInputChange("cliente_id", e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
                >
                  <option value="">Seleccionar cliente</option>
                  {clientes.map(cliente => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Propiedad
                </label>
                <select
                  value={formData.propiedad_id}
                  onChange={(e) => handleInputChange("propiedad_id", e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
                >
                  <option value="">Seleccionar propiedad</option>
                  {propiedades.map(propiedad => (
                    <option key={propiedad.id} value={propiedad.id}>
                      {propiedad.identificacion_interna} - {propiedad.tipo}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ubicación */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Ubicación
              </label>
              <input
                type="text"
                value={formData.ubicacion}
                onChange={(e) => handleInputChange("ubicacion", e.target.value)}
                placeholder="Ej: Oficina principal, Sala de juntas"
                className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
              />
            </div>

            {/* Notificaciones */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-crm-text-primary">Notificaciones</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-crm-text-primary mb-2">
                    Recordar antes (minutos)
                  </label>
                  <input
                    type="number"
                    value={formData.recordar_antes_minutos}
                    onChange={(e) => handleInputChange("recordar_antes_minutos", parseInt(e.target.value))}
                    min="0"
                    max="10080"
                    className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.notificar_email}
                      onChange={(e) => handleInputChange("notificar_email", e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-crm-text-primary">Email</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.notificar_push}
                      onChange={(e) => handleInputChange("notificar_push", e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-crm-text-primary">Push</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-crm-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-crm-text-secondary bg-crm-border hover:bg-crm-border-hover rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-crm-primary hover:bg-crm-primary-hover rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Guardando..." : evento ? "Actualizar" : "Crear"} Evento
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
