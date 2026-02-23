"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  format,
  isToday,
  isTomorrow,
  isPast,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
} from "date-fns";
import { es } from "date-fns/locale";
import toast from "react-hot-toast";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { marcarRecordatorioCompletado, eliminarRecordatorio } from "@/app/dashboard/agenda/actions";
import RecordatorioModal from "@/app/dashboard/agenda/_RecordatorioModal";

type TipoRecordatorio =
  | "seguimiento_cliente"
  | "llamada_prospecto"
  | "envio_documentos"
  | "visita_propiedad"
  | "reunion_equipo"
  | "personalizado";

type Prioridad = "baja" | "media" | "alta" | "urgente";

interface Recordatorio {
  id: string;
  titulo: string;
  descripcion?: string;
  tipo: TipoRecordatorio;
  prioridad: Prioridad;
  fecha_recordatorio: string;
  completado: boolean;
  leido: boolean;
  cliente_id?: string;
  cliente_nombre?: string;
  cliente_telefono?: string;
  notas?: string;
}

const TIPOS: Record<TipoRecordatorio, { label: string; icon: string; color: string }> = {
  seguimiento_cliente: {
    label: "Seguimiento",
    icon: "👤",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  },
  llamada_prospecto: {
    label: "Llamada",
    icon: "📞",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  },
  envio_documentos: {
    label: "Documentos",
    icon: "📄",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  },
  visita_propiedad: {
    label: "Visita",
    icon: "🏠",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  },
  reunion_equipo: {
    label: "Reunión",
    icon: "👥",
    color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  },
  personalizado: {
    label: "Personalizado",
    icon: "✏️",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300",
  },
};

