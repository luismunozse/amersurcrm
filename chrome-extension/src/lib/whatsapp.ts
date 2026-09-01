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
  /**
   * Header del chat activo.
   *
   * OJO el orden: `'header'` pelado estaba PRIMERO, contra la convención del
   * resto del registro. WhatsApp Web tiene más de un <header> y el del panel
   * izquierdo (lista de chats) viene antes en el documento, así que
   * `queryFirst` devolvía ESE — el MutationObserver de observeChatChanges
   * quedaba escuchando un nodo que no cambia al cambiar de chat y la
   * detección dependía sólo del interval de respaldo de 3s.
   */
  chatHeader: [
    '[data-testid="conversation-header"]',
    '#main header',
    'header',
  ],
  /**
   * Span del nombre/teléfono en el header.
   *
   * Las variantes con `#main header` van antes que las de `header` pelado por
   * el mismo motivo: `queryAll` devuelve los resultados del PRIMER selector
   * que matchee, y `header span[dir="auto"]` barre todos los headers del
   * documento — incluido el del panel izquierdo. Las de `header` quedan como
   * fallback para no perder el comportamiento actual si `#main` no existe.
   */
  headerContactSpan: [
    '[data-testid="conversation-info-header"] span[dir="auto"]',
    '[data-testid="conversation-title"] span[dir="auto"]',
    '#main header span[title][dir="auto"]',
    '#main header span[dir="auto"]',
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
  /**
   * Elementos con data-id dentro del chat activo. Los mensajes de un chat
   * iniciado por username traen el LID del contacto embebido ahí
   * (ej. "true_123456789012345@lid_ABCDEF"), que es el único lugar estable
   * donde se puede leer ese identificador.
   */
  messageDataId: [
    '#main [data-id]',
  ],
  /**
   * Caja de búsqueda del panel izquierdo. Es un contenteditable, igual que el
   * compositor, así que se escribe con la misma técnica (ver escribirEn).
   * Los selectores acotados a `#side` van primero: `[data-tab="3"]` a secas
   * también matchea nodos del panel derecho en algunas versiones.
   */
  searchInput: [
    '#side [data-testid="chat-list-search"]',
    '#side [contenteditable="true"][data-tab="3"]',
    '#side [contenteditable="true"][role="textbox"]',
    '#side [contenteditable="true"]',
    '[data-testid="chat-list-search"]',
  ],
  /** Filas de resultado de la búsqueda, en orden de aparición. */
  searchResultItem: [
    '#pane-side [role="listitem"]',
    '#pane-side [data-testid="cell-frame-container"]',
    '#side [role="listitem"]',
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
  // OJO: un LID ("<dígitos>@lid") NUNCA es un teléfono real — es el
  // pseudónimo que WhatsApp asigna a contactos que escriben por username
  // (Meta, jun 2026). El grupo 2 captura el sufijo exacto para poder
  // excluir "@lid" sin dejar de aceptar "@c.us" o fin de string como antes.
  const urlMatch = window.location.href.match(/\/(\d{10,15})(@lid|@|$)/);
  if (urlMatch?.[1] && urlMatch[2] !== '@lid') {
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
  if (limpio.startsWith('@')) return null;                 // username, no es un nombre
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
 * Extrae el username de WhatsApp del contacto activo, si el header lo
 * muestra en vez de un nombre guardado (chats iniciados por username,
 * Meta jun 2026). Devuelve el username sin "@", en minúsculas.
 */
export function extractUsername(): string | null {
  const spans = queryAll(SELECTORS.headerContactSpan);

  for (const span of spans) {
    const text = span.textContent?.trim();
    if (!text) continue;

    const match = text.match(/^@([a-z0-9._]{3,30})$/i);
    if (match) return match[1].toLowerCase();
  }

  return null;
}

/**
 * Busca el LID ("<dígitos>@lid") del contacto activo en el DOM.
 * Los mensajes de un chat iniciado por username traen el LID embebido en
 * su atributo data-id (ej. "true_123456789012345@lid_ABCDEF") — es el
 * único lugar estable donde se puede leer ese identificador.
 *
 * OJO: esta lectura es cruda/sin correlacionar con el chat activo — puede
 * devolver un LID que ya no corresponde al header actual (ver
 * leerLidEstable, que es quien realmente llama a esta función).
 */
function findLidEnDom(): string | null {
  const nodos = queryAll(SELECTORS.messageDataId);

  for (const nodo of nodos) {
    const dataId = nodo.getAttribute('data-id') || '';
    const match = dataId.match(/(\d{6,20})@lid/);
    if (match) return `${match[1]}@lid`;
  }

  return null;
}

/** "Huella" barata del header actual (su primer span) para detectar si #main ya repintó. */
function headerKeyActualDom(): string {
  return queryAll(SELECTORS.headerContactSpan)[0]?.textContent?.trim() || '';
}

// Cache a nivel de módulo para la guarda de doble lectura de leerLidEstable.
let lidCacheHeaderKey: string | null = null;
let lidCacheValor: string | null = null;

/**
 * Lee el LID del DOM con una guarda de doble lectura estable.
 *
 * Por qué: findLidEnDom() escanea "#main [data-id]" sin correlacionarlo con
 * el chat activo. En un switch de chat username→username (ambos SIN
 * teléfono, el único caso donde este camino se usa — ver extractChatId) el
 * MutationObserver del header dispara ANTES de que WhatsApp termine de
 * repintar #main: en ese instante #main todavía puede tener los nodos del
 * chat ANTERIOR, y findLidEnDom() devolvería su LID — un contacto ajeno.
 * Sin esta guarda eso llega directo al sidebar (cliente equivocado) y a
 * CreateLeadForm (chat_id equivocado en el lead nuevo).
 *
 * Estrategia (barata, sin timers nuevos — solo compara con la lectura
 * anterior): cachea a nivel de módulo el último (headerKey, lid) leído,
 * donde headerKey es el título actual del header (mismo span que usan
 * extractContactName/extractUsername). Solo se devuelve el LID si ESTA
 * lectura tiene el mismo headerKey Y el mismo LID que la lectura cacheada
 * — dos ticks consecutivos coincidiendo significa que #main ya terminó de
 * repintar para este chat. Si el headerKey (o el LID) cambió respecto del
 * cache, se guarda la lectura nueva como candidata y se devuelve null en
 * este tick; el próximo tick (nueva mutación del header o el interval de
 * respaldo de 3s en observeChatChanges) la confirma.
 *
 * Nota: un null transitorio acá NO deja al contacto entero en null — en un
 * chat por username, extractContactInfo() cae a `username` como chatId (ver
 * WhatsAppContact.chatId), y extractUsername() lee del header, que ya
 * está actualizado en este mismo tick. El sidebar identifica al cliente por
 * username en el primer tick y el LID real llega un tick después.
 */
function leerLidEstable(): string | null {
  const headerKeyActual = headerKeyActualDom();
  const lidActual = findLidEnDom();

  if (!lidActual) {
    // Todavía no hay nodos con LID (#main sin renderizar aún) — no tocar el
    // cache, esperar al próximo tick.
    return null;
  }

  const esLecturaEstable = lidCacheHeaderKey === headerKeyActual && lidCacheValor === lidActual;

  lidCacheHeaderKey = headerKeyActual;
  lidCacheValor = lidActual;

  return esLecturaEstable ? lidActual : null;
}

/**
 * Extrae el chat ID del chat activo.
 *
 * Prioridad: número desde la URL/header (chats clásicos, barato y
 * confiable) > LID del DOM (SOLO cuando no hay teléfono extraíble).
 *
 * El escaneo de LID (#main [data-id], corre en cada mutación del header +
 * el interval de respaldo de 3s) es más costoso y, durante un switch de
 * chat, puede leer nodos todavía no actualizados del chat anterior y
 * devolver un LID ajeno. Priorizar el teléfono achica esa ventana de
 * "stale read" y evita el costo del escaneo en la mayoría de los chats
 * (clásicos, con teléfono), reservando el LID para cuando es la única
 * pista disponible. La lectura del LID en sí pasa por leerLidEstable(), que
 * agrega una guarda de doble lectura contra ese mismo stale-read residual.
 */
export function extractChatId(): string | null {
  // 1. Desde la URL (chats clásicos, con teléfono real)
  const urlMatch = window.location.href.match(/\/(\d{10,15})(@lid|@|$)/);
  if (urlMatch?.[1] && urlMatch[2] !== '@lid') return urlMatch[1];

  // 2. Desde el número del header
  const phone = findPhoneInHeaderSpans();
  if (phone) return phone.replace(/[^\d]/g, '');

  // 3. LID desde el DOM: solo si no hay teléfono extraíble.
  const lid = leerLidEstable();
  if (lid) return lid;

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
 * Fallback: contacto sin teléfono visible (chat por username/LID) — compara
 * contra el "@username" (el data-pre-plain-text puede traer el username como
 * remitente) y, si no, contra el nombre para contactos guardados.
 */
function esRemitenteDelContacto(
  remitente: string,
  contactoDigits: string,
  contactoNombre: string,
  contactoUsername: string,
): boolean {
  if (!remitente) return false;
  const rd = soloDigitos(remitente);
  if (contactoDigits && rd.length >= 8) {
    return rd.slice(-8) === contactoDigits.slice(-8);
  }
  if (contactoUsername) {
    const remitenteNormalizado = remitente.replace(/^@/, '').toLowerCase();
    if (remitenteNormalizado === contactoUsername.toLowerCase()) return true;
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
  const contactoUsername = extractUsername() || '';

  // Camino actual: bloques con data-pre-plain-text, de más reciente a más viejo.
  const bloques = queryAll(SELECTORS.messageMeta);
  for (let i = bloques.length - 1; i >= 0; i--) {
    const remitente = parseRemitentePrePlain(bloques[i].getAttribute('data-pre-plain-text'));
    if (!esRemitenteDelContacto(remitente, contactoDigits, contactoNombre, contactoUsername)) continue;

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

/** Resultado de detectSharedPhone: número candidato + el mensaje donde apareció. */
export interface SharedPhoneDetection {
  phone: string;
  sourceText: string;
}

/** Cuántos bloques de mensaje (más recientes primero) se revisan buscando un teléfono. */
const MAX_BLOQUES_TELEFONO_COMPARTIDO = 30;
/** Largo máximo del sourceText mostrado en el banner del sidebar. */
const SOURCE_TEXT_MAX = 120;

/** Números de 7-18 caracteres (dígitos + separadores comunes), con + opcional. */
const PHONE_MATCH_PATTERN = /\+?\d[\d\s().-]{6,17}\d/g;

/**
 * Normaliza un match crudo de teléfono a formato E.164-ish.
 * Perú: 9 dígitos que empiezan en 9 (celular sin código de país) → prefija +51.
 * Si el match ya traía "+" (código de país explícito) → se conserva el "+".
 * Cualquier otro largo sin "+": se devuelve solo en dígitos (sin inventar el +).
 * Devuelve null si, tras limpiar, no quedan entre 8 y 15 dígitos.
 */
function normalizarTelefonoDetectado(raw: string): { phone: string; digits: string } | null {
  const teniaMasSigno = raw.trim().startsWith('+');
  const digitos = raw.replace(/\D/g, '');
  if (digitos.length < 8 || digitos.length > 15) return null;

  if (digitos.length === 9 && digitos.startsWith('9')) {
    return { phone: `+51${digitos}`, digits: digitos };
  }
  if (teniaMasSigno) {
    return { phone: `+${digitos}`, digits: digitos };
  }
  return { phone: digitos, digits: digitos };
}

/**
 * Separador de miles REAL: una coma entre dígitos ("85,000"). Antes se
 * descartaba el match ante CUALQUIER coma en la ventana de contexto, y una
 * coma de puntuación normal ("mi numero es 987123456, escríbame ahí") mataba
 * la detección — el caso más común de todos.
 */
const SEPARADOR_MILES = /\d,\d/;

/**
 * Busca el primer teléfono válido dentro de un texto de mensaje, descartando
 * falsos positivos comunes: montos (símbolo de moneda o separador de miles
 * cerca del match) y DNIs (8 dígitos SIN formato de teléfono con "dni" cerca).
 */
function extraerTelefonoDeTexto(texto: string): string | null {
  const matches = texto.matchAll(PHONE_MATCH_PATTERN);

  for (const match of matches) {
    const raw = match[0];
    const idx = match.index ?? texto.indexOf(raw);
    // Ventana de contexto alrededor del match (no todo el mensaje): un
    // "S/" lejos del número no debería descartarlo.
    const entorno = texto.slice(Math.max(0, idx - 12), idx + raw.length + 12);

    if (/S\/|\$/.test(entorno)) continue;          // monto con símbolo de moneda
    if (SEPARADOR_MILES.test(entorno)) continue;   // monto con separador de miles

    const normalizado = normalizarTelefonoDetectado(raw);
    if (!normalizado) continue;

    const esFormatoPlano = /^\d+$/.test(raw.trim());
    if (normalizado.digits.length === 8 && esFormatoPlano && /dni/i.test(entorno)) {
      continue; // DNI (8 dígitos sin formato de teléfono + "dni" cerca)
    }

    return normalizado.phone;
  }

  return null;
}

/** Recorta el texto fuente para mostrarlo como cita en el banner del sidebar. */
function truncarSourceText(texto: string): string {
  return texto.length > SOURCE_TEXT_MAX ? `${texto.slice(0, SOURCE_TEXT_MAX)}…` : texto;
}

/**
 * Detecta un posible número de teléfono compartido VOLUNTARIAMENTE por el
 * contacto en sus mensajes entrantes más recientes. Reusa el mismo camino de
 * data-pre-plain-text + esRemitenteDelContacto que getLastReceivedMessage.
 *
 * IMPORTANTE: esto NUNCA guarda nada — solo detecta y devuelve un candidato.
 * El sidebar decide si mostrarlo (banner) y el vendedor confirma o descarta.
 *
 * TODO(vCard): compartir una tarjeta de contacto (vCard) es otra vía por la
 * que un contacto puede compartir su número, pero no se encontró un selector
 * robusto y estable en el DOM actual de WhatsApp Web para leer el número
 * visible de una vCard sin abrir el mensaje. Queda fuera a propósito — no
 * vale la pena invertir más de un intento en un selector frágil.
 */
export function detectSharedPhone(): SharedPhoneDetection | null {
  const contactoDigits = soloDigitos(extractPhoneNumber());
  const contactoNombre = (extractContactName() || '').trim();
  const contactoUsername = extractUsername() || '';

  const bloques = queryAll(SELECTORS.messageMeta);
  const desde = Math.max(0, bloques.length - MAX_BLOQUES_TELEFONO_COMPARTIDO);

  for (let i = bloques.length - 1; i >= desde; i--) {
    const remitente = parseRemitentePrePlain(bloques[i].getAttribute('data-pre-plain-text'));
    if (!esRemitenteDelContacto(remitente, contactoDigits, contactoNombre, contactoUsername)) continue;

    const textEl = queryFirst(SELECTORS.selectableText, bloques[i]) || bloques[i];
    const texto = limpiarTextoMensaje((textEl.textContent || '').trim());
    if (!texto || !isRealMessageText(texto)) continue;

    const telefono = extraerTelefonoDeTexto(texto);
    if (telefono) {
      return { phone: telefono, sourceText: truncarSourceText(texto) };
    }
  }

  return null;
}

/**
 * Obtiene información completa del contacto activo.
 */
export function extractContactInfo(): WhatsAppContact | null {
  const phone = extractPhoneNumber();
  const name = extractContactName();
  const chatId = extractChatId();
  const username = extractUsername();

  if (!phone && !chatId && !username) return null;

  return {
    // null real (no sentinel 'unknown'): un LID nunca es el teléfono.
    phone,
    // null real (no sentinel 'Sin nombre'): un contacto no agendado no tiene
    // nombre, y el string de relleno se colaba a la UI como nombre válido.
    name,
    chatId: chatId || username || 'unknown',
    username,
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

    // Se verifica contra un fragmento (no el texto entero) porque el editor
    // normaliza espacios y saltos de línea al renderizar.
    const fragmento = text.substring(0, 20);
    const quedoEscrito = () => (inputBox.textContent || '').includes(fragmento);

    // Método principal: execCommand (aún funcional en contenteditable)
    const inserted = document.execCommand('insertText', false, text);
    if (inserted && quedoEscrito()) {
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

    // El fallback NO es confiable: el editor de WhatsApp es controlado y suele
    // descartar una escritura directa de textContent. Antes se devolvía `true`
    // fijo, así que el sidebar cantaba éxito con el input vacío y el vendedor
    // creía haber pegado la plantilla. Ahora se verifica y el caller decide
    // (ver el fallback a portapapeles en Sidebar.handleSelectTemplate).
    const ok = quedoEscrito();
    if (!ok) {
      logger.warn(
        'insertTextIntoWhatsApp: el input no quedó con el texto tras execCommand ni el fallback. ' +
        '¿Cambió el editor de WhatsApp Web? Revisar SELECTORS.chatInput.',
      );
    }
    return ok;
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

  // MutationObserver enfocado solo en el header (mucho más eficiente que body).
  //
  // Se re-engancha si el nodo resuelto cambió: al arrancar sin ningún chat
  // abierto `#main` todavía no existe y el selector cae al <header> del panel
  // izquierdo, que nunca cambia — el observer quedaba pegado a ese nodo para
  // siempre y la detección de chat dependía del interval. WhatsApp además
  // reemplaza el header de la conversación en algunos repintados, dejando al
  // observer sobre un nodo huérfano.
  let headerObservado: Element | null = null;
  const engancharObserver = () => {
    const headerActual = queryFirst(SELECTORS.chatHeader);
    if (!headerActual || headerActual === headerObservado) return;

    observer?.disconnect();
    headerObservado = headerActual;
    observer = new MutationObserver(checkChat);
    observer.observe(headerActual, { childList: true, subtree: true, characterData: true });
  };
  engancharObserver();

  // Interval de respaldo cada 3s (en vez de 1s) por si el observer no captura el cambio
  const interval = setInterval(() => {
    engancharObserver();
    checkChat();
  }, 3000);

  return () => {
    cleanedUp = true;
    clearInterval(interval);
    observer?.disconnect();
  };
}

// ─── Apertura de chat por alias ──────────────────────────────────────────

/** Cuánto se espera a que la búsqueda de WhatsApp pinte resultados. */
const BUSQUEDA_TIMEOUT_MS = 3000;
const BUSQUEDA_INTERVALO_MS = 100;
const BUSCADOR_TIMEOUT_MS = 3000;

/**
 * Escribe texto en un contenteditable de WhatsApp.
 *
 * Mismo problema que insertTextIntoWhatsApp: el editor es controlado y
 * descarta una asignación directa de textContent, así que primero se intenta
 * execCommand y recién después el fallback por InputEvent.
 */
function escribirEn(campo: HTMLElement, texto: string): boolean {
  campo.focus();

  if (document.execCommand('insertText', false, texto) && (campo.textContent || '').includes(texto)) {
    return true;
  }

  campo.textContent = texto;
  campo.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: texto }));
  return (campo.textContent || '').includes(texto);
}

/**
 * Busca un alias (username de WhatsApp) en el panel izquierdo y abre su chat.
 *
 * Por qué existe: WhatsApp no expone el teléfono real de un contacto que
 * escribió por username, y `wa.me` solo acepta números — no hay deep link
 * posible para ese chat. Como la extensión ya vive adentro de WhatsApp Web,
 * la abre manejando el buscador como lo haría el vendedor.
 *
 * El chat siempre existe: si hay alias guardado es porque ese contacto
 * escribió, que es lo que generó el lead.
 *
 * Devuelve false si no pudo abrirlo. En ese caso el alias queda ESCRITO en el
 * buscador a propósito: el fallback es que el vendedor haga el último click,
 * no que se quede con la caja vacía y sin saber qué pasó.
 */
export async function abrirChatPorAlias(alias: string): Promise<boolean> {
  const limpio = (alias || '').replace(/^@/, '').trim();
  if (!limpio) return false;

  // #app aparece antes que el panel lateral en algunas cargas de WhatsApp.
  // Esperar evita que el enlace del CRM falle sólo por una carrera de render.
  const buscador = await esperarElemento(SELECTORS.searchInput, BUSCADOR_TIMEOUT_MS);
  if (!buscador) {
    logger.warn('No se encontró la caja de búsqueda de WhatsApp con ningún selector');
    return false;
  }

  // WhatsApp identifica los usernames con el prefijo @ en su buscador.
  if (!escribirEn(buscador, `@${limpio}`)) {
    logger.warn('No se pudo escribir el alias en la caja de búsqueda');
    return false;
  }

  const primerResultado = await esperarPrimerResultado();
  if (!primerResultado) {
    logger.warn(`La búsqueda de "${limpio}" no devolvió resultados`);
    return false;
  }

  primerResultado.click();
  return true;
}

/** Espera a que WhatsApp monte un elemento que todavía no existe en el DOM. */
function esperarElemento(
  selectors: readonly string[],
  timeoutMs: number,
): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    let esperado = 0;
    const revisar = () => {
      const elemento = queryFirst(selectors) as HTMLElement | null;
      if (elemento) {
        resolve(elemento);
        return;
      }

      esperado += BUSQUEDA_INTERVALO_MS;
      if (esperado >= timeoutMs) {
        resolve(null);
        return;
      }

      setTimeout(revisar, BUSQUEDA_INTERVALO_MS);
    };

    revisar();
  });
}

/** Espera a que la lista de resultados pinte al menos una fila. */
function esperarPrimerResultado(): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    let esperado = 0;
    const timer = setInterval(() => {
      const fila = queryAll(SELECTORS.searchResultItem)[0] as HTMLElement | undefined;
      if (fila) {
        clearInterval(timer);
        resolve(fila);
        return;
      }

      esperado += BUSQUEDA_INTERVALO_MS;
      if (esperado >= BUSQUEDA_TIMEOUT_MS) {
        clearInterval(timer);
        resolve(null);
      }
    }, BUSQUEDA_INTERVALO_MS);
  });
}
