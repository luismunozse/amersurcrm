"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { format, isToday, isTomorrow, isYesterday } from "date-fns";
import { es } from "date-fns/locale";
import toast from "react-hot-toast";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Prioridad = "baja" | "media" | "alta" | "urgente";
type TipoRecordatorioKey =
  | "seguimiento_cliente"
  | "llamada_prospecto"
  | "envio_documentos"
  | "visita_propiedad"
  | "reunion_equipo"
  | "personalizado";

interface RecordatorioQuery {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: string;
  prioridad: Prioridad | null;
  fecha_recordatorio: string;
  fecha_completado: string | null;
  completado: boolean | null;
  leido: boolean | null;
  notificar_email: boolean | null;
  notificar_push: boolean | null;
  created_at: string;
  cliente: { id: string; nombre: string | null } | null;
  propiedad: { id: string; identificacion_interna: string | null; tipo: string | null } | null;
}

interface Recordatorio {
  id: string;
  titulo: string;
  descripcion?: string;
  tipo: TipoRecordatorioKey;
  prioridad: Prioridad;
  fecha_recordatorio: string;
  cliente_nombre?: string;
  propiedad_nombre?: string;
  completado: boolean;
  leido: boolean;
  notificar_email: boolean;
  notificar_push: boolean;
  created_at: string;
  fecha_completado?: string | null;
}

const TIPOS_RECORDATORIO: Record<TipoRecordatorioKey, { label: string; icon: string; color: string }> = {
  seguimiento_cliente: { label: "Seguimiento Cliente", icon: "👥", color: "bg-blue-100 text-blue-800" },
  llamada_prospecto: { label: "Llamada Prospecto", icon: "📞", color: "bg-green-100 text-green-800" },
  envio_documentos: { label: "Envío Documentos", icon: "📄", color: "bg-purple-100 text-purple-800" },
  visita_propiedad: { label: "Visita Propiedad", icon: "🏠", color: "bg-orange-100 text-orange-800" },
  reunion_equipo: { label: "Reunión Equipo", icon: "👨‍💼", color: "bg-indigo-100 text-indigo-800" },
  personalizado: { label: "Personalizado", icon: "⏰", color: "bg-gray-100 text-gray-800" },
};

const PRIORIDADES: Record<Prioridad, { label: string; color: string; bg: string }> = {
  baja: { label: "Baja", color: "text-gray-600", bg: "bg-gray-100" },
  media: { label: "Media", color: "text-blue-600", bg: "bg-blue-100" },
  alta: { label: "Alta", color: "text-orange-600", bg: "bg-orange-100" },
  urgente: { label: "Urgente", color: "text-red-600", bg: "bg-red-100" },
};

