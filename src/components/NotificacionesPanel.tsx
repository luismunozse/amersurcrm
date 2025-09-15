"use client";

import { useState, useEffect } from "react";
import { format, isToday, isYesterday, addDays } from "date-fns";
import { es } from "date-fns/locale";
import toast from "react-hot-toast";

interface Notificacion {
  id: string;
  tipo: 'evento' | 'recordatorio' | 'sistema' | 'venta' | 'reserva';
  titulo: string;
  mensaje: string;
  leida: boolean;
  fecha: string;
  data?: any;
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
}

interface NotificacionesPanelProps {
  vendedorId: string;
}

const TIPOS_NOTIFICACION = {
  'evento': { label: 'Evento', icon: '📅', color: 'bg-blue-100 text-blue-800' },
  'recordatorio': { label: 'Recordatorio', icon: '⏰', color: 'bg-orange-100 text-orange-800' },
  'sistema': { label: 'Sistema', icon: '⚙️', color: 'bg-gray-100 text-gray-800' },
  'venta': { label: 'Venta', icon: '💰', color: 'bg-green-100 text-green-800' },
  'reserva': { label: 'Reserva', icon: '🔒', color: 'bg-purple-100 text-purple-800' }
};

const PRIORIDADES = {
  'baja': { label: 'Baja', color: 'text-gray-600', bg: 'bg-gray-100' },
  'media': { label: 'Media', color: 'text-blue-600', bg: 'bg-blue-100' },
  'alta': { label: 'Alta', color: 'text-orange-600', bg: 'bg-orange-100' },
  'urgente': { label: 'Urgente', color: 'text-red-600', bg: 'bg-red-100' }
};

