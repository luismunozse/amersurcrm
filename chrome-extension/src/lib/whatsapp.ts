/**
 * Utilidades para extraer información de WhatsApp Web
 *
 * Estrategia de selectores:
 * - Cada elemento tiene múltiples selectores ordenados por estabilidad
 * - Los data-testid son los más estables (usados internamente por WhatsApp)
 * - Los selectores de clase/estructura son fallback
 * - Si todos fallan, se loguea un warning para actualizar los selectores
 */

import { WhatsAppContact } from '@/types/crm';

// Logger liviano inline - no importar logger.ts para evitar code-splitting
// (content scripts de Chrome no soportan ES module imports)
const logger = {
  debug: (..._args: any[]) => {},
  warn: (msg: string, ...args: any[]) => console.warn(`[WhatsApp] ${msg}`, ...args),
  error: (msg: string, err?: Error) => console.error(`[WhatsApp] ${msg}`, err || ''),
};

// ─── Registro de selectores con fallbacks ────────────────────────────────
// Ordenados por estabilidad: data-testid > aria > estructura DOM

const SELECTORS = {
  /** Header del chat activo */
  chatHeader: [
    'header',
    '[data-testid="conversation-header"]',
    '#main header',
  ],
  /** Span del nombre/teléfono en el header */
  headerContactSpan: [
    '[data-testid="conversation-info-header"] span[dir="auto"]',
    '[data-testid="conversation-title"] span[dir="auto"]',
    'header span[title][dir="auto"]',
    'header span[dir="auto"]',
  ],
  /** Info del header (botón clickeable con datos del contacto) */
  headerInfoButton: [
    '[data-testid="conversation-info-header"]',
    '[data-testid="contact-info-drawer"]',
    'header [role="button"]',
  ],
  /** Mensajes entrantes (del contacto) */
  incomingMessage: [
    '[data-testid="msg-container"].message-in',
    '.message-in',
    'div[data-id][class*="message-in"]',
  ],
  /** Texto seleccionable dentro de un mensaje */
  messageText: [
    'span.selectable-text.copyable-text span',
    'span.selectable-text span[dir="ltr"]',
    'span.selectable-text span',
    'span[dir="ltr"]',
  ],
  /** Input de texto de WhatsApp */
  chatInput: [
    '[data-testid="conversation-compose-box-input"]',
    'footer [contenteditable="true"][data-tab="10"]',
    'footer [contenteditable="true"]',
    '[contenteditable="true"][data-tab="10"]',
    'div[contenteditable="true"][role="textbox"]',
  ],
} as const;

// ─── Helpers de selectores ───────────────────────────────────────────────

/**
 * Intenta encontrar UN elemento usando una lista de selectores.
 * Devuelve el primero que encuentra o null.
 */
function queryFirst(selectors: readonly string[], parent: ParentNode = document): Element | null {
  for (const sel of selectors) {
    try {
      const el = parent.querySelector(sel);
      if (el) return el;
    } catch {
      // Selector inválido en esta versión del DOM, ignorar
    }
  }
  return null;
}

/**
 * Intenta encontrar TODOS los elementos usando una lista de selectores.
 * Devuelve los del primer selector que encuentre resultados.
 */
function queryAll(selectors: readonly string[], parent: ParentNode = document): Element[] {
  for (const sel of selectors) {
    try {
      const els = parent.querySelectorAll(sel);
      if (els.length > 0) return Array.from(els);
    } catch {
      // Selector inválido, ignorar
    }
  }
  return [];
}

// ─── Extracción de datos ─────────────────────────────────────────────────

/**
 * Extrae el número de teléfono del contacto activo.
 * Estrategia: URL > aria-label del header > spans del header.
 */
export function extractPhoneNumber(): string | null {
  // 1. Desde la URL (más confiable - no depende del DOM)
  const urlMatch = window.location.href.match(/\/(\d{10,15})(@|$)/);
  if (urlMatch?.[1]) {
    return '+' + urlMatch[1];
  }

  // 2. Desde aria-label del botón de info del header
  const headerBtn = queryFirst(SELECTORS.headerInfoButton);
  if (headerBtn) {
    const ariaLabel = headerBtn.getAttribute('aria-label') || headerBtn.getAttribute('title') || '';
    const match = ariaLabel.match(/\+?[\d\s()-]+/);
    if (match && match[0].replace(/[^\d]/g, '').length >= 10) {
      return match[0].replace(/[^\d+]/g, '');
    }
  }

  // 3. Buscar en spans del header
  const phone = findPhoneInHeaderSpans();
  if (phone) return phone;

  logger.debug('No se pudo extraer número de teléfono');
  return null;
}

/**
 * Busca un número de teléfono en los spans del header.
 */
function findPhoneInHeaderSpans(): string | null {
  const spans = queryAll(SELECTORS.headerContactSpan);

  for (const span of spans) {
    const text = span.textContent?.trim();
    if (!text) continue;

    const match = text.match(/\+?[\d\s()-]+/);
    if (!match) continue;

    const cleaned = match[0].replace(/[^\d+]/g, '');
    const digitCount = cleaned.replace(/\+/g, '').length;

    if (digitCount >= 10) {
      return cleaned.startsWith('+') ? cleaned : '+' + cleaned;
    }
  }
  return null;
}

/**
 * Extrae el nombre del contacto activo.
 */
