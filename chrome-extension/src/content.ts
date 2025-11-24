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

  // Crear contenedor del sidebar
  const sidebarContainer = document.createElement('div');
  sidebarContainer.id = 'amersurchat-sidebar';
  sidebarContainer.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 360px;
    height: 100vh;
    z-index: 999999;
    background: white;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
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
  document.body.appendChild(sidebarContainer);

  // Botón toggle
  const toggleButton = document.createElement('button');
  toggleButton.id = 'amersurchat-toggle';
  toggleButton.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z"/>
    </svg>
  `;
  toggleButton.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: #25D366;
    color: white;
    border: none;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    z-index: 999998;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  `;

  toggleButton.addEventListener('mouseenter', () => {
    toggleButton.style.transform = 'scale(1.1)';
  });

  toggleButton.addEventListener('mouseleave', () => {
    toggleButton.style.transform = 'scale(1)';
  });

  toggleButton.addEventListener('click', () => {
    const isHidden = sidebarContainer.classList.contains('amersurchat-hidden');

    if (isHidden) {
      sidebarContainer.classList.remove('amersurchat-hidden');
      sidebarContainer.style.transform = 'translateX(0)';
      toggleButton.style.right = '380px'; // 360px sidebar + 20px margin
    } else {
      sidebarContainer.classList.add('amersurchat-hidden');
      sidebarContainer.style.transform = 'translateX(100%)';
      toggleButton.style.right = '20px';
    }
  });

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