const PRIORIDADES: Record<Prioridad, { label: string; color: string; bg: string }> = {
  baja: {
    label: "Baja",
    color: "text-gray-600 dark:text-gray-400",
    bg: "bg-gray-100 dark:bg-gray-800",
  },
  media: {
    label: "Media",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  alta: {
    label: "Alta",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-100 dark:bg-orange-900/30",
  },
  urgente: {
    label: "Urgente",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30",
  },
};

function obtenerTiempoRestante(fecha: string): string {
  const ahora = new Date();
  const f = new Date(fecha);

  if (isPast(f)) return "Vencido";

  const minutos = differenceInMinutes(f, ahora);
  const horas = differenceInHours(f, ahora);
  const dias = differenceInDays(f, ahora);

  if (minutos < 60) return `En ${minutos} min`;
  if (horas < 24) return `En ${horas}h`;
  if (dias === 1) return "Mañana";
  return `En ${dias} días`;
}

function obtenerUrgencia(fecha: string): "inminente" | "proximo" | "futuro" | "pasado" {
  const ahora = new Date();
  const f = new Date(fecha);

  if (isPast(f)) return "pasado";
  const minutos = differenceInMinutes(f, ahora);
  if (minutos <= 60) return "inminente";
  if (minutos <= 24 * 60) return "proximo";
  return "futuro";
}

export default function RecordatoriosPanel() {
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todos" | "hoy" | "inminentes" | "completados">("todos");
  const [mostrarModal, setMostrarModal] = useState(false);
  const supabase = useMemo(() => supabaseBrowser(), []);

  const cargarRecordatorios = useCallback(async () => {
    try {
      setCargando(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setRecordatorios([]);
        return;
      }

      // Últimos 7 días + próximos 30 días
      const fechaInicio = new Date();
      fechaInicio.setDate(fechaInicio.getDate() - 7);
      const fechaFin = new Date();
      fechaFin.setDate(fechaFin.getDate() + 30);

      const { data, error } = await supabase
        .schema("crm")
        .from("recordatorio")
        .select(`
          id,
          titulo,
          descripcion,
          tipo,
          prioridad,
          fecha_recordatorio,
          completado,
          leido,
          cliente_id,
          notas,
          cliente:cliente_id (id, nombre, telefono)
        `)
        .eq("vendedor_id", user.id)
        .gte("fecha_recordatorio", fechaInicio.toISOString())
        .lte("fecha_recordatorio", fechaFin.toISOString())
        .order("fecha_recordatorio", { ascending: true });

      if (error) {
        console.error("Error cargando recordatorios:", error);
        throw error;
      }

      const normalizados: Recordatorio[] = (data ?? []).map((item: any) => ({
        id: item.id,
        titulo: item.titulo,
        descripcion: item.descripcion ?? undefined,
        tipo: (item.tipo ?? "personalizado") as TipoRecordatorio,
        prioridad: (item.prioridad ?? "media") as Prioridad,
        fecha_recordatorio: item.fecha_recordatorio,
        completado: item.completado ?? false,
        leido: item.leido ?? false,
        cliente_id: item.cliente_id ?? undefined,
        cliente_nombre: item.cliente?.nombre ?? undefined,
        cliente_telefono: item.cliente?.telefono ?? undefined,
        notas: item.notas ?? undefined,
      }));

      setRecordatorios(normalizados);
    } catch {
      toast.error("Error cargando recordatorios");
    } finally {
      setCargando(false);
    }
  }, [supabase]);

  useEffect(() => {
    cargarRecordatorios();
    const interval = setInterval(cargarRecordatorios, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [cargarRecordatorios]);

  const handleCompletar = async (id: string) => {
    if (procesando) return;
    setProcesando(id);
    try {
      const formData = new FormData();
      formData.append("id", id);
      const result = await marcarRecordatorioCompletado(id);
      if (result.success) {
        toast.success("Recordatorio completado");
        setRecordatorios((prev) =>
          prev.map((r) => (r.id === id ? { ...r, completado: true, leido: true } : r))
        );
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Error al completar recordatorio");
    } finally {
      setProcesando(null);
    }
  };

  const handleEliminar = async (id: string) => {
    if (procesando) return;
    setProcesando(id);
    try {
      const result = await eliminarRecordatorio(id);
      if (result.success) {
        toast.success("Recordatorio eliminado");
        setRecordatorios((prev) => prev.filter((r) => r.id !== id));
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Error al eliminar recordatorio");
    } finally {
      setProcesando(null);
    }
  };

  const llamarCliente = (telefono: string) => {
    window.open(`tel:${telefono}`, "_self");
  };

  const enviarWhatsApp = (telefono: string, titulo: string) => {
    const limpio = telefono.replace(/\D/g, "");
    const msg = encodeURIComponent(`Hola, te contacto sobre: ${titulo}`);
    window.open(`https://wa.me/${limpio}?text=${msg}`, "_blank");
  };

  const recordatoriosFiltrados = useMemo(() => {
    return recordatorios.filter((r) => {
      switch (filtro) {
        case "hoy":
          return isToday(new Date(r.fecha_recordatorio));
        case "inminentes": {
          const urgencia = obtenerUrgencia(r.fecha_recordatorio);
          return !r.completado && (urgencia === "inminente" || urgencia === "proximo");
        }
        case "completados":
          return r.completado;
        default:
          return true;
      }
    });
  }, [recordatorios, filtro]);

  const estadisticas = useMemo(() => {
    const pendientes = recordatorios.filter((r) => !r.completado);
    return {
      total: recordatorios.length,
      hoy: pendientes.filter((r) => isToday(new Date(r.fecha_recordatorio))).length,
      inminentes: pendientes.filter((r) => obtenerUrgencia(r.fecha_recordatorio) === "inminente").length,
      manana: pendientes.filter((r) => isTomorrow(new Date(r.fecha_recordatorio))).length,
    };
  }, [recordatorios]);

  if (cargando) {
    return (
      <div className="crm-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-crm-border rounded w-48" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-crm-border rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con botón crear */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-crm-text-primary">Mis recordatorios</h2>
        <button
          onClick={() => setMostrarModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nuevo recordatorio
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="crm-card p-4 text-center">
          <div className="text-2xl font-bold text-crm-text-primary">{estadisticas.total}</div>
          <div className="text-sm text-crm-text-muted">Total (30 días)</div>
        </div>
        <div className="crm-card p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{estadisticas.hoy}</div>
          <div className="text-sm text-crm-text-muted">Hoy</div>
        </div>
        <div className="crm-card p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{estadisticas.inminentes}</div>
          <div className="text-sm text-crm-text-muted">Inminentes</div>
        </div>
        <div className="crm-card p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{estadisticas.manana}</div>
          <div className="text-sm text-crm-text-muted">Mañana</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="crm-card p-3">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "todos", label: "Todos", icon: "📋" },
            { key: "hoy", label: "Hoy", icon: "📅" },
            { key: "inminentes", label: "Inminentes", icon: "🔔" },
            { key: "completados", label: "Completados", icon: "✅" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key as typeof filtro)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filtro === f.key
                  ? "bg-crm-primary text-white shadow-md"
                  : "bg-crm-border text-crm-text-muted hover:bg-crm-sidebar-hover hover:text-white"
              }`}
            >
              <span className="mr-1">{f.icon}</span>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {recordatoriosFiltrados.length === 0 ? (
          <div className="crm-card p-8 text-center">
            <div className="text-crm-text-muted">
              <svg
                className="w-12 h-12 mx-auto mb-4 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
              <p className="text-base font-medium">No hay recordatorios</p>
              <p className="text-sm mt-1">
                {filtro === "completados"
                  ? "Aún no has completado ningún recordatorio"
                  : "Los recordatorios aparecerán aquí cuando los crees"}
              </p>
            </div>
          </div>
        ) : (
          recordatoriosFiltrados.map((rec) => {
            const tipoInfo = TIPOS[rec.tipo] ?? TIPOS.personalizado;
            const prioridadInfo = PRIORIDADES[rec.prioridad] ?? PRIORIDADES.media;
            const urgencia = obtenerUrgencia(rec.fecha_recordatorio);
            const tiempoRestante = obtenerTiempoRestante(rec.fecha_recordatorio);
            const esProcesando = procesando === rec.id;

            const urgenciaClasses = {
              inminente: "border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-900/10",
              proximo: "border-l-4 border-l-orange-500 bg-orange-50/50 dark:bg-orange-900/10",
              futuro: "border-l-4 border-l-blue-500",
              pasado: "border-l-4 border-l-gray-400 opacity-60",
            };

            return (
              <div
                key={rec.id}
                className={`crm-card p-4 transition-all hover:shadow-lg ${
                  rec.completado ? "opacity-60" : urgenciaClasses[urgencia]
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xl">{tipoInfo.icon}</span>
                      <h3
                        className={`font-semibold text-crm-text-primary truncate ${
                          rec.completado ? "line-through" : ""
                        }`}
                      >
                        {rec.titulo}
                      </h3>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${tipoInfo.color}`}
                      >
                        {tipoInfo.label}
                      </span>
                      {rec.completado && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                          Completado
                        </span>
                      )}
                    </div>

                    {rec.descripcion && (
                      <p className="text-sm text-crm-text-secondary mb-2 line-clamp-2">
                        {rec.descripcion}
                      </p>
                    )}

                    {/* Metadatos */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-crm-text-muted">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="font-medium">
                          {format(new Date(rec.fecha_recordatorio), "dd/MM HH:mm", { locale: es })}
                        </span>
                      </div>

                      {!rec.completado && (
                        <span
                          className={`px-2 py-0.5 rounded-full font-medium ${
                            urgencia === "inminente"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                              : urgencia === "proximo"
                              ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                              : urgencia === "pasado"
                              ? "bg-gray-100 text-gray-600"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          }`}
                        >
                          {tiempoRestante}
                        </span>
                      )}

                      {rec.cliente_nombre && (
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                          <span>{rec.cliente_nombre}</span>
                        </div>
                      )}

                      <span className={`px-2 py-0.5 rounded-full ${prioridadInfo.bg} ${prioridadInfo.color}`}>
                        {prioridadInfo.label}
                      </span>
                    </div>

                    {rec.notas && (
                      <p className="mt-2 text-xs text-crm-text-muted italic line-clamp-1">
                        {rec.notas}
                      </p>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {rec.cliente_telefono && !rec.completado && (
                      <>
                        <button
                          onClick={() => llamarCliente(rec.cliente_telefono!)}
                          className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition"
                          title="Llamar"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => enviarWhatsApp(rec.cliente_telefono!, rec.titulo)}
                          className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition"
                          title="WhatsApp"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                        </button>
                      </>
                    )}

                    {!rec.completado && (
                      <button
                        onClick={() => handleCompletar(rec.id)}
                        disabled={esProcesando}
                        className="p-2 text-crm-primary hover:bg-crm-primary/10 rounded-lg transition disabled:opacity-50"
                        title="Marcar completado"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </button>
                    )}

                    <button
                      onClick={() => handleEliminar(rec.id)}
                      disabled={esProcesando}
                      className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition disabled:opacity-50"
                      title="Eliminar"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {recordatorios.length > 0 && (
        <div className="text-center text-sm text-crm-text-muted">
          <p>Se actualizan automáticamente cada 5 minutos</p>
        </div>
      )}

      <RecordatorioModal
        isOpen={mostrarModal}
        onClose={() => setMostrarModal(false)}
        onSuccess={() => {
          setMostrarModal(false);
          cargarRecordatorios();
        }}
      />
    </div>
  );
}
