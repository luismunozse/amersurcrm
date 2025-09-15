"use client";

import { useState } from "react";
import { marcarNotificacionLeida, marcarTodasLeidas } from "@/app/_actionsNotifications";
import type { NotificacionNoLeida } from "@/types/crm";

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

export default function NotificationsDropdown({ notificaciones, count }: NotificationsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleMarkAsRead = async (notificacionId: string) => {
    try {
      await marcarNotificacionLeida(notificacionId);
    } catch (error) {
      console.error("Error al marcar notificación como leída:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await marcarTodasLeidas();
      setIsOpen(false);
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
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-crm-text-secondary hover:text-crm-text-primary hover:bg-crm-card-hover rounded-lg transition-colors"
        aria-label="Notificaciones"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v-6H4v6zM4 13h6V7H4v6z"/>
        </svg>
        {count > 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 bg-crm-danger rounded-full" />
        )}
      </button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-crm-border z-50">
            <div className="p-4 border-b border-crm-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-crm-text-primary">
                  Notificaciones
                </h3>
                {count > 0 && (
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
              {notificaciones.length > 0 ? (
                <div className="divide-y divide-crm-border">
                  {notificaciones.map((notificacion) => (
                    <div
                      key={notificacion.id}
                      className="p-4 hover:bg-crm-card-hover transition-colors cursor-pointer"
                      onClick={() => handleMarkAsRead(notificacion.id)}
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
