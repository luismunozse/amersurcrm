"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { format, isToday, isTomorrow, isPast, addMinutes, differenceInMinutes, differenceInHours, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import toast from "react-hot-toast";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type TipoEvento = 'cita' | 'llamada' | 'email' | 'visita' | 'seguimiento' | 'recordatorio' | 'tarea';
type Prioridad = 'baja' | 'media' | 'alta' | 'urgente';
type EstadoEvento = 'programado' | 'completado' | 'cancelado' | 'reprogramado';

interface EventoRecordatorio {
  id: string;
  titulo: string;
  descripcion?: string;
  tipo: TipoEvento;
  prioridad: Prioridad;
  estado: EstadoEvento;
  fecha_inicio: string;
  fecha_fin?: string;
  recordar_antes_minutos: number;
  cliente_id?: string;
  cliente_nombre?: string;
  cliente_telefono?: string;
}

const TIPOS_EVENTO: Record<TipoEvento, { label: string; icon: string; color: string }> = {
  cita: { label: "Cita", icon: "📅", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  llamada: { label: "Llamada", icon: "📞", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  email: { label: "Email", icon: "✉️", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  visita: { label: "Visita", icon: "🏠", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
  seguimiento: { label: "Seguimiento", icon: "👥", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300" },
  recordatorio: { label: "Recordatorio", icon: "⏰", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  tarea: { label: "Tarea", icon: "✅", color: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300" },
};

const PRIORIDADES: Record<Prioridad, { label: string; color: string; bg: string }> = {
  baja: { label: "Baja", color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-100 dark:bg-gray-800" },
  media: { label: "Media", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
  alta: { label: "Alta", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30" },
  urgente: { label: "Urgente", color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30" },
};

function obtenerTiempoRestante(fechaEvento: string): string {
  const ahora = new Date();
  const fecha = new Date(fechaEvento);
  
  if (isPast(fecha)) {
    return "Pasado";
  }
  
  const minutos = differenceInMinutes(fecha, ahora);
  const horas = differenceInHours(fecha, ahora);
  const dias = differenceInDays(fecha, ahora);
  
  if (minutos < 60) {
    return `En ${minutos} min`;
  } else if (horas < 24) {
    return `En ${horas}h`;
  } else if (dias === 1) {
    return "Mañana";
  } else {
    return `En ${dias} días`;
  }
}

function obtenerUrgencia(fechaEvento: string, recordarAntesMinutos: number): 'inminente' | 'proximo' | 'futuro' | 'pasado' {
  const ahora = new Date();
  const fecha = new Date(fechaEvento);
  const fechaRecordatorio = addMinutes(fecha, -recordarAntesMinutos);
  
  if (isPast(fecha)) return 'pasado';
  if (isPast(fechaRecordatorio)) return 'inminente'; // Ya debería haberse recordado
  
  const minutosParaEvento = differenceInMinutes(fecha, ahora);
  if (minutosParaEvento <= 60) return 'inminente';
  if (minutosParaEvento <= 24 * 60) return 'proximo';
  return 'futuro';
}

export default function RecordatoriosPanel() {
  const [eventos, setEventos] = useState<EventoRecordatorio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<"todos" | "hoy" | "inminentes" | "completados">("todos");
  const supabase = useMemo(() => supabaseBrowser(), []);

  const cargarEventos = useCallback(async () => {
    try {
      setCargando(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setEventos([]);
        return;
      }

      // Obtener eventos: últimos 7 días + próximos 30 días
      const fechaInicio = new Date();
      fechaInicio.setDate(fechaInicio.getDate() - 7); // Incluir últimos 7 días
      const fechaFin = new Date();
      fechaFin.setDate(fechaFin.getDate() + 30);

      const { data, error } = await supabase
        .schema('crm')
        .from("evento")
        .select(`
          id,
          titulo,
          descripcion,
          tipo,
          prioridad,
          estado,
          fecha_inicio,
          fecha_fin,
          recordar_antes_minutos,
          cliente_id,
          cliente:cliente_id (id, nombre, telefono)
        `)
        .eq("vendedor_id", user.id)
        .neq("estado", "cancelado")
        .gte("fecha_inicio", fechaInicio.toISOString())
        .lte("fecha_inicio", fechaFin.toISOString())
        .order("fecha_inicio", { ascending: true });

      if (error) {
        console.error("Error cargando eventos:", error);
        throw error;
      }

      const eventosNormalizados: EventoRecordatorio[] = (data ?? []).map((item: any) => ({
        id: item.id,
        titulo: item.titulo,
        descripcion: item.descripcion ?? undefined,
        tipo: item.tipo as TipoEvento,
        prioridad: (item.prioridad ?? 'media') as Prioridad,
        estado: item.estado as EstadoEvento,
        fecha_inicio: item.fecha_inicio,
        fecha_fin: item.fecha_fin ?? undefined,
        recordar_antes_minutos: item.recordar_antes_minutos ?? 15,
        cliente_id: item.cliente_id ?? undefined,
        cliente_nombre: item.cliente?.nombre ?? undefined,
        cliente_telefono: item.cliente?.telefono ?? undefined,
      }));

      setEventos(eventosNormalizados);
    } catch (error) {
      console.error("Error cargando recordatorios:", error);
      toast.error("Error cargando recordatorios");
    } finally {
      setCargando(false);
    }
  }, [supabase]);

  useEffect(() => {
    cargarEventos();
    // Recargar cada 5 minutos
    const interval = setInterval(cargarEventos, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [cargarEventos]);

  const marcarCompletado = async (id: string) => {
    try {
      const { error } = await supabase
        .schema('crm')
        .from("evento")
        .update({ estado: 'completado' })
        .eq("id", id);

      if (error) throw error;

      setEventos((prev) => prev.filter((e) => e.id !== id));
      toast.success("Evento marcado como completado");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al marcar como completado");
    }
  };

  const llamarCliente = (telefono: string) => {
    window.open(`tel:${telefono}`, '_self');
  };

  const enviarWhatsApp = (telefono: string, titulo: string) => {
    const telefonoLimpio = telefono.replace(/\D/g, '');
    const mensaje = encodeURIComponent(`Hola, te contacto sobre: ${titulo}`);
    window.open(`https://wa.me/${telefonoLimpio}?text=${mensaje}`, '_blank');
  };

  // Filtrar eventos
  const eventosFiltrados = useMemo(() => {
    return eventos.filter((evento) => {
      const urgencia = obtenerUrgencia(evento.fecha_inicio, evento.recordar_antes_minutos);
      
      switch (filtro) {
        case "hoy":
          return isToday(new Date(evento.fecha_inicio));
        case "inminentes":
          return urgencia === 'inminente' || urgencia === 'proximo';
        case "completados":
          return evento.estado === 'completado';
        default:
          return true;
      }
    });
  }, [eventos, filtro]);

  // Estadísticas
  const estadisticas = useMemo(() => {
    const hoy = eventos.filter(e => isToday(new Date(e.fecha_inicio))).length;
    const inminentes = eventos.filter(e => {
      const urgencia = obtenerUrgencia(e.fecha_inicio, e.recordar_antes_minutos);
      return urgencia === 'inminente';
    }).length;
    const manana = eventos.filter(e => isTomorrow(new Date(e.fecha_inicio))).length;
    
    return {
      total: eventos.length,
      hoy,
      inminentes,
      manana,
    };
  }, [eventos]);

  if (cargando) {
    return (
      <div className="crm-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-crm-border rounded w-48"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-crm-border rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="crm-card p-4 text-center">
          <div className="text-2xl font-bold text-crm-text-primary">{estadisticas.total}</div>
          <div className="text-sm text-crm-text-muted">Próximos 30 días</div>
        </div>
        <div className="crm-card p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{estadisticas.hoy}</div>
          <div className="text-sm text-crm-text-muted">Hoy</div>
        </div>
        <div className="crm-card p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{estadisticas.inminentes}</div>
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

      {/* Lista de recordatorios */}
      <div className="space-y-3">
        {eventosFiltrados.length === 0 ? (
          <div className="crm-card p-8 text-center">
            <div className="text-crm-text-muted">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <p className="text-base font-medium">No hay eventos próximos</p>
              <p className="text-sm mt-1">Los recordatorios aparecerán aquí cuando tengas eventos programados</p>
            </div>
          </div>
        ) : (
          eventosFiltrados.map((evento) => {
            const tipoInfo = TIPOS_EVENTO[evento.tipo] ?? TIPOS_EVENTO.tarea;
            const prioridadInfo = PRIORIDADES[evento.prioridad] ?? PRIORIDADES.media;
            const urgencia = obtenerUrgencia(evento.fecha_inicio, evento.recordar_antes_minutos);
            const tiempoRestante = obtenerTiempoRestante(evento.fecha_inicio);
            
            const urgenciaClasses = {
              inminente: "border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-900/10",
              proximo: "border-l-4 border-l-orange-500 bg-orange-50/50 dark:bg-orange-900/10",
              futuro: "border-l-4 border-l-blue-500",
              pasado: "border-l-4 border-l-gray-400 opacity-60",
            };

            return (
              <div
                key={evento.id}
                className={`crm-card p-4 transition-all hover:shadow-lg ${urgenciaClasses[urgencia]}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{tipoInfo.icon}</span>
                      <h3 className="font-semibold text-crm-text-primary truncate">
                        {evento.titulo}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${tipoInfo.color}`}>
                        {tipoInfo.label}
                      </span>
                    </div>

                    {/* Descripción */}
                    {evento.descripcion && (
                      <p className="text-sm text-crm-text-secondary mb-2 line-clamp-2">
                        {evento.descripcion}
                      </p>
                    )}

                    {/* Info */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-crm-text-muted">
                      {/* Fecha y hora */}
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">
                          {format(new Date(evento.fecha_inicio), "dd/MM HH:mm", { locale: es })}
                        </span>
                      </div>

                      {/* Tiempo restante */}
                      <span className={`px-2 py-0.5 rounded-full font-medium ${
                        urgencia === 'inminente' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                        urgencia === 'proximo' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}>
                        {tiempoRestante}
                      </span>

                      {/* Cliente */}
                      {evento.cliente_nombre && (
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>{evento.cliente_nombre}</span>
                        </div>
                      )}

                      {/* Prioridad */}
                      <span className={`px-2 py-0.5 rounded-full ${prioridadInfo.bg} ${prioridadInfo.color}`}>
                        {prioridadInfo.label}
                      </span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1">
                    {evento.cliente_telefono && (
                      <>
                        <button
                          onClick={() => llamarCliente(evento.cliente_telefono!)}
                          className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition"
                          title="Llamar"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => enviarWhatsApp(evento.cliente_telefono!, evento.titulo)}
                          className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition"
                          title="WhatsApp"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => marcarCompletado(evento.id)}
                      className="p-2 text-crm-primary hover:bg-crm-primary/10 rounded-lg transition"
                      title="Marcar completado"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {eventos.length > 0 && (
        <div className="text-center text-sm text-crm-text-muted">
          <p>Los recordatorios se actualizan automáticamente cada 5 minutos</p>
        </div>
      )}
    </div>
  );
}
