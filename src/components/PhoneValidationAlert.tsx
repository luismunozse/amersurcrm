"use client";

import { useState, useEffect } from "react";

interface PhoneValidationAlertProps {
  clientes: Array<{
    id: string;
    nombre: string;
    telefono: string | null;
    telefono_whatsapp: string | null;
  }>;
}

export default function PhoneValidationAlert({ clientes }: PhoneValidationAlertProps) {
  const [showAlert, setShowAlert] = useState(false);
  const [invalidPhones, setInvalidPhones] = useState<Array<{
    id: string;
    nombre: string;
    telefono: string | null;
    telefono_whatsapp: string | null;
  }>>([]);

  useEffect(() => {
    // Verificar si hay números sin código de país
    const invalid = clientes.filter(cliente => {
      const hasInvalidPhone = cliente.telefono && !cliente.telefono.startsWith('+');
      const hasInvalidWhatsApp = cliente.telefono_whatsapp && !cliente.telefono_whatsapp.startsWith('+');
      return hasInvalidPhone || hasInvalidWhatsApp;
    });

    setInvalidPhones(invalid);
    setShowAlert(invalid.length > 0);
  }, [clientes]);

  if (!showAlert || invalidPhones.length === 0) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Números de teléfono sin código de país detectados
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              Se encontraron {invalidPhones.length} cliente(s) con números de teléfono que no incluyen código de país. 
              Esto puede causar problemas con:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Enlaces de llamada y WhatsApp</li>
              <li>Validación internacional</li>
              <li>Búsqueda y filtros</li>
              <li>Integración con APIs externas</li>
            </ul>
          </div>
          <div className="mt-4">
            <div className="flex space-x-3">
              <button
                onClick={() => setShowAlert(false)}
                className="bg-yellow-100 text-yellow-800 px-3 py-2 rounded-lg text-sm font-medium hover:bg-yellow-200 transition-colors"
              >
                Ocultar advertencia
              </button>
              <button
                onClick={() => {
                  // Aquí podrías abrir un modal o ejecutar el script de normalización
                  console.log('Ejecutar normalización de números');
                }}
                className="bg-yellow-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors"
              >
                Normalizar números
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
