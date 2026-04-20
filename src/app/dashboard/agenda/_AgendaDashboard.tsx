"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isToday,
  startOfDay,
  endOfDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { obtenerEventos, reprogramarEvento, marcarEventosVencidos, obtenerVendedoresAgenda, obtenerProyectosAgenda, completarEventoConResultado, cambiarEstadoEvento, type DatosCompletarEvento } from "./actions";
import { Evento } from "@/lib/types/agenda";
import EventoModal from "./_EventoModal";
import RecordatoriosPanel from "@/components/RecordatoriosPanel";
import NotificacionesPanel from "@/components/NotificacionesPanel";
import DateTimePicker from "@/components/ui/DateTimePicker";
import toast from "react-hot-toast";
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  Clock,
  Bell,
  Phone,
  Mail,
  Home,
  Users,
  CheckSquare,
  CheckCircle2,
  Tag,
  User,
  MapPin,
  ArrowRight,
  MessageCircle,
  Hourglass,
  XCircle,
  HeartCrack,
  ThumbsDown,
  Check,
  X as XIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  PanelRight,
  Pencil,
  type LucideIcon,
} from "lucide-react";

type VistaCalendario = "mes" | "semana" | "dia";
type VistaTab = "calendario" | "recordatorios" | "notificaciones";

// Mapa de colores por tipo de evento (module-level para evitar re-creación)
const COLOR_TIPO: Record<string, { bg: string; border: string }> = {
  cita:         { bg: '#3B82F6', border: '#2563EB' },  // Azul
  llamada:      { bg: '#22C55E', border: '#16A34A' },  // Verde
  email:        { bg: '#8B5CF6', border: '#7C3AED' },  // Violeta
  visita:       { bg: '#F97316', border: '#EA580C' },  // Naranja
  seguimiento:  { bg: '#EAB308', border: '#CA8A04' },  // Amarillo (WhatsApp, mensajes)
  recordatorio: { bg: '#F43F5E', border: '#E11D48' },  // Rosa
  tarea:        { bg: '#64748B', border: '#475569' },  // Gris
};

