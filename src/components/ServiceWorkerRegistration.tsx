"use client";

import { useEffect } from "react";

/**
 * Registra el Service Worker generado por Serwist en `/sw.js`.
 *
 * - Solo se ejecuta en browsers que soportan SW y en protocolos seguros
 *   (https o localhost). En `http://` (excepto localhost) no aplica.
 * - Se deshabilita durante dev para evitar conflicto con HMR.
 * - Detecta nuevas versiones y recarga automáticamente la app cuando
 *   el SW nuevo toma control (evita que PWA siga sirviendo assets viejos
 *   tras un deploy; típico en iOS/Android con stale-while-revalidate).
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Guard para evitar bucles de reload: solo recargamos una vez por sesión.
    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    let registration: ServiceWorkerRegistration | null = null;
    let visibilityHandler: (() => void) | null = null;

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

        registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

        // Chequear actualizaciones cuando la pestaña/PWA vuelve a primer plano.
        // Esto es lo que permite que un deploy se vea sin matar la app.
        visibilityHandler = () => {
          if (document.visibilityState === "visible") {
            registration?.update().catch(() => {
              // silencioso: offline u otros errores no bloqueantes
            });
          }
        };
        document.addEventListener("visibilitychange", visibilityHandler);
      } catch (error) {
        console.warn("No se pudo registrar el service worker:", error);
      }
    };

    // Esperar al evento load para no competir con el render inicial
    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      if (visibilityHandler) {
        document.removeEventListener("visibilitychange", visibilityHandler);
      }
    };
  }, []);

  return null;
}
