import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

function Popup() {
  return (
    <div className="w-80 p-4">
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">AmersurChat</h1>
        <p className="text-sm text-gray-600 mb-4">
          Extensión de Chrome para WhatsApp Web
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-800">
            Para usar AmersurChat, abre{' '}
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
          <p className="text-xs text-gray-500">
            Amersur CRM v1.0.0
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
