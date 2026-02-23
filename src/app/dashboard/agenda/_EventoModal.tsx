"use client";

import { useState, useEffect, useRef } from "react";
import { Evento } from "@/lib/types/agenda";
import { crearEvento, actualizarEvento, buscarLotes } from "./actions";
import toast from "react-hot-toast";
import { XMarkIcon, UserIcon } from "@heroicons/react/24/outline";
import DateTimePicker from "@/components/ui/DateTimePicker";

interface EventoModalProps {
  evento?: Evento | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  fechaPreseleccionada?: string;
  clienteInicial?: { id: string; nombre: string };
}

const TIPOS_EVENTO = [
  { value: "llamada", label: "Llamada", icon: "📞" },
  { value: "visita", label: "Visita", icon: "🏠" },
  { value: "cita", label: "Cita", icon: "📅" },
  { value: "seguimiento", label: "Seguimiento", icon: "👥" },
  { value: "tarea", label: "Tarea", icon: "✅" },
];

const PRIORIDADES = [
  { value: "baja", label: "Baja", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
  { value: "media", label: "Media", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "alta", label: "Alta", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  { value: "urgente", label: "Urgente", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
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
  cliente_nombre: string;
  propiedad_id: string;
  propiedad_label: string;
  fecha_inicio: string;
  duracion_minutos: number;
  recordar_antes_minutos: number;
  notas: string;
  proximo_paso_objetivo: string;
  proximo_paso_fecha: string;
}

// Componente de búsqueda de clientes con búsqueda en servidor
function ClienteSearch({
  value,
  onChange,
  clienteInicial
}: {
  value: string;
  onChange: (id: string, nombre: string) => void;
  clienteInicial?: { id: string; nombre: string; telefono?: string };
}) {
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [resultados, setResultados] = useState<Array<{ id: string; nombre: string; telefono?: string }>>([]);
  const [buscando, setBuscando] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<{ id: string; nombre: string } | null>(
    clienteInicial ? { id: clienteInicial.id, nombre: clienteInicial.nombre } : null
  );
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Búsqueda en servidor con debounce
  useEffect(() => {
    if (!abierto) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (busqueda.trim().length < 2) {
      setResultados([]);
      return;
    }

    setBuscando(true);
    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/agenda/clientes?search=${encodeURIComponent(busqueda.trim())}`);
        const data = await res.json();
        setResultados(data.clientes || []);
      } catch (error) {
        console.error("Error buscando clientes:", error);
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [busqueda, abierto]);

  // Actualizar cliente seleccionado si viene de props
  useEffect(() => {
    if (clienteInicial && !clienteSeleccionado) {
      setClienteSeleccionado({ id: clienteInicial.id, nombre: clienteInicial.nombre });
    }
  }, [clienteInicial, clienteSeleccionado]);

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
        placeholder="Escribe para buscar cliente..."
        className="w-full px-3 py-2.5 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
      />
      {abierto && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setAbierto(false)}
          />
          <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-700 border border-crm-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {busqueda.trim().length < 2 ? (
              <div className="px-3 py-3 text-sm text-crm-text-muted text-center">
                Escribe al menos 2 caracteres para buscar
              </div>
            ) : buscando ? (
              <div className="px-3 py-3 text-sm text-crm-text-muted text-center">
                Buscando...
              </div>
            ) : resultados.length === 0 ? (
              <div className="px-3 py-3 text-sm text-crm-text-muted text-center">
                No se encontraron clientes
              </div>
            ) : (
              resultados.map((cliente) => (
                <button
                  key={cliente.id}
                  type="button"
                  onClick={() => {
                    onChange(cliente.id, cliente.nombre);
                    setClienteSeleccionado({ id: cliente.id, nombre: cliente.nombre });
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
          </div>
        </>
      )}
    </div>
  );
}

// Selector de lote con búsqueda
type LoteResultado = Awaited<ReturnType<typeof buscarLotes>>[number];

function LoteSearch({
  value,
  onChange,
  loteInicial,
}: {
  value: string;
  onChange: (id: string, label: string) => void;
  loteInicial?: { id: string; label: string };
}) {
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [resultados, setResultados] = useState<LoteResultado[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [loteSeleccionado, setLoteSeleccionado] = useState<{ id: string; label: string } | null>(
    loteInicial ?? null
  );
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!abierto) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!busqueda.trim()) { setResultados([]); return; }

    timeoutRef.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const data = await buscarLotes(busqueda);
        setResultados(data);
      } finally {
        setBuscando(false);
      }
    }, 300);
  }, [busqueda, abierto]);

  const seleccionar = (lote: LoteResultado) => {
    const label = `${lote.proyecto_nombre} — Lote ${lote.codigo}`;
    setLoteSeleccionado({ id: lote.id, label });
    onChange(lote.id, label);
    setBusqueda('');
    setAbierto(false);
  };

  const limpiar = () => {
    setLoteSeleccionado(null);
    onChange('', '');
    setBusqueda('');
  };

  return (
    <div className="relative">
      {loteSeleccionado ? (
        <div className="flex items-center gap-2 px-3 py-2.5 border border-crm-border rounded-lg bg-crm-bg-secondary">
          <span className="text-sm text-crm-text-primary flex-1 truncate">🏠 {loteSeleccionado.label}</span>
          <button type="button" onClick={limpiar} className="text-crm-text-muted hover:text-crm-text-primary text-xs">✕</button>
        </div>
      ) : (
        <input
          type="text"
          value={busqueda}
          onChange={(e) => { setBusqueda(e.target.value); setAbierto(true); }}
          onFocus={() => setAbierto(true)}
          onBlur={() => setTimeout(() => setAbierto(false), 200)}
          placeholder="Buscar por código de lote..."
          className="w-full px-3 py-2.5 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary text-sm"
        />
      )}

      {abierto && !loteSeleccionado && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-crm-border rounded-lg shadow-xl max-h-52 overflow-y-auto">
          {buscando ? (
            <p className="p-3 text-sm text-crm-text-muted text-center">Buscando...</p>
          ) : resultados.length === 0 ? (
            <p className="p-3 text-sm text-crm-text-muted text-center">
              {busqueda.length > 0 ? 'Sin resultados' : 'Escribe el código del lote'}
            </p>
          ) : (
            resultados.map((lote) => (
              <button
                key={lote.id}
                type="button"
                onMouseDown={() => seleccionar(lote)}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-crm-primary/10 transition-colors border-b border-crm-border/50 last:border-0"
              >
                <span className="font-medium text-crm-text-primary">{lote.proyecto_nombre}</span>
                <span className="text-crm-text-muted ml-1">— Lote {lote.codigo}</span>
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${lote.estado === 'disponible' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {lote.estado}
                </span>
                {lote.sup_m2 && (
                  <span className="ml-1 text-xs text-crm-text-muted">{lote.sup_m2} m²</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function EventoModal({ evento, isOpen, onClose, onSuccess, fechaPreseleccionada, clienteInicial }: EventoModalProps) {
  const [formData, setFormData] = useState<FormValues>({
    titulo: "",
    tipo: "llamada",
    prioridad: "media",
    cliente_id: "",
    cliente_nombre: "",
    propiedad_id: "",
    propiedad_label: "",
    fecha_inicio: "",
    duracion_minutos: 30,
    recordar_antes_minutos: 15,
    notas: "",
    proximo_paso_objetivo: "",
    proximo_paso_fecha: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form cuando se abre el modal
  useEffect(() => {
    if (!isOpen) return;

    if (evento) {
      const eventoAny = evento as any;
      const clienteNombre = eventoAny.cliente?.nombre || "";
      setFormData({
        titulo: evento.titulo,
        tipo: evento.tipo,
        prioridad: evento.prioridad,
        cliente_id: evento.cliente_id || "",
        cliente_nombre: clienteNombre,
        propiedad_id: evento.propiedad_id || "",
        propiedad_label: evento.propiedad_id ? `Lote ${evento.propiedad_id.slice(0, 8)}...` : "",
        fecha_inicio: evento.fecha_inicio?.slice(0, 16) || "",
        duracion_minutos: evento.duracion_minutos || 30,
        recordar_antes_minutos: evento.recordar_antes_minutos || 15,
        notas: evento.notas || "",
        proximo_paso_objetivo: (evento as any).proximo_paso_objetivo || "",
        proximo_paso_fecha: (evento as any).proximo_paso_fecha?.slice(0, 16) || "",
      });
    } else {
      // Valores por defecto para nuevo evento
      let fechaDefault: string;
      if (fechaPreseleccionada) {
        fechaDefault = fechaPreseleccionada;
      } else {
        const ahora = new Date();
        ahora.setMinutes(Math.ceil(ahora.getMinutes() / 15) * 15); // Redondear a 15 min
        fechaDefault = ahora.toISOString().slice(0, 16);
      }

      setFormData({
        titulo: "",
        tipo: "llamada",
        prioridad: "media",
        cliente_id: clienteInicial?.id || "",
        cliente_nombre: clienteInicial?.nombre || "",
        propiedad_id: "",
        propiedad_label: "",
        fecha_inicio: fechaDefault,
        duracion_minutos: 30,
        recordar_antes_minutos: 15,
        notas: "",
        proximo_paso_objetivo: "",
        proximo_paso_fecha: "",
      });
    }
  }, [evento, isOpen, fechaPreseleccionada, clienteInicial]);

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
      if (formData.propiedad_id) {
        payload.append("propiedad_id", formData.propiedad_id);
      }
      payload.append("fecha_inicio", formData.fecha_inicio);
      payload.append("duracion_minutos", String(formData.duracion_minutos));
      payload.append("recordar_antes_minutos", String(formData.recordar_antes_minutos));
      payload.append("notas", formData.notas);
      if (formData.proximo_paso_objetivo) {
        payload.append("proximo_paso_objetivo", formData.proximo_paso_objetivo);
      }
      if (formData.proximo_paso_fecha) {
        payload.append("proximo_paso_fecha", formData.proximo_paso_fecha);
      }

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
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header fijo */}
        <div className="flex items-center justify-between p-5 pb-4 border-b border-crm-border flex-shrink-0">
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

        {/* Contenido scrolleable */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-5 space-y-5 overflow-y-auto flex-1">
            {/* Tipo de evento */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Tipo de evento
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
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
                value={formData.cliente_id}
                onChange={(id, nombre) =>
                  setFormData(prev => ({ ...prev, cliente_id: id, cliente_nombre: nombre }))
                }
                clienteInicial={
                  formData.cliente_id && formData.cliente_nombre
                    ? { id: formData.cliente_id, nombre: formData.cliente_nombre }
                    : undefined
                }
              />
            </div>

            {/* Lote/Proyecto — solo para visitas */}
            {(formData.tipo === 'visita' || formData.tipo === 'cita') && (
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  🏠 Lote / Propiedad <span className="text-crm-text-muted font-normal">(opcional)</span>
                </label>
                <LoteSearch
                  value={formData.propiedad_id}
                  onChange={(id, label) =>
                    setFormData(prev => ({ ...prev, propiedad_id: id, propiedad_label: label }))
                  }
                  loteInicial={
                    formData.propiedad_id && formData.propiedad_label
                      ? { id: formData.propiedad_id, label: formData.propiedad_label }
                      : undefined
                  }
                />
              </div>
            )}

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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Fecha y hora *
                </label>
                <DateTimePicker
                  value={formData.fecha_inicio}
                  onChange={(value) => setFormData(prev => ({ ...prev, fecha_inicio: value }))}
                  placeholder="Seleccionar fecha y hora"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            {/* Próximo paso */}
            <div className="border border-crm-border rounded-lg p-4 space-y-3 bg-crm-bg-secondary/50">
              <p className="text-sm font-semibold text-crm-text-primary flex items-center gap-2">
                <span>➡️</span> Próximo paso
              </p>
              <div>
                <label className="block text-xs font-medium text-crm-text-muted mb-1.5">
                  ¿Qué acción se tomará?
                </label>
                <input
                  type="text"
                  value={formData.proximo_paso_objetivo}
                  onChange={(e) => setFormData(prev => ({ ...prev, proximo_paso_objetivo: e.target.value }))}
                  placeholder="Ej: Enviar propuesta, Agendar visita al proyecto..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-crm-text-muted mb-1.5">
                  Fecha límite del próximo paso
                </label>
                <DateTimePicker
                  value={formData.proximo_paso_fecha}
                  onChange={(value) => setFormData(prev => ({ ...prev, proximo_paso_fecha: value }))}
                  placeholder="Seleccionar fecha y hora"
                />
              </div>
            </div>
          </div>

          {/* Footer fijo con botones */}
          <div className="flex justify-end space-x-3 p-5 pt-4 border-t border-crm-border flex-shrink-0 bg-white dark:bg-slate-800 rounded-b-2xl">
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
  );
}
