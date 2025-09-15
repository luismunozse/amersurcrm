import { getCachedNotificacionesNoLeidas, getCachedNotificacionesCount } from "@/lib/cache.server";
import FloatingNotificationsButton from "./FloatingNotificationsButton";
import { Suspense } from "react";

async function FloatingNotificationsContent() {
  const [notifications, unreadCount] = await Promise.all([
    getCachedNotificacionesNoLeidas(),
    getCachedNotificacionesCount(),
  ]);

  return (
    <FloatingNotificationsButton notifications={notifications} unreadCount={unreadCount} />
  );
}

export default function FloatingNotifications() {
  return (
    <Suspense fallback={
      <div className="fixed bottom-6 right-6 z-50">
        <button
          type="button"
          className="w-14 h-14 bg-crm-primary/50 text-white rounded-full shadow-lg flex items-center justify-center animate-pulse"
          aria-label="Cargando notificaciones"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v-6H4v6zM4 13h6V7H4v6z"/>
          </svg>
        </button>
      </div>
    }>
      <FloatingNotificationsContent />
    </Suspense>
  );
}
