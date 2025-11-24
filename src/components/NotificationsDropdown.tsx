"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { marcarNotificacionLeida, marcarTodasLeidas } from "@/app/_actionsNotifications";
import type { Notificacion, NotificacionNoLeida } from "@/types/crm";
import { createClient, createRealtimeClient } from "@/lib/supabase.client";
import toast from "react-hot-toast";

type NotificacionInsertPayload = {
  new: NotificacionNoLeida & { usuario_id?: string | null };
};

type NotificacionUpdatePayload = {
  new: Notificacion & { usuario_id?: string | null };
};

interface NotificationsDropdownProps {
  notificaciones: NotificacionNoLeida[];
  count: number;
}

const tipoIcons = {
  cliente: "👤",
  proyecto: "🏢",
  lote: "🏠",
  sistema: "⚙️",
  evento: "📅",
  recordatorio: "⏰",
  venta: "💰",
  reserva: "📝",
};

const tipoColors = {
  cliente: "text-blue-600",
  proyecto: "text-green-600",
  lote: "text-orange-600",
  sistema: "text-gray-600",
  evento: "text-purple-600",
  recordatorio: "text-yellow-600",
  venta: "text-emerald-600",
  reserva: "text-indigo-600",
};

export default function NotificationsDropdown({ notificaciones, count }: NotificationsDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState(notificaciones);
  const [unreadCount, setUnreadCount] = useState(count);
  const [userId, setUserId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Obtener userId y configurar audio
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        console.log('👤 Usuario conectado:', user.id, '| Email:', user.email);
        setUserId(user.id);
      }
    });

    // Precargar sonido de notificación (desactivado temporalmente)
    // TODO: Descargar un sonido desde https://notificationsounds.com/
    // y guardarlo como /public/notification.mp3
    // if (typeof window !== 'undefined') {
    //   audioRef.current = new Audio('/notification.mp3');
    //   audioRef.current.volume = 0.5;
    // }
  }, []);

  useEffect(() => {
    setItems(notificaciones);
    setUnreadCount(count);
  }, [notificaciones, count]);

  // Realtime: Suscribirse a nuevas notificaciones
  useEffect(() => {
    if (!userId) return;

    let channel: any = null;
    let supabase: any = null;

    // OBTENER SESIÓN Y CONFIGURAR REALTIME
    const setupRealtime = async () => {
      // OBTENER SESIÓN DEL CLIENTE SSR
      const ssupabase = createClient();
      const { data: { session } } = await ssupabase.auth.getSession();

      if (!session) {
        console.error('❌ No hay sesión activa');
        return;
      }

      console.log('🔑 Sesión obtenida, token JWT presente:', !!session.access_token);

      // CREAR CLIENTE REALTIME Y SINCRONIZAR SESIÓN
      supabase = createRealtimeClient();

      // IMPORTANTE: Establecer la sesión manualmente
      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      console.log('🔌 Conectando a notificaciones en tiempo real...');
      console.log('🎯 Filtrando notificaciones para usuario_id:', userId);
      console.log('⚠️ PRUEBA FINAL: Patrón recomendado por Supabase');

      channel = supabase.channel(`notificaciones:${userId}`);
      console.log('📝 Canal creado:', channel);

      // IMPORTANTE: Registrar todos los listeners ANTES de suscribirse
      console.log('📝 Registrando listener de broadcast...');
      console.log('📝 Bindings ANTES de broadcast:', Object.keys(channel.bindings));

      channel.on(
        'broadcast',
        { event: 'test' },
        (payload: { payload: unknown }) => {
          console.log('📻 [BROADCAST RECIBIDO]', payload);
          toast.success('Broadcast funciona! ' + JSON.stringify(payload.payload));
        }
      );

      console.log('📝 Bindings DESPUÉS de broadcast:', Object.keys(channel.bindings));
      console.log('📝 Listener de broadcast registrado');

      console.log('📝 Registrando listener de postgres_changes...');
      console.log('📝 Bindings ANTES de postgres_changes:', Object.keys(channel.bindings));

      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'crm',
          table: 'notificacion',
          filter: `usuario_id=eq.${userId}`
        },
        (payload: NotificacionInsertPayload) => {
          console.log('🔔 [INSERT RECIBIDO]', payload.new);
          console.log('📦 [PAYLOAD COMPLETO]', payload);

          const newNotif = payload.new;

          // Filtrar manualmente en el cliente
          if (newNotif.usuario_id && newNotif.usuario_id !== userId) {
            console.log('⏭️ Notificación ignorada - no es para este usuario');
            return;
          }

          console.log('✅ Notificación es para este usuario - procesando...');

          // Agregar a la lista (máximo 20)
          setItems((prev) => [newNotif, ...prev].slice(0, 20));
          setUnreadCount((prev) => prev + 1);

          // Toast de notificación
          toast.success(newNotif.titulo, {
            icon: tipoIcons[newNotif.tipo as keyof typeof tipoIcons] || '🔔',
            duration: 4000,
          });

          // Notificación del navegador
          if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
              new Notification(newNotif.titulo, {
                body: newNotif.mensaje,
                icon: '/logo-amersur.png',
                badge: '/logo-amersur.png',
                tag: newNotif.id,
              });
            } else if (Notification.permission === 'default') {
              Notification.requestPermission().then((permission) => {
                if (permission === 'granted') {
                  new Notification(newNotif.titulo, {
                    body: newNotif.mensaje,
                    icon: '/logo-amersur.png',
                    badge: '/logo-amersur.png',
                    tag: newNotif.id,
                  });
                }
              });
            }
          }

          // Reproducir sonido
          if (audioRef.current) {
            audioRef.current.play().catch((e) => {
              console.log('No se pudo reproducir el sonido:', e);
            });
          }
        }
      );

      console.log('📝 Bindings DESPUÉS de postgres_changes:', Object.keys(channel.bindings));
      console.log('📝 Listener de INSERT registrado');

      console.log('📝 Registrando listener de UPDATE...');
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'crm',
          table: 'notificacion',
          filter: `usuario_id=eq.${userId}`
        },
        (payload: NotificacionUpdatePayload) => {
          const updatedNotif = payload.new;

          // Si se marcó como leída, remover de la lista
          if (updatedNotif.leida) {
            setItems((prev) => prev.filter((n) => n.id !== updatedNotif.id));
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      );

      console.log('📝 Bindings DESPUÉS de UPDATE:', Object.keys(channel.bindings));
      console.log('📝 Listener de UPDATE registrado');

      console.log('📝 Suscribiendo al canal...');
      console.log('📝 Bindings FINAL antes de subscribe:', Object.keys(channel.bindings));
      channel.subscribe((status: string, err?: unknown) => {
        console.log('📡 Estado de suscripción:', status);
        if (err) {
          console.error('❌ Error en suscripción:', err);
        }

        if (status === 'SUBSCRIBED') {
          console.log('✅ Conectado a notificaciones en tiempo real');
          console.log('📋 Estado del canal:', channel.state);

          // Inspeccionar qué listeners están registrados
          console.log('👂 Bindings del canal:', channel.bindings);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error al conectar a notificaciones en tiempo real');
        } else if (status === 'TIMED_OUT') {
          console.warn('⏱️ Timeout al conectar a notificaciones');
        } else if (status === 'CLOSED') {
          console.log('🔌 Desconectado de notificaciones en tiempo real');
        }
      });
    };

    // Ejecutar setup
    setupRealtime();

    // Cleanup: desconectar cuando el componente se desmonte
    return () => {
      if (channel && supabase) {
        console.log('🔌 Desconectando de notificaciones...');
        supabase.removeChannel(channel);
      }
    };
  }, [userId]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (notificacionId: string) => {
    try {
      await marcarNotificacionLeida(notificacionId);
      setItems((prev) => prev.filter((item) => item.id !== notificacionId));
      setUnreadCount((prev) => (prev > 0 ? prev - 1 : 0));
      router.refresh();
    } catch (error) {
      console.error("Error al marcar notificación como leída:", error);
    }
  };

  const handleNotificationClick = async (notificacion: NotificacionNoLeida) => {
    // Marcar como leída
    await handleMarkAsRead(notificacion.id);

    // Cerrar el dropdown
    setIsOpen(false);

    // Navegar a la URL si existe
    if (notificacion.data?.url) {
      router.push(notificacion.data.url as string);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await marcarTodasLeidas();
      setItems([]);
      setUnreadCount(0);
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error al marcar todas como leídas:", error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Ahora";
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-crm-text-secondary hover:text-crm-text-primary hover:bg-crm-card-hover rounded-lg transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] px-1 h-[18px] bg-crm-danger text-white rounded-full text-[10px] leading-[18px] font-semibold text-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Overlay */}
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-crm-border z-50">
            <div className="p-4 border-b border-crm-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-crm-text-primary">
                  Notificaciones
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-sm text-crm-primary hover:text-crm-primary/80"
                  >
                    Marcar todas como leídas
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {items.length > 0 ? (
                <div className="divide-y divide-crm-border">
                  {items.map((notificacion) => (
                    <div
                      key={notificacion.id}
                      className="p-4 hover:bg-crm-card-hover transition-colors cursor-pointer"
                      onClick={() => handleNotificationClick(notificacion)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <span className="text-2xl">
                            {tipoIcons[notificacion.tipo]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-medium ${tipoColors[notificacion.tipo]}`}>
                              {notificacion.titulo}
                            </p>
                            <span className="text-xs text-crm-text-muted">
                              {formatTimeAgo(notificacion.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-crm-text-secondary mt-1 line-clamp-2">
                            {notificacion.mensaje}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="text-4xl mb-2">🔔</div>
                  <p className="text-crm-text-muted">No hay notificaciones</p>
                  <p className="text-xs text-crm-text-muted mt-1">
                    Te notificaremos cuando haya novedades
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
