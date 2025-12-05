/**
 * Service Worker de fondo
 * Maneja eventos globales de la extensión
 */

console.log('[AmersurChat] Background service worker iniciado');

// Listener para instalación
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[AmersurChat] Extensión instalada:', details.reason);

  if (details.reason === 'install') {
    // Primera instalación - mostrar página de bienvenida
    chrome.tabs.create({
      url: 'https://web.whatsapp.com',
    });
  }
});

// Listener para mensajes desde content script o popup
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log('[AmersurChat] Mensaje recibido:', request);

  if (request.type === 'GET_AUTH_STATE') {
    // Obtener estado de autenticación desde storage
    chrome.storage.local.get(['authState'], (result) => {
      sendResponse(result.authState || null);
    });
    return true; // Indica respuesta asíncrona
  }

  if (request.type === 'SET_AUTH_STATE') {
    // Guardar estado de autenticación
    chrome.storage.local.set({ authState: request.authState }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.type === 'LOGOUT') {
    // Limpiar autenticación
    chrome.storage.local.remove(['authState'], () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Mantener el service worker vivo
chrome.alarms.create('keepAlive', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    console.log('[AmersurChat] Keep alive ping');
  }
});
