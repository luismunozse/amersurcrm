/**
 * Service Worker de fondo
 * Maneja eventos globales de la extensión
 */

// Habilitar session storage para content scripts
chrome.storage.session?.setAccessLevel?.({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' });

// Listener para instalación
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: 'https://web.whatsapp.com' });
  }
});

// Listener para mensajes desde content script o popup
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'LOGOUT') {
    // Limpiar tokens de session y local
    const clearSession = new Promise<void>((resolve) => {
      if (chrome.storage.session) {
        chrome.storage.session.remove(['authToken', 'refreshToken'], () => resolve());
      } else {
        resolve();
      }
    });
    const clearLocal = new Promise<void>((resolve) => {
      chrome.storage.local.remove(['authToken', 'refreshToken', 'authState', 'lastLogin'], () => resolve());
    });
    Promise.all([clearSession, clearLocal]).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Mantener el service worker vivo
chrome.alarms.create('keepAlive', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(() => {});