export default function NotificacionesPanel({ vendedorId }: NotificacionesPanelProps) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<'todas' | 'no_leidas' | 'hoy' | 'sistema'>('todas');

  useEffect(() => {
    cargarNotificaciones();
  }, [vendedorId, filtro]);

  const cargarNotificaciones = async () => {
    try {
      setCargando(true);
      // Simular carga de notificaciones - en producción esto vendría de la API
      const notificacionesSimuladas: Notificacion[] = [
        {
          id: '1',
          tipo: 'recordatorio',
          titulo: 'Recordatorio: Llamar a Juan',
          mensaje: 'Tienes programada una llamada con Juan Pérez mañana a las 10:00 AM',
          leida: false,
          fecha: new Date().toISOString(),
          prioridad: 'alta'
        },
        {
          id: '2',
          tipo: 'evento',
          titulo: 'Evento próximo: Visita con Ana',
          mensaje: 'Visita programada con Ana García - Proyecto Central, Lote 5 en 2 horas',
          leida: false,
          fecha: new Date().toISOString(),
          prioridad: 'media'
        },
        {
          id: '3',
          tipo: 'venta',
          titulo: '¡Nueva venta confirmada!',
          mensaje: 'Se ha confirmado la venta del Lote 8 por $150,000. ¡Felicitaciones!',
          leida: true,
          fecha: addDays(new Date(), -1).toISOString(),
          prioridad: 'alta'
        },
        {
          id: '4',
          tipo: 'reserva',
          titulo: 'Nueva reserva pendiente',
          mensaje: 'Carlos López ha realizado una reserva del Lote 12. Revisar documentación.',
          leida: false,
          fecha: addDays(new Date(), -2).toISOString(),
          prioridad: 'media'
        },
        {
          id: '5',
          tipo: 'sistema',
          titulo: 'Actualización del sistema',
          mensaje: 'El sistema se actualizará esta noche a las 2:00 AM. Guarda tu trabajo.',
          leida: true,
          fecha: addDays(new Date(), -3).toISOString(),
          prioridad: 'baja'
        },
        {
          id: '6',
          tipo: 'recordatorio',
          titulo: 'Recordatorio: Enviar documentos',
          mensaje: 'Recordatorio para enviar los documentos de reserva a María González',
          leida: false,
          fecha: addDays(new Date(), -1).toISOString(),
          prioridad: 'alta'
        }
      ];

      setNotificaciones(notificacionesSimuladas);
    } catch (error) {
      console.error("Error cargando notificaciones:", error);
      toast.error("Error cargando notificaciones");
    } finally {
      setCargando(false);
    }
  };

  const marcarComoLeida = async (id: string) => {
    try {
      setNotificaciones(prev => 
        prev.map(n => n.id === id ? { ...n, leida: true } : n)
      );
      toast.success("Notificación marcada como leída");
    } catch (error) {
      console.error("Error marcando notificación:", error);
      toast.error("Error marcando notificación");
    }
  };

  const marcarTodasComoLeidas = async () => {
    try {
      setNotificaciones(prev => 
        prev.map(n => ({ ...n, leida: true }))
      );
      toast.success("Todas las notificaciones marcadas como leídas");
    } catch (error) {
      console.error("Error marcando notificaciones:", error);
      toast.error("Error marcando notificaciones");
    }
  };

  const eliminarNotificacion = async (id: string) => {
    try {
      setNotificaciones(prev => prev.filter(n => n.id !== id));
      toast.success("Notificación eliminada");
    } catch (error) {
      console.error("Error eliminando notificación:", error);
      toast.error("Error eliminando notificación");
    }
  };

  const obtenerFechaRelativa = (fecha: string) => {
    const fechaNotificacion = new Date(fecha);
    
    if (isToday(fechaNotificacion)) {
      return { texto: 'Hoy', color: 'text-blue-600', bg: 'bg-blue-100' };
    } else if (isYesterday(fechaNotificacion)) {
      return { texto: 'Ayer', color: 'text-gray-600', bg: 'bg-gray-100' };
    } else {
      return { 
        texto: format(fechaNotificacion, 'dd/MM', { locale: es }), 
        color: 'text-gray-600', 
        bg: 'bg-gray-100' 
      };
    }
  };

  const notificacionesFiltradas = notificaciones.filter(notificacion => {
    switch (filtro) {
      case 'no_leidas':
        return !notificacion.leida;
      case 'hoy':
        return isToday(new Date(notificacion.fecha));
      case 'sistema':
        return notificacion.tipo === 'sistema';
      default:
        return true;
    }
  });

  const estadisticas = {
    total: notificaciones.length,
    noLeidas: notificaciones.filter(n => !n.leida).length,
    hoy: notificaciones.filter(n => isToday(new Date(n.fecha))).length,
    urgentes: notificaciones.filter(n => n.prioridad === 'urgente' && !n.leida).length
  };

  if (cargando) {
    return (
      <div className="crm-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-crm-border rounded"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-crm-border rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="crm-card p-4 text-center">
          <div className="text-2xl font-bold text-crm-text-primary">{estadisticas.total}</div>
          <div className="text-sm text-crm-text-muted">Total</div>
        </div>
        <div className="crm-card p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{estadisticas.noLeidas}</div>
          <div className="text-sm text-crm-text-muted">No leídas</div>
        </div>
        <div className="crm-card p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{estadisticas.hoy}</div>
          <div className="text-sm text-crm-text-muted">Hoy</div>
        </div>
        <div className="crm-card p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{estadisticas.urgentes}</div>
          <div className="text-sm text-crm-text-muted">Urgentes</div>
        </div>
      </div>

      {/* Filtros y acciones */}
      <div className="crm-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'todas', label: 'Todas' },
              { key: 'no_leidas', label: 'No leídas' },
              { key: 'hoy', label: 'Hoy' },
              { key: 'sistema', label: 'Sistema' }
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFiltro(f.key as any)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  filtro === f.key
                    ? 'bg-crm-primary text-white'
                    : 'bg-crm-border text-crm-text-muted hover:bg-crm-sidebar-hover hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {estadisticas.noLeidas > 0 && (
            <button
              onClick={marcarTodasComoLeidas}
              className="px-4 py-2 text-sm font-medium text-crm-primary bg-crm-primary/10 hover:bg-crm-primary/20 rounded-lg transition-colors"
            >
              Marcar todas como leídas
            </button>
          )}
        </div>
      </div>

      {/* Lista de Notificaciones */}
      <div className="space-y-3">
        {notificacionesFiltradas.length === 0 ? (
          <div className="crm-card p-8 text-center">
            <div className="text-crm-text-muted">
              <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.828 7l2.586 2.586a2 2 0 002.828 0L16 7l-6 6-6-6z" />
              </svg>
              <p>No hay notificaciones para mostrar</p>
            </div>
          </div>
        ) : (
          notificacionesFiltradas.map((notificacion) => {
            const fechaRelativa = obtenerFechaRelativa(notificacion.fecha);
            const tipoInfo = TIPOS_NOTIFICACION[notificacion.tipo];
            const prioridadInfo = PRIORIDADES[notificacion.prioridad];

            return (
              <div
                key={notificacion.id}
                className={`crm-card p-4 hover:shadow-lg transition-all duration-200 ${
                  !notificacion.leida ? 'border-l-4 border-l-crm-primary' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-lg">{tipoInfo.icon}</span>
                      <h3 className={`text-sm font-medium ${
                        !notificacion.leida ? 'text-crm-text-primary' : 'text-crm-text-muted'
                      }`}>
                        {notificacion.titulo}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${tipoInfo.color}`}>
                        {tipoInfo.label}
                      </span>
                      {!notificacion.leida && (
                        <span className="w-2 h-2 bg-crm-primary rounded-full"></span>
                      )}
                    </div>

                    <p className={`text-sm mb-2 ${
                      !notificacion.leida ? 'text-crm-text-secondary' : 'text-crm-text-muted'
                    }`}>
                      {notificacion.mensaje}
                    </p>

                    <div className="flex items-center space-x-4 text-xs text-crm-text-muted">
                      <div className="flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className={`px-2 py-1 rounded-full ${fechaRelativa.bg} ${fechaRelativa.color}`}>
                          {fechaRelativa.texto} {format(new Date(notificacion.fecha), 'HH:mm')}
                        </span>
                      </div>

                      <span className={`px-2 py-1 rounded-full ${prioridadInfo.bg} ${prioridadInfo.color}`}>
                        {prioridadInfo.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {!notificacion.leida && (
                      <button
                        onClick={() => marcarComoLeida(notificacion.id)}
                        className="p-2 text-crm-text-muted hover:text-crm-primary transition-colors"
                        title="Marcar como leída"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => eliminarNotificacion(notificacion.id)}
                      className="p-2 text-crm-text-muted hover:text-red-600 transition-colors"
                      title="Eliminar notificación"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
