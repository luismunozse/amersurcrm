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
  /**
   * Metadata del mensaje: atributo con "[hora, fecha] Remitente: ".
   * Estable y semántico: sobrevive a la ofuscación de clases de WhatsApp
   * (jun 2026 eliminó .message-in/.message-out). Permite extraer el texto y
   * detectar la dirección comparando el remitente con el contacto abierto.
   */
  messageMeta: [
    '[data-pre-plain-text]',
  ],
  /** Texto seleccionable dentro de un bloque de mensaje */
  selectableText: [
    'span.selectable-text',
    'span.selectable-text span',
    '.selectable-text',
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
 * Normaliza un texto a un nombre válido: quita el prefijo "~" del push name,
 * descarta teléfonos puros y textos sin letras (horas, fechas, previews vacíos).
 * Devuelve el nombre limpio o null si no es un nombre.
 */
function normalizarNombre(text: string | null | undefined): string | null {
  const limpio = (text || '').replace(/^~\s*/, '').trim();
  if (!limpio) return null;
  if (/^\+?[\d\s()-]+$/.test(limpio)) return null;        // teléfono puro
  if (!/[a-zA-ZáéíóúñÁÉÍÓÚÑ]/.test(limpio)) return null;   // sin letras (hora/fecha)
  return limpio;
}

/**
 * Extrae el nombre del contacto activo.
 *
 * Prioridad: nombre guardado (título del header) > push name de WhatsApp
 * (título de la fila activa en la lista, expuesto como "~Nombre") > null.
 * Para un no guardado el header solo trae el número; el push name vive en la
 * fila de la lista de chats.
 */
export function extractContactName(): string | null {
  // Nombre GUARDADO: el título es el PRIMER span del header (no iterar: los
  // siguientes pueden ser el estado "en línea"/"escribiendo..."). Para un
  // contacto no agendado el título es el número y devolvemos null. El push name
  // de un no agendado solo vive en el panel "información de contacto", que no
  // leemos a propósito (obligaría a abrirlo): el form usa su nombre por defecto.
  const headerSpans = queryAll(SELECTORS.headerContactSpan);
  const nombre = normalizarNombre(headerSpans[0]?.textContent);
  if (nombre) return nombre;

  logger.debug('No se pudo extraer nombre del contacto (solo teléfono disponible)');
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

/** Solo los dígitos de un string (para comparar teléfonos sin importar formato). */
function soloDigitos(s: string | null | undefined): string {
  return (s || '').replace(/\D/g, '');
}

/** Extrae el remitente de un data-pre-plain-text: "[hora, fecha] Remitente: " → "Remitente". */
function parseRemitentePrePlain(pre: string | null): string {
  const m = (pre || '').match(/\]\s*(.*?):\s*$/);
  return m ? m[1].trim() : '';
}

/**
 * Determina si un remitente corresponde al contacto abierto (mensaje entrante).
 * Primario: últimos 8 dígitos del teléfono (tolera prefijos/formato distinto).
 * Fallback: igualdad de nombre para contactos guardados (sin teléfono visible).
 */
function esRemitenteDelContacto(
  remitente: string,
  contactoDigits: string,
  contactoNombre: string,
): boolean {
  if (!remitente) return false;
  const rd = soloDigitos(remitente);
  if (contactoDigits && rd.length >= 8) {
    return rd.slice(-8) === contactoDigits.slice(-8);
  }
  return !!contactoNombre && remitente === contactoNombre;
}

/** Quita un timestamp final tipo "2:17 p. m." que WhatsApp anexa al texto. */
function limpiarTextoMensaje(texto: string): string {
  return texto
    .replace(/\s*\d{1,2}:\d{2}\s*(a\.?\s*m\.?|p\.?\s*m\.?|AM|PM)?\s*$/i, '')
    .trim();
}

/**
 * Obtiene el último mensaje recibido del contacto activo.
 *
 * Estrategia (jun 2026): WhatsApp Web ofusca las clases y eliminó
 * .message-in/.message-out y el prefijo false_/true_ del data-id. Lo estable
 * que queda es [data-pre-plain-text] ("[hora, fecha] Remitente: ") + el texto
 * en span.selectable-text. La dirección se detecta comparando el remitente con
 * el teléfono/nombre del contacto abierto. Se mantiene el camino legacy
 * (.message-in) como fallback por si WhatsApp revierte.
 */
export function getLastReceivedMessage(): string | null {
  const contactoDigits = soloDigitos(extractPhoneNumber());
  const contactoNombre = (extractContactName() || '').trim();

  // Camino actual: bloques con data-pre-plain-text, de más reciente a más viejo.
  const bloques = queryAll(SELECTORS.messageMeta);
  for (let i = bloques.length - 1; i >= 0; i--) {
    const remitente = parseRemitentePrePlain(bloques[i].getAttribute('data-pre-plain-text'));
    if (!esRemitenteDelContacto(remitente, contactoDigits, contactoNombre)) continue;

    const textEl = queryFirst(SELECTORS.selectableText, bloques[i]) || bloques[i];
    const texto = limpiarTextoMensaje((textEl.textContent || '').trim());
    if (texto && isRealMessageText(texto)) {
      return texto;
    }
  }

  // Fallback legacy: contenedores .message-in (por si WhatsApp revierte el DOM).
  const incomingMessages = queryAll(SELECTORS.incomingMessage);
  for (let i = incomingMessages.length - 1; i >= Math.max(0, incomingMessages.length - 5); i--) {
    const textElements = queryAll(SELECTORS.messageText, incomingMessages[i]);
    for (const el of textElements) {
      const text = el.textContent?.trim();
      if (text && isRealMessageText(text)) {
        return text;
      }
    }
  }

  logger.warn(
    'getLastReceivedMessage: no se encontró mensaje entrante. ' +
    `Bloques data-pre-plain-text: ${bloques.length}, contacto: ${contactoDigits || contactoNombre || 'desconocido'}. ` +
    '¿Cambió el DOM de WhatsApp Web? Revisar SELECTORS.messageMeta/selectableText.',
  );
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