export default function AgendaDashboard() {
  const [fechaActual, setFechaActual] = useState(new Date());
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState<VistaCalendario>("mes");
  const [vistaActualTab, setVistaActualTab] = useState<VistaTab>("calendario");
  const [mostrarModalEvento, setMostrarModalEvento] = useState(false);
  const [eventoActivo, setEventoActivo] = useState<Evento | null>(null);

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [filtroProyectoId, setFiltroProyectoId] = useState<string | null>(null);
  const [proyectos, setProyectos] = useState<Array<{ id: string; nombre: string }>>([]);
  const [filtroDesde, setFiltroDesde] = useState<string>("");
  const [filtroHasta, setFiltroHasta] = useState<string>("");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const rangoPersonalizadoActivo = Boolean(filtroDesde && filtroHasta);

  // Mini-calendario lateral
  const [mostrarMiniCalendario, setMostrarMiniCalendario] = useState(true);

  // Slots expandidos en vista día (agrupación por hora)
  const [slotsExpandidos, setSlotsExpandidos] = useState<Set<string>>(new Set());

  // Vista de equipo para admin/gerente
  const [vendedorFiltroId, setVendedorFiltroId] = useState<string | null>(null);
  const [vendedores, setVendedores] = useState<Array<{ id: string; nombre: string }>>([]);

  // Modal de reprogramar
  const [mostrarModalReprogramar, setMostrarModalReprogramar] = useState(false);
  const [eventoReprogramar, setEventoReprogramar] = useState<Evento | null>(null);
  const [nuevaFechaReprogramar, setNuevaFechaReprogramar] = useState('');
  const [procesandoAccion, setProcesandoAccion] = useState(false);

  const cargarEventos = useCallback(async () => {
    try {
      setCargando(true);
      await marcarEventosVencidos();
      const rangoPers = rangoPersonalizadoActivo
        ? { desde: filtroDesde, hasta: filtroHasta }
        : null;
      const data = await obtenerEventos(fechaActual, vista, vendedorFiltroId, filtroProyectoId, rangoPers);
      setEventos(data);
    } catch (error) {
      console.error("Error cargando eventos:", error);
      toast.error("Error cargando eventos");
    } finally {
      setCargando(false);
    }
  }, [fechaActual, vista, vendedorFiltroId, filtroProyectoId, filtroDesde, filtroHasta, rangoPersonalizadoActivo]);

  useEffect(() => {
    cargarEventos();
  }, [cargarEventos]);

  // Cargar lista de vendedores para el selector admin (solo si el usuario es admin/gerente)
  useEffect(() => {
    obtenerVendedoresAgenda().then(setVendedores);
    obtenerProyectosAgenda().then(setProyectos);
  }, []);


  const navegarPeriodo = (direccion: "anterior" | "siguiente") => {
    setFechaActual((prev) => {
      if (vista === "semana") {
        return direccion === "anterior" ? subWeeks(prev, 1) : addWeeks(prev, 1);
      }
      if (vista === "dia") {
        return direccion === "anterior" ? addDays(prev, -1) : addDays(prev, 1);
      }
      return direccion === "anterior" ? subMonths(prev, 1) : addMonths(prev, 1);
    });
  };

  const irHoy = () => {
    setFechaActual(new Date());
  };

  const rangoFechas = useMemo(() => {
    if (vista === "semana") {
      return {
        inicio: startOfWeek(fechaActual, { weekStartsOn: 1 }),
        fin: endOfWeek(fechaActual, { weekStartsOn: 1 }),
      };
    }
    if (vista === "dia") {
      return {
        inicio: startOfDay(fechaActual),
        fin: endOfDay(fechaActual),
      };
    }
    return {
      inicio: startOfMonth(fechaActual),
      fin: endOfMonth(fechaActual),
    };
  }, [fechaActual, vista]);

  const dias = useMemo(
    () => eachDayOfInterval({ start: rangoFechas.inicio, end: rangoFechas.fin }),
    [rangoFechas]
  );

  const ordenarEventos = useCallback((lista: Evento[]) => {
    return [...lista].sort(
      (a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime()
    );
  }, []);

  // Filtrar eventos según los filtros seleccionados
  const eventosFiltrados = useMemo(() => {
    let filtered = eventos;

    if (filtroTipo) {
      filtered = filtered.filter(evt => evt.tipo === filtroTipo);
    }
    if (filtroPrioridad) {
      filtered = filtered.filter(evt => evt.prioridad === filtroPrioridad);
    }
    if (filtroEstado) {
      filtered = filtered.filter(evt => evt.estado === filtroEstado);
    }

    return filtered;
  }, [eventos, filtroTipo, filtroPrioridad, filtroEstado]);

  const obtenerEventosDia = useCallback(
    (fecha: Date) =>
      eventosFiltrados.filter((evento) => isSameDay(new Date(evento.fecha_inicio), fecha)),
    [eventosFiltrados]
  );

  const obtenerColorEvento = useCallback((tipo: string, estado?: string): React.CSSProperties => {
    const base = COLOR_TIPO[tipo] || { bg: '#64748B', border: '#475569' };
    const style: React.CSSProperties = {
      backgroundColor: base.bg,
      color: 'white',
      borderColor: base.border,
    };

    // Estado modifica la opacidad/aspecto pero NO el color base
    if (estado === 'completado')  style.opacity = 0.55;
    if (estado === 'cancelado')   style.opacity = 0.35;
    if (estado === 'vencida')     style.outline = '2px solid #EF4444';
    if (estado === 'en_progreso') style.outline = '2px solid #60A5FA';

    return style;
  }, []);

  // Clases extra según estado (no-color)
  const obtenerClasesEvento = useCallback((tipo: string, estado?: string) => {
    if (estado === 'cancelado') return "line-through";
    return "";
  }, []);

  const obtenerTooltipCreador = useCallback((evento: Evento) => {
    const creadorNombre = (evento as any).creador_nombre;
    if (!creadorNombre) return undefined;
    return `Creado por: ${creadorNombre}`;
  }, []);

  const tituloVista = useMemo(() => {
    if (vista === "semana") {
      const inicio = startOfWeek(fechaActual, { weekStartsOn: 1 });
      const fin = endOfWeek(fechaActual, { weekStartsOn: 1 });
      const inicioTexto = format(inicio, "d MMM", { locale: es });
      const finTexto = format(fin, "d MMM yyyy", { locale: es });
      return `${inicioTexto} – ${finTexto}`;
    }
    if (vista === "dia") {
      return format(fechaActual, "EEEE d 'de' MMMM yyyy", { locale: es });
    }
    return format(fechaActual, "MMMM yyyy", { locale: es });
  }, [fechaActual, vista]);

  const eventosHoy = useMemo(
    () => eventosFiltrados.filter((evento) => isToday(new Date(evento.fecha_inicio))).length,
    [eventosFiltrados]
  );

  const eventosEstaSemana = useMemo(() => {
    const inicioSemana = startOfWeek(new Date(), { weekStartsOn: 1 });
    const finSemana = endOfWeek(new Date(), { weekStartsOn: 1 });
    return eventosFiltrados.filter((evento) => {
      const fechaEvento = new Date(evento.fecha_inicio);
      return fechaEvento >= inicioSemana && fechaEvento <= finSemana;
    }).length;
  }, [eventosFiltrados]);

  const eventosPendientes = useMemo(
    () => eventosFiltrados.filter((evento) => new Date(evento.fecha_inicio) > new Date()).length,
    [eventosFiltrados]
  );

  const eventosDiaSeleccionado = useMemo(
    () => ordenarEventos(obtenerEventosDia(fechaActual)),
    [obtenerEventosDia, ordenarEventos, fechaActual]
  );

  const [fechaPreseleccionada, setFechaPreseleccionada] = useState<string | null>(null);

  const abrirModalNuevoEvento = (fechaSugerida?: Date) => {
    setEventoActivo(null);
    if (fechaSugerida) {
      // Redondear a la próxima hora completa para esa fecha
      const fecha = new Date(fechaSugerida);
      fecha.setHours(9, 0, 0, 0); // 9:00 AM por defecto
      setFechaPreseleccionada(fecha.toISOString().slice(0, 16));
    } else {
      setFechaPreseleccionada(null);
    }
    setMostrarModalEvento(true);
  };

  const abrirModalEvento = (evento: Evento) => {
    setEventoActivo(evento);
    setMostrarModalEvento(true);
  };

  // Panel de detalle (solo lectura con acciones)
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [eventoDetalle, setEventoDetalle] = useState<Evento | null>(null);

  const abrirDetalleEvento = (evento: Evento) => {
    setEventoDetalle(evento);
    setMostrarDetalle(true);
  };

  const cerrarDetalleEvento = () => {
    setMostrarDetalle(false);
    setEventoDetalle(null);
  };

  const handleEditarDesdeDetalle = () => {
    if (!eventoDetalle) return;
    const evt = eventoDetalle;
    cerrarDetalleEvento();
    setEventoActivo(evt);
    setMostrarModalEvento(true);
  };

  const handleCerrarModal = () => {
    setEventoActivo(null);
    setFechaPreseleccionada(null);
    setMostrarModalEvento(false);
  };

  const handleEventoGuardado = () => {
    handleCerrarModal();
    cargarEventos();
  };

  // Modal de resultado al completar
  const [mostrarModalResultado, setMostrarModalResultado] = useState(false);
  const [eventoParaCompletar, setEventoParaCompletar] = useState<Evento | null>(null);

  // Quick Actions handlers
  const handleMarcarCompletado = (evento: Evento, e: React.MouseEvent) => {
    e.stopPropagation();
    if (procesandoAccion) return;
    setEventoParaCompletar(evento);
    setMostrarModalResultado(true);
  };

  const handleConfirmarCompletado = async (datos: DatosCompletarEvento) => {
    if (!eventoParaCompletar || procesandoAccion) return;
    setProcesandoAccion(true);
    try {
      const result = await completarEventoConResultado(eventoParaCompletar.id, datos);
      if (result.success) {
        toast.success(result.message);
        setMostrarModalResultado(false);
        setEventoParaCompletar(null);
        cargarEventos();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error('Error al completar evento');
    } finally {
      setProcesandoAccion(false);
    }
  };

  const handleAbrirReprogramar = (evento: Evento, e: React.MouseEvent) => {
    e.stopPropagation();
    setEventoReprogramar(evento);
    setNuevaFechaReprogramar(evento.fecha_inicio.slice(0, 16));
    setMostrarModalReprogramar(true);
  };

  const handleConfirmarReprogramar = async () => {
    if (!eventoReprogramar || !nuevaFechaReprogramar || procesandoAccion) return;

    setProcesandoAccion(true);
    try {
      const result = await reprogramarEvento(eventoReprogramar.id, nuevaFechaReprogramar);
      if (result.success) {
        toast.success(result.message);
        setMostrarModalReprogramar(false);
        setEventoReprogramar(null);
        setNuevaFechaReprogramar('');
        cargarEventos();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error('Error al reprogramar evento');
    } finally {
      setProcesandoAccion(false);
    }
  };

  const handleLlamar = (evento: Evento, e: React.MouseEvent) => {
    e.stopPropagation();
    const eventoAny = evento as any;
    const telefono = eventoAny.cliente?.telefono;
    if (telefono) {
      window.open(`tel:${telefono}`, '_self');
      toast.success(`Llamando a ${telefono}`);
    } else {
      toast.error('Este cliente no tiene teléfono registrado');
    }
  };

  const handleWhatsApp = (evento: Evento, e: React.MouseEvent) => {
    e.stopPropagation();
    const eventoAny = evento as any;
    const telefono = eventoAny.cliente?.telefono;
    if (telefono) {
      // Limpiar el teléfono de caracteres no numéricos
      const telefonoLimpio = telefono.replace(/\D/g, '');
      const mensaje = encodeURIComponent(`Hola, te contacto sobre: ${evento.titulo}`);
      window.open(`https://wa.me/${telefonoLimpio}?text=${mensaje}`, '_blank');
      toast.success('Abriendo WhatsApp');
    } else {
      toast.error('Este cliente no tiene teléfono registrado');
    }
  };

  const handleCancelar = async (evento: Evento, e: React.MouseEvent) => {
    e.stopPropagation();
    if (procesandoAccion) return;
    const confirmado = window.confirm(`¿Cancelar el evento "${evento.titulo}"?`);
    if (!confirmado) return;
    setProcesandoAccion(true);
    try {
      const result = await cambiarEstadoEvento(evento.id, 'cancelado');
      if (result.success) {
        toast.success('Evento cancelado');
        cargarEventos();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error('Error al cancelar evento');
    } finally {
      setProcesandoAccion(false);
    }
  };

  const seccionEventosContexto = useMemo(() => {
    const ahora = new Date();
    const rangoEsPasado = rangoFechas.fin < ahora;

    if (rangoEsPasado) {
      return {
        titulo: "Eventos del período",
        vacio: "No hay eventos en este período",
        lista: ordenarEventos(eventosFiltrados).slice(0, 5),
      };
    }

    return {
      titulo: "Próximos eventos",
      vacio: "No hay eventos próximos",
      lista: ordenarEventos(
        eventosFiltrados.filter((e) => new Date(e.fecha_inicio) >= ahora)
      ).slice(0, 5),
    };
  }, [eventosFiltrados, ordenarEventos, rangoFechas]);

  // Métricas para gerente/admin (calculadas del listado cargado)
  const metricasEquipo = useMemo(() => {
    if (vendedores.length === 0) return null;
    const total = eventosFiltrados.length;
    if (total === 0) return null;

    const porEstado = eventosFiltrados.reduce<Record<string, number>>((acc, e) => {
      acc[e.estado] = (acc[e.estado] || 0) + 1;
      return acc;
    }, {});
    const porTipo = eventosFiltrados.reduce<Record<string, number>>((acc, e) => {
      acc[e.tipo] = (acc[e.tipo] || 0) + 1;
      return acc;
    }, {});
    const completados = porEstado['completado'] || 0;
    const cerrados = completados + (porEstado['cancelado'] || 0) + (porEstado['vencida'] || 0);
    const tasaConversion = cerrados > 0 ? Math.round((completados / cerrados) * 100) : 0;

    return { total, porEstado, porTipo, tasaConversion, completados };
  }, [eventosFiltrados, vendedores]);

  const renderMes = () => (
    <div className="grid grid-cols-7 gap-1 sm:gap-2">
      {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((dia) => (
        <div
          key={dia}
          className="p-2 sm:p-3 text-center text-xs sm:text-sm font-medium text-crm-text-muted bg-crm-border/50 rounded-lg"
        >
          <span className="hidden sm:inline">{dia}</span>
          <span className="sm:hidden">{dia.charAt(0)}</span>
        </div>
      ))}
      {dias.map((dia) => {
        const eventosDia = obtenerEventosDia(dia);
        const esHoy = isToday(dia);
        const esMesActual = isSameMonth(dia, fechaActual);
        const esSeleccionado = isSameDay(dia, fechaActual);

        return (
          <div
            role="button"
            tabIndex={0}
            onClick={() => { setFechaActual(dia); setVista("dia"); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setFechaActual(dia);
                setVista("dia");
              }
            }}
            key={dia.toISOString()}
            title="Click para ver eventos del día"
            className={`min-h-[80px] sm:min-h-[120px] p-1 sm:p-2 border border-crm-border rounded-lg transition-all duration-200 hover:shadow-md text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-crm-primary/50 ${
              esMesActual ? "bg-crm-card" : "bg-crm-border/30"
            } ${esHoy ? "ring-2 ring-crm-primary bg-crm-primary/5" : ""} ${
              esSeleccionado && !esHoy ? "border-crm-primary" : ""
            }`}
          >
            <div
              className={`text-xs sm:text-sm font-medium mb-1 sm:mb-2 ${
                esHoy ? "text-crm-primary font-bold" : "text-crm-text-primary"
              }`}
            >
              {format(dia, "d")}
            </div>

            <div className="space-y-1">
              {ordenarEventos(eventosDia)
                .slice(0, 2)
                .map((evento) => (
                  <div
                    key={evento.id}
                    className={`group/evt relative text-xs p-1 rounded border cursor-pointer hover:shadow-sm transition-all duration-200 ${obtenerClasesEvento(evento.tipo, evento.estado)}`}
                    style={obtenerColorEvento(evento.tipo, evento.estado)}
                    title={obtenerTooltipCreador(evento)}
                    onClick={(e) => {
                      e.stopPropagation();
                      abrirDetalleEvento(evento);
                    }}
                  >
                    <div className="truncate font-medium text-xs flex items-center gap-1">
                      <TipoIcon tipo={evento.tipo} className="w-3 h-3 shrink-0" />
                      {(evento as any).proximo_paso_objetivo && (
                        <ArrowRight className="w-3 h-3 opacity-90 shrink-0" aria-label="Tiene próximo paso" />
                      )}
                      <span className="truncate">{evento.titulo}</span>
                    </div>
                    {(evento as any).cliente?.nombre && (
                      <div className="text-[10px] opacity-90 truncate hidden sm:flex items-center gap-1">
                        <User className="w-3 h-3 shrink-0" aria-hidden />
                        <span className="truncate">{(evento as any).cliente.nombre}</span>
                      </div>
                    )}
                    <div className="text-xs opacity-75 hidden sm:flex items-center gap-1">
                      <span>{format(new Date(evento.fecha_inicio), "HH:mm")}</span>
                      <span className="opacity-80">· {TIPO_ETIQUETA[evento.tipo]?.label ?? evento.tipo}</span>
                    </div>
                    <EventoQuickActions
                      evento={evento}
                      onCompletar={handleMarcarCompletado}
                      onReprogramar={handleAbrirReprogramar}
                      onCancelar={handleCancelar}
                      tamanio="xs"
                    />
                  </div>
                ))}
              {eventosDia.length > 2 && (
                <div className="text-xs text-crm-text-muted text-center">
                  +{eventosDia.length - 2} más
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderSemana = () => {
    const HOUR_START = 7;
    const HOUR_END = 22;
    const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);
    const HOUR_HEIGHT = 56;

    const now = new Date();
    const currentMinutes = (now.getHours() - HOUR_START) * 60 + now.getMinutes();
    const totalMinutes = (HOUR_END - HOUR_START + 1) * 60;

    const renderEventoBloque = (evento: Evento) => {
      const start = new Date(evento.fecha_inicio);
      const hour = start.getHours();
      const minute = start.getMinutes();
      const duration = evento.duracion_minutos || 30;

      if (hour > HOUR_END) return null;
      if (hour + duration / 60 < HOUR_START) return null;

      const startOffsetMin = Math.max(0, (hour - HOUR_START) * 60 + minute);
      const endOffsetMin = Math.min(totalMinutes, (hour - HOUR_START) * 60 + minute + duration);
      const top = (startOffsetMin / 60) * HOUR_HEIGHT;
      const height = Math.max(22, ((endOffsetMin - startOffsetMin) / 60) * HOUR_HEIGHT - 2);

      return (
        <div
          key={evento.id}
          onClick={(e) => { e.stopPropagation(); abrirDetalleEvento(evento); }}
          className={`group/evt absolute left-1 right-1 p-1.5 rounded border cursor-pointer overflow-hidden shadow-sm hover:shadow-md transition-shadow ${obtenerClasesEvento(evento.tipo, evento.estado)}`}
          style={{ top: `${top}px`, height: `${height}px`, zIndex: 10, ...obtenerColorEvento(evento.tipo, evento.estado) }}
          title={`${evento.titulo} — ${format(start, "HH:mm")}`}
        >
          <div className="text-[10px] font-semibold truncate flex items-center gap-1 leading-tight">
            <TipoIcon tipo={evento.tipo} className="w-3 h-3 shrink-0" />
            <span className="truncate">{evento.titulo}</span>
          </div>
          {height >= 36 && (
            <div className="text-[10px] opacity-80 leading-tight">
              {format(start, "HH:mm")}
              {evento.fecha_fin ? `–${format(new Date(evento.fecha_fin), "HH:mm")}` : ''}
            </div>
          )}
          {(evento as any).cliente?.nombre && height >= 58 && (
            <div className="text-[10px] opacity-90 truncate flex items-center gap-0.5 leading-tight mt-0.5">
              <User className="w-2.5 h-2.5 shrink-0" aria-hidden />
              <span className="truncate">{(evento as any).cliente.nombre}</span>
            </div>
          )}
          <EventoQuickActions
            evento={evento}
            onCompletar={handleMarcarCompletado}
            onReprogramar={handleAbrirReprogramar}
            onCancelar={handleCancelar}
            tamanio="xs"
          />
        </div>
      );
    };

    return (
      <div className="crm-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            {/* Header: hora + días */}
            <div className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] border-b border-crm-border bg-crm-bg-secondary/30">
              <div className="p-2 text-xs font-medium text-crm-text-muted text-center border-r border-crm-border">Hora</div>
              {dias.map((dia) => {
                const esHoy = isToday(dia);
                return (
                  <button
                    type="button"
                    key={dia.toISOString()}
                    onClick={() => { setFechaActual(dia); setVista("dia"); }}
                    className={`p-2 text-center border-r border-crm-border last:border-r-0 hover:bg-crm-border/30 transition-colors ${esHoy ? 'bg-crm-primary/10' : ''}`}
                    title="Ver día"
                  >
                    <p className="text-xs text-crm-text-muted uppercase">{format(dia, "EEE", { locale: es })}</p>
                    <p className={`text-lg font-semibold ${esHoy ? 'text-crm-primary' : 'text-crm-text-primary'}`}>
                      {format(dia, "d")}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Cuerpo: filas por hora × columnas por día */}
            <div className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] relative">
              {/* Columna de horas */}
              <div className="border-r border-crm-border">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    style={{ height: HOUR_HEIGHT }}
                    className="text-[11px] text-crm-text-muted text-right pr-2 pt-0.5 border-b border-crm-border/40"
                  >
                    {String(hour).padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              {/* Columnas de días */}
              {dias.map((dia) => {
                const eventosDia = ordenarEventos(obtenerEventosDia(dia));
                const esHoy = isToday(dia);
                const mostrarIndicador = esHoy && currentMinutes >= 0 && currentMinutes <= totalMinutes;
                const indicadorTop = (currentMinutes / 60) * HOUR_HEIGHT;

                return (
                  <div
                    key={dia.toISOString()}
                    className={`relative border-r border-crm-border last:border-r-0 ${esHoy ? 'bg-crm-primary/[0.02]' : ''}`}
                    style={{ height: HOURS.length * HOUR_HEIGHT }}
                  >
                    {/* Líneas de hora */}
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        style={{ height: HOUR_HEIGHT }}
                        className="border-b border-crm-border/40"
                      />
                    ))}

                    {/* Indicador de hora actual */}
                    {mostrarIndicador && (
                      <div
                        className="absolute left-0 right-0 z-20 pointer-events-none"
                        style={{ top: `${indicadorTop}px` }}
                        aria-label="Hora actual"
                      >
                        <div className="relative border-t-2 border-red-500">
                          <div className="absolute -left-1 -top-1.5 w-2.5 h-2.5 bg-red-500 rounded-full" />
                        </div>
                      </div>
                    )}

                    {/* Eventos del día */}
                    {eventosDia.map(renderEventoBloque)}

                    {/* Si no hay eventos */}
                    {eventosDia.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-[10px] text-crm-text-muted/60">Sin eventos</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDia = () => (
    <div className="crm-card p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-crm-text-muted uppercase">
            {format(fechaActual, "EEEE", { locale: es })}
          </p>
          <h3 className="text-2xl font-bold text-crm-text-primary">
            {format(fechaActual, "d 'de' MMMM yyyy", { locale: es })}
          </h3>
        </div>
        <div className="text-sm text-crm-text-muted">
          {eventosDiaSeleccionado.length} eventos programados
        </div>
      </div>

      <div className="space-y-3">
        {eventosDiaSeleccionado.length === 0 ? (
          <p className="text-crm-text-muted text-sm">No hay eventos para este día</p>
        ) : (
          (() => {
            // Agrupar eventos por HH:mm para colapsar slots con >3 eventos
            const grupos = new Map<string, Evento[]>();
            eventosDiaSeleccionado.forEach((e) => {
              const slot = format(new Date(e.fecha_inicio), 'HH:mm');
              const arr = grupos.get(slot) ?? [];
              arr.push(e);
              grupos.set(slot, arr);
            });

            const bloques: React.ReactNode[] = [];
            Array.from(grupos.entries()).forEach(([slot, evts]) => {
              const expandido = slotsExpandidos.has(slot);
              const colapsable = evts.length > 3;
              const visibles = colapsable && !expandido ? evts.slice(0, 3) : evts;

              visibles.forEach((evento) => {
                const eventoAny = evento as any;
                const tieneTelefono = eventoAny.cliente?.telefono;
                bloques.push(
                  <div
                    key={evento.id}
                    className={`group relative p-3 border rounded-lg hover:shadow transition-all cursor-pointer ${obtenerClasesEvento(evento.tipo, evento.estado)}`}
                    style={obtenerColorEvento(evento.tipo, evento.estado)}
                    title={obtenerTooltipCreador(evento)}
                    onClick={() => abrirDetalleEvento(evento)}
                  >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate flex items-center gap-1.5">
                      <TipoIcon tipo={evento.tipo} className="w-4 h-4 shrink-0" />
                      <span className="truncate">{evento.titulo}</span>
                    </p>
                    {(evento as any).cliente?.nombre && (
                      <p className="text-xs opacity-90 truncate mt-0.5 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 shrink-0" aria-hidden />
                        <span className="truncate">{(evento as any).cliente.nombre}</span>
                      </p>
                    )}
                    <p className="text-xs opacity-80">
                      {format(new Date(evento.fecha_inicio), "HH:mm")}
                      {evento.fecha_fin
                        ? ` - ${format(new Date(evento.fecha_fin), "HH:mm")}`
                        : ""}
                    </p>
                    {evento.descripcion && (
                      <p className="text-xs mt-2 opacity-80 line-clamp-2">
                        {evento.descripcion}
                      </p>
                    )}
                    {(evento as any).proximo_paso_objetivo && (
                      <p className="text-xs mt-1.5 opacity-90 flex items-center gap-1">
                        <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden />
                        <span className="truncate">{(evento as any).proximo_paso_objetivo}</span>
                      </p>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {evento.estado !== 'completado' && (
                      <button
                        onClick={(e) => handleMarcarCompletado(evento, e)}
                        className="p-1.5 bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-800/40 dark:text-green-400 rounded transition-colors"
                        title="Marcar como completado"
                      >
                        <Check className="w-4 h-4" aria-hidden />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleAbrirReprogramar(evento, e)}
                      className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-800/40 dark:text-blue-400 rounded transition-colors"
                      title="Reprogramar"
                    >
                      <Calendar className="w-4 h-4" aria-hidden />
                    </button>
                    {evento.estado !== 'cancelado' && evento.estado !== 'completado' && (
                      <button
                        onClick={(e) => handleCancelar(evento, e)}
                        className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-800/40 dark:text-red-400 rounded transition-colors"
                        title="Cancelar"
                      >
                        <XIcon className="w-4 h-4" aria-hidden />
                      </button>
                    )}
                    {tieneTelefono && (
                      <>
                        <button
                          onClick={(e) => handleLlamar(evento, e)}
                          className="p-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-900/30 dark:hover:bg-purple-800/40 dark:text-purple-400 rounded transition-colors"
                          title="Llamar"
                        >
                          <Phone className="w-4 h-4" aria-hidden />
                        </button>
                        <button
                          onClick={(e) => handleWhatsApp(evento, e)}
                          className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-800/40 dark:text-emerald-400 rounded transition-colors"
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" aria-hidden />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
                );
              });

              if (colapsable) {
                bloques.push(
                  <button
                    key={`slot-${slot}-toggle`}
                    type="button"
                    onClick={() => setSlotsExpandidos((prev) => {
                      const nuevo = new Set(prev);
                      if (nuevo.has(slot)) nuevo.delete(slot);
                      else nuevo.add(slot);
                      return nuevo;
                    })}
                    className="w-full py-2 text-xs font-medium text-crm-primary bg-crm-primary/5 hover:bg-crm-primary/10 rounded-lg border border-dashed border-crm-primary/30 transition-colors"
                  >
                    {expandido
                      ? `Ocultar ${evts.length - 3} evento${evts.length - 3 === 1 ? '' : 's'} de las ${slot}`
                      : `+${evts.length - 3} evento${evts.length - 3 === 1 ? '' : 's'} más a las ${slot}`}
                  </button>
                );
              }
            });

            return bloques;
          })()
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="crm-card p-1">
        <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-1">
          {([
            { key: "calendario", label: "Calendario", Icon: Calendar },
            { key: "recordatorios", label: "Recordatorios", Icon: Clock },
            { key: "notificaciones", label: "Notificaciones", Icon: Bell },
          ] as const).map((tab) => {
            const Ic = tab.Icon;
            return (
              <button
                key={tab.key}
                onClick={() => setVistaActualTab(tab.key)}
                className={`flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  vistaActualTab === tab.key
                    ? "bg-crm-primary text-white shadow-lg"
                    : "text-crm-text-muted hover:text-crm-text-primary hover:bg-crm-border"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Ic className="w-4 h-4" aria-hidden />
                  <span>{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {vistaActualTab === "calendario" ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="crm-card p-3 sm:p-4 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-crm-text-muted truncate">Eventos Hoy</p>
                  <p className="text-xl sm:text-2xl font-bold text-crm-text-primary">{eventosHoy}</p>
                </div>
              </div>
            </div>

            <div className="crm-card p-3 sm:p-4 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-crm-text-muted truncate">Esta Semana</p>
                  <p className="text-xl sm:text-2xl font-bold text-crm-text-primary">{eventosEstaSemana}</p>
                </div>
              </div>
            </div>

            <div className="crm-card p-3 sm:p-4 hover:shadow-lg transition-all duration-200 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 dark:text-orange-400" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-crm-text-muted truncate">Pendientes</p>
                  <p className="text-xl sm:text-2xl font-bold text-crm-text-primary">{eventosPendientes}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Panel de métricas para gerente/admin */}
          {metricasEquipo && (
            <div className="crm-card p-4 sm:p-5 border-l-4 border-crm-primary">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-crm-text-primary">
                    Métricas del equipo
                    {vendedorFiltroId && (
                      <span className="ml-2 text-xs font-normal text-crm-text-muted">
                        — {vendedores.find(v => v.id === vendedorFiltroId)?.nombre}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-crm-text-muted mt-0.5">
                    {metricasEquipo.total} eventos · {format(rangoFechas.inicio, "d MMM", { locale: es })} – {format(rangoFechas.fin, "d MMM yyyy", { locale: es })}
                  </p>
                </div>
                <div className="flex bg-crm-border rounded-lg p-0.5 w-full sm:w-auto">
                  {([
                    { key: "dia", label: "Hoy" },
                    { key: "semana", label: "Semana" },
                    { key: "mes", label: "Mes" },
                  ] as const).map((opcion) => (
                    <button
                      key={opcion.key}
                      type="button"
                      onClick={() => { setVista(opcion.key); setFechaActual(new Date()); }}
                      className={`flex-1 sm:flex-none px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        vista === opcion.key
                          ? "bg-crm-primary text-white shadow-sm"
                          : "text-crm-text-muted hover:text-crm-text-primary"
                      }`}
                      title={`Ver métricas del ${opcion.label.toLowerCase()}`}
                    >
                      {opcion.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {/* Tasa de conversión */}
                <div className="bg-crm-primary/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-crm-primary">{metricasEquipo.tasaConversion}%</p>
                  <p className="text-xs text-crm-text-muted mt-0.5">Tasa completados</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{metricasEquipo.porEstado['completado'] || 0}</p>
                  <p className="text-xs text-crm-text-muted mt-0.5">Completados</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-orange-600">{(metricasEquipo.porEstado['pendiente'] || 0) + (metricasEquipo.porEstado['en_progreso'] || 0)}</p>
                  <p className="text-xs text-crm-text-muted mt-0.5">Activos</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">{metricasEquipo.porEstado['vencida'] || 0}</p>
                  <p className="text-xs text-crm-text-muted mt-0.5">Vencidos</p>
                </div>
              </div>

              {/* Por tipo */}
              <div>
                <p className="text-xs font-medium text-crm-text-muted mb-2">Distribución por tipo</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(metricasEquipo.porTipo)
                    .sort(([,a],[,b]) => b - a)
                    .map(([tipo, count]) => (
                      <span key={tipo} className="px-2.5 py-1 text-xs rounded-full bg-crm-border text-crm-text-primary">
                        {tipo}: <strong>{count}</strong>
                      </span>
                    ))}
                </div>
              </div>
            </div>
          )}

          <div className="crm-card p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 space-y-4 sm:space-y-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold text-crm-text-primary">
                  {tituloVista.charAt(0).toUpperCase() + tituloVista.slice(1)}
                </h2>
                <button
                  type="button"
                  onClick={() => abrirModalNuevoEvento()}
                  className="crm-button-primary px-3 py-1.5 text-sm font-medium rounded-lg flex items-center gap-1.5 shadow-sm"
                  title="Crear evento"
                >
                  <Plus className="w-4 h-4" aria-hidden />
                  <span>Nuevo</span>
                </button>
                {vendedores.length > 0 && (
                  <select
                    value={vendedorFiltroId ?? ''}
                    onChange={(e) => setVendedorFiltroId(e.target.value || null)}
                    className="px-3 py-1.5 text-sm bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                  >
                    <option value="">Todos los vendedores</option>
                    {vendedores.map((v) => (
                      <option key={v.id} value={v.id}>{v.nombre}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                <div className="flex bg-crm-border rounded-lg p-1 w-full sm:w-auto">
                  {([
                    { key: "mes", label: "Mes", Icon: Calendar },
                    { key: "semana", label: "Semana", Icon: CalendarRange },
                    { key: "dia", label: "Día", Icon: CalendarDays },
                  ] as const).map((opcion) => {
                    const Ic = opcion.Icon;
                    return (
                      <button
                        key={opcion.key}
                        onClick={() => setVista(opcion.key)}
                        className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-1 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 inline-flex items-center justify-center gap-1.5 ${
                          vista === opcion.key
                            ? "bg-crm-primary text-white shadow-md"
                            : "text-crm-text-muted hover:text-crm-text-primary hover:bg-crm-sidebar-hover"
                        }`}
                      >
                        <Ic className="w-4 h-4" aria-hidden />
                        <span className="hidden sm:inline">{opcion.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <button
                    onClick={() => navegarPeriodo("anterior")}
                    className="flex-1 sm:flex-none p-2 text-crm-text-muted hover:text-crm-text-primary hover:bg-crm-border rounded-lg transition-colors inline-flex items-center justify-center"
                    title="Periodo anterior"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />
                  </button>

                  <button
                    onClick={irHoy}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-crm-primary bg-crm-primary/10 hover:bg-crm-primary/20 rounded-lg transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    <Calendar className="w-4 h-4 sm:hidden" aria-hidden />
                    <span className="hidden sm:inline">Hoy</span>
                  </button>

                  <button
                    onClick={() => navegarPeriodo("siguiente")}
                    className="flex-1 sm:flex-none p-2 text-crm-text-muted hover:text-crm-text-primary hover:bg-crm-border rounded-lg transition-colors inline-flex items-center justify-center"
                    title="Periodo siguiente"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />
                  </button>

                  <button
                    onClick={() => setMostrarMiniCalendario((v) => !v)}
                    className={`hidden lg:flex flex-none p-2 rounded-lg transition-colors items-center justify-center ${
                      mostrarMiniCalendario
                        ? 'text-crm-primary bg-crm-primary/10 hover:bg-crm-primary/20'
                        : 'text-crm-text-muted hover:text-crm-text-primary hover:bg-crm-border'
                    }`}
                    title={mostrarMiniCalendario ? 'Ocultar mini-calendario' : 'Mostrar mini-calendario'}
                  >
                    <PanelRight className="w-5 h-5" aria-hidden />
                  </button>
                </div>
              </div>
            </div>

            {/* Leyenda de estados */}
            <div className="mb-4 pb-3 border-b border-crm-border">
              <LeyendaEstados />
            </div>

            <div className={`grid grid-cols-1 gap-4 ${mostrarMiniCalendario ? 'lg:grid-cols-[1fr_240px]' : ''}`}>
              <div className="min-w-0">
                {vista === "mes" && renderMes()}
                {vista === "semana" && renderSemana()}
                {vista === "dia" && renderDia()}
              </div>

              {mostrarMiniCalendario && (
                <aside className="hidden lg:block">
                  <MiniCalendario
                    fechaActual={fechaActual}
                    onSeleccionar={(fecha) => setFechaActual(fecha)}
                    eventos={eventosFiltrados}
                  />
                </aside>
              )}
            </div>
          </div>

          <div className="crm-card p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-crm-text-primary mb-3 sm:mb-4">{seccionEventosContexto.titulo}</h3>
            <div className="space-y-2 sm:space-y-3">
              {seccionEventosContexto.lista.map((evento) => (
                <div
                  key={evento.id}
                  className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-crm-border/30 rounded-lg hover:bg-crm-border/50 transition-all duration-200 cursor-pointer"
                  title={obtenerTooltipCreador(evento)}
                  onClick={() => abrirDetalleEvento(evento)}
                >
                  <div
                    className="w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: (COLOR_TIPO[evento.tipo] || { bg: '#64748B' }).bg }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-crm-text-primary truncate">
                      {evento.titulo}
                    </p>
                    <p className="text-xs text-crm-text-muted">
                      {format(new Date(evento.fecha_inicio), "dd/MM/yyyy HH:mm", { locale: es })}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${obtenerClasesEvento(evento.tipo, evento.estado)}`}
                    style={obtenerColorEvento(evento.tipo, evento.estado)}
                  >
                    <span className="hidden sm:inline">{evento.tipo}</span>
                    <span className="sm:hidden">{evento.tipo.charAt(0).toUpperCase()}</span>
                  </span>
                </div>
              ))}
              {seccionEventosContexto.lista.length === 0 && (
                <p className="text-crm-text-muted text-center py-4 text-sm">{seccionEventosContexto.vacio}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
            <button
              onClick={() => abrirModalNuevoEvento()}
              className="crm-button-primary px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />
              <span>Crear evento</span>
            </button>

            <button
              onClick={cargarEventos}
              className="px-4 sm:px-6 py-2.5 sm:py-3 text-crm-primary bg-crm-primary/10 hover:bg-crm-primary/20 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors w-full sm:w-auto"
            >
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />
              <span>Actualizar</span>
            </button>

            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors w-full sm:w-auto ${
                mostrarFiltros || filtroTipo || filtroPrioridad || filtroEstado || vendedorFiltroId || filtroProyectoId || rangoPersonalizadoActivo
                  ? 'crm-button-primary'
                  : 'text-crm-text-secondary bg-crm-bg-secondary hover:bg-crm-border'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />
              <span>Filtros</span>
              {(filtroTipo || filtroPrioridad || filtroEstado || vendedorFiltroId || filtroProyectoId || rangoPersonalizadoActivo) && (
                <span className="ml-1 px-2 py-0.5 bg-white rounded-full text-xs">
                  {[filtroTipo, filtroPrioridad, filtroEstado, vendedorFiltroId, filtroProyectoId, rangoPersonalizadoActivo].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          {/* Panel de Filtros */}
          {mostrarFiltros && (
            <div className="mt-4 p-4 bg-crm-bg-secondary rounded-lg border border-crm-border">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <div>
                  <label className="text-sm font-medium text-crm-text-primary block mb-2">Tipo</label>
                  <select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                  >
                    <option value="">Todos</option>
                    <option value="cita">Cita</option>
                    <option value="llamada">Llamada</option>
                    <option value="email">Email</option>
                    <option value="visita">Visita</option>
                    <option value="seguimiento">Seguimiento</option>
                    <option value="tarea">Tarea</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-crm-text-primary block mb-2">Prioridad</label>
                  <select
                    value={filtroPrioridad}
                    onChange={(e) => setFiltroPrioridad(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                  >
                    <option value="">Todas</option>
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-crm-text-primary block mb-2">Estado</label>
                  <select
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                  >
                    <option value="">Todos</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="en_progreso">En progreso</option>
                    <option value="vencida">Vencida</option>
                    <option value="reprogramado">Reprogramada</option>
                    <option value="completado">Completada</option>
                    <option value="cancelado">Cancelada</option>
                  </select>
                </div>

                {vendedores.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-crm-text-primary block mb-2">Vendedor</label>
                    <select
                      value={vendedorFiltroId ?? ''}
                      onChange={(e) => setVendedorFiltroId(e.target.value || null)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                    >
                      <option value="">Todos los vendedores</option>
                      {vendedores.map((v) => (
                        <option key={v.id} value={v.id}>{v.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}

                {proyectos.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-crm-text-primary block mb-2">Proyecto</label>
                    <select
                      value={filtroProyectoId ?? ''}
                      onChange={(e) => setFiltroProyectoId(e.target.value || null)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                    >
                      <option value="">Todos los proyectos</option>
                      {proyectos.map((p) => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Rango de fechas personalizado */}
              <div className="mt-4 pt-4 border-t border-crm-border">
                <p className="text-xs font-semibold text-crm-text-muted uppercase tracking-wide mb-2">Rango de fechas personalizado</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-crm-text-muted block mb-1">Desde</label>
                    <input
                      type="date"
                      value={filtroDesde}
                      onChange={(e) => setFiltroDesde(e.target.value)}
                      max={filtroHasta || undefined}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-crm-text-muted block mb-1">Hasta</label>
                    <input
                      type="date"
                      value={filtroHasta}
                      onChange={(e) => setFiltroHasta(e.target.value)}
                      min={filtroDesde || undefined}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary text-sm"
                    />
                  </div>
                </div>
                {rangoPersonalizadoActivo && (
                  <p className="text-xs text-crm-primary mt-2">
                    Aplicado: del {format(new Date(filtroDesde), "d MMM yyyy", { locale: es })} al {format(new Date(filtroHasta), "d MMM yyyy", { locale: es })} — anula la navegación del calendario.
                  </p>
                )}
                {(filtroDesde || filtroHasta) && !rangoPersonalizadoActivo && (
                  <p className="text-xs text-crm-text-muted mt-2">Completá ambas fechas para aplicar el rango.</p>
                )}
              </div>

              {(filtroTipo || filtroPrioridad || filtroEstado || vendedorFiltroId || filtroProyectoId || filtroDesde || filtroHasta) && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      setFiltroTipo('');
                      setFiltroPrioridad('');
                      setFiltroEstado('');
                      setVendedorFiltroId(null);
                      setFiltroProyectoId(null);
                      setFiltroDesde('');
                      setFiltroHasta('');
                    }}
                    className="px-4 py-2 text-sm text-crm-text-secondary hover:text-crm-text-primary transition-colors"
                  >
                    Limpiar filtros
                  </button>
                </div>
              )}
            </div>
          )}

          {cargando && (
            <div className="crm-card p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-crm-border rounded mb-4"></div>
                <div className="h-32 bg-crm-border rounded"></div>
              </div>
            </div>
          )}
        </>
      ) : vistaActualTab === "recordatorios" ? (
        <RecordatoriosPanel />
      ) : (
        <NotificacionesPanel />
      )}

      {/* Modal de Reprogramar */}
      {mostrarModalReprogramar && eventoReprogramar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md pb-[env(safe-area-inset-bottom)] sm:pb-0 animate-in slide-in-from-bottom-4 sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-200">
            <div className="sm:hidden flex justify-center pt-2.5 pb-1">
              <span className="h-1 w-10 rounded-full bg-crm-border" aria-hidden />
            </div>
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-crm-text-primary">Reprogramar Evento</h2>
                <button
                  onClick={() => {
                    setMostrarModalReprogramar(false);
                    setEventoReprogramar(null);
                  }}
                  className="p-2 hover:bg-crm-border rounded-lg transition-colors"
                  aria-label="Cerrar"
                >
                  <XIcon className="w-5 h-5" aria-hidden />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-crm-text-muted">Evento:</p>
                <p className="font-medium text-crm-text-primary">{eventoReprogramar.titulo}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-crm-text-primary">Nueva fecha y hora</label>
                <DateTimePicker
                  value={nuevaFechaReprogramar}
                  onChange={setNuevaFechaReprogramar}
                  placeholder="Seleccionar fecha y hora"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-crm-border">
                <button
                  type="button"
                  onClick={() => {
                    setMostrarModalReprogramar(false);
                    setEventoReprogramar(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-crm-text-secondary bg-crm-border hover:bg-crm-border-hover rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarReprogramar}
                  disabled={procesandoAccion}
                  className="px-4 py-2 text-sm font-medium text-white bg-crm-primary hover:bg-crm-primary-hover rounded-lg transition-colors disabled:opacity-50"
                >
                  {procesandoAccion ? "Reprogramando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <EventoModal
        evento={eventoActivo ?? undefined}
        isOpen={mostrarModalEvento}
        onClose={handleCerrarModal}
        onSuccess={handleEventoGuardado}
        fechaPreseleccionada={fechaPreseleccionada ?? undefined}
        vendedorId={vendedorFiltroId}
      />

      <EventoDetallePanel
        evento={eventoDetalle}
        isOpen={mostrarDetalle}
        onClose={cerrarDetalleEvento}
        onEditar={handleEditarDesdeDetalle}
        onCompletar={(evt) => {
          cerrarDetalleEvento();
          setEventoParaCompletar(evt);
          setMostrarModalResultado(true);
        }}
        onReprogramar={(evt) => {
          cerrarDetalleEvento();
          setEventoReprogramar(evt);
          setNuevaFechaReprogramar(evt.fecha_inicio.slice(0, 16));
          setMostrarModalReprogramar(true);
        }}
        onCancelar={async (evt) => {
          const confirmado = window.confirm(`¿Cancelar el evento "${evt.titulo}"?`);
          if (!confirmado) return;
          setProcesandoAccion(true);
          try {
            const result = await cambiarEstadoEvento(evt.id, 'cancelado');
            if (result.success) {
              toast.success('Evento cancelado');
              cerrarDetalleEvento();
              cargarEventos();
            } else {
              toast.error(result.message);
            }
          } catch {
            toast.error('Error al cancelar evento');
          } finally {
            setProcesandoAccion(false);
          }
        }}
      />

      {/* Modal de resultado al completar */}
      {mostrarModalResultado && eventoParaCompletar && (
        <ModalResultadoEvento
          evento={eventoParaCompletar}
          procesando={procesandoAccion}
          onConfirmar={handleConfirmarCompletado}
          onCancelar={() => {
            setMostrarModalResultado(false);
            setEventoParaCompletar(null);
          }}
        />
      )}
    </div>
  );
}

// =====================================================
// COMPONENTE: QUICK ACTIONS UNIFICADAS
// =====================================================

function EventoQuickActions({
  evento,
  onCompletar,
  onReprogramar,
  onCancelar,
  tamanio = "sm",
}: {
  evento: Evento;
  onCompletar: (evento: Evento, e: React.MouseEvent) => void;
  onReprogramar: (evento: Evento, e: React.MouseEvent) => void;
  onCancelar: (evento: Evento, e: React.MouseEvent) => void;
  tamanio?: "xs" | "sm";
}) {
  const puedeCompletar = evento.estado !== 'completado';
  const puedeCancelar = evento.estado !== 'cancelado' && evento.estado !== 'completado';
  const btnClase = tamanio === "xs" ? "p-0.5 rounded" : "p-1 rounded";
  const iconClase = tamanio === "xs" ? "w-3 h-3" : "w-3.5 h-3.5";
  const gapClase = tamanio === "xs" ? "gap-0.5" : "gap-1";

  return (
    <div className={`absolute top-1 right-1 flex ${gapClase} opacity-0 group-hover/evt:opacity-100 transition-opacity`}>
      {puedeCompletar && (
        <button
          type="button"
          onClick={(e) => onCompletar(evento, e)}
          className={`${btnClase} bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-800/40 dark:text-green-400 transition-colors`}
          title="Completar"
        >
          <Check className={iconClase} aria-hidden />
        </button>
      )}
      <button
        type="button"
        onClick={(e) => onReprogramar(evento, e)}
        className={`${btnClase} bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-800/40 dark:text-blue-400 transition-colors`}
        title="Reprogramar"
      >
        <Calendar className={iconClase} aria-hidden />
      </button>
      {puedeCancelar && (
        <button
          type="button"
          onClick={(e) => onCancelar(evento, e)}
          className={`${btnClase} bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-800/40 dark:text-red-400 transition-colors`}
          title="Cancelar"
        >
          <XIcon className={iconClase} aria-hidden />
        </button>
      )}
    </div>
  );
}

// =====================================================
// COMPONENTE: LEYENDA DE ESTADOS
// =====================================================

function LeyendaEstados() {
  const items: Array<{ label: string; descripcion: string; estilo: React.CSSProperties; clase?: string }> = [
    { label: 'Pendiente', descripcion: 'Evento programado a futuro', estilo: { backgroundColor: '#3B82F6' } },
    { label: 'En progreso', descripcion: 'En curso', estilo: { backgroundColor: '#3B82F6', outline: '2px solid #60A5FA' } },
    { label: 'Completado', descripcion: 'Gestión terminada', estilo: { backgroundColor: '#3B82F6', opacity: 0.55 } },
    { label: 'Cancelado', descripcion: 'Gestión anulada', estilo: { backgroundColor: '#3B82F6', opacity: 0.35 }, clase: 'line-through' },
    { label: 'Vencido', descripcion: 'Fecha pasada sin completar', estilo: { backgroundColor: '#3B82F6', outline: '2px solid #EF4444' } },
    { label: 'Reprogramado', descripcion: 'Se movió a otra fecha', estilo: { backgroundColor: '#3B82F6' } },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-xs font-medium text-crm-text-muted">Leyenda:</span>
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5" title={it.descripcion}>
          <span
            className={`inline-block w-3 h-3 rounded border ${it.clase ?? ''}`}
            style={{ ...it.estilo, borderColor: 'rgba(0,0,0,0.15)' }}
          />
          <span className={`text-xs text-crm-text-secondary ${it.clase ?? ''}`}>{it.label}</span>
        </span>
      ))}
    </div>
  );
}

// =====================================================
// COMPONENTE: MINI-CALENDARIO LATERAL
// =====================================================

function MiniCalendario({
  fechaActual,
  onSeleccionar,
  eventos,
}: {
  fechaActual: Date;
  onSeleccionar: (fecha: Date) => void;
  eventos: Evento[];
}) {
  const [mes, setMes] = useState(fechaActual);

  useEffect(() => {
    setMes(fechaActual);
  }, [fechaActual]);

  const rango = useMemo(() => {
    const inicio = startOfWeek(startOfMonth(mes), { weekStartsOn: 1 });
    const fin = endOfWeek(endOfMonth(mes), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: inicio, end: fin });
  }, [mes]);

  const diasConEventos = useMemo(() => {
    const set = new Set<string>();
    eventos.forEach((e) => {
      set.add(format(new Date(e.fecha_inicio), 'yyyy-MM-dd'));
    });
    return set;
  }, [eventos]);

  return (
    <div className="crm-card p-3 sticky top-4">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => setMes((prev) => subMonths(prev, 1))}
          className="p-1 hover:bg-crm-border rounded text-crm-text-muted"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden />
        </button>
        <p className="text-sm font-semibold text-crm-text-primary capitalize">
          {format(mes, "MMMM yyyy", { locale: es })}
        </p>
        <button
          type="button"
          onClick={() => setMes((prev) => addMonths(prev, 1))}
          className="p-1 hover:bg-crm-border rounded text-crm-text-muted"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="w-4 h-4" aria-hidden />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-[10px] text-center text-crm-text-muted mb-1">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
          <div key={d} className="py-1 font-medium">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {rango.map((dia) => {
          const esMesActual = isSameMonth(dia, mes);
          const esHoy = isToday(dia);
          const esSeleccionado = isSameDay(dia, fechaActual);
          const tieneEventos = diasConEventos.has(format(dia, 'yyyy-MM-dd'));

          return (
            <button
              key={dia.toISOString()}
              type="button"
              onClick={() => onSeleccionar(dia)}
              className={`relative aspect-square text-xs rounded transition-colors ${
                esSeleccionado
                  ? 'bg-crm-primary text-white font-semibold'
                  : esHoy
                  ? 'bg-crm-primary/10 text-crm-primary font-semibold'
                  : esMesActual
                  ? 'text-crm-text-primary hover:bg-crm-border'
                  : 'text-crm-text-muted/50 hover:bg-crm-border/50'
              }`}
            >
              {format(dia, 'd')}
              {tieneEventos && !esSeleccionado && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-crm-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// =====================================================
// COMPONENTE: PANEL DE DETALLE DE EVENTO (READ-ONLY + ACCIONES)
// =====================================================

const ESTADO_ETIQUETA: Record<string, { label: string; clase: string }> = {
  pendiente: { label: 'Pendiente', clase: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  en_progreso: { label: 'En progreso', clase: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' },
  completado: { label: 'Completado', clase: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  cancelado: { label: 'Cancelado', clase: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  vencida: { label: 'Vencido', clase: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  reprogramado: { label: 'Reprogramado', clase: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
};

const TIPO_ETIQUETA: Record<string, { label: string; Icon: LucideIcon }> = {
  cita: { label: 'Cita', Icon: CalendarDays },
  llamada: { label: 'Llamada', Icon: Phone },
  email: { label: 'Email', Icon: Mail },
  visita: { label: 'Visita', Icon: Home },
  seguimiento: { label: 'Seguimiento', Icon: Users },
  recordatorio: { label: 'Recordatorio', Icon: Bell },
  tarea: { label: 'Tarea', Icon: CheckSquare },
};

function TipoIcon({ tipo, className = "w-4 h-4" }: { tipo: string; className?: string }) {
  const Icon = TIPO_ETIQUETA[tipo]?.Icon ?? Tag;
  return <Icon className={className} />;
}

function EventoDetallePanel({
  evento,
  isOpen,
  onClose,
  onEditar,
  onCompletar,
  onReprogramar,
  onCancelar,
}: {
  evento: Evento | null;
  isOpen: boolean;
  onClose: () => void;
  onEditar: () => void;
  onCompletar: (evento: Evento) => void;
  onReprogramar: (evento: Evento) => void;
  onCancelar: (evento: Evento) => void;
}) {
  if (!isOpen || !evento) return null;

  const eventoAny = evento as any;
  const cliente = eventoAny.cliente;
  const estadoInfo = ESTADO_ETIQUETA[evento.estado] ?? { label: evento.estado, clase: 'bg-gray-100 text-gray-700' };
  const tipoInfo = TIPO_ETIQUETA[evento.tipo] ?? { label: evento.tipo, Icon: Tag };
  const TipoIc = tipoInfo.Icon;
  const puedeCompletar = evento.estado !== 'completado';
  const puedeCancelar = evento.estado !== 'cancelado' && evento.estado !== 'completado';
  const puedeReprogramar = evento.estado !== 'completado' && evento.estado !== 'cancelado';

  const telefonoLimpio = cliente?.telefono ? String(cliente.telefono).replace(/\D/g, '') : null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} aria-hidden />
      <aside className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white dark:bg-slate-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-crm-border flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${estadoInfo.clase}`}>
                {estadoInfo.label}
              </span>
              <span className="text-xs text-crm-text-muted flex items-center gap-1">
                <TipoIc className="w-3.5 h-3.5" aria-hidden />
                <span>{tipoInfo.label}</span>
              </span>
              <span className="text-xs text-crm-text-muted capitalize">· prioridad {evento.prioridad}</span>
            </div>
            <h2 className="text-xl font-bold text-crm-text-primary break-words">{evento.titulo}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-crm-border rounded-lg transition-colors flex-shrink-0"
            aria-label="Cerrar detalle"
          >
            <XIcon className="w-5 h-5 text-crm-text-muted" aria-hidden />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Fecha/hora */}
          <section>
            <p className="text-xs font-semibold text-crm-text-muted uppercase tracking-wide mb-1">Fecha y hora</p>
            <p className="text-sm text-crm-text-primary">
              {format(new Date(evento.fecha_inicio), "EEEE d 'de' MMMM yyyy", { locale: es })}
            </p>
            <p className="text-sm text-crm-text-secondary">
              {format(new Date(evento.fecha_inicio), "HH:mm")}
              {evento.fecha_fin ? ` – ${format(new Date(evento.fecha_fin), "HH:mm")}` : ""}
              {evento.duracion_minutos ? ` · ${evento.duracion_minutos} min` : ""}
            </p>
          </section>

          {/* Cliente */}
          {cliente && (
            <section>
              <p className="text-xs font-semibold text-crm-text-muted uppercase tracking-wide mb-1">Cliente</p>
              <p className="text-sm font-medium text-crm-text-primary flex items-center gap-1.5">
                <User className="w-4 h-4 shrink-0" aria-hidden />
                <span>{cliente.nombre}</span>
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {cliente.telefono && telefonoLimpio && (
                  <>
                    <a
                      href={`tel:${cliente.telefono}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-crm-primary/10 text-crm-primary hover:bg-crm-primary/20 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" aria-hidden />
                      <span>{cliente.telefono}</span>
                    </a>
                    <a
                      href={`https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(`Hola, te contacto sobre: ${evento.titulo}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" aria-hidden />
                      <span>WhatsApp</span>
                    </a>
                  </>
                )}
                {cliente.email && (
                  <a
                    href={`mailto:${cliente.email}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-crm-border text-crm-text-secondary hover:bg-crm-border-hover transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" aria-hidden />
                    <span>{cliente.email}</span>
                  </a>
                )}
              </div>
            </section>
          )}

          {/* Proyecto/Lote */}
          {evento.propiedad_id && (
            <section>
              <p className="text-xs font-semibold text-crm-text-muted uppercase tracking-wide mb-1">Proyecto / Lote</p>
              <p className="text-sm text-crm-text-primary flex items-center gap-1.5">
                <Home className="w-4 h-4 shrink-0" aria-hidden />
                <span className="font-mono text-xs">{evento.propiedad_id.slice(0, 8)}…</span>
              </p>
            </section>
          )}

          {/* Lugar */}
          {evento.ubicacion && (
            <section>
              <p className="text-xs font-semibold text-crm-text-muted uppercase tracking-wide mb-1">Lugar</p>
              <p className="text-sm text-crm-text-primary flex items-start gap-1.5">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
                <span>{evento.ubicacion}</span>
              </p>
            </section>
          )}

          {/* Descripción */}
          {evento.descripcion && (
            <section>
              <p className="text-xs font-semibold text-crm-text-muted uppercase tracking-wide mb-1">Descripción</p>
              <p className="text-sm text-crm-text-secondary whitespace-pre-wrap">{evento.descripcion}</p>
            </section>
          )}

          {/* Notas */}
          {evento.notas && (
            <section>
              <p className="text-xs font-semibold text-crm-text-muted uppercase tracking-wide mb-1">Notas / Observaciones</p>
              <p className="text-sm text-crm-text-secondary whitespace-pre-wrap">{evento.notas}</p>
            </section>
          )}

          {/* Próximo paso */}
          {evento.proximo_paso_objetivo && (
            <section className="border-l-4 border-crm-primary bg-crm-primary/5 p-3 rounded-r-lg">
              <p className="text-xs font-semibold text-crm-primary uppercase tracking-wide mb-1 flex items-center gap-1">
                <ArrowRight className="w-3.5 h-3.5" aria-hidden /> Próximo paso
              </p>
              <p className="text-sm text-crm-text-primary">{evento.proximo_paso_objetivo}</p>
              {evento.proximo_paso_fecha && (
                <p className="text-xs text-crm-text-muted mt-1">
                  Para el {format(new Date(evento.proximo_paso_fecha), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                </p>
              )}
            </section>
          )}

          {/* Resultado si ya se completó */}
          {evento.resultado_notas && (
            <section>
              <p className="text-xs font-semibold text-crm-text-muted uppercase tracking-wide mb-1">Resultado</p>
              <p className="text-sm text-crm-text-secondary whitespace-pre-wrap">{evento.resultado_notas}</p>
            </section>
          )}

          {/* Creador */}
          {eventoAny.creador_nombre && (
            <p className="text-xs text-crm-text-muted pt-2 border-t border-crm-border">
              Creado por <span className="font-medium">{eventoAny.creador_nombre}</span>
            </p>
          )}
        </div>

        {/* Footer con acciones */}
        <div className="flex flex-wrap gap-2 p-4 border-t border-crm-border flex-shrink-0 bg-crm-bg-secondary/30">
          {puedeCompletar && (
            <button
              type="button"
              onClick={() => onCompletar(evento)}
              className="flex-1 min-w-[120px] px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" aria-hidden />
              Completar
            </button>
          )}
          {puedeReprogramar && (
            <button
              type="button"
              onClick={() => onReprogramar(evento)}
              className="flex-1 min-w-[120px] px-3 py-2 text-sm font-medium text-crm-primary bg-crm-primary/10 hover:bg-crm-primary/20 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Calendar className="w-4 h-4" aria-hidden />
              Reprogramar
            </button>
          )}
          <button
            type="button"
            onClick={onEditar}
            className="flex-1 min-w-[100px] px-3 py-2 text-sm font-medium text-crm-text-primary bg-crm-border hover:bg-crm-border-hover rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <Pencil className="w-4 h-4" aria-hidden />
            Editar
          </button>
          {puedeCancelar && (
            <button
              type="button"
              onClick={() => onCancelar(evento)}
              className="flex-1 min-w-[100px] px-3 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <XIcon className="w-4 h-4" aria-hidden />
              Cancelar
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

// =====================================================
// COMPONENTE: MODAL DE RESULTADO AL COMPLETAR EVENTO
// =====================================================

function ModalResultadoEvento({
  evento,
  procesando,
  onConfirmar,
  onCancelar,
}: {
  evento: Evento;
  procesando: boolean;
  onConfirmar: (datos: DatosCompletarEvento) => void;
  onCancelar: () => void;
}) {
  const [resultado, setResultado] = useState<DatosCompletarEvento['resultado']>('interesado');
  const [notas, setNotas] = useState('');
  const [agendarSiguiente, setAgendarSiguiente] = useState(false);
  const [proximoTipo, setProximoTipo] = useState('llamada');
  const [proximoTitulo, setProximoTitulo] = useState('');
  const [proximaFecha, setProximaFecha] = useState('');
  const [proximaDuracion, setProximaDuracion] = useState(30);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmar({
      resultado,
      notas: notas.trim() || undefined,
      proximaAccion: agendarSiguiente && proximoTitulo && proximaFecha
        ? { tipo: proximoTipo, titulo: proximoTitulo, fecha: proximaFecha, duracion_minutos: proximaDuracion }
        : undefined,
    });
  };

  const RESULTADOS: Array<{ value: DatosCompletarEvento['resultado']; label: string; Icon: LucideIcon; color: string }> = [
    { value: 'interesado',      label: 'Interesado',       Icon: CheckCircle2, color: 'border-green-400 bg-green-50 text-green-800 dark:border-green-500 dark:bg-green-900/30 dark:text-green-300' },
    { value: 'necesita_tiempo', label: 'Necesita tiempo',  Icon: Hourglass,    color: 'border-yellow-400 bg-yellow-50 text-yellow-800 dark:border-yellow-500 dark:bg-yellow-900/30 dark:text-yellow-300' },
    { value: 'no_interesado',   label: 'No interesado',    Icon: ThumbsDown,   color: 'border-gray-300 bg-gray-50 text-gray-600 dark:border-gray-500 dark:bg-gray-800/50 dark:text-gray-400' },
    { value: 'separo_lote',     label: 'Separó lote',      Icon: Home,         color: 'border-blue-400 bg-blue-50 text-blue-800 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-300' },
    { value: 'perdido',         label: 'Perdido',          Icon: HeartCrack,   color: 'border-red-400 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-900/30 dark:text-red-300' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-end sm:items-center justify-center z-50 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] sm:max-h-[90vh] flex flex-col pb-[env(safe-area-inset-bottom)] sm:pb-0 animate-in slide-in-from-bottom-4 sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-200">
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <span className="h-1 w-10 rounded-full bg-crm-border" aria-hidden />
        </div>
        <div className="p-5 border-b border-crm-border flex-shrink-0">
          <h2 className="text-lg font-bold text-crm-text-primary">Resultado de la gestión</h2>
          <p className="text-sm text-crm-text-muted mt-0.5 truncate">{evento.titulo}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-5 space-y-5 overflow-y-auto flex-1">
            {/* Resultado */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-3">¿Cómo resultó la gestión?</label>
              <div className="space-y-2">
                {RESULTADOS.map((r) => {
                  const Ic = r.Icon;
                  return (
                    <label
                      key={r.value}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        resultado === r.value ? r.color + ' border-2' : 'border-crm-border hover:border-crm-primary/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="resultado"
                        value={r.value}
                        checked={resultado === r.value}
                        onChange={() => setResultado(r.value)}
                        className="sr-only"
                      />
                      <Ic className="w-5 h-5 shrink-0" aria-hidden />
                      <span className="text-sm font-medium">{r.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">Notas de la gestión <span className="text-crm-text-muted font-normal">(opcional)</span></label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="¿Qué se dijo? ¿Cuál es el siguiente paso conversado?"
                rows={3}
                className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary resize-none text-sm"
              />
            </div>

            {/* Próxima acción */}
            <div className="border border-crm-border rounded-lg overflow-hidden">
              <label className="flex items-center gap-3 p-3 cursor-pointer bg-crm-bg-secondary/50 hover:bg-crm-bg-secondary transition-colors">
                <input
                  type="checkbox"
                  checked={agendarSiguiente}
                  onChange={(e) => setAgendarSiguiente(e.target.checked)}
                  className="w-4 h-4 rounded text-crm-primary border-crm-border"
                />
                <div>
                  <p className="text-sm font-medium text-crm-text-primary">Agendar próxima acción</p>
                  <p className="text-xs text-crm-text-muted">Crea automáticamente el siguiente evento</p>
                </div>
              </label>

              {agendarSiguiente && (
                <div className="p-4 space-y-3 border-t border-crm-border">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-crm-text-muted mb-1.5">Tipo</label>
                      <select
                        value={proximoTipo}
                        onChange={(e) => setProximoTipo(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-crm-border rounded-lg text-sm text-crm-text-primary"
                      >
                        <option value="llamada">📞 Llamada</option>
                        <option value="visita">🏠 Visita</option>
                        <option value="cita">📅 Cita</option>
                        <option value="seguimiento">👥 Seguimiento</option>
                        <option value="email">✉️ Email</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-crm-text-muted mb-1.5">Duración</label>
                      <select
                        value={proximaDuracion}
                        onChange={(e) => setProximaDuracion(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-crm-border rounded-lg text-sm text-crm-text-primary"
                      >
                        <option value={15}>15 min</option>
                        <option value={30}>30 min</option>
                        <option value={60}>1 hora</option>
                        <option value={90}>1h 30m</option>
                        <option value={120}>2 horas</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-crm-text-muted mb-1.5">Título</label>
                    <input
                      type="text"
                      value={proximoTitulo}
                      onChange={(e) => setProximoTitulo(e.target.value)}
                      placeholder="Ej: Seguimiento post-visita con María García"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-crm-border rounded-lg text-sm text-crm-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-crm-text-muted mb-1.5">Fecha y hora</label>
                    <input
                      type="datetime-local"
                      value={proximaFecha}
                      onChange={(e) => setProximaFecha(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-crm-border rounded-lg text-sm text-crm-text-primary"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 p-5 pt-4 border-t border-crm-border flex-shrink-0 bg-white dark:bg-slate-800 sm:rounded-b-2xl">
            <button
              type="button"
              onClick={onCancelar}
              className="px-4 py-2.5 text-sm font-medium text-crm-text-secondary bg-crm-border hover:bg-crm-border-hover rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={procesando || (agendarSiguiente && (!proximoTitulo || !proximaFecha))}
              className="px-5 py-2.5 text-sm font-medium text-white bg-crm-primary hover:bg-crm-primary-hover rounded-lg transition-colors disabled:opacity-50"
            >
              {procesando ? 'Guardando...' : 'Completar evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
