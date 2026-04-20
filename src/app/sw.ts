import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

// Extiende el tipo global para permitir acceso a __SW_MANIFEST (inyectado por Serwist al build).
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  // Página de fallback cuando no hay red y la ruta no está cacheada
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();

// ============================================================
// Integración de Web Push (antes vivía en /notifications-sw.js)
// ============================================================
interface PushPayload {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  data?: { url?: string } & Record<string, unknown>;
  tag?: string;
  renotify?: boolean;
}

self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  let payload: PushPayload;
  try {
    payload = event.data.json() as PushPayload;
  } catch {
    payload = { title: "Nueva notificación", body: event.data.text() };
  }

  const title = payload.title ?? "Nueva notificación";
  const options: NotificationOptions = {
    body: payload.body ?? "",
    icon: payload.icon ?? "/favicon.ico",
    badge: payload.badge ?? "/favicon.ico",
    data: payload.data ?? {},
    tag: payload.tag,
  };
  // `renotify` es opcional y no está tipado en todas las versiones de lib.dom
  if (payload.renotify !== undefined) {
    (options as Notification & { renotify?: boolean }).renotify = payload.renotify;
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  const data = (event.notification.data as { url?: string } | undefined) ?? {};
  const targetUrl = data.url ?? "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.postMessage({ type: "notification-click", data });
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      }),
  );
});
