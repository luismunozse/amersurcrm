/**
 * Utilidades para extraer información de WhatsApp Web
 */

import { WhatsAppContact } from '@/types/crm';

/**
 * Extrae el número de teléfono del contacto activo
 */
export function extractPhoneNumber(): string | null {
  // WhatsApp Web estructura: el número está en el header del chat
  // Buscar en varios selectores posibles (WhatsApp cambia su estructura)

  console.log('[WhatsApp] Extrayendo número de teléfono...');
  console.log('[WhatsApp] URL actual:', window.location.href);

  // 1. Intentar desde la URL primero (más confiable)
  const urlMatch = window.location.href.match(/\/(\d{10,15})(@|$)/);
  if (urlMatch && urlMatch[1]) {
    console.log('[WhatsApp] Número extraído de URL:', urlMatch[1]);
    return '+' + urlMatch[1];
  }

  // 2. Buscar haciendo click en el header para obtener info del contacto
  // Buscar el botón de información del chat
  const headerButton = document.querySelector('[data-testid="conversation-info-header"]');
  if (headerButton) {
    console.log('[WhatsApp] Header encontrado, buscando número en atributos...');

    // Intentar extraer del aria-label o title
    const ariaLabel = headerButton.getAttribute('aria-label');
    if (ariaLabel) {
      console.log('[WhatsApp] aria-label encontrado:', ariaLabel);
      const match = ariaLabel.match(/\+?[\d\s()-]+/);
      if (match && match[0].replace(/[^\d]/g, '').length >= 10) {
        const phone = match[0].replace(/[^\d+]/g, '');
        console.log('[WhatsApp] Número extraído de aria-label:', phone);
        return phone;
      }
    }
  }

  // 3. Buscar en todos los spans del header con dir="auto"
  const headerSpans = document.querySelectorAll('header span[dir="auto"]');
  console.log('[WhatsApp] Spans con dir="auto" encontrados:', headerSpans.length);

  for (const span of headerSpans) {
    if (span.textContent) {
      const text = span.textContent.trim();
      console.log('[WhatsApp] Analizando span:', text);

      // Buscar patrón de número de teléfono
      const phonePattern = /\+?[\d\s()-]+/;
      const match = text.match(phonePattern);

      if (match) {
        const digitsOnly = match[0].replace(/[^\d+]/g, '');
        // Verificar que tenga al menos 10 dígitos (sin contar el +)
        const digitCount = digitsOnly.replace(/\+/g, '').length;

        if (digitCount >= 10) {
          console.log('[WhatsApp] Número extraído:', digitsOnly);
          return digitsOnly;
        }
      }
    }
  }

  console.log('[WhatsApp] No se pudo extraer número de teléfono');
  return null;
}

/**
 * Extrae el nombre del contacto activo
 */
export function extractContactName(): string | null {
  console.log('[WhatsApp] Extrayendo nombre de contacto...');

  // Buscar en los spans del header con dir="auto"
  const headerSpans = document.querySelectorAll('header span[dir="auto"]');
  console.log('[WhatsApp] Buscando nombre en spans con dir="auto":', headerSpans.length);

  for (const span of headerSpans) {
    if (span.textContent) {
      const text = span.textContent.trim();

      // Si el texto es solo un número de teléfono, saltarlo
      const isPhoneOnly = /^\+?[\d\s()-]+$/.test(text);
      if (isPhoneOnly) {
        console.log('[WhatsApp] Saltando número puro:', text);
        continue;
      }

      // Si tiene letras, es probablemente un nombre
      const hasLetters = /[a-zA-Z]/.test(text);
      if (hasLetters && text.length > 0) {
        // Remover números si están mezclados con el nombre
        const cleanName = text.replace(/\+?[\d\s()-]+/g, '').trim();
        if (cleanName.length > 0) {
          console.log('[WhatsApp] Nombre extraído:', cleanName);
          return cleanName;
        }
      }
    }
  }

  console.log('[WhatsApp] No se pudo extraer nombre');
  return null;
}

/**
 * Extrae el chat ID del chat activo
 */
export function extractChatId(): string | null {
  console.log('[WhatsApp] Extrayendo chat ID...');

  // 1. Intentar desde la URL
  const urlMatch = window.location.href.match(/\/(\d{10,15})(@|$)/);
  if (urlMatch && urlMatch[1]) {
    console.log('[WhatsApp] Chat ID extraído de URL:', urlMatch[1]);
    return urlMatch[1];
  }

  // 2. Buscar el número de teléfono en el header y usarlo como ID
  const headerSpans = document.querySelectorAll('header span[dir="auto"]');

  for (const span of headerSpans) {
    if (span.textContent) {
      const text = span.textContent.trim();
      const phonePattern = /\+?[\d\s()-]+/;
      const match = text.match(phonePattern);

      if (match) {
        const digitsOnly = match[0].replace(/[^\d+]/g, '');
        const digitCount = digitsOnly.replace(/\+/g, '').length;

        if (digitCount >= 10) {
          console.log('[WhatsApp] Chat ID generado desde número:', digitsOnly);
          return digitsOnly;
        }
      }
    }
  }

  console.log('[WhatsApp] No se pudo extraer chat ID');
  return null;
}

/**
 * Obtiene el último mensaje recibido del contacto
 */
export function getLastReceivedMessage(): string | null {
  // Buscar mensajes entrantes (no enviados por nosotros)
  const messageSelectors = [
    '.message-in .copyable-text span',
    '[data-pre-plain-text]:not([data-id*="true"]) .copyable-text span',
  ];

  for (const selector of messageSelectors) {
    const messages = document.querySelectorAll(selector);
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      return lastMessage?.textContent || null;
    }
  }

  return null;
}

/**
 * Obtiene información completa del contacto activo
 */
export function extractContactInfo(): WhatsAppContact | null {
  const phone = extractPhoneNumber();
  const name = extractContactName();
  const chatId = extractChatId();

  if (!phone && !chatId) {
    return null;
  }

  return {
    phone: phone || 'unknown',
    name: name || 'Sin nombre',
    chatId: chatId || 'unknown',
  };
}

/**
 * Observa cambios en el chat activo
 */
export function observeChatChanges(callback: (contact: WhatsAppContact | null) => void): () => void {
  let lastChatId: string | null = null;

  const checkChat = () => {
    const contact = extractContactInfo();
    const currentChatId = contact?.chatId || null;

    if (currentChatId !== lastChatId) {
      lastChatId = currentChatId;
      callback(contact);
    }
  };

  // Verificar inmediatamente
  checkChat();

  // Verificar cada segundo
  const interval = setInterval(checkChat, 1000);

  // Observer para detectar cambios en el DOM
  const observer = new MutationObserver(checkChat);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Función de cleanup
  return () => {
    clearInterval(interval);
    observer.disconnect();
  };
}
