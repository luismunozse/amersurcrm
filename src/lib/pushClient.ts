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
  serviceWorkerPath = "/notifications-sw.js",
  onSubscribed,
  onPermissionDenied,
}: RegisterOptions) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return;
  }

  if (Notification.permission === "denied") {
    onPermissionDenied?.();
    return;
  }

  const swRegistration = await navigator.serviceWorker.register(serviceWorkerPath, { scope: "/" });

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") {
    onPermissionDenied?.();
    return;
  }

  const existingSubscription = await swRegistration.pushManager.getSubscription();
  const subscription =
    existingSubscription ??
    (await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }));

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
