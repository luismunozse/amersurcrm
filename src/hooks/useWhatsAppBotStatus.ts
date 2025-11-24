"use client";

import { useState, useEffect } from "react";

export interface WhatsAppBotState {
  connected: boolean;
  qr: string | null;
  phoneNumber: string | null;
  lastUpdate: string;
  error: string | null;
}

/**
 * Hook para obtener estado del bot de WhatsApp en tiempo real via SSE
 */
export function useWhatsAppBotStatus() {
  const [state, setState] = useState<WhatsAppBotState>({
    connected: false,
    qr: null,
    phoneNumber: null,
    lastUpdate: new Date().toISOString(),
    error: null,
  });

  const [isConnecting, setIsConnecting] = useState(true);

  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connect = () => {
      try {
        eventSource = new EventSource("/api/whatsapp/bot/stream");

        eventSource.onopen = () => {
          console.log("[WhatsAppBotStatus] Conectado a SSE");
          setIsConnecting(false);
        };

        eventSource.onmessage = (event) => {
          try {
            const newState = JSON.parse(event.data);
            setState(newState);
          } catch (error) {
            console.error("[WhatsAppBotStatus] Error parseando mensaje:", error);
          }
        };

        eventSource.onerror = (error) => {
          console.error("[WhatsAppBotStatus] Error en SSE:", error);
          setIsConnecting(true);

          // Cerrar y reintentar en 5 segundos
          eventSource?.close();
          setTimeout(connect, 5000);
        };
      } catch (error) {
        console.error("[WhatsAppBotStatus] Error creando EventSource:", error);
        setIsConnecting(true);
      }
    };

    connect();

    return () => {
      eventSource?.close();
    };
  }, []);

  return {
    ...state,
    isConnecting,
  };
}
