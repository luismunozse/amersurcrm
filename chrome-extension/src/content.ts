/**
 * Content Script - Se ejecuta en el contexto de WhatsApp Web
 * Inyecta el sidebar de AmersurChat
 */

import { extractContactInfo } from './lib/whatsapp';

console.log('[AmersurChat] Content script cargado');

// Esperar a que WhatsApp Web esté completamente cargado
function waitForWhatsAppWeb(): Promise<void> {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      // Buscar elemento característico de WhatsApp Web
      const whatsappApp = document.querySelector('#app');
      if (whatsappApp && whatsappApp.childNodes.length > 0) {
        clearInterval(checkInterval);
        console.log('[AmersurChat] WhatsApp Web detectado');
        resolve();
      }
    }, 500);
  });
}

// Crear e inyectar el sidebar
function injectSidebar() {
  // Verificar si ya existe
  if (document.getElementById('amersurchat-sidebar')) {
    console.log('[AmersurChat] Sidebar ya existe');
    return;
  }

  console.log('[AmersurChat] Inyectando sidebar...');

  // Crear overlay de fondo (para cerrar al hacer click fuera)
  const overlay = document.createElement('div');
  overlay.id = 'amersurchat-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    background: rgba(0, 0, 0, 0.3);
    z-index: 999998;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
  `;

  // Crear contenedor del sidebar (más estrecho)
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

  // Agregar clase para toggle
  sidebarContainer.classList.add('amersurchat-hidden');

  // Crear iframe para el sidebar (aislado del CSS de WhatsApp)
  const iframe = document.createElement('iframe');
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
  `;
  iframe.src = chrome.runtime.getURL('sidebar.html');

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
      toggleButton.style.right = '320px'; // 300px sidebar + 20px margin
    }
  };

  // Click en overlay cierra el sidebar
  overlay.addEventListener('click', () => toggleSidebar(true));

  // Botón toggle (más pequeño y discreto)
  const toggleButton = document.createElement('button');
  toggleButton.id = 'amersurchat-toggle';
  toggleButton.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      <line x1="9" y1="10" x2="15" y2="10"/>
      <line x1="9" y1="14" x2="13" y2="14"/>
    </svg>
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

  document.body.appendChild(toggleButton);

  console.log('[AmersurChat] Sidebar inyectado correctamente');
}

// Inicializar cuando WhatsApp Web esté listo
waitForWhatsAppWeb().then(() => {
  injectSidebar();
});

// Escuchar mensajes del sidebar (comunicación con React)
window.addEventListener('message', (event) => {
  console.log('[AmersurChat] Mensaje recibido:', event.data.type, 'desde:', event.origin);

  // Aceptar mensajes del sidebar (desde el iframe o desde la misma ventana)
  if (event.data.type === 'AMERSURCHAT_GET_CONTACT') {
    console.log('[AmersurChat] Solicitando información del contacto...');

    // El sidebar solicita información del contacto
    const contact = extractContactInfo();

    console.log('[AmersurChat] Contacto extraído:', contact);

    // Enviar respuesta al iframe si viene del iframe, sino a window
    if (event.source && event.source !== window) {
      // Mensaje viene del iframe, responder al iframe
      (event.source as Window).postMessage({
        type: 'AMERSURCHAT_CONTACT_INFO',
        contact,
      }, '*');
    } else {
      // Mensaje viene de la misma ventana
      window.postMessage({
        type: 'AMERSURCHAT_CONTACT_INFO',
        contact,
      }, '*');
    }
  }
});
