"use server";

import { NextRequest, NextResponse } from "next/server";
import { updateBotState, clearQR } from "@/lib/whatsapp-bot-state";

const WHATSAPP_BOT_API_KEY = process.env.WHATSAPP_BOT_API_KEY;

/**
 * GET /api/whatsapp/bot/status
 *
 * Obtiene el estado actual del bot (para debugging)
 */
export async function GET(_request: NextRequest) {
  const { getBotState } = await import("@/lib/whatsapp-bot-state");
  return NextResponse.json(getBotState());
}

/**
 * POST /api/whatsapp/bot/status
 *
 * Recibe actualizaciones de estado del bot de WhatsApp
 * Llamado por el bot para reportar QR, conexión, errores, etc.
 */
export async function POST(request: NextRequest) {
  try {
    // Validar autenticación
    const apiKey = request.headers.get("x-api-key") || request.headers.get("authorization")?.replace("Bearer ", "");

    if (!WHATSAPP_BOT_API_KEY) {
      console.error("[WhatsAppBotStatus] WHATSAPP_BOT_API_KEY no configurada");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    if (apiKey !== WHATSAPP_BOT_API_KEY) {
      console.warn("[WhatsAppBotStatus] API Key inválida");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parsear body
    const body = await request.json().catch(() => ({}));

    const {
      connected,
      qr,
      phoneNumber,
      error,
    } = body;

    // Obtener estado previo
    const { getBotState } = await import("@/lib/whatsapp-bot-state");
    const previousState = getBotState();

    // Actualizar estado global
    updateBotState({
      connected: connected ?? false,
      qr: qr ?? null,
      phoneNumber: phoneNumber ?? null,
      error: error ?? null,
    });

    // Si se conectó exitosamente, limpiar QR
    if (connected === true && qr === null) {
      clearQR();
    }

    // Solo loguear si el estado cambió (no cada heartbeat)
    const stateChanged =
      previousState.connected !== connected ||
      previousState.phoneNumber !== phoneNumber ||
      (previousState.qr === null) !== (qr === null) ||
      previousState.error !== error;

    if (stateChanged) {
      console.log(`[WhatsAppBotStatus] Estado actualizado: connected=${connected}, hasQR=${!!qr}, phone=${phoneNumber}`);
    }

    return NextResponse.json({
      success: true,
      message: "Estado actualizado",
    });
  } catch (error) {
    console.error("[WhatsAppBotStatus] Error:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
