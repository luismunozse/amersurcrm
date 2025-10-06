"use client";

import { useState, useEffect, useMemo } from "react";
import { Evento } from "@/lib/types/agenda";
import { crearEvento, actualizarEvento } from "./actions";
import toast from "react-hot-toast";
import {
  XMarkIcon,
  UserIcon,
  HomeIcon,
  MapPinIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";

interface EventoModalProps {
  evento?: Evento | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientes?: Array<{ id: string; nombre: string; telefono?: string; email?: string }>;
  propiedades?: Array<{ id: string; identificacion_interna: string; tipo: string }>;
}

const TIPOS_EVENTO_OPTIONS = [
  { value: "cita", label: "Cita", icon: "📅" },
  { value: "llamada", label: "Llamada", icon: "📞" },
  { value: "email", label: "Email", icon: "📧" },
  { value: "visita", label: "Visita", icon: "🏠" },
  { value: "seguimiento", label: "Seguimiento", icon: "👥" },
  { value: "recordatorio", label: "Recordatorio", icon: "⏰" },
  { value: "tarea", label: "Tarea", icon: "✅" },
];

const PRIORIDADES_OPTIONS = [
  { value: "baja", label: "Baja" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

const RESULTADOS_BASE = [
  { value: "contactado", label: "Contactado" },
  { value: "no_contactado", label: "No contactado" },
  { value: "visita_agendada", label: "Visita agendada" },
  { value: "visita_no_show", label: "No asistió a la visita" },
  { value: "propuesta_enviada", label: "Propuesta enviada" },
  { value: "propuesta_rechazada", label: "Propuesta rechazada" },
  { value: "venta_cerrada", label: "Venta cerrada" },
];

const ESTADOS_EVENTO = [
  { value: "pendiente", label: "Pendiente" },
  { value: "en_progreso", label: "En progreso" },
  { value: "vencida", label: "Vencida" },
  { value: "reprogramado", label: "Reprogramada" },
  { value: "completado", label: "Completada" },
  { value: "cancelado", label: "Cancelada" },
];

interface FormValues {
  titulo: string;
  descripcion: string;
  tipo: string;
  prioridad: string;
  fecha_inicio: string;
  fecha_fin: string;
  duracion_minutos: number;
  todo_el_dia: boolean;
  cliente_id: string;
  oportunidad_id: string;
  propiedad_id: string;
  ubicacion: string;
  direccion: string;
  recordar_antes_minutos: number;
  notificar_email: boolean;
  notificar_push: boolean;
  objetivo: string;
  resultado_id: string;
  resultado_notas: string;
  proximo_paso_objetivo: string;
  proximo_paso_fecha: string;
  sla_tipo: string;
  sla_vencimiento: string;
  recordatorio_canal: string;
  snooze_motivo_id: string;
  snooze_hasta: string;
  color: string;
  notas: string;
  etiquetas: string[];
}

export default function EventoModal({ evento, isOpen, onClose, onSuccess, clientes = [], propiedades = [] }: EventoModalProps) {
  const [formData, setFormData] = useState<FormValues>({
    titulo: "",
    descripcion: "",
    tipo: "cita",
    prioridad: "media",
    fecha_inicio: "",
    fecha_fin: "",
    duracion_minutos: 60,
    todo_el_dia: false,
    cliente_id: "",
    oportunidad_id: "",
    propiedad_id: "",
    ubicacion: "",
    direccion: "",
    recordar_antes_minutos: 15,
    notificar_email: true,
    notificar_push: false,
    objetivo: "",
    resultado_id: "",
    resultado_notas: "",
    proximo_paso_objetivo: "",
    proximo_paso_fecha: "",
    sla_tipo: "",
    sla_vencimiento: "",
    recordatorio_canal: "push",
    snooze_motivo_id: "",
    snooze_hasta: "",
    color: "#3B82F6",
    notas: "",
    etiquetas: [],
  });
  const [estado, setEstado] = useState<string>("pendiente");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requiereProximoPaso = useMemo(() => estado === "completado" || estado === "cancelado", [estado]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (evento) {
      setFormData({
        titulo: evento.titulo,
        descripcion: evento.descripcion || "",
        tipo: evento.tipo,
        prioridad: evento.prioridad,
        fecha_inicio: evento.fecha_inicio?.slice(0, 16) || "",
        fecha_fin: evento.fecha_fin?.slice(0, 16) || "",
        duracion_minutos: evento.duracion_minutos,
        todo_el_dia: evento.todo_el_dia,
        cliente_id: evento.cliente_id || "",
        oportunidad_id: evento.oportunidad_id || "",
        propiedad_id: evento.propiedad_id || "",
        ubicacion: evento.ubicacion || "",
        direccion: evento.direccion || "",
        recordar_antes_minutos: evento.recordar_antes_minutos,
        notificar_email: evento.notificar_email,
        notificar_push: evento.notificar_push,
        objetivo: evento.objetivo || "",
        resultado_id: evento.resultado_id || "",
        resultado_notas: evento.resultado_notas || "",
        proximo_paso_objetivo: evento.proximo_paso_objetivo || "",
        proximo_paso_fecha: evento.proximo_paso_fecha ? evento.proximo_paso_fecha.slice(0, 16) : "",
        sla_tipo: evento.sla_tipo || "",
        sla_vencimiento: evento.sla_vencimiento ? evento.sla_vencimiento.slice(0, 16) : "",
        recordatorio_canal: evento.recordatorio_canal || "push",
        snooze_motivo_id: evento.snooze_motivo_id || "",
        snooze_hasta: evento.snooze_hasta ? evento.snooze_hasta.slice(0, 16) : "",
        color: evento.color,
        notas: evento.notas || "",
        etiquetas: evento.etiquetas || [],
      });
      setEstado(evento.estado);
    } else {
      setFormData((prev) => ({
        ...prev,
        titulo: "",
        descripcion: "",
        tipo: "cita",
        prioridad: "media",
        fecha_inicio: "",
        fecha_fin: "",
        duracion_minutos: 60,
        todo_el_dia: false,
        cliente_id: "",
        oportunidad_id: "",
        propiedad_id: "",
        ubicacion: "",
        direccion: "",
        recordar_antes_minutos: 15,
        notificar_email: true,
        notificar_push: false,
        objetivo: "",
        resultado_id: "",
        resultado_notas: "",
        proximo_paso_objetivo: "",
        proximo_paso_fecha: "",
        sla_tipo: "",
        sla_vencimiento: "",
        recordatorio_canal: "push",
        snooze_motivo_id: "",
        snooze_hasta: "",
        color: "#3B82F6",
        notas: "",
        etiquetas: [],
      }));
      setEstado("pendiente");
    }
  }, [evento, isOpen]);

  const handleInputChange = (field: keyof FormValues, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.oportunidad_id && !formData.cliente_id) {
      toast.error("Debes asociar la tarea a una oportunidad o a un cliente");
      return;
    }

    if (requiereProximoPaso && (!formData.proximo_paso_objetivo || !formData.proximo_paso_fecha)) {
      toast.error("Define objetivo y fecha del próximo paso antes de cerrar la tarea");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        if (Array.isArray(value) || typeof value === "object") {
          payload.append(key, JSON.stringify(value));
        } else {
          payload.append(key, String(value));
        }
      });
      payload.append("estado", estado);

      const result = evento ? await actualizarEvento(evento.id, payload) : await crearEvento(payload);

      if (result?.success) {
        toast.success(result.message || "Tarea guardada");
        onSuccess();
        onClose();
      } else {
        toast.error(result?.message || "No se pudo guardar la tarea");
      }
    } catch (error) {
      console.error("Error submit evento", error);
      toast.error("Error al procesar la tarea");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-crm-text-primary">
                {evento ? "Editar tarea" : "Nueva tarea"}
              </h2>
              <p className="text-sm text-crm-text-secondary">Disciplina comercial: cada paso deja trazabilidad</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-crm-border rounded-lg transition-colors">
              <XMarkIcon className="w-6 h-6 text-crm-text-muted" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-crm-text-primary">Título *</label>
                <input
                  value={formData.titulo}
                  onChange={(e) => handleInputChange("titulo", e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                  placeholder="Ej: Llamada de calificación"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-crm-text-primary">Prioridad</label>
                <select
                  value={formData.prioridad}
                  onChange={(e) => handleInputChange("prioridad", e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                >
                  {PRIORIDADES_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-crm-text-primary">Tipo *</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => handleInputChange("tipo", e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                  required
                >
                  {TIPOS_EVENTO_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.icon} {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-crm-text-primary">Objetivo *</label>
                <input
                  value={formData.objetivo}
                  onChange={(e) => handleInputChange("objetivo", e.target.value)}
                  placeholder="¿Qué debe lograrse en esta tarea?"
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                  required
                />
              </div>
            </section>

            <section className="space-y-2">
              <label className="text-sm font-medium text-crm-text-primary">Descripción</label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => handleInputChange("descripcion", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
              />
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-crm-text-primary">Inicio *</label>
                <input
                  type="datetime-local"
                  value={formData.fecha_inicio}
                  onChange={(e) => handleInputChange("fecha_inicio", e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-crm-text-primary">Fin</label>
                <input
                  type="datetime-local"
                  value={formData.fecha_fin}
                  onChange={(e) => handleInputChange("fecha_fin", e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-crm-text-primary">Duración (min)</label>
                <input
                  type="number"
                  min={5}
                  max={1440}
                  value={formData.duracion_minutos}
                  onChange={(e) => handleInputChange("duracion_minutos", Number(e.target.value))}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                />
              </div>
              <div className="flex items-center space-x-3 pt-6">
                <label className="flex items-center space-x-2 text-sm text-crm-text-primary">
                  <input
                    type="checkbox"
                    checked={formData.todo_el_dia}
                    onChange={(e) => handleInputChange("todo_el_dia", e.target.checked)}
                  />
                  <span>Tarea de todo el día</span>
                </label>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-crm-text-primary flex items-center space-x-2">
                  <UserIcon className="w-4 h-4" />
                  <span>Cliente</span>
                </label>
                <select
                  value={formData.cliente_id}
                  onChange={(e) => handleInputChange("cliente_id", e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                >
                  <option value="">Seleccionar cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-crm-text-primary flex items-center space-x-2">
                  <ClipboardDocumentListIcon className="w-4 h-4" />
                  <span>Oportunidad (UUID)</span>
                </label>
                <input
                  value={formData.oportunidad_id}
                  onChange={(e) => handleInputChange("oportunidad_id", e.target.value)}
                  placeholder="Pegá aquí el ID de la oportunidad"
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                />
                <p className="text-xs text-crm-text-muted">Si no existe oportunidad, deja vacío y selecciona cliente.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-crm-text-primary flex items-center space-x-2">
                  <HomeIcon className="w-4 h-4" />
                  <span>Propiedad / Lote</span>
                </label>
                <select
                  value={formData.propiedad_id}
                  onChange={(e) => handleInputChange("propiedad_id", e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                >
                  <option value="">Seleccionar</option>
                  {propiedades.map((propiedad) => (
                    <option key={propiedad.id} value={propiedad.id}>
                      {propiedad.identificacion_interna} - {propiedad.tipo}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-crm-text-primary flex items-center space-x-2">
                  <MapPinIcon className="w-4 h-4" />
                  <span>Ubicación</span>
                </label>
                <input
                  value={formData.ubicacion}
                  onChange={(e) => handleInputChange("ubicacion", e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                  placeholder="Sala comercial, oficina, virtual..."
                />
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-crm-text-primary">Resultado</label>
                <select
                  value={formData.resultado_id}
                  onChange={(e) => handleInputChange("resultado_id", e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                >
                  <option value="">Selecciona el resultado</option>
                  {RESULTADOS_BASE.map((resultado) => (
                    <option key={resultado.value} value={resultado.value}>
                      {resultado.label}
                    </option>
                  ))}
                </select>
                <textarea
                  value={formData.resultado_notas}
                  onChange={(e) => handleInputChange("resultado_notas", e.target.value)}
                  placeholder="Notas del resultado"
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-crm-text-primary">Próximo paso *</label>
                <input
                  value={formData.proximo_paso_objetivo}
                  onChange={(e) => handleInputChange("proximo_paso_objetivo", e.target.value)}
                  placeholder="Ej: Confirmar disponibilidad"
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                  required={requiereProximoPaso}
                />
                <input
                  type="datetime-local"
                  value={formData.proximo_paso_fecha}
                  onChange={(e) => handleInputChange("proximo_paso_fecha", e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                  required={requiereProximoPaso}
                />
                {requiereProximoPaso && (
                  <p className="text-xs text-crm-text-muted">Necesario para cerrar la tarea dejando trazabilidad.</p>
                )}
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-crm-text-primary">SLA</label>
                <input
                  value={formData.sla_tipo}
                  onChange={(e) => handleInputChange("sla_tipo", e.target.value)}
                  placeholder="Ej: primer_contacto"
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                />
                <input
                  type="datetime-local"
                  value={formData.sla_vencimiento}
                  onChange={(e) => handleInputChange("sla_vencimiento", e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-crm-text-primary">Recordatorio</label>
                <select
                  value={formData.recordatorio_canal}
                  onChange={(e) => handleInputChange("recordatorio_canal", e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                >
                  <option value="push">Notificación push</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-crm-text-primary">Recordar antes (min)</label>
                <input
                  type="number"
                  min={0}
                  max={10080}
                  value={formData.recordar_antes_minutos}
                  onChange={(e) => handleInputChange("recordar_antes_minutos", Number(e.target.value))}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                />
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-crm-text-primary">Estado</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                >
                  {ESTADOS_EVENTO.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-crm-text-primary">Motivo de snooze</label>
                  <input
                    value={formData.snooze_motivo_id}
                    onChange={(e) => handleInputChange("snooze_motivo_id", e.target.value)}
                    className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-crm-text-primary">Snooze hasta</label>
                  <input
                    type="datetime-local"
                    value={formData.snooze_hasta}
                    onChange={(e) => handleInputChange("snooze_hasta", e.target.value)}
                    className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                  />
                </div>
              </div>
            </section>

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
                {isSubmitting ? "Guardando..." : evento ? "Actualizar" : "Crear"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
