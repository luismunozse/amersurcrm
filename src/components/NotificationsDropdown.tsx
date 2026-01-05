"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { marcarNotificacionLeida, marcarTodasLeidas } from "@/app/_actionsNotifications";
import type { NotificacionNoLeida } from "@/types/crm";
import { dedupeNotifications } from "@/lib/notifications/dedupe";
import { createClient } from "@/lib/supabase.client";

type NotificacionRow = NotificacionNoLeida & {
  usuario_id?: string | null;
  leida?: boolean | null;
  data?: Record<string, unknown> | null;
};

const tipoIcons: Record<string, string> = {
  cliente: "👤",
  proyecto: "🏢",
  lote: "🏠",
  sistema: "⚙️",
  evento: "📅",
  recordatorio: "⏰",
  venta: "💰",
  reserva: "🔒",
  lead_asignado: "🌱",
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
  lead_asignado: "text-crm-primary",
};

interface NotificationsDropdownProps {
  notificaciones: NotificacionNoLeida[];
  count: number;
}

function normalizePayload(payload: NotificacionRow): NotificacionNoLeida {
  return {
    id: payload.id,
    tipo: (payload.tipo ?? "sistema") as NotificacionNoLeida["tipo"],
    titulo: payload.titulo,
    mensaje: payload.mensaje,
    data: payload.data ?? undefined,
    created_at: payload.created_at ?? new Date().toISOString(),
  };
}

function showBrowserNotification(notificacion: NotificacionNoLeida) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  // Solo mostrar si el permiso ya fue otorgado
  // No solicitar permiso aquí - eso lo maneja NotificationPermissionPrompt
  if (Notification.permission === "granted") {
    new Notification(notificacion.titulo, {
      body: notificacion.mensaje,
      icon: "/logo-amersur.png",
      badge: "/logo-amersur.png",
      tag: notificacion.id,
    });
  }
}

