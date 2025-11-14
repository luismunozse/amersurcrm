"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { marcarNotificacionLeida, marcarTodasLeidas } from "@/app/_actionsNotifications";
import type { NotificacionNoLeida } from "@/types/crm";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import toast from "react-hot-toast";
import { dedupeNotifications } from "@/lib/notifications/dedupe";

interface NotificationsDropdownProps {
  notificaciones: NotificacionNoLeida[];
  count: number;
}

const tipoIcons = {
  cliente: "👤",
  proyecto: "🏢",
  lote: "🏠",
  sistema: "⚙️",
};

const tipoColors = {
  cliente: "text-blue-600",
  proyecto: "text-green-600",
  lote: "text-orange-600",
  sistema: "text-gray-600",
};

// Intervalo de polling en milisegundos (15 segundos)
const POLLING_INTERVAL = 15000;

export default function NotificationsDropdownPolling({ notificaciones, count }: NotificationsDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState(() => dedupeNotifications(notificaciones));
  const [unreadCount, setUnreadCount] = useState(count);
  const [userId, setUserId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastCheckRef = useRef<Date>(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Obtener userId
  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (user) {
        setUserId(user.id);
      }
    });
  }, []);

  useEffect(() => {
    setItems(dedupeNotifications(notificaciones));
    setUnreadCount(count);
  }, [notificaciones, count]);

  // Función para verificar nuevas notificaciones
  const checkNewNotifications = async () => {
    if (!userId) return;

    const supabase = supabaseBrowser();

    // Consultar notificaciones creadas después del último check
    const { data, error } = await supabase
      .schema("crm")
      .from("notificacion")
      .select("*")
      .eq("usuario_id", userId)
      .eq("leida", false)
      .gt("created_at", lastCheckRef.current.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error al verificar notificaciones:", error);
      return;
    }

    if (data && data.length > 0) {
      // Agregar nuevas notificaciones al inicio de la lista
      setItems((prev) => dedupeNotifications([...data, ...prev]).slice(0, 20));
      setUnreadCount((prev) => prev + data.length);

      // Mostrar toast solo para la más reciente
      const newest = data[0] as NotificacionNoLeida;
      toast.success(newest.titulo, {
        icon: tipoIcons[newest.tipo as keyof typeof tipoIcons] || "🔔",
        duration: 4000,
      });

      // Notificación del navegador
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification(newest.titulo, {
            body: newest.mensaje,
            icon: "/logo-amersur.png",
            badge: "/logo-amersur.png",
            tag: newest.id,
          });
        } else if (Notification.permission === "default") {
          Notification.requestPermission().then((permission) => {
            if (permission === "granted") {
              new Notification(newest.titulo, {
                body: newest.mensaje,
                icon: "/logo-amersur.png",
                badge: "/logo-amersur.png",
                tag: newest.id,
              });
            }
          });
        }
      }

      // Reproducir sonido
      if (audioRef.current) {
        audioRef.current.play().catch(() => {
          // Silenciar error de autoplay
        });
      }
    }

    // Actualizar timestamp del último check
    lastCheckRef.current = new Date();
  };

  // Configurar polling
  useEffect(() => {
    if (!userId) return;

    // Ejecutar el primer check inmediatamente
    checkNewNotifications();

    // Configurar intervalo
    intervalRef.current = setInterval(checkNewNotifications, POLLING_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
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
