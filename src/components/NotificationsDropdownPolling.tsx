"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { marcarNotificacionLeida, marcarTodasLeidas } from "@/app/_actionsNotifications";
import type { NotificacionNoLeida } from "@/types/crm";
import type { NotificacionItem } from "@/types/notificaciones";
import { dedupeNotifications } from "@/lib/notifications/dedupe";

interface NotificationsDropdownProps {
  notificaciones: NotificacionNoLeida[];
  count: number;
}

const tipoIcons: Record<string, string> = {
  cliente: "👤",
  proyecto: "🏢",
  lote: "🏠",
  sistema: "⚙️",
  evento: "📅",
  recordatorio: "⏰",
  venta: "💰",
  reserva: "🔒",
};

const tipoColors: Record<string, string> = {
  cliente: "text-blue-600",
  proyecto: "text-green-600",
  lote: "text-orange-600",
  sistema: "text-gray-600",
  evento: "text-blue-600",
  recordatorio: "text-orange-600",
  venta: "text-green-600",
  reserva: "text-purple-600",
};

const POLLING_INTERVAL = 15000;

export default function NotificationsDropdownPolling({ notificaciones, count }: NotificationsDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState(() => dedupeNotifications(notificaciones));
  const [unreadCount, setUnreadCount] = useState(count);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastCheckRef = useRef<Date>(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setItems(dedupeNotifications(notificaciones));
    setUnreadCount(count);
  }, [notificaciones, count]);

  const convertToDropdownItems = useCallback((data: NotificacionItem[]): NotificacionNoLeida[] => {
    return data.map((item) => ({
      id: item.id,
      tipo: (item.tipo ?? "sistema") as NotificacionNoLeida["tipo"],
      titulo: item.titulo,
      mensaje: item.mensaje,
      data: item.data ?? undefined,
      created_at: item.createdAt,
    }));
  }, []);

  const checkNewNotifications = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        unread: "true",
        since: lastCheckRef.current.toISOString(),
      });
      const response = await fetch(`/api/notificaciones?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status !== 401) {
          const message =
            (payload as { error?: string })?.error ??
            `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;
          console.error("Error al verificar notificaciones:", message);
        }
        return;
      }

      const data = ((payload as { data?: NotificacionItem[] })?.data ?? []) as NotificacionItem[];
      if (data.length > 0) {
        const parsed = convertToDropdownItems(data);
        setItems((prev) => dedupeNotifications([...parsed, ...prev]).slice(0, 20));
        setUnreadCount((prev) => prev + parsed.length);

        const newest = parsed[0];
        toast.success(newest.titulo, {
          icon: tipoIcons[newest.tipo as keyof typeof tipoIcons] || "🔔",
          duration: 4000,
        });

        if (typeof window !== "undefined" && "Notification" in window) {
          const showNotification = () =>
            new Notification(newest.titulo, {
              body: newest.mensaje,
              icon: "/logo-amersur.png",
              badge: "/logo-amersur.png",
              tag: newest.id,
            });

          if (Notification.permission === "granted") {
            showNotification();
          } else if (Notification.permission === "default") {
            Notification.requestPermission().then((permission) => {
              if (permission === "granted") {
                showNotification();
              }
            });
          }
        }

        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {
            // Ignorar rechazo de autoplay
          });
        }
      }

      lastCheckRef.current = new Date();
    } catch (error) {
      console.error("Error al verificar notificaciones:", error);
    }
  }, [convertToDropdownItems]);

  useEffect(() => {
    checkNewNotifications();
    intervalRef.current = setInterval(checkNewNotifications, POLLING_INTERVAL);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [checkNewNotifications]);

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
    await handleMarkAsRead(notificacion.id);
    setIsOpen(false);
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
      <audio ref={audioRef} src="/notification.mp3" preload="auto" className="hidden" aria-hidden="true" />
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
          <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-crm-border z-50">
            <div className="p-4 border-b border-crm-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-crm-text-primary">Notificaciones</h3>
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
                        <span className="text-2xl">{tipoIcons[notificacion.tipo] ?? "🔔"}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-medium ${tipoColors[notificacion.tipo] ?? "text-crm-text-primary"}`}>
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
                  <p className="text-xs text-crm-text-muted mt-1">Te notificaremos cuando haya novedades</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-crm-border bg-crm-card-hover/40">
            <Link
              href="/dashboard/notificaciones"
              className="flex items-center justify-center w-full text-sm font-medium text-crm-primary hover:text-white hover:bg-crm-primary rounded-lg px-3 py-2 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Ver todas las notificaciones
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