export default function NotificationsDropdown({ notificaciones, count }: NotificationsDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState(() => dedupeNotifications(notificaciones));
  const [unreadCount, setUnreadCount] = useState(count);
  const itemsRef = useRef(items);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    setItems(dedupeNotifications(notificaciones));
    setUnreadCount(count);
  }, [notificaciones, count]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const unlockAudio = async () => {
      if (audioUnlockedRef.current || !audioRef.current) return;

      audioRef.current.muted = true;
      try {
        await audioRef.current.play();
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.muted = false;
        audioUnlockedRef.current = true;
      } catch {
        audioRef.current.muted = false;
      }
    };

    const handleInteraction = () => {
      void unlockAudio();
    };

    window.addEventListener("click", handleInteraction);
    window.addEventListener("keydown", handleInteraction);

    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, []);

  const handleRealtimeInsert = useCallback((payload: NotificacionRow, currentUserId: string) => {
    // Filtro client-side: solo procesar notificaciones del usuario actual
    if (!payload || payload.usuario_id !== currentUserId) {
      return;
    }

    const normalized = normalizePayload(payload);
    const alreadyExists = itemsRef.current.some((item) => item.id === normalized.id);

    setItems((prev) => dedupeNotifications([normalized, ...prev]).slice(0, 20));
    if (!alreadyExists) {
      setUnreadCount((prev) => prev + 1);
    }

    toast.success(normalized.titulo, {
      icon: tipoIcons[normalized.tipo] ?? "🔔",
      duration: 4000,
    });

    showBrowserNotification(normalized);
    if (audioUnlockedRef.current && audioRef.current) {
      audioRef.current.currentTime = 0;
      void audioRef.current.play().catch(() => {
        // Ignorar rechazos de autoplay
      });
    }
  }, []);

  const handleRealtimeUpdate = useCallback((payload: NotificacionRow, currentUserId: string) => {
    if (!payload || payload.usuario_id !== currentUserId) {
      return;
    }

    const normalized = normalizePayload(payload);

    if (payload.leida) {
      const existed = itemsRef.current.some((item) => item.id === normalized.id);
      setItems((prev) => prev.filter((item) => item.id !== normalized.id));
      if (existed) {
        setUnreadCount((prev) => (prev > 0 ? prev - 1 : 0));
      }
      return;
    }

    setItems((prev) => {
      const idx = prev.findIndex((item) => item.id === normalized.id);
      if (idx === -1) {
        return prev;
      }
      const updated = [...prev];
      updated[idx] = { ...updated[idx], ...normalized };
      return updated;
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;
    const maxRetryDelay = 60000; // Máximo 60 segundos
    const errorNotifiedRef = { current: false };

    const cleanupChannel = () => {
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };

    // Exponential backoff: 2^n * 1000ms, máximo 60 segundos
    const getRetryDelay = () => {
      const delay = Math.min(Math.pow(2, retryCount) * 1000, maxRetryDelay);
      retryCount++;
      return delay;
    };

    const scheduleRetry = () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      const delay = getRetryDelay();
      retryTimeout = setTimeout(() => {
        if (isMounted) {
          void setupRealtime();
        }
      }, delay);
    };

    const handleStatusChange = (status: string) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        if (!errorNotifiedRef.current) {
          // Usar ID fijo para evitar toasts duplicados y no bloquear la UI
          toast.error("No se pudo conectar a notificaciones en tiempo real. Reintentando...", {
            id: "realtime-notifications-error",
            duration: 4000,
          });
          errorNotifiedRef.current = true;
        }
        scheduleRetry();
      }

      if (status === "SUBSCRIBED") {
        toast.dismiss("realtime-notifications-error");
        errorNotifiedRef.current = false;
        retryCount = 0;
      }
    };

    const handleRealtimeDelete = (payload: { old: NotificacionRow }) => {
      if (!payload.old) return;
      const deletedId = payload.old.id;
      const existed = itemsRef.current.some((item) => item.id === deletedId);
      setItems((prev) => prev.filter((item) => item.id !== deletedId));
      if (existed && !payload.old.leida) {
        setUnreadCount((prev) => (prev > 0 ? prev - 1 : 0));
      }
    };

    const setupRealtime = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !isMounted) {
        return;
      }

      cleanupChannel();

      // NOTA: No usar filter en Realtime - tiene problemas con UUIDs en schemas no-públicos
      // El filtro se aplica client-side en handleRealtimeInsert/Update (valida usuario_id)
      channel = supabase
        .channel(`notificaciones:${user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "crm", table: "notificacion" },
          (event) => handleRealtimeInsert(event.new as NotificacionRow, user.id),
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "crm", table: "notificacion" },
          (event) => handleRealtimeUpdate(event.new as NotificacionRow, user.id),
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "crm", table: "notificacion" },
          (event) => handleRealtimeDelete(event as unknown as { old: NotificacionRow }),
        )
        .subscribe(handleStatusChange);
    };

    void setupRealtime();

    return () => {
      isMounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      cleanupChannel();
    };
  }, [handleRealtimeInsert, handleRealtimeUpdate, supabase]);

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

    // Navegar según el tipo de notificación
    if (notificacion.data?.url) {
      router.push(notificacion.data.url as string);
    } else if (notificacion.tipo === "lead_asignado" && notificacion.data?.cliente_id) {
      router.push(`/dashboard/clientes/${notificacion.data.cliente_id}`);
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
                  <button onClick={handleMarkAllAsRead} className="text-sm text-crm-primary hover:text-crm-primary/80">
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
                            <span className="text-xs text-crm-text-muted">{formatTimeAgo(notificacion.created_at)}</span>
                          </div>
                          <p className="text-sm text-crm-text-secondary mt-1 line-clamp-2">{notificacion.mensaje}</p>
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

            <div className="p-4 border-t border-crm-border bg-crm-card-hover/40">
              <Link
                href="/dashboard/notificaciones"
                className="flex items-center justify-center w-full text-sm font-medium text-crm-primary hover:text-white hover:bg-crm-primary rounded-lg px-3 py-2 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Ver todas las notificaciones
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
