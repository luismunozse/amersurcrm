"use client";

import { useEffect } from "react";

/**
 * Registra el Service Worker generado por Serwist en `/sw.js`.
 *
 * - Solo se ejecuta en browsers que soportan SW y en protocolos seguros
 *   (https o localhost). En `http://` (excepto localhost) no aplica.
 * - Se deshabilita durante dev para evitar conflicto con HMR.
 *
 * NOTA importante: NO hacemos `window.location.reload()` en `controllerchange`.
 * Con `skipWaiting + clientsClaim` configurados en el SW, cualquier reinstalación
 * (normal tras un deploy, o por inestabilidad en iOS standalone) dispara
 * `controllerchange` y generaría un loop de reload. El browser toma el SW nuevo
 * en la próxima navegación; no hace falta reload forzado.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        // Desregistrar el SW legacy de solo-push si está registrado.
        // Sus handlers ahora viven dentro del SW de Serwist en /sw.js.
        const legacy = await navigator.serviceWorker.getRegistration("/notifications-sw.js");
        if (legacy) {
          try {
            await legacy.unregister();
          } catch {
            // ignorar; si falla, el nuevo SW igual tomará control.
          }
        }

        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch (error) {
        console.warn("No se pudo registrar el service worker:", error);
      }
    };

    // Esperar al evento load para no competir con el render inicial
    let cleanup: (() => void) | null = null;
    if (document.readyState === "complete") {
      void register();
    } else {
      const handler = () => void register();
      window.addEventListener("load", handler, { once: true });
      cleanup = () => window.removeEventListener("load", handler);
    }

    return () => {
      cleanup?.();
    };
  }, []);

  return null;
}
