import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

function Popup() {
  // null = detectando, false = sin pestaña de WhatsApp, objeto = pestaña encontrada
  const [whatsappTab, setWhatsappTab] = useState<chrome.tabs.Tab | null | false>(null);

  useEffect(() => {
    // La query por URL funciona sin permiso "tabs" gracias al host_permission
    // de web.whatsapp.com declarado en el manifest.
    chrome.tabs.query({ url: 'https://web.whatsapp.com/*' }, (tabs) => {
      setWhatsappTab(tabs[0] ?? false);
    });
  }, []);

  const irAWhatsApp = () => {
    if (whatsappTab && whatsappTab.id !== undefined) {
      chrome.tabs.update(whatsappTab.id, { active: true });
      if (whatsappTab.windowId !== undefined) {
        chrome.windows.update(whatsappTab.windowId, { focused: true });
      }
      window.close();
    }
  };

  return (
    <div className="w-80 p-4">
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">AmersurChat</h1>
        <p className="text-sm text-gray-600 mb-4">
          Extensión de Chrome para WhatsApp Web
        </p>

        {whatsappTab ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-green-800 mb-2">
              WhatsApp Web ya está abierto. Use el botón flotante con el logo
              de Amersur, en la esquina superior derecha de WhatsApp, para
              abrir el panel.
            </p>
            <button
              onClick={irAWhatsApp}
              className="w-full rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
            >
              Ir a WhatsApp Web
            </button>
          </div>
        ) : whatsappTab === false ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800">
              Para usar AmersurChat, abra{' '}
              <a
                href="https://web.whatsapp.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline"
              >
                WhatsApp Web
              </a>
            </p>
          </div>
        ) : null}

        <div className="space-y-2 text-left">
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-green-600 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <p className="text-sm text-gray-700">
              Ver información de contactos en CRM
            </p>
          </div>

          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-green-600 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <p className="text-sm text-gray-700">
              Crear leads con un clic
            </p>
          </div>

          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-green-600 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <p className="text-sm text-gray-700">
              Gestión automática de asignación
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          {/* Desde el manifest, no hardcodeado: decía v1.0.0 con la extensión
              publicada en 1.3.0. Mismo criterio que el footer del sidebar. */}
          <p className="text-xs text-gray-500">
            AmersurChat v{chrome.runtime.getManifest().version}
          </p>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
