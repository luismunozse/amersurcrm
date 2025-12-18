'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useNotificationPermission } from '@/hooks/useNotificationPermission';

const STORAGE_KEY = 'notification-prompt-dismissed';

interface NotificationPermissionPromptProps {
  /** Callback cuando el usuario otorga permiso */
  onPermissionGranted?: () => void;
}

/**
 * Componente que muestra un prompt amigable para solicitar
 * permisos de notificaciones del navegador
 */
export default function NotificationPermissionPrompt({ onPermissionGranted }: NotificationPermissionPromptProps) {
  const { permission: _permission, requestPermission, isDefault, isUnsupported } = useNotificationPermission();
  // Inicializar como null para evitar flash durante hidratación
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  // Verificar localStorage solo en el cliente después del mount
  useEffect(() => {
    const wasDismissed = localStorage.getItem(STORAGE_KEY) === 'true';
    setDismissed(wasDismissed);
  }, []);

  // No mostrar hasta que se verifique localStorage (dismissed === null)
  // o si ya fue descartado, permiso otorgado/denegado, o no soportado
  if (dismissed === null || dismissed || !isDefault || isUnsupported) {
    return null;
  }

  const handleRequest = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      setDismissed(true);
      onPermissionGranted?.();
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-slide-up">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-crm-border p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="p-2 bg-crm-primary/10 rounded-lg">
              <Bell className="w-6 h-6 text-crm-primary" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-crm-text-primary mb-1">
              Mantente informado
            </h3>
            <p className="text-xs text-crm-text-secondary mb-3">
              Recibe notificaciones instantáneas sobre clientes, eventos y novedades importantes
            </p>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleRequest}
                className="px-3 py-1.5 bg-crm-primary text-white rounded-lg text-xs font-medium hover:bg-crm-primary-hover transition-colors"
              >
                Activar notificaciones
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-crm-text-muted hover:text-crm-text-primary rounded-lg text-xs font-medium transition-colors"
              >
                Ahora no
              </button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 text-crm-text-muted hover:text-crm-text-primary rounded transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
