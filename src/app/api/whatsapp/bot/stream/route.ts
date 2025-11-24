"use server";

import { NextRequest } from "next/server";
import { getBotState, addStateListener, removeStateListener } from "@/lib/whatsapp-bot-state";
import { esAdmin } from "@/lib/auth/roles";

/**
 * GET /api/whatsapp/bot/stream
 *
 * Server-Sent Events (SSE) para enviar estado del bot al dashboard en tiempo real
 * Solo accesible para administradores
 */
export async function GET(request: NextRequest) {
  // Verificar que sea admin
  const isAdmin = await esAdmin();
  if (!isAdmin) {
    return new Response("Forbidden", { status: 403 });
  }

  // Crear stream SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Enviar estado inicial inmediatamente
      const initialState = getBotState();
      const initialData = `data: ${JSON.stringify(initialState)}\n\n`;
      controller.enqueue(encoder.encode(initialData));

      // Listener para cambios de estado
      const listener = (state: typeof initialState) => {
        try {
          const data = `data: ${JSON.stringify(state)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch (error) {
          console.error('[WhatsAppBotStream] Error enviando estado:', error);
        }
      };

      // Agregar listener
      addStateListener(listener);

      // Heartbeat cada 30 segundos para mantener conexión viva
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch (error) {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Cleanup cuando el cliente se desconecta
      request.signal.addEventListener('abort', () => {
        console.log('[WhatsAppBotStream] Cliente desconectado');
        clearInterval(heartbeat);
        removeStateListener(listener);
        try {
          controller.close();
        } catch (error) {
          // Ya cerrado
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
