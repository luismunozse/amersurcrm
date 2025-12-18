"use client";

import { useEffect } from "react";

/**
 * Componente que filtra errores de desarrollo causados por el conflicto
 * entre Turbopack HMR y Supabase Realtime WebSocket.
 *
 * Solo activo en desarrollo. No renderiza nada.
 */
export default function DevErrorFilter() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;

      // Filtrar errores de HMR ping (conflicto Turbopack + Supabase Realtime)
      if (
        error instanceof Error &&
        error.message?.includes("unrecognized HMR message")
      ) {
        event.preventDefault();
        return;
      }

      // También filtrar si el mensaje contiene el ping de Supabase
      if (
        typeof error === "string" &&
        (error.includes("unrecognized HMR message") ||
         error.includes('{"event":"ping"}'))
      ) {
        event.preventDefault();
        return;
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
