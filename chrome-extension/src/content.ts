/**
 * Content Script - Se ejecuta en el contexto de WhatsApp Web
 * Inyecta el sidebar de AmersurChat
 */

import { detectSharedPhone, extractContactInfo, getLastReceivedMessage, insertTextIntoWhatsApp, observeChatChanges } from './lib/whatsapp';
// Solo el tipo: `types/crm.ts` no emite runtime, así que esto no agrega un
// módulo compartido al bundle del content script (ver la nota de bundling en
// lib/chatId.ts).
import type { WhatsAppContact } from '@/types/crm';

const EXTENSION_ORIGIN = new URL(chrome.runtime.getURL('')).origin;
let sidebarWindow: Window | null = null;

/**
 * Notifica al sidebar de un cambio de contacto (push, no polling).
 *
 * Recibe el contacto YA EXTRAÍDO en vez de volver a leer el DOM: una segunda
 * llamada a extractContactInfo() en el mismo tick anula la guarda de doble
 * lectura de leerLidEstable() (lib/whatsapp.ts). Esa guarda solo devuelve el
 * LID cuando dos lecturas consecutivas coinciden, y cachea la lectura actual
 * como candidata al fallar — así que re-extraer acá matchea contra el cache
 * que acaba de escribir observeChatChanges y confirma el LID sin que #main
 * haya repintado. En un switch username→username eso manda al sidebar el LID
 * del contacto ANTERIOR (cliente equivocado en el panel, chat_id equivocado
 * en el lead nuevo) — exactamente lo que la guarda existe para evitar.
 */
function pushContactToSidebar(contact: WhatsAppContact | null) {
  if (!sidebarWindow) return;
  sidebarWindow.postMessage({ type: 'AMERSURCHAT_CONTACT_CHANGED', contact }, EXTENSION_ORIGIN);
}

// Esperar a que WhatsApp Web esté completamente cargado.
// Con tope: si #app nunca aparece (WhatsApp caído, pantalla de error, cambio de
// markup), el interval quedaba corriendo cada 500ms para siempre. Al agotarse
// se sigue igual — inyectar el botón es inofensivo y el sidebar sabe mostrar
// "Seleccione un chat" — pero se deja constancia en la consola.
const ESPERA_MAX_MS = 60_000;
const ESPERA_INTERVALO_MS = 500;

function waitForWhatsAppWeb(): Promise<void> {
  return new Promise((resolve) => {
    let esperado = 0;
    const checkInterval = setInterval(() => {
      const whatsappApp = document.querySelector('#app');
      if (whatsappApp && whatsappApp.childNodes.length > 0) {
        clearInterval(checkInterval);
        resolve();
        return;
      }

      esperado += ESPERA_INTERVALO_MS;
      if (esperado >= ESPERA_MAX_MS) {
        clearInterval(checkInterval);
        console.warn(
          `[AmersurChat] #app no apareció tras ${ESPERA_MAX_MS / 1000}s. ` +
          'Se inyecta el sidebar igual. ¿Cambió el markup de WhatsApp Web?',
        );
        resolve();
      }
    }, ESPERA_INTERVALO_MS);
  });
}