export default function RecordatoriosPanel() {
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<"todos" | "hoy" | "pendientes" | "completados">("todos");
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [accionEnProgreso, setAccionEnProgreso] = useState<string | null>(null);

  const cargarRecordatorios = useCallback(async () => {
    try {
      setCargando(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) {
        setRecordatorios([]);
        return;
      }

      const { data, error } = await supabase
        .from("recordatorio")
        .select(`
          id,
          titulo,
          descripcion,
          tipo,
          prioridad,
          fecha_recordatorio,
          fecha_completado,
          completado,
          leido,
          notificar_email,
          notificar_push,
          created_at,
          cliente:cliente_id ( id, nombre ),
          propiedad:propiedad_id ( id, identificacion_interna, tipo )
        `)
        .eq("vendedor_id", user.id)
        .order("fecha_recordatorio", { ascending: true });

      if (error) throw error;

      const normalizados: Recordatorio[] = ((data ?? []) as RecordatorioQuery[]).map((item) => {
        const prioridad = (item.prioridad ?? "media") as Prioridad;
        const tipoNormalizado = (Object.keys(TIPOS_RECORDATORIO).includes(item.tipo)
          ? item.tipo
          : "personalizado") as TipoRecordatorioKey;

        return {
          id: item.id,
          titulo: item.titulo,
          descripcion: item.descripcion ?? undefined,
          tipo: tipoNormalizado,
          prioridad,
          fecha_recordatorio: item.fecha_recordatorio,
          cliente_nombre: item.cliente?.nombre ?? undefined,
          propiedad_nombre: item.propiedad?.identificacion_interna ?? undefined,
          completado: Boolean(item.completado),
          leido: Boolean(item.leido),
          notificar_email: Boolean(item.notificar_email ?? true),
          notificar_push: Boolean(item.notificar_push),
          created_at: item.created_at,
          fecha_completado: item.fecha_completado,
        };
      });

      setRecordatorios(normalizados);
    } catch (error) {
      console.error("Error cargando recordatorios:", error);
      toast.error("Error cargando recordatorios");
    } finally {
      setCargando(false);
    }
  }, [supabase]);

  useEffect(() => {
    cargarRecordatorios();
  }, [cargarRecordatorios]);

  const obtenerUsuarioId = useCallback(async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user) throw new Error("Sesión inválida");
    return user.id;
  }, [supabase]);

  const marcarCompletado = async (id: string) => {
    try {
      setAccionEnProgreso(id);
      const userId = await obtenerUsuarioId();
      const { error } = await supabase
        .from("recordatorio")
        .update({
          completado: true,
          fecha_completado: new Date().toISOString(),
          leido: true,
        })
        .eq("id", id)
        .eq("vendedor_id", userId);

      if (error) throw error;

      setRecordatorios((prev) =>
        prev.map((recordatorio) =>
          recordatorio.id === id
            ? { ...recordatorio, completado: true, leido: true, fecha_completado: new Date().toISOString() }
            : recordatorio
        )
      );
      toast.success("Recordatorio marcado como completado");
    } catch (error) {
      console.error("Error marcando recordatorio:", error);
      toast.error("Error marcando recordatorio");
    } finally {
      setAccionEnProgreso(null);
    }
  };

  const marcarLeido = async (id: string) => {
    try {
      setAccionEnProgreso(id);
      const userId = await obtenerUsuarioId();
      const { error } = await supabase
        .from("recordatorio")
        .update({ leido: true })
        .eq("id", id)
        .eq("vendedor_id", userId);

      if (error) throw error;

      setRecordatorios((prev) =>
        prev.map((recordatorio) =>
          recordatorio.id === id ? { ...recordatorio, leido: true } : recordatorio
        )
      );
    } catch (error) {
      console.error("Error marcando recordatorio:", error);
      toast.error("Error marcando recordatorio");
    } finally {
      setAccionEnProgreso(null);
    }
  };

  const eliminarRecordatorio = async (id: string) => {
    try {
      setAccionEnProgreso(id);
      const userId = await obtenerUsuarioId();
      const { error } = await supabase
        .from("recordatorio")
        .delete()
        .eq("id", id)
        .eq("vendedor_id", userId);

      if (error) throw error;

      setRecordatorios((prev) => prev.filter((recordatorio) => recordatorio.id !== id));
      toast.success("Recordatorio eliminado");
    } catch (error) {
      console.error("Error eliminando recordatorio:", error);
      toast.error("Error eliminando recordatorio");
    } finally {
      setAccionEnProgreso(null);
    }
  };

  const obtenerFechaRelativa = (fecha: string) => {
    const fechaRecordatorio = new Date(fecha);

    if (isToday(fechaRecordatorio)) {
      return { texto: "Hoy", color: "text-blue-600", bg: "bg-blue-100" };
    }
    if (isTomorrow(fechaRecordatorio)) {
      return { texto: "Mañana", color: "text-orange-600", bg: "bg-orange-100" };
    }
    if (isYesterday(fechaRecordatorio)) {
      return { texto: "Ayer", color: "text-gray-600", bg: "bg-gray-100" };
    }

    return {
      texto: format(fechaRecordatorio, "dd/MM", { locale: es }),
      color: "text-gray-600",
      bg: "bg-gray-100",
    };
  };

  const recordatoriosFiltrados = recordatorios.filter((recordatorio) => {
    switch (filtro) {
      case "hoy":
        return isToday(new Date(recordatorio.fecha_recordatorio));
      case "pendientes":
        return !recordatorio.completado;
      case "completados":
        return recordatorio.completado;
      default:
        return true;
    }
  });

  const estadisticas = {
    total: recordatorios.length,
    pendientes: recordatorios.filter((r) => !r.completado).length,
    completados: recordatorios.filter((r) => r.completado).length,
    hoy: recordatorios.filter((r) => isToday(new Date(r.fecha_recordatorio))).length,
  };

  if (cargando) {
    return (
      <div className="crm-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-crm-border rounded"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-crm-border rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="crm-card p-3 sm:p-4 text-center hover:shadow-lg transition-all duration-200">
          <div className="text-xl sm:text-2xl font-bold text-crm-text-primary">{estadisticas.total}</div>
          <div className="text-xs sm:text-sm text-crm-text-muted">Total</div>
        </div>
        <div className="crm-card p-3 sm:p-4 text-center hover:shadow-lg transition-all duration-200">
          <div className="text-xl sm:text-2xl font-bold text-orange-600">{estadisticas.pendientes}</div>
          <div className="text-xs sm:text-sm text-crm-text-muted">Pendientes</div>
        </div>
        <div className="crm-card p-3 sm:p-4 text-center hover:shadow-lg transition-all duration-200">
          <div className="text-xl sm:text-2xl font-bold text-green-600">{estadisticas.completados}</div>
          <div className="text-xs sm:text-sm text-crm-text-muted">Completados</div>
        </div>
        <div className="crm-card p-3 sm:p-4 text-center hover:shadow-lg transition-all duration-200">
          <div className="text-xl sm:text-2xl font-bold text-blue-600">{estadisticas.hoy}</div>
          <div className="text-xs sm:text-sm text-crm-text-muted">Hoy</div>
        </div>
      </div>

      <div className="crm-card p-3 sm:p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "todos", label: "Todos", icon: "📋" },
            { key: "hoy", label: "Hoy", icon: "📅" },
            { key: "pendientes", label: "Pendientes", icon: "⏳" },
            { key: "completados", label: "Completados", icon: "✅" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key as typeof filtro)}
              className={`px-2 sm:px-3 py-1.5 sm:py-1 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                filtro === f.key
                  ? "bg-crm-primary text-white shadow-md"
                  : "bg-crm-border text-crm-text-muted hover:bg-crm-sidebar-hover hover:text-white"
              }`}
            >
              <span className="hidden sm:inline">{f.label}</span>
              <span className="sm:hidden">{f.icon}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 sm:space-y-3">
        {recordatoriosFiltrados.length === 0 ? (
          <div className="crm-card p-6 sm:p-8 text-center">
            <div className="text-crm-text-muted">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm sm:text-base">No hay recordatorios para mostrar</p>
            </div>
          </div>
        ) : (
          recordatoriosFiltrados.map((recordatorio) => {
            const fechaRelativa = obtenerFechaRelativa(recordatorio.fecha_recordatorio);
            const tipoInfo =
              TIPOS_RECORDATORIO[recordatorio.tipo] ?? TIPOS_RECORDATORIO.personalizado;
            const prioridadInfo = PRIORIDADES[recordatorio.prioridad] ?? PRIORIDADES.media;

            return (
              <div
                key={recordatorio.id}
                className={`crm-card p-3 sm:p-4 hover:shadow-lg transition-all duration-200 ${
                  recordatorio.completado ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3 mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-base sm:text-lg">{tipoInfo.icon}</span>
                        <h3
                          className={`text-sm font-medium ${
                            recordatorio.completado
                              ? "line-through text-crm-text-muted"
                              : "text-crm-text-primary"
                          }`}
                        >
                          {recordatorio.titulo}
                        </h3>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full w-fit ${tipoInfo.color}`}>
                        <span className="hidden sm:inline">{tipoInfo.label}</span>
                        <span className="sm:hidden">{tipoInfo.label.charAt(0).toUpperCase()}</span>
                      </span>
                    </div>

                    {recordatorio.descripcion && (
                      <p className="text-sm text-crm-text-secondary mb-2">
                        {recordatorio.descripcion}
                      </p>
                    )}

                    <div className="flex items-center flex-wrap gap-3 text-xs text-crm-text-muted">
                      <div className="flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className={`px-2 py-1 rounded-full ${fechaRelativa.bg} ${fechaRelativa.color}`}>
                          {fechaRelativa.texto} {format(new Date(recordatorio.fecha_recordatorio), "HH:mm")}
                        </span>
                      </div>

                      {recordatorio.cliente_nombre && (
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>{recordatorio.cliente_nombre}</span>
                        </div>
                      )}

                      {recordatorio.propiedad_nombre && (
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                          <span>{recordatorio.propiedad_nombre}</span>
                        </div>
                      )}

                      <span className={`px-2 py-1 rounded-full ${prioridadInfo.bg} ${prioridadInfo.color}`}>
                        {prioridadInfo.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {!recordatorio.completado && (
                      <>
                        {!recordatorio.leido && (
                          <button
                            onClick={() => marcarLeido(recordatorio.id)}
                            disabled={accionEnProgreso === recordatorio.id}
                            className="p-2 text-crm-text-muted hover:text-crm-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Marcar como leído"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => marcarCompletado(recordatorio.id)}
                          disabled={accionEnProgreso === recordatorio.id}
                          className="p-2 text-green-600 hover:text-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Marcar como completado"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => eliminarRecordatorio(recordatorio.id)}
                      disabled={accionEnProgreso === recordatorio.id}
                      className="p-2 text-red-600 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Eliminar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
