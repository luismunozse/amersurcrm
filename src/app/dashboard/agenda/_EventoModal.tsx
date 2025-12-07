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
  oportunidades?: Array<{ id: string; cliente_nombre: string; etapa: string; label: string }>;
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

export default function EventoModal({ evento, isOpen, onClose, onSuccess, clientes = [], propiedades = [], oportunidades = [] }: EventoModalProps) {
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
  const [timelineCliente, setTimelineCliente] = useState<Array<{ id: string; titulo: string; tipo: string; fecha_inicio: string; estado: string }>>([]);
  const [cargandoTimeline, setCargandoTimeline] = useState(false);
  const [mostrarTimeline, setMostrarTimeline] = useState(false);
  const [conflictos, setConflictos] = useState<Array<{ id: string; titulo: string; fecha_inicio: string; fecha_fin?: string }>>([]);
  const [mostrarAdvertenciaConflicto, setMostrarAdvertenciaConflicto] = useState(false);
  const [templates, setTemplates] = useState<Array<{ id: string; nombre: string; config: Partial<FormValues> }>>([]);
  const [mostrarGuardarTemplate, setMostrarGuardarTemplate] = useState(false);
  const [nombreTemplate, setNombreTemplate] = useState('');

  const requiereProximoPaso = useMemo(() => estado === "completado" || estado === "cancelado", [estado]);

  // Cargar templates desde localStorage
  useEffect(() => {
    try {
      const savedTemplates = localStorage.getItem('evento_templates');
      if (savedTemplates) {
        setTemplates(JSON.parse(savedTemplates));
      }
    } catch (error) {
      console.error('Error cargando templates:', error);
    }
  }, []);

  // Guardar template
  const handleGuardarTemplate = () => {
    if (!nombreTemplate.trim()) {
      toast.error('Ingresa un nombre para el template');
      return;
    }

    const nuevoTemplate = {
      id: Date.now().toString(),
      nombre: nombreTemplate.trim(),
      config: {
        tipo: formData.tipo,
        prioridad: formData.prioridad,
        duracion_minutos: formData.duracion_minutos,
        todo_el_dia: formData.todo_el_dia,
        ubicacion: formData.ubicacion,
        recordar_antes_minutos: formData.recordar_antes_minutos,
        notificar_email: formData.notificar_email,
        notificar_push: formData.notificar_push,
        color: formData.color,
        etiquetas: formData.etiquetas,
        objetivo: formData.objetivo,
        recordatorio_canal: formData.recordatorio_canal,
      }
    };

    const nuevosTemplates = [...templates, nuevoTemplate];
    setTemplates(nuevosTemplates);
    localStorage.setItem('evento_templates', JSON.stringify(nuevosTemplates));
    toast.success(`Template "${nombreTemplate}" guardado`);
    setMostrarGuardarTemplate(false);
    setNombreTemplate('');
  };

  // Cargar template
  const handleCargarTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        ...template.config,
        titulo: '', // No copiar titulo ni fechas
        descripcion: '',
        fecha_inicio: '',
        fecha_fin: '',
        cliente_id: '',
        oportunidad_id: '',
        propiedad_id: '',
      }));
      toast.success(`Template "${template.nombre}" cargado`);
    }
  };

  // Eliminar template
  const handleEliminarTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template && confirm(`¿Eliminar template "${template.nombre}"?`)) {
      const nuevosTemplates = templates.filter(t => t.id !== templateId);
      setTemplates(nuevosTemplates);
      localStorage.setItem('evento_templates', JSON.stringify(nuevosTemplates));
      toast.success('Template eliminado');
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (evento) {
      const eventoAny = evento as any;

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
        oportunidad_id: eventoAny.oportunidad_id || "",
        propiedad_id: evento.propiedad_id || "",
        ubicacion: evento.ubicacion || "",
        direccion: evento.direccion || "",
        recordar_antes_minutos: evento.recordar_antes_minutos,
        notificar_email: evento.notificar_email,
        notificar_push: evento.notificar_push,
        objetivo: eventoAny.objetivo || "",
        resultado_id: eventoAny.resultado_id || "",
        resultado_notas: eventoAny.resultado_notas || "",
        proximo_paso_objetivo: eventoAny.proximo_paso_objetivo || "",
        proximo_paso_fecha: eventoAny.proximo_paso_fecha ? eventoAny.proximo_paso_fecha.slice(0, 16) : "",
        sla_tipo: eventoAny.sla_tipo || "",
        sla_vencimiento: eventoAny.sla_vencimiento ? eventoAny.sla_vencimiento.slice(0, 16) : "",
        recordatorio_canal: eventoAny.recordatorio_canal || "push",
        snooze_motivo_id: eventoAny.snooze_motivo_id || "",
        snooze_hasta: eventoAny.snooze_hasta ? eventoAny.snooze_hasta.slice(0, 16) : "",
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
      setTimelineCliente([]);
      setMostrarTimeline(false);
    }
  }, [evento, isOpen]);

  // Cargar timeline del cliente cuando se selecciona
  useEffect(() => {
    if (formData.cliente_id && isOpen) {
      setCargandoTimeline(true);
      fetch(`/api/agenda/eventos?cliente_id=${formData.cliente_id}&limit=5`)
        .then(r => r.json())
        .then(data => {
          setTimelineCliente(data.eventos || []);
        })
        .catch(error => {
          console.error('Error cargando timeline del cliente:', error);
        })
        .finally(() => setCargandoTimeline(false));
    } else {
      setTimelineCliente([]);
      setMostrarTimeline(false);
    }
  }, [formData.cliente_id, isOpen]);

  // Detectar conflictos de horarios
  useEffect(() => {
    if (!formData.fecha_inicio || !isOpen) {
      setConflictos([]);
      return;
    }

    const detectarConflictos = async () => {
      try {
        const fechaInicio = new Date(formData.fecha_inicio);
        const fechaFin = formData.fecha_fin
          ? new Date(formData.fecha_fin)
          : new Date(fechaInicio.getTime() + formData.duracion_minutos * 60000);

        // Obtener eventos del mismo día para verificar solapamientos
        const diaInicio = fechaInicio.toISOString().split('T')[0];
        const diaFin = fechaFin.toISOString().split('T')[0];

        const response = await fetch(`/api/agenda/eventos?inicio=${diaInicio}T00:00:00&fin=${diaFin}T23:59:59`);
        const data = await response.json();
        const eventosDelDia = data.eventos || [];

        // Filtrar eventos que se solapan
        const conflictosDetectados = eventosDelDia.filter((evt: any) => {
          // Excluir el evento actual si estamos editando
          if (evento && evt.id === evento.id) return false;

          const evtInicio = new Date(evt.fecha_inicio);
          const evtFin = evt.fecha_fin
            ? new Date(evt.fecha_fin)
            : new Date(evtInicio.getTime() + (evt.duracion_minutos || 60) * 60000);

          // Verificar solapamiento
          return (
            (fechaInicio >= evtInicio && fechaInicio < evtFin) || // inicio está dentro de otro evento
            (fechaFin > evtInicio && fechaFin <= evtFin) || // fin está dentro de otro evento
            (fechaInicio <= evtInicio && fechaFin >= evtFin) // envuelve completamente otro evento
          );
        });

        setConflictos(conflictosDetectados);
      } catch (error) {
        console.error('Error detectando conflictos:', error);
      }
    };

    const timeoutId = setTimeout(detectarConflictos, 500); // Debounce de 500ms
    return () => clearTimeout(timeoutId);
  }, [formData.fecha_inicio, formData.fecha_fin, formData.duracion_minutos, isOpen, evento]);

  const handleInputChange = (field: keyof FormValues, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Validar formato UUID
  const isValidUUID = (uuid: string): boolean => {
    if (!uuid) return true; // Campos opcionales están OK si están vacíos
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.oportunidad_id && !formData.cliente_id) {
      toast.error("Debes asociar la tarea a una oportunidad o a un cliente");
      return;
    }

    // Validar formato UUID de los IDs
    if (formData.cliente_id && !isValidUUID(formData.cliente_id)) {
      toast.error("El ID del cliente no tiene un formato válido");
      return;
    }

    if (formData.oportunidad_id && !isValidUUID(formData.oportunidad_id)) {
      toast.error("El ID de la oportunidad no tiene un formato válido");
      return;
    }

    if (formData.propiedad_id && !isValidUUID(formData.propiedad_id)) {
      toast.error("El ID de la propiedad no tiene un formato válido");
      return;
    }

    // Validar que la oportunidad seleccionada existe en la lista
    if (formData.oportunidad_id && oportunidades.length > 0) {
      const oportunidadExiste = oportunidades.some(op => op.id === formData.oportunidad_id);
      if (!oportunidadExiste) {
        toast.error("La oportunidad seleccionada no existe o no tienes acceso a ella");
        return;
      }
    }

    // Validar que la fecha de inicio no sea en el pasado (permitir hoy)
    if (formData.fecha_inicio) {
      const fechaInicio = new Date(formData.fecha_inicio);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      if (fechaInicio < hoy) {
        toast.error("No puedes crear un evento con fecha pasada. Selecciona hoy o una fecha futura.");
        return;
      }
    }

    // Advertir sobre conflictos de horarios
    if (conflictos.length > 0 && !mostrarAdvertenciaConflicto) {
      setMostrarAdvertenciaConflicto(true);
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

          {/* Templates Section */}
          {!evento && templates.length > 0 && (
            <div className="bg-crm-bg-secondary p-4 rounded-lg border border-crm-border">
              <h3 className="text-sm font-semibold text-crm-text-primary mb-3">Templates guardados</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-2 bg-white rounded border border-crm-border hover:shadow-sm transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => handleCargarTemplate(template.id)}
                      className="flex-1 text-left text-sm text-crm-text-primary hover:text-crm-primary transition-colors"
                    >
                      {template.nombre}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEliminarTemplate(template.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Eliminar template"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-crm-text-primary">Título *</label>
                <input
                  value={formData.titulo}
                  onChange={(e) => handleInputChange("titulo", e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                  placeholder="Ej: Llamada de calificación"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-crm-text-primary">Prioridad</label>
                <select
                  value={formData.prioridad}
                  onChange={(e) => handleInputChange("prioridad", e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
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
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
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
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
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
                className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
              />
            </section>

            {/* Color Picker y Etiquetas */}
            <section className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-crm-text-primary">Color del evento</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => handleInputChange("color", e.target.value)}
                    className="h-10 w-16 rounded cursor-pointer border border-crm-border"
                  />
                  <div className="flex-1 grid grid-cols-6 gap-1">
                    {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleInputChange("color", color)}
                        className={`h-7 w-full rounded border-2 transition-all ${
                          formData.color === color ? 'border-crm-text-primary scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-crm-text-primary">Etiquetas</label>
                <input
                  type="text"
                  value={formData.etiquetas.join(', ')}
                  onChange={(e) => {
                    const tags = e.target.value
                      .split(',')
                      .map(tag => tag.trim())
                      .filter(tag => tag.length > 0);
                    handleInputChange("etiquetas", tags);
                  }}
                  placeholder="Ej: urgente, cliente-vip, seguimiento"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                />
                <p className="text-xs text-crm-text-muted">Separa las etiquetas con comas</p>
                {formData.etiquetas.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.etiquetas.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-crm-primary/10 text-crm-primary rounded text-xs flex items-center space-x-1"
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newTags = formData.etiquetas.filter((_, i) => i !== index);
                            handleInputChange("etiquetas", newTags);
                          }}
                          className="hover:text-red-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-crm-text-primary">Inicio *</label>
                <input
                  type="datetime-local"
                  value={formData.fecha_inicio}
                  onChange={(e) => handleInputChange("fecha_inicio", e.target.value)}
                  className="crm-datetime-input"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-crm-text-primary">Fin</label>
                <input
                  type="datetime-local"
                  value={formData.fecha_fin}
                  onChange={(e) => handleInputChange("fecha_fin", e.target.value)}
                  className="crm-datetime-input"
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
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
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
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                >
                  <option value="">Seleccionar cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre}
                    </option>
                  ))}
                </select>

                {/* Timeline del cliente */}
                {formData.cliente_id && timelineCliente.length > 0 && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setMostrarTimeline(!mostrarTimeline)}
                      className="text-xs text-crm-primary hover:underline flex items-center space-x-1"
                    >
                      <span>{mostrarTimeline ? '▼' : '►'}</span>
                      <span>Ver historial ({timelineCliente.length} eventos)</span>
                    </button>
                    {mostrarTimeline && (
                      <div className="mt-2 space-y-1 bg-crm-bg-secondary p-2 rounded text-xs max-h-32 overflow-y-auto">
                        {timelineCliente.map((evt) => (
                          <div key={evt.id} className="flex items-center justify-between py-1 border-b border-crm-border last:border-0">
                            <div className="flex-1">
                              <span className="font-medium">{evt.titulo}</span>
                              <span className="text-crm-text-muted ml-2">({evt.tipo})</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-crm-text-muted">{new Date(evt.fecha_inicio).toLocaleDateString('es-PE')}</span>
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                evt.estado === 'completado' ? 'bg-green-100 text-green-800' :
                                evt.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {evt.estado}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {cargandoTimeline && (
                  <p className="text-xs text-crm-text-muted mt-1">Cargando historial...</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-crm-text-primary flex items-center space-x-2">
                  <ClipboardDocumentListIcon className="w-4 h-4" />
                  <span>Oportunidad</span>
                </label>
                <select
                  value={formData.oportunidad_id}
                  onChange={(e) => handleInputChange("oportunidad_id", e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                >
                  <option value="">Seleccionar oportunidad (opcional)</option>
                  {oportunidades.map((oportunidad) => (
                    <option key={oportunidad.id} value={oportunidad.id}>
                      {oportunidad.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-crm-text-muted">
                  {oportunidades.length === 0
                    ? "No tienes oportunidades abiertas. Selecciona un cliente."
                    : "Selecciona una oportunidad existente o deja vacío para cliente general."}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-crm-text-primary flex items-center space-x-2">
                  <HomeIcon className="w-4 h-4" />
                  <span>Propiedad / Lote</span>
                </label>
                <select
                  value={formData.propiedad_id}
                  onChange={(e) => handleInputChange("propiedad_id", e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
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
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
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
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
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
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-crm-text-primary">Próximo paso *</label>
                <input
                  value={formData.proximo_paso_objetivo}
                  onChange={(e) => handleInputChange("proximo_paso_objetivo", e.target.value)}
                  placeholder="Ej: Confirmar disponibilidad"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                  required={requiereProximoPaso}
                />
                <input
                  type="datetime-local"
                  value={formData.proximo_paso_fecha}
                  onChange={(e) => handleInputChange("proximo_paso_fecha", e.target.value)}
                  className="crm-datetime-input"
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
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                />
                <input
                  type="datetime-local"
                  value={formData.sla_vencimiento}
                  onChange={(e) => handleInputChange("sla_vencimiento", e.target.value)}
                  className="crm-datetime-input"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-crm-text-primary">Recordatorio</label>
                <select
                  value={formData.recordatorio_canal}
                  onChange={(e) => handleInputChange("recordatorio_canal", e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
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
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                />
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-crm-text-primary">Estado</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
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
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-crm-text-primary">Snooze hasta</label>
                  <input
                    type="datetime-local"
                    value={formData.snooze_hasta}
                    onChange={(e) => handleInputChange("snooze_hasta", e.target.value)}
                    className="crm-datetime-input"
                  />
                </div>
              </div>
            </section>

            {/* Advertencia de conflictos */}
            {conflictos.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-yellow-800 mb-2">
                      Conflicto de horarios detectado ({conflictos.length})
                    </h4>
                    <p className="text-sm text-yellow-700 mb-2">
                      Este evento se solapa con {conflictos.length === 1 ? 'otro evento' : `${conflictos.length} eventos`} en tu agenda:
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {conflictos.map((conflicto) => (
                        <div key={conflicto.id} className="text-xs bg-white rounded p-2 border border-yellow-100">
                          <p className="font-medium text-crm-text-primary">{conflicto.titulo}</p>
                          <p className="text-crm-text-muted">
                            {new Date(conflicto.fecha_inicio).toLocaleString('es-PE', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                            {conflicto.fecha_fin && ` - ${new Date(conflicto.fecha_fin).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`}
                          </p>
                        </div>
                      ))}
                    </div>
                    {mostrarAdvertenciaConflicto && (
                      <div className="mt-3 flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setMostrarAdvertenciaConflicto(false);
                            setConflictos([]);
                          }}
                          className="text-xs px-3 py-1 bg-white hover:bg-gray-50 text-yellow-800 border border-yellow-300 rounded transition-colors"
                        >
                          Cambiar horario
                        </button>
                        <p className="text-xs text-yellow-700">o continúa para guardar de todas formas</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-6 border-t border-crm-border">
              {!evento && (
                <button
                  type="button"
                  onClick={() => setMostrarGuardarTemplate(true)}
                  className="px-3 py-2 text-xs font-medium text-crm-primary bg-crm-primary/10 hover:bg-crm-primary/20 rounded-lg transition-colors flex items-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <span>Guardar como template</span>
                </button>
              )}
              <div className="flex space-x-3 ml-auto">
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
            </div>
          </form>
        </div>
      </div>

      {/* Modal para guardar template */}
      {mostrarGuardarTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-bold text-crm-text-primary">Guardar como template</h3>
              <p className="text-sm text-crm-text-secondary">
                Guarda la configuración actual (tipo, prioridad, duración, etc.) para reutilizarla después.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium text-crm-text-primary">Nombre del template *</label>
                <input
                  type="text"
                  value={nombreTemplate}
                  onChange={(e) => setNombreTemplate(e.target.value)}
                  placeholder="Ej: Llamada de seguimiento, Visita a propiedad..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleGuardarTemplate();
                    }
                  }}
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-crm-border">
                <button
                  type="button"
                  onClick={() => {
                    setMostrarGuardarTemplate(false);
                    setNombreTemplate('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-crm-text-secondary bg-crm-border hover:bg-crm-border-hover rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleGuardarTemplate}
                  className="px-4 py-2 text-sm font-medium text-white bg-crm-primary hover:bg-crm-primary-hover rounded-lg transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
