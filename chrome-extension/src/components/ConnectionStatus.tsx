import { useState, useEffect } from 'react';
import { CRMApiClient } from '@/lib/api';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ConnectionStatus');

interface ConnectionStatusProps {
  apiClient: CRMApiClient | null;
}

type ConnectionState = 'checking' | 'connected' | 'disconnected' | 'error';

export function ConnectionStatus({ apiClient }: ConnectionStatusProps) {
  const [status, setStatus] = useState<ConnectionState>('checking');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!apiClient) {
      setStatus('disconnected');
      return;
    }

    let isMounted = true;
    let checkInterval: NodeJS.Timeout;

    const checkConnection = async () => {
      if (!isMounted || !apiClient) return;

      try {
        logger.debug('Verificando conexión con el servidor...');
        
        // Intentar una petición simple para verificar conexión
        const startTime = Date.now();
        await apiClient.getCurrentUser();
        const responseTime = Date.now() - startTime;

        if (isMounted) {
          setStatus('connected');
          setLastCheck(new Date());
          setRetryCount(0);
          logger.info(`Conexión verificada exitosamente (${responseTime}ms)`);
        }
      } catch (error) {
        if (!isMounted) return;

        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        logger.warn('Error verificando conexión', { error: errorMessage });

        // Determinar tipo de error
        if (errorMessage.includes('conexión') || errorMessage.includes('fetch')) {
          setStatus('disconnected');
        } else if (errorMessage.includes('401') || errorMessage.includes('No autorizado')) {
          setStatus('error');
        } else {
          setStatus('error');
        }

        setRetryCount((prev) => prev + 1);
        setLastCheck(new Date());
      }
    };

    // Verificar inmediatamente
    checkConnection();

    // Verificar cada 30 segundos
    checkInterval = setInterval(checkConnection, 30000);

    return () => {
      isMounted = false;
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [apiClient]);

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'disconnected':
        return 'bg-red-500';
      case 'error':
        return 'bg-yellow-500';
      case 'checking':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Conectado';
      case 'disconnected':
        return 'Sin conexión';
      case 'error':
        return 'Error de conexión';
      case 'checking':
        return 'Verificando...';
      default:
        return 'Desconocido';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'disconnected':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'checking':
        return (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  if (!apiClient) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()} animate-pulse`} />
      <div className="flex items-center gap-1.5">
        {getStatusIcon()}
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {getStatusText()}
        </span>
      </div>
      {lastCheck && status === 'connected' && (
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
          {formatLastCheck(lastCheck)}
        </span>
      )}
      {retryCount > 0 && status !== 'connected' && (
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
          Reintento {retryCount}
        </span>
      )}
    </div>
  );
}

function formatLastCheck(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) {
    return 'Ahora';
  } else if (diff < 3600) {
    const minutes = Math.floor(diff / 60);
    return `Hace ${minutes}m`;
  } else {
    const hours = Math.floor(diff / 3600);
    return `Hace ${hours}h`;
  }
}

