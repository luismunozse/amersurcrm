"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Cliente {
  id: string;
  nombre: string;
  telefono: string | null;
  telefono_whatsapp: string | null;
}

interface PhoneNormalizationToolProps {
  clientes: Cliente[];
  onUpdate?: () => void;
}

export default function PhoneNormalizationTool({ clientes, onUpdate }: PhoneNormalizationToolProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{
    processed: number;
    updated: number;
    errors: number;
  } | null>(null);

  function _normalizePhoneNumber(phone: string | null): string | null {
    if (!phone) return null;
    
    // Si ya tiene código de país, devolverlo tal como está
    if (phone.startsWith('+')) {
      return phone;
    }
    
    // Limpiar el número (solo dígitos)
    const cleanNumber = phone.replace(/\D/g, '');
    
    // Si está vacío después de limpiar, devolver null
    if (!cleanNumber) return null;
    
    // Si ya tiene código de país peruano (51), agregar el +
    if (cleanNumber.startsWith('51') && cleanNumber.length >= 9) {
      return `+${cleanNumber}`;
    }
    
    // Si es un número peruano (9 dígitos), agregar +51
    if (cleanNumber.length === 9 && cleanNumber.startsWith('9')) {
      return `+51${cleanNumber}`;
    }
    
    // Si es un número peruano (8 dígitos), agregar +51
    if (cleanNumber.length === 8) {
      return `+51${cleanNumber}`;
    }
    
    // Para otros casos, agregar +51 por defecto
    return `+51${cleanNumber}`;
  }

  const handleNormalize = async () => {
    setIsProcessing(true);
    setResults(null);

    try {
      // Usar la función segura que maneja duplicados
      const { data, error } = await supabase.rpc('normalize_all_phone_numbers_safe');

      if (error) {
        console.error('❌ Error ejecutando normalización:', error);
        setResults({ processed: 0, updated: 0, errors: 1 });
        return;
      }

      if (!data || data.length === 0) {
        setResults({ processed: 0, updated: 0, errors: 0 });
        return;
      }

      // Procesar resultados
      const processed = data.length;
      const updated = data.filter((row: any) => row.updated).length;
      const errors = 0; // La función de BD maneja errores internamente

      setResults({ processed, updated, errors });
      
      if (onUpdate) {
        onUpdate();
      }

    } catch (error) {
      console.error('❌ Error en la normalización:', error);
      setResults({ processed: 0, updated: 0, errors: 1 });
    } finally {
      setIsProcessing(false);
    }
  };

  const clientesNeedingUpdate = clientes.filter(cliente => {
    const hasInvalidPhone = cliente.telefono && !cliente.telefono.startsWith('+');
    const hasInvalidWhatsApp = cliente.telefono_whatsapp && !cliente.telefono_whatsapp.startsWith('+');
    return hasInvalidPhone || hasInvalidWhatsApp;
  });

  if (clientesNeedingUpdate.length === 0) {
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
              Se encontraron <strong>{clientesNeedingUpdate.length}</strong> cliente(s) con números de teléfono que no incluyen código de país.
            </p>
            {results && (
              <div className="mt-3 p-3 bg-yellow-100 rounded-lg">
                <h4 className="font-medium">Resultados de la normalización:</h4>
                <ul className="mt-1 space-y-1">
                  <li>✅ Clientes actualizados: {results.updated}</li>
                  <li>❌ Errores: {results.errors}</li>
                  <li>📊 Total procesados: {results.processed}</li>
                </ul>
              </div>
            )}
          </div>
          <div className="mt-4">
            <button
              onClick={handleNormalize}
              disabled={isProcessing}
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Normalizando...
                </>
              ) : (
                'Normalizar números de teléfono'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
