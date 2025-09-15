"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import {
  marcarNotificacionLeida,
  marcarTodasLeidas,
} from "@/app/_actionsNotifications";
import { NotificacionNoLeida } from "@/types/crm";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface FloatingNotificationsButtonProps {
  notifications: NotificacionNoLeida[];
  unreadCount: number;
}

export default function FloatingNotificationsButton({
  notifications,
  unreadCount,
}: FloatingNotificationsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleMarkAsRead = (id: string) => {
    startTransition(async () => {
      try {
        await marcarNotificacionLeida(id);
        toast.success("Notificación marcada como leída");
      } catch (error) {
        toast.error("Error al marcar notificación");
      }
    });
  };

  const handleMarkAllAsRead = () => {
    startTransition(async () => {
      try {
        await marcarTodasLeidas();
        toast.success("Todas las notificaciones marcadas como leídas");
        setIsOpen(false);
      } catch (error) {
        toast.error("Error al marcar todas las notificaciones");
      }
    });
  };

  const getIcon = (type: NotificacionNoLeida["tipo"]) => {
    switch (type) {
      case "cliente":
        return "👤";
      case "proyecto":
        return "🏢";
      case "lote":
        return "🏠";
      case "sistema":
        return "⚙️";
      default:
        return "🔔";
    }
  };

  const getColorClass = (type: NotificacionNoLeida["tipo"]) => {
    switch (type) {
      case "cliente":
        return "text-crm-primary";
      case "proyecto":
        return "text-crm-success";
      case "lote":
        return "text-crm-warning";
      case "sistema":
        return "text-crm-info";
      default:
        return "text-crm-text-secondary";
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50" ref={dropdownRef}>
      {/* Botón flotante */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-14 h-14 bg-crm-primary hover:bg-crm-primary/90 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group"
        aria-label="Notificaciones"
      >
        <svg
          className="h-6 w-6 transition-transform group-hover:scale-110"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-5 5v-5zM4 19h6v-6H4v6zM4 13h6V7H4v6z"
          />
        </svg>
        
        {/* Badge de notificaciones no leídas */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-6 w-6 bg-crm-danger text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panel de notificaciones */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-2xl ring-1 ring-black ring-opacity-5 border border-crm-border">
          <div className="px-4 py-3 border-b border-crm-border flex justify-between items-center">
            <h3 className="text-lg font-semibold text-crm-text-primary">
              Notificaciones {unreadCount > 0 && `(${unreadCount})`}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={isPending}
                className="text-sm text-crm-primary hover:underline disabled:opacity-50"
              >
                {isPending ? "Marcando..." : "Marcar todas"}
              </button>
            )}
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleMarkAsRead(notif.id)}
                  className={cn(
                    "flex items-start space-x-3 p-3 border-b border-crm-border cursor-pointer hover:bg-crm-card-hover transition-colors",
                    !notif.leida && "bg-crm-card-hover/50"
                  )}
                >
                  <div className={cn("text-xl", getColorClass(notif.tipo))}>
                    {getIcon(notif.tipo)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-crm-text-primary">
                      {notif.titulo}
                    </p>
                    <p className="text-xs text-crm-text-muted mt-1">
                      {notif.mensaje}
                    </p>
                    <p className="text-xs text-crm-text-muted mt-1">
                      {formatDistanceToNow(new Date(notif.created_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-crm-text-muted">
                <div className="text-4xl mb-2">🔔</div>
                <p>No hay notificaciones</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