// Crear e inyectar el sidebar
function injectSidebar() {
  // Verificar si ya existe
  if (document.getElementById('amersurchat-sidebar')) return;

  // Crear overlay de fondo (para cerrar al hacer click fuera)
  const overlay = document.createElement('div');
  overlay.id = 'amersurchat-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: calc(100% - 300px);
    height: 100vh;
    background: rgba(0, 0, 0, 0.2);
    z-index: 999998;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
  `;

  // Crear contenedor del sidebar
  const sidebarContainer = document.createElement('div');
  sidebarContainer.id = 'amersurchat-sidebar';
  sidebarContainer.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 300px;
    height: 100vh;
    z-index: 999999;
    background: white;
    box-shadow: -2px 0 12px rgba(0, 0, 0, 0.2);
    transform: translateX(100%);
    transition: transform 0.3s ease;
  `;
  sidebarContainer.classList.add('amersurchat-hidden');

  // Crear iframe para el sidebar (aislado del CSS de WhatsApp)
  const iframe = document.createElement('iframe');
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
  `;
  // `clipboard-write` es una feature con allowlist por defecto "self": sin este
  // atributo, el iframe (chrome-extension://, cross-origin respecto de
  // web.whatsapp.com) NO puede usar navigator.clipboard.writeText y el fallback
  // a portapapeles del sidebar rechazaba SIEMPRE con NotAllowedError — el error
  // se logueaba y se descartaba, así que el vendedor se quedaba sin plantilla y
  // sin aviso cuando la inserción directa fallaba.
  iframe.allow = 'clipboard-write';
  iframe.src = chrome.runtime.getURL('sidebar.html');
  sidebarWindow = iframe.contentWindow;
  iframe.addEventListener('load', () => {
    sidebarWindow = iframe.contentWindow;
  });
  sidebarContainer.appendChild(iframe);

  // Agregar overlay y sidebar al DOM
  document.body.appendChild(overlay);
  document.body.appendChild(sidebarContainer);

  // Función para abrir/cerrar sidebar
  const toggleSidebar = (forceClose = false) => {
    const isHidden = sidebarContainer.classList.contains('amersurchat-hidden');

    if (!isHidden || forceClose) {
      // Cerrar
      sidebarContainer.classList.add('amersurchat-hidden');
      sidebarContainer.style.transform = 'translateX(100%)';
      overlay.style.opacity = '0';
      overlay.style.pointerEvents = 'none';
      toggleButton.style.right = '20px';
    } else {
      // Abrir
      sidebarContainer.classList.remove('amersurchat-hidden');
      sidebarContainer.style.transform = 'translateX(0)';
      overlay.style.opacity = '1';
      overlay.style.pointerEvents = 'auto';
      toggleButton.style.right = '320px';
    }
  };

  // Click en overlay cierra el sidebar
  overlay.addEventListener('click', () => toggleSidebar(true));

  // Botón toggle (con logo de la empresa)
  const toggleButton = document.createElement('button');
  toggleButton.id = 'amersurchat-toggle';
  const logoUrl = chrome.runtime.getURL('icons/icon48.png');
  toggleButton.innerHTML = `
    <img src="${logoUrl}" alt="Amersur CRM" style="width: 28px; height: 28px; object-fit: contain;" />
  `;
  toggleButton.title = 'Amersur CRM';
  toggleButton.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    z-index: 999998;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
  `;

  toggleButton.addEventListener('mouseenter', () => {
    toggleButton.style.transform = 'scale(1.1)';
    toggleButton.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.6)';
  });

  toggleButton.addEventListener('mouseleave', () => {
    toggleButton.style.transform = 'scale(1)';
    toggleButton.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
  });

  toggleButton.addEventListener('click', () => toggleSidebar());

  // Badge de notificaciones (inicialmente oculto)
  const badge = document.createElement('div');
  badge.id = 'amersurchat-badge';
  badge.style.cssText = `
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 20px;
    height: 20px;
    border-radius: 10px;
    background: #ef4444;
    color: white;
    font-size: 11px;
    font-weight: bold;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 0 6px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    border: 2px solid white;
  `;
  toggleButton.appendChild(badge);

  document.body.appendChild(toggleButton);
}

/**
 * Actualiza el badge del botón con el número de pendientes
 */
function updateBadge(count: number) {
  const badge = document.getElementById('amersurchat-badge');
  if (!badge) return;

  if (count > 0) {
    badge.textContent = count > 9 ? '9+' : count.toString();
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

// Inicializar cuando WhatsApp Web esté listo
waitForWhatsAppWeb().then(() => {
  injectSidebar();
  // Observar cambios de chat y notificar al sidebar proactivamente
  observeChatChanges((contact) => pushContactToSidebar(contact));
});

// Escuchar mensajes del sidebar (comunicación con React)
window.addEventListener('message', (event) => {
  if (event.origin !== EXTENSION_ORIGIN) return;
  if (!event.data || typeof event.data !== 'object') return;
  if (sidebarWindow && event.source !== sidebarWindow) return;

  const reply = (payload: any) => {
    if (event.source && typeof (event.source as Window).postMessage === 'function') {
      (event.source as Window).postMessage(payload, EXTENSION_ORIGIN);
    }
  };

  switch (event.data.type) {
    case 'AMERSURCHAT_GET_CONTACT': {
      const contact = extractContactInfo();
      reply({ type: 'AMERSURCHAT_CONTACT_INFO', contact });
      break;
    }

    case 'AMERSURCHAT_INSERT_TEMPLATE': {
      const { text } = event.data;
      if (text) {
        const success = insertTextIntoWhatsApp(text);
        reply({ type: 'AMERSURCHAT_TEMPLATE_INSERTED', success });
      }
      break;
    }

    case 'AMERSURCHAT_UPDATE_BADGE': {
      const { count } = event.data;
      if (typeof count === 'number') {
        updateBadge(count);
      }
      break;
    }

    case 'AMERSURCHAT_GET_LAST_MESSAGE': {
      const message = getLastReceivedMessage();
      reply({ type: 'AMERSURCHAT_LAST_MESSAGE', message });
      break;
    }

    case 'AMERSURCHAT_DETECT_SHARED_PHONE': {
      const detection = detectSharedPhone();
      reply({ type: 'AMERSURCHAT_SHARED_PHONE', detection });
      break;
    }
  }
});
