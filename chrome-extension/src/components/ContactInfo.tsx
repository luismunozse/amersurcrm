import React from 'react';
import { WhatsAppContact, Cliente } from '@/types/crm';

interface ContactInfoProps {
  contact: WhatsAppContact;
  cliente: Cliente | null;
  loading: boolean;
}

export function ContactInfo({ contact, cliente, loading }: ContactInfoProps) {
  const estadoColors: Record<string, string> = {
    por_contactar: 'bg-yellow-100 text-yellow-800',
    contactado: 'bg-blue-100 text-blue-800',
    interesado: 'bg-purple-100 text-purple-800',
    negociacion: 'bg-orange-100 text-orange-800',
    cerrado: 'bg-green-100 text-green-800',
    perdido: 'bg-red-100 text-red-800',
  };

  const estadoLabels: Record<string, string> = {
    por_contactar: 'Por Contactar',
    contactado: 'Contactado',
    interesado: 'Interesado',
    negociacion: 'En Negociación',
    cerrado: 'Cerrado',
    perdido: 'Perdido',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <svg
              className="w-7 h-7"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-lg">{contact.name}</h2>
            <p className="text-sm opacity-90">{contact.phone}</p>
          </div>
        </div>
      </div>

      {/* Estado del Cliente */}
      <div className="p-4">
        {loading && (
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-crm-primary"></div>
            <span className="text-sm">Buscando en CRM...</span>
          </div>
        )}

        {!loading && cliente && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Estado:</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  estadoColors[cliente.estado_cliente]
                }`}
              >
                {estadoLabels[cliente.estado_cliente]}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Origen:</span>
              <span className="text-sm text-gray-900 dark:text-gray-100">{cliente.origen_lead}</span>
            </div>

            {cliente.vendedor_asignado && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Vendedor:</span>
                <span className="text-sm text-gray-900 dark:text-gray-100">{cliente.vendedor_asignado}</span>
              </div>
            )}

            {cliente.email && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Email:</span>
                <span className="text-sm text-gray-900 dark:text-gray-100">{cliente.email}</span>
              </div>
            )}

            <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Registrado: {new Date(cliente.created_at).toLocaleDateString('es-PE')}
              </span>
            </div>

            {cliente.notas && (
              <div className="pt-2">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Notas:</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  {cliente.notas}
                </p>
              </div>
            )}
          </div>
        )}

        {!loading && !cliente && (
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm">Contacto nuevo - No registrado en CRM</span>
          </div>
        )}
      </div>
    </div>
  );
}
