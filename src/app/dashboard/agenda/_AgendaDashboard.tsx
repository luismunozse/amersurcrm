"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
import { obtenerEventos, cambiarEstadoEvento, reprogramarEvento } from "./actions";
import { Evento } from "@/lib/types/agenda";
import EventoModal from "./_EventoModal";
import RecordatoriosPanel from "@/components/RecordatoriosPanel";
import NotificacionesPanel from "@/components/NotificacionesPanel";
import toast from "react-hot-toast";

type VistaCalendario = "mes" | "semana" | "dia";
type VistaTab = "calendario" | "recordatorios" | "notificaciones";

export default function AgendaDashboard() {
  const [fechaActual, setFechaActual] = useState(new Date());
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState<VistaCalendario>("mes");
  const [vistaActualTab, setVistaActualTab] = useState<VistaTab>("calendario");
  const [mostrarModalEvento, setMostrarModalEvento] = useState(false);
  const [eventoActivo, setEventoActivo] = useState<Evento | null>(null);
  const [clientes, setClientes] = useState<Array<{ id: string; nombre: string; telefono?: string; email?: string }>>([]);
  const [propiedades, setPropiedades] = useState<Array<{ id: string; identificacion_interna: string; tipo: string }>>([]);
  const [oportunidades, setOportunidades] = useState<Array<{ id: string; cliente_nombre: string; etapa: string; label: string }>>([]);
  const [cargandoDatos, setCargandoDatos] = useState(false);

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [filtroCliente, setFiltroCliente] = useState<string>('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Modal de reprogramar
  const [mostrarModalReprogramar, setMostrarModalReprogramar] = useState(false);
  const [eventoReprogramar, setEventoReprogramar] = useState<Evento | null>(null);
  const [nuevaFechaReprogramar, setNuevaFechaReprogramar] = useState('');
  const [procesandoAccion, setProcesandoAccion] = useState(false);

  const cargarEventos = useCallback(async () => {
    try {
      setCargando(true);
      const data = await obtenerEventos(fechaActual, vista);
      setEventos(data);
    } catch (error) {
      console.error("Error cargando eventos:", error);
      toast.error("Error cargando eventos");
    } finally {
      setCargando(false);
    }
  }, [fechaActual, vista]);

  useEffect(() => {
    cargarEventos();
  }, [cargarEventos]);

  // Cargar clientes, propiedades y oportunidades cuando se abre el modal
  useEffect(() => {
    if (mostrarModalEvento && clientes.length === 0 && propiedades.length === 0 && oportunidades.length === 0 && !cargandoDatos) {
      setCargandoDatos(true);
      Promise.all([
        fetch('/api/agenda/clientes').then(r => r.json()),
        fetch('/api/agenda/propiedades').then(r => r.json()),
        fetch('/api/agenda/oportunidades').then(r => r.json())
      ])
      .then(([clientesData, propiedadesData, oportunidadesData]) => {
        setClientes(clientesData.clientes || []);
        setPropiedades(propiedadesData.propiedades || []);
        setOportunidades(oportunidadesData.oportunidades || []);
      })
      .catch(error => {
        console.error('Error cargando datos para formulario:', error);
        toast.error('Error cargando datos para el formulario');
      })
      .finally(() => setCargandoDatos(false));
    }
  }, [mostrarModalEvento, clientes.length, propiedades.length, oportunidades.length, cargandoDatos]);

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
    if (filtroCliente) {
      filtered = filtered.filter(evt => evt.cliente_id === filtroCliente);
    }

    return filtered;
  }, [eventos, filtroTipo, filtroPrioridad, filtroEstado, filtroCliente]);

  const obtenerEventosDia = useCallback(
    (fecha: Date) =>
      eventosFiltrados.filter((evento) => isSameDay(new Date(evento.fecha_inicio), fecha)),
    [eventosFiltrados]
  );

  const obtenerColorEvento = useCallback((tipo: string) => {
    const colores: Record<string, string> = {
      cita: "bg-blue-100 text-blue-800 border-blue-200",
      llamada: "bg-green-100 text-green-800 border-green-200",
      email: "bg-purple-100 text-purple-800 border-purple-200",
      visita: "bg-orange-100 text-orange-800 border-orange-200",
      seguimiento: "bg-yellow-100 text-yellow-800 border-yellow-200",
      recordatorio: "bg-red-100 text-red-800 border-red-200",
      tarea: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return colores[tipo] || "bg-gray-100 text-gray-800 border-gray-200";
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

  const abrirModalNuevoEvento = () => {
    setEventoActivo(null);
    setMostrarModalEvento(true);
  };

  const abrirModalEvento = (evento: Evento) => {
    setEventoActivo(evento);
    setMostrarModalEvento(true);
  };

  const handleCerrarModal = () => {
    setEventoActivo(null);
    setMostrarModalEvento(false);
  };

  const handleEventoGuardado = () => {
    handleCerrarModal();
    cargarEventos();
  };

  // Quick Actions handlers
  const handleMarcarCompletado = async (evento: Evento, e: React.MouseEvent) => {
    e.stopPropagation();
    if (procesandoAccion) return;

    setProcesandoAccion(true);
    try {
      const result = await cambiarEstadoEvento(evento.id, 'completado');
      if (result.success) {
        toast.success(result.message);
        cargarEventos();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
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
    } catch (error) {
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

  const eventosFuturos = useMemo(
    () =>
      ordenarEventos(
        eventosFiltrados.filter((evento) => new Date(evento.fecha_inicio) >= new Date())
      ).slice(0, 5),
    [eventosFiltrados, ordenarEventos]
  );

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
          <button
            type="button"
            onClick={() => setFechaActual(dia)}
            key={dia.toISOString()}
            className={`min-h-[80px] sm:min-h-[120px] p-1 sm:p-2 border border-crm-border rounded-lg transition-all duration-200 hover:shadow-md text-left ${
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
                    className={`text-xs p-1 rounded border cursor-pointer hover:shadow-sm transition-all duration-200 ${obtenerColorEvento(evento.tipo)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      abrirModalEvento(evento);
                    }}
                  >
                    <div className="truncate font-medium text-xs">{evento.titulo}</div>
                    <div className="text-xs opacity-75 hidden sm:block">
                      {format(new Date(evento.fecha_inicio), "HH:mm")}
                    </div>
                  </div>
                ))}
              {eventosDia.length > 2 && (
                <div className="text-xs text-crm-text-muted text-center">
                  +{eventosDia.length - 2} más
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );

  const renderSemana = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
      {dias.map((dia) => {
        const eventosDia = ordenarEventos(obtenerEventosDia(dia));
        return (
          <div key={dia.toISOString()} className="crm-card p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-crm-text-muted uppercase">
                  {format(dia, "EEE", { locale: es })}
                </p>
                <p className="text-lg font-semibold text-crm-text-primary">
                  {format(dia, "d")}
                </p>
              </div>
              {isToday(dia) && (
                <span className="text-xs px-2 py-1 bg-crm-primary/10 text-crm-primary rounded-full">
                  Hoy
                </span>
              )}
            </div>

            <div className="space-y-2">
              {eventosDia.length === 0 ? (
                <p className="text-xs text-crm-text-muted">Sin eventos</p>
              ) : (
                eventosDia.map((evento) => {
                  const eventoAny = evento as any;
                  const tieneTelefono = eventoAny.cliente?.telefono;
                  return (
                    <div
                      key={evento.id}
                      className={`group relative p-2 border rounded-lg cursor-pointer transition-all ${obtenerColorEvento(evento.tipo)}`}
                      onClick={() => abrirModalEvento(evento)}
                    >
                      <p className="text-xs font-semibold truncate pr-8">{evento.titulo}</p>
                      <p className="text-[11px] opacity-80">
                        {format(new Date(evento.fecha_inicio), "HH:mm")}
                        {evento.fecha_fin
                          ? ` - ${format(new Date(evento.fecha_fin), "HH:mm")}`
                          : ""}
                      </p>

                      {/* Quick Actions - solo checkmark y calendario en vista semana por espacio */}
                      <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {evento.estado !== 'completado' && (
                          <button
                            onClick={(e) => handleMarcarCompletado(evento, e)}
                            className="p-1 bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
                            title="Completar"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={(e) => handleAbrirReprogramar(evento, e)}
                          className="p-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                          title="Reprogramar"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

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
          eventosDiaSeleccionado.map((evento) => {
            const eventoAny = evento as any;
            const tieneTelefono = eventoAny.cliente?.telefono;
            return (
              <div
                key={evento.id}
                className={`group relative p-3 border rounded-lg hover:shadow transition-all cursor-pointer ${obtenerColorEvento(evento.tipo)}`}
                onClick={() => abrirModalEvento(evento)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{evento.titulo}</p>
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
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {evento.estado !== 'completado' && (
                      <button
                        onClick={(e) => handleMarcarCompletado(evento, e)}
                        className="p-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
                        title="Marcar como completado"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={(e) => handleAbrirReprogramar(evento, e)}
                      className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                      title="Reprogramar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>
                    {tieneTelefono && (
                      <>
                        <button
                          onClick={(e) => handleLlamar(evento, e)}
                          className="p-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors"
                          title="Llamar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => handleWhatsApp(evento, e)}
                          className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded transition-colors"
                          title="WhatsApp"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="crm-card p-1">
        <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-1">
          {([
            { key: "calendario", label: "Calendario", icon: "📅" },
            { key: "recordatorios", label: "Recordatorios", icon: "⏰" },
            { key: "notificaciones", label: "Notificaciones", icon: "🔔" },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setVistaActualTab(tab.key)}
              className={`flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                vistaActualTab === tab.key
                  ? "bg-crm-primary text-white shadow-lg"
                  : "text-crm-text-muted hover:text-crm-text-primary hover:bg-crm-border"
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <span className="hidden xs:inline">{tab.label}</span>
                <span className="xs:hidden">{tab.icon}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {vistaActualTab === "calendario" ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="crm-card p-3 sm:p-4 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-crm-text-muted truncate">Eventos Hoy</p>
                  <p className="text-xl sm:text-2xl font-bold text-crm-text-primary">{eventosHoy}</p>
                </div>
              </div>
            </div>

            <div className="crm-card p-3 sm:p-4 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-crm-text-muted truncate">Esta Semana</p>
                  <p className="text-xl sm:text-2xl font-bold text-crm-text-primary">{eventosEstaSemana}</p>
                </div>
              </div>
            </div>

            <div className="crm-card p-3 sm:p-4 hover:shadow-lg transition-all duration-200 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-crm-text-muted truncate">Pendientes</p>
                  <p className="text-xl sm:text-2xl font-bold text-crm-text-primary">{eventosPendientes}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="crm-card p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 space-y-4 sm:space-y-0">
              <h2 className="text-xl sm:text-2xl font-bold text-crm-text-primary text-center sm:text-left">
                {tituloVista.charAt(0).toUpperCase() + tituloVista.slice(1)}
              </h2>

              <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                <div className="flex bg-crm-border rounded-lg p-1 w-full sm:w-auto">
                  {([
                    { key: "mes", label: "Mes", icon: "📅" },
                    { key: "semana", label: "Semana", icon: "📊" },
                    { key: "dia", label: "Día", icon: "📋" },
                  ] as const).map((opcion) => (
                    <button
                      key={opcion.key}
                      onClick={() => setVista(opcion.key)}
                      className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-1 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
                        vista === opcion.key
                          ? "bg-crm-primary text-white shadow-md"
                          : "text-crm-text-muted hover:text-crm-text-primary hover:bg-crm-sidebar-hover"
                      }`}
                    >
                      <span className="hidden sm:inline">{opcion.label}</span>
                      <span className="sm:hidden">{opcion.icon}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <button
                    onClick={() => navegarPeriodo("anterior")}
                    className="flex-1 sm:flex-none p-2 text-crm-text-muted hover:text-crm-text-primary hover:bg-crm-border rounded-lg transition-colors"
                    title="Periodo anterior"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <button
                    onClick={irHoy}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-crm-primary bg-crm-primary/10 hover:bg-crm-primary/20 rounded-lg transition-colors"
                  >
                    <span className="hidden sm:inline">Hoy</span>
                    <span className="sm:hidden">📅</span>
                  </button>

                  <button
                    onClick={() => navegarPeriodo("siguiente")}
                    className="flex-1 sm:flex-none p-2 text-crm-text-muted hover:text-crm-text-primary hover:bg-crm-border rounded-lg transition-colors"
                    title="Periodo siguiente"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {vista === "mes" && renderMes()}
            {vista === "semana" && renderSemana()}
            {vista === "dia" && renderDia()}
          </div>

          <div className="crm-card p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-crm-text-primary mb-3 sm:mb-4">Próximos eventos</h3>
            <div className="space-y-2 sm:space-y-3">
              {eventosFuturos.map((evento) => (
                <div
                  key={evento.id}
                  className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-crm-border/30 rounded-lg hover:bg-crm-border/50 transition-all duration-200 cursor-pointer"
                  onClick={() => abrirModalEvento(evento)}
                >
                  <div
                    className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${
                      obtenerColorEvento(evento.tipo).split(" ")[0]
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-crm-text-primary truncate">
                      {evento.titulo}
                    </p>
                    <p className="text-xs text-crm-text-muted">
                      {format(new Date(evento.fecha_inicio), "dd/MM/yyyy HH:mm", { locale: es })}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${obtenerColorEvento(evento.tipo)}`}>
                    <span className="hidden sm:inline">{evento.tipo}</span>
                    <span className="sm:hidden">{evento.tipo.charAt(0).toUpperCase()}</span>
                  </span>
                </div>
              ))}
              {eventosFuturos.length === 0 && (
                <p className="text-crm-text-muted text-center py-4 text-sm">No hay eventos próximos</p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
            <button
              onClick={abrirModalNuevoEvento}
              className="crm-button-primary px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium flex items-center justify-center space-x-2 w-full sm:w-auto"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Crear evento</span>
            </button>

            <button
              onClick={cargarEventos}
              className="px-4 sm:px-6 py-2.5 sm:py-3 text-crm-primary bg-crm-primary/10 hover:bg-crm-primary/20 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors w-full sm:w-auto"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Actualizar</span>
            </button>

            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors w-full sm:w-auto ${
                mostrarFiltros || filtroTipo || filtroPrioridad || filtroEstado || filtroCliente
                  ? 'crm-button-primary'
                  : 'text-crm-text-secondary bg-crm-bg-secondary hover:bg-crm-border'
              }`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Filtros</span>
              {(filtroTipo || filtroPrioridad || filtroEstado || filtroCliente) && (
                <span className="ml-1 px-2 py-0.5 bg-white rounded-full text-xs">
                  {[filtroTipo, filtroPrioridad, filtroEstado, filtroCliente].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          {/* Panel de Filtros */}
          {mostrarFiltros && (
            <div className="mt-4 p-4 bg-crm-bg-secondary rounded-lg border border-crm-border">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

                <div>
                  <label className="text-sm font-medium text-crm-text-primary block mb-2">Cliente</label>
                  <select
                    value={filtroCliente}
                    onChange={(e) => setFiltroCliente(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                  >
                    <option value="">Todos</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(filtroTipo || filtroPrioridad || filtroEstado || filtroCliente) && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      setFiltroTipo('');
                      setFiltroPrioridad('');
                      setFiltroEstado('');
                      setFiltroCliente('');
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-crm-text-primary">Reprogramar Evento</h2>
                <button
                  onClick={() => {
                    setMostrarModalReprogramar(false);
                    setEventoReprogramar(null);
                  }}
                  className="p-2 hover:bg-crm-border rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-crm-text-muted">Evento:</p>
                <p className="font-medium text-crm-text-primary">{eventoReprogramar.titulo}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-crm-text-primary">Nueva fecha y hora</label>
                <input
                  type="datetime-local"
                  value={nuevaFechaReprogramar}
                  onChange={(e) => setNuevaFechaReprogramar(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-crm-text-primary border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary"
                  required
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
        clientes={clientes}
        propiedades={propiedades}
        oportunidades={oportunidades}
      />
    </div>
  );
}
