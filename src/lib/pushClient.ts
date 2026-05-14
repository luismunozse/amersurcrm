"use client";

import { supabaseBrowser } from "@/lib/supabaseBrowser";

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface RegisterOptions {
  vapidPublicKey: string;
  serviceWorkerPath?: string;
  onSubscribed?: () => void;
  onPermissionDenied?: () => void;
}

export async function registerPushSubscription({
  vapidPublicKey,
  serviceWorkerPath = "/sw.js",
  onSubscribed,
  onPermissionDenied,
}: RegisterOptions) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return;
  }

  // Si el permiso fue denegado, no continuar
  if (Notification.permission === "denied") {
    onPermissionDenied?.();
    return;
  }

  // Si el permiso aún no se ha otorgado, no solicitar aquí
  // Dejar que NotificationPermissionPrompt lo maneje primero
  if (Notification.permission !== "granted") {
    return;
  }

  // El SW de Serwist ya se registra globalmente en ServiceWorkerRegistration.tsx.
  // Acá reutilizamos la registración existente o esperamos a que esté lista.
  let swRegistration = await navigator.serviceWorker.getRegistration(serviceWorkerPath);
  if (!swRegistration) {
    swRegistration = await navigator.serviceWorker.register(serviceWorkerPath, { scope: "/" });
  }

  // Asegurarnos de que el Service Worker esté activo/controlando la página
  const controllingRegistration = await navigator.serviceWorker.ready;

  // El permiso ya está granted, no necesitamos solicitarlo
  const permission = Notification.permission;

  if (permission !== "granted") {
    onPermissionDenied?.();
    return;
  }

  const pushManager = controllingRegistration.pushManager;
  const existingSubscription = await pushManager.getSubscription();
  let subscription = existingSubscription;
  if (!subscription) {
    try {
      subscription = await pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    } catch (error) {
      const err = error as Error;
      // AbortError = servicio push no disponible (localhost sin HTTPS, FCM/Mozilla bloqueado, dev sin red).
      // No es fatal: app funciona sin push. Log silencioso, no error.
      if (err?.name === "AbortError" || err?.message?.includes("push service")) {
        console.warn("[push] Servicio push no disponible (omitiendo suscripción)");
      } else {
        console.warn("[push] No se pudo crear suscripción:", err?.message ?? err);
      }
      return;
    }
  }

  const p256dh = subscription.getKey("p256dh");
  const auth = subscription.getKey("auth");

  if (!p256dh || !auth) return;

  const supabase = supabaseBrowser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("push_subscription").upsert(
    {
      usuario_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: arrayBufferToBase64(p256dh),
      auth: arrayBufferToBase64(auth),
    },
    { onConflict: "usuario_id,endpoint" },
  );

  onSubscribed?.();
}

/**
 * Cancela suscripción push del browser y borra el registro DB.
 * El permiso del navegador queda en 'granted' (no se puede revocar desde JS);
 * para revocar permiso el usuario debe hacerlo desde settings del browser.
 */
export async function unsubscribePush(): Promise<{ unsubscribed: boolean; endpoint?: string }> {
  if (typeof window === "undefined") return { unsubscribed: false };
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { unsubscribed: false };
  }

  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!registration) return { unsubscribed: false };

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return { unsubscribed: false };

  const endpoint = subscription.endpoint;

  try {
    await subscription.unsubscribe();
  } catch (err) {
    console.warn("[push] No se pudo cancelar suscripción browser:", err);
  }

  const supabase = supabaseBrowser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from("push_subscription")
      .delete()
      .eq("usuario_id", user.id)
      .eq("endpoint", endpoint);
  }

  return { unsubscribed: true, endpoint };
}

/**
 * Indica si hay suscripción activa del browser actual.
 */
export async function tieneSuscripcionPushActiva(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!registration) return false;

  const subscription = await registration.pushManager.getSubscription();
  return subscription !== null;
}
