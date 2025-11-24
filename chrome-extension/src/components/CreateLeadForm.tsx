import React, { useState, useEffect } from 'react';
import { WhatsAppContact } from '@/types/crm';
import { CRMApiClient } from '@/lib/api';

interface CreateLeadFormProps {
  contact: WhatsAppContact;
  apiClient: CRMApiClient;
  onLeadCreated: () => void;
}

export function CreateLeadForm({ contact, apiClient, onLeadCreated }: CreateLeadFormProps) {
  const [nombre, setNombre] = useState(contact.name);
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Intentar obtener el último mensaje del chat
  useEffect(() => {
    // Solicitar al content script el último mensaje
    window.parent.postMessage({ type: 'AMERSURCHAT_GET_LAST_MESSAGE' }, '*');

    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'AMERSURCHAT_LAST_MESSAGE') {
        if (event.data.message) {
          setMensaje(event.data.message.substring(0, 500));
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [contact]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await apiClient.createLead({
        nombre: nombre || `Lead WhatsApp ${contact.phone.slice(-4)}`,
        telefono: contact.phone,
        telefono_whatsapp: contact.phone,
        origen_lead: 'whatsapp_web',
        canal: 'whatsapp_extension',
        mensaje_inicial: mensaje || undefined,
        chat_id: contact.chatId,
      });

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onLeadCreated();
        }, 1500);
      } else {
        setError(result.message || 'Error al crear lead');
      }
    } catch (err) {
      console.error('[CreateLeadForm] Error:', err);
      setError(err instanceof Error ? err.message : 'Error al crear lead');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <svg
            className="w-8 h-8 text-green-600"
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
        </div>
        <h3 className="text-lg font-semibold text-green-900 mb-2">
          ¡Lead creado con éxito!
        </h3>
        <p className="text-sm text-green-700">
          El contacto ha sido registrado en el CRM
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Crear nuevo lead
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del contacto
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-crm-primary text-sm"
            placeholder="Nombre del lead"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Teléfono
          </label>
          <input
            type="text"
            value={contact.phone}
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
            disabled
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mensaje inicial (opcional)
          </label>
          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-crm-primary text-sm"
            rows={4}
            placeholder="Primer mensaje del contacto..."
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-crm-primary text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium text-sm"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Creando lead...
            </span>
          ) : (
            'Crear Lead en CRM'
          )}
        </button>
      </form>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          El lead será asignado automáticamente a un vendedor disponible
        </p>
      </div>
    </div>
  );
}
