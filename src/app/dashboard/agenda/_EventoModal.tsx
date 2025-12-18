"use client";

import { useState, useEffect } from "react";
import { Evento } from "@/lib/types/agenda";
import { crearEvento, actualizarEvento } from "./actions";
import toast from "react-hot-toast";
import { XMarkIcon, UserIcon } from "@heroicons/react/24/outline";

interface EventoModalProps {
  evento?: Evento | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientes?: Array<{ id: string; nombre: string; telefono?: string; email?: string }>;
  propiedades?: Array<{ id: string; identificacion_interna: string; tipo: string }>;
}

const TIPOS_EVENTO = [
  { value: "llamada", label: "Llamada", icon: "📞" },
  { value: "visita", label: "Visita", icon: "🏠" },
  { value: "cita", label: "Cita", icon: "📅" },
  { value: "seguimiento", label: "Seguimiento", icon: "👥" },
  { value: "tarea", label: "Tarea", icon: "✅" },
];

const PRIORIDADES = [
  { value: "baja", label: "Baja", color: "bg-gray-100 text-gray-700" },
  { value: "media", label: "Media", color: "bg-blue-100 text-blue-700" },
  { value: "alta", label: "Alta", color: "bg-orange-100 text-orange-700" },
  { value: "urgente", label: "Urgente", color: "bg-red-100 text-red-700" },
];

const RECORDATORIOS = [
  { value: 0, label: "Sin recordatorio" },
  { value: 15, label: "15 minutos antes" },
  { value: 30, label: "30 minutos antes" },
  { value: 60, label: "1 hora antes" },
  { value: 1440, label: "1 día antes" },
];

interface FormValues {
  titulo: string;
  tipo: string;
  prioridad: string;
  cliente_id: string;
  fecha_inicio: string;
  duracion_minutos: number;
  recordar_antes_minutos: number;
  notas: string;
}