export function extractContactName(): string | null {
  const spans = queryAll(SELECTORS.headerContactSpan);

  for (const span of spans) {
    const text = span.textContent?.trim();
    if (!text) continue;

    // Saltar si es solo un número de teléfono
    if (/^\+?[\d\s()-]+$/.test(text)) continue;

    // Si tiene letras, es probablemente un nombre
    if (/[a-zA-ZáéíóúñÁÉÍÓÚÑ]/.test(text) && text.length > 0) {
      return text;
    }
  }

  logger.debug('No se pudo extraer nombre del contacto');
  return null;
}

/**
 * Extrae el chat ID del chat activo.
 */
export function extractChatId(): string | null {
  // 1. Desde la URL
  const urlMatch = window.location.href.match(/\/(\d{10,15})(@|$)/);
  if (urlMatch?.[1]) return urlMatch[1];

  // 2. Desde el número del header
  const phone = findPhoneInHeaderSpans();
  if (phone) return phone.replace(/[^\d]/g, '');

  logger.debug('No se pudo extraer chat ID');
  return null;
}

/**
 * Obtiene el último mensaje recibido del contacto.
 * Busca dentro de los contenedores .message-in y filtra timestamps/estados.
 */
export function getLastReceivedMessage(): string | null {
  const incomingMessages = queryAll(SELECTORS.incomingMessage);

  if (incomingMessages.length === 0) {
    logger.debug('No se encontraron mensajes entrantes');
    return null;
  }

  // Recorrer desde el último (más reciente) hacia atrás
  for (let i = incomingMessages.length - 1; i >= Math.max(0, incomingMessages.length - 5); i--) {
    const container = incomingMessages[i];
    const textElements = queryAll(SELECTORS.messageText, container);

    for (const el of textElements) {
      const text = el.textContent?.trim();
      if (text && isRealMessageText(text)) {
        return text;
      }
    }
  }

  logger.debug('No se encontró mensaje válido en los últimos mensajes entrantes');
  return null;
}

/**
 * Verifica que un texto sea un mensaje real y no un timestamp, estado o emoji suelto.
 */
function isRealMessageText(text: string): boolean {
  if (text.length < 2) return false;

  // Timestamps: "12:30", "1:45 p. m.", "3:00 PM"
  if (/^\d{1,2}:\d{2}(\s*(a\.\s*m\.|p\.\s*m\.|AM|PM))?\.?$/.test(text)) return false;

  // Estados de mensaje
  if (/^(Enviado|Entregado|Le[íi]do|Visto|Delivered|Read|Sent)$/i.test(text)) return false;

  // "Ayer", "Hoy", fechas cortas
  if (/^(Ayer|Hoy|Yesterday|Today)$/i.test(text)) return false;

  return true;
}

/**
 * Obtiene información completa del contacto activo.
 */
export function extractContactInfo(): WhatsAppContact | null {
  const phone = extractPhoneNumber();
  const name = extractContactName();
  const chatId = extractChatId();

  if (!phone && !chatId) return null;

  return {
    phone: phone || 'unknown',
    name: name || 'Sin nombre',
    chatId: chatId || 'unknown',
  };
}

/**
 * Inserta texto en el input de WhatsApp Web.
 * Retorna true si tuvo éxito.
 */
export function insertTextIntoWhatsApp(text: string): boolean {
  try {
    const inputBox = queryFirst(SELECTORS.chatInput) as HTMLElement | null;
    if (!inputBox) {
      logger.warn('No se encontró el input de WhatsApp con ningún selector');
      return false;
    }

    inputBox.focus();

    // Método principal: execCommand (aún funcional en contenteditable)
    const inserted = document.execCommand('insertText', false, text);
    if (inserted && inputBox.textContent?.includes(text.substring(0, 20))) {
      return true;
    }

    // Fallback: insertar vía InputEvent (más moderno)
    const inputEvent = new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: text,
    });
    inputBox.textContent = text;
    inputBox.dispatchEvent(inputEvent);
    inputBox.dispatchEvent(new Event('change', { bubbles: true }));

    return true;
  } catch (error) {
    logger.error('Error insertando texto en WhatsApp', error instanceof Error ? error : undefined);
    return false;
  }
}

/**
 * Observa cambios en el chat activo.
 * Usa MutationObserver en el header (liviano) + interval de respaldo.
 * Retorna función de cleanup.
 */
export function observeChatChanges(callback: (contact: WhatsAppContact | null) => void): () => void {
  let lastChatId: string | null = null;
  let observer: MutationObserver | null = null;
  let cleanedUp = false;

  const checkChat = () => {
    if (cleanedUp) return;
    const contact = extractContactInfo();
    const currentChatId = contact?.chatId || null;

    if (currentChatId !== lastChatId) {
      lastChatId = currentChatId;
      callback(contact);
    }
  };

  // Check inmediato
  checkChat();

  // MutationObserver enfocado solo en el header (mucho más eficiente que body)
  const header = queryFirst(SELECTORS.chatHeader);
  if (header) {
    observer = new MutationObserver(checkChat);
    observer.observe(header, { childList: true, subtree: true, characterData: true });
  }

  // Interval de respaldo cada 3s (en vez de 1s) por si el observer no captura el cambio
  const interval = setInterval(checkChat, 3000);

  return () => {
    cleanedUp = true;
    clearInterval(interval);
    observer?.disconnect();
  };
}
