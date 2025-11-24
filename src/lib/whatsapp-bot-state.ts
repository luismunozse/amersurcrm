/**
 * Estado compartido del bot de WhatsApp
 * Usado para comunicar estado entre el bot y el dashboard via SSE
 */

export interface WhatsAppBotState {
  connected: boolean;
  qr: string | null;
  phoneNumber: string | null;
  lastUpdate: string;
  error: string | null;
}

// Estado en memoria (se reinicia al reiniciar el servidor)
let botState: WhatsAppBotState = {
  connected: false,
  qr: null,
  phoneNumber: null,
  lastUpdate: new Date().toISOString(),
  error: null,
};

// Listeners para SSE
type StateListener = (state: WhatsAppBotState) => void;
const listeners: Set<StateListener> = new Set();

/**
 * Obtener estado actual del bot
 */
export function getBotState(): WhatsAppBotState {
  return { ...botState };
}

/**
 * Actualizar estado del bot
 */
export function updateBotState(newState: Partial<WhatsAppBotState>): void {
  botState = {
    ...botState,
    ...newState,
    lastUpdate: new Date().toISOString(),
  };

  // Notificar a todos los listeners (SSE connections)
  notifyListeners();
}

/**
 * Agregar listener para cambios de estado (SSE)
 */
export function addStateListener(listener: StateListener): void {
  listeners.add(listener);
}

/**
 * Remover listener
 */
export function removeStateListener(listener: StateListener): void {
  listeners.delete(listener);
}

/**
 * Notificar a todos los listeners
 */
function notifyListeners(): void {
  const state = getBotState();
  listeners.forEach((listener) => {
    try {
      listener(state);
    } catch (error) {
      console.error('[WhatsAppBotState] Error notificando listener:', error);
    }
  });
}

/**
 * Limpiar QR después de conexión exitosa
 */
export function clearQR(): void {
  updateBotState({ qr: null });
}
