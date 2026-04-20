import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

// Extiende el tipo global para permitir acceso a __SW_MANIFEST (inyectado por Serwist al build).
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Rutas autenticadas: NUNCA cachear HTML/RSC — siempre ir a red.
// iOS standalone tiende a servir caches obsoletos del SW (datos viejos o
// vistos sin sesión). Las APIs también deben ir a red para no servir
// respuestas con auth desactualizado.
const authenticatedRoutes: RuntimeCaching[] = [
  {
    matcher: ({ url, request, sameOrigin }) => {
      if (!sameOrigin) return false;
      const path = url.pathname;
      if (path.startsWith("/dashboard") || path.startsWith("/api/")) return true;
      // RSC payloads: `_rsc` query param o accept header con text/x-component
      if (url.searchParams.has("_rsc")) return true;
      const accept = request.headers.get("accept") ?? "";
      if (accept.includes("text/x-component")) return true;
      return false;
    },
    handler: new NetworkOnly(),
  },
  // Imágenes cross-origin desde Supabase Storage: NetworkOnly sin cachear.
  // iOS standalone falla al servir respuestas opacas cacheadas del SW
  // (imágenes grises/rotas); dejarlas ir directo a red evita el bug.
  {
    matcher: ({ url, request }) => {
      if (request.destination !== "image") return false;
      const host = url.hostname;
      return (
        host.endsWith(".supabase.co") ||
        host.endsWith(".supabase.in") ||
        host.endsWith(".supabase.com")
      );
    },
    handler: new NetworkOnly(),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // Orden importa: las reglas de autenticadas van ANTES del defaultCache.
  runtimeCaching: [...authenticatedRoutes, ...defaultCache],
  // Página de fallback cuando no hay red y la ruta no está cacheada.
  // Solo aplica a navegaciones que no matchearon las reglas anteriores
  // (por ejemplo, la home pública o /login).
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => {
          if (request.destination !== "document") return false;
          // No dar fallback offline a rutas autenticadas — ya van NetworkOnly.
          // Si están sin red, el browser muestra su error nativo, lo cual
          // es preferible a un offline engañoso con datos stale.
          try {
            const path = new URL(request.url).pathname;
            return !path.startsWith("/dashboard");
          } catch {
            return true;
          }
        },
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