// Componente de búsqueda de clientes
function ClienteSearch({
  clientes,
  value,
  onChange
}: {
  clientes: Array<{ id: string; nombre: string; telefono?: string }>;
  value: string;
  onChange: (id: string) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(false);

  const clientesFiltrados = busqueda.trim()
    ? clientes.filter(c =>
        c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (c.telefono && c.telefono.includes(busqueda))
      )
    : clientes;

  const clienteSeleccionado = clientes.find(c => c.id === value);

  return (
    <div className="relative">
      <input
        type="text"
        value={abierto ? busqueda : (clienteSeleccionado?.nombre || "")}
        onChange={(e) => {
          setBusqueda(e.target.value);
          if (!abierto) setAbierto(true);
        }}
        onFocus={() => {
          setAbierto(true);
          setBusqueda("");
        }}
        placeholder="Buscar cliente por nombre o teléfono..."
        className="w-full px-3 py-2.5 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
      />
      {abierto && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setAbierto(false)}
          />
          <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-700 border border-crm-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {clientesFiltrados.length === 0 ? (
              <div className="px-3 py-2 text-sm text-crm-text-muted">
                {clientes.length === 0 ? "Cargando clientes..." : "No se encontraron clientes"}
              </div>
            ) : (
              clientesFiltrados.slice(0, 50).map((cliente) => (
                <button
                  key={cliente.id}
                  type="button"
                  onClick={() => {
                    onChange(cliente.id);
                    setBusqueda("");
                    setAbierto(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-crm-primary/10 transition-colors ${
                    cliente.id === value ? "bg-crm-primary/20 font-medium" : ""
                  }`}
                >
                  <span className="text-crm-text-primary">{cliente.nombre}</span>
                  {cliente.telefono && (
                    <span className="text-crm-text-muted ml-2">- {cliente.telefono}</span>
                  )}
                </button>
              ))
            )}
            {clientesFiltrados.length > 50 && (
              <div className="px-3 py-2 text-xs text-crm-text-muted border-t border-crm-border">
                Escribe para filtrar ({clientesFiltrados.length - 50} más)
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function EventoModal({ evento, isOpen, onClose, onSuccess, clientes = [] }: EventoModalProps) {
  const [formData, setFormData] = useState<FormValues>({
    titulo: "",
    tipo: "llamada",
    prioridad: "media",
    cliente_id: "",
    fecha_inicio: "",
    duracion_minutos: 30,
    recordar_antes_minutos: 15,
    notas: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form cuando se abre el modal
  useEffect(() => {
    if (!isOpen) return;

    if (evento) {
      setFormData({
        titulo: evento.titulo,
        tipo: evento.tipo,
        prioridad: evento.prioridad,
        cliente_id: evento.cliente_id || "",
        fecha_inicio: evento.fecha_inicio?.slice(0, 16) || "",
        duracion_minutos: evento.duracion_minutos || 30,
        recordar_antes_minutos: evento.recordar_antes_minutos || 15,
        notas: evento.notas || "",
      });
    } else {
      // Valores por defecto para nuevo evento
      const ahora = new Date();
      ahora.setMinutes(Math.ceil(ahora.getMinutes() / 15) * 15); // Redondear a 15 min
      const fechaDefault = ahora.toISOString().slice(0, 16);

      setFormData({
        titulo: "",
        tipo: "llamada",
        prioridad: "media",
        cliente_id: "",
        fecha_inicio: fechaDefault,
        duracion_minutos: 30,
        recordar_antes_minutos: 15,
        notas: "",
      });
    }
  }, [evento, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cliente_id) {
      toast.error("Selecciona un cliente");
      return;
    }

    if (!formData.titulo.trim()) {
      toast.error("Ingresa un título para el evento");
      return;
    }

    if (!formData.fecha_inicio) {
      toast.error("Selecciona fecha y hora");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = new FormData();

      // Campos básicos
      payload.append("titulo", formData.titulo);
      payload.append("tipo", formData.tipo);
      payload.append("prioridad", formData.prioridad);
      payload.append("cliente_id", formData.cliente_id);
      payload.append("fecha_inicio", formData.fecha_inicio);
      payload.append("duracion_minutos", String(formData.duracion_minutos));
      payload.append("recordar_antes_minutos", String(formData.recordar_antes_minutos));
      payload.append("notas", formData.notas);

      // Valores por defecto para campos requeridos por el schema
      payload.append("notificar_email", "true");
      payload.append("notificar_push", "false");
      payload.append("todo_el_dia", "false");
      payload.append("es_recurrente", "false");
      payload.append("etiquetas", "[]");
      payload.append("color", "#3B82F6");

      const result = evento
        ? await actualizarEvento(evento.id, payload)
        : await crearEvento(payload);

      if (result?.success) {
        toast.success(result.message || "Evento guardado");
        onSuccess();
        onClose();
      } else {
        toast.error(result?.message || "No se pudo guardar el evento");
      }
    } catch (error) {
      console.error("Error al guardar evento:", error);
      toast.error("Error al procesar el evento");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-crm-text-primary">
              {evento ? "Editar evento" : "Nuevo evento"}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-crm-border rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-crm-text-muted" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Tipo de evento */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Tipo de evento
              </label>
              <div className="grid grid-cols-5 gap-2">
                {TIPOS_EVENTO.map((tipo) => (
                  <button
                    key={tipo.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, tipo: tipo.value }))}
                    className={`p-3 rounded-lg border-2 transition-all text-center ${
                      formData.tipo === tipo.value
                        ? "border-crm-primary bg-crm-primary/10"
                        : "border-crm-border hover:border-crm-primary/50"
                    }`}
                  >
                    <span className="text-xl block">{tipo.icon}</span>
                    <span className="text-xs text-crm-text-secondary">{tipo.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cliente */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                <UserIcon className="w-4 h-4 inline mr-1" />
                Cliente *
              </label>
              <ClienteSearch
                clientes={clientes}
                value={formData.cliente_id}
                onChange={(id) => setFormData(prev => ({ ...prev, cliente_id: id }))}
              />
              {clientes.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  Cargando clientes...
                </p>
              )}
            </div>

            {/* Título */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Título del evento *
              </label>
              <input
                type="text"
                value={formData.titulo}
                onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="Ej: Llamada de seguimiento, Visita al proyecto..."
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
                required
              />
            </div>

            {/* Fecha y Duración */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Fecha y hora *
                </label>
                <input
                  type="datetime-local"
                  value={formData.fecha_inicio}
                  onChange={(e) => setFormData(prev => ({ ...prev, fecha_inicio: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Duración
                </label>
                <select
                  value={formData.duracion_minutos}
                  onChange={(e) => setFormData(prev => ({ ...prev, duracion_minutos: Number(e.target.value) }))}
                  className="w-full px-3 py-2.5 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
                >
                  <option value={15}>15 minutos</option>
                  <option value={30}>30 minutos</option>
                  <option value={45}>45 minutos</option>
                  <option value={60}>1 hora</option>
                  <option value={90}>1 hora 30 min</option>
                  <option value={120}>2 horas</option>
                </select>
              </div>
            </div>

            {/* Prioridad y Recordatorio */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Prioridad
                </label>
                <select
                  value={formData.prioridad}
                  onChange={(e) => setFormData(prev => ({ ...prev, prioridad: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
                >
                  {PRIORIDADES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Recordatorio
                </label>
                <select
                  value={formData.recordar_antes_minutos}
                  onChange={(e) => setFormData(prev => ({ ...prev, recordar_antes_minutos: Number(e.target.value) }))}
                  className="w-full px-3 py-2.5 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
                >
                  {RECORDATORIOS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Notas / Observaciones
              </label>
              <textarea
                value={formData.notas}
                onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                placeholder="Registra aquí el objetivo, resultado o cualquier observación..."
                rows={3}
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary resize-none"
              />
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-crm-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-crm-text-secondary bg-crm-border hover:bg-crm-border-hover rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 text-sm font-medium text-white bg-crm-primary hover:bg-crm-primary-hover rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Guardando..." : evento ? "Actualizar" : "Crear evento"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
