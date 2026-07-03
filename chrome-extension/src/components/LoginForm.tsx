import React, { useState, useEffect } from 'react';
import { CRMApiClient, saveCRMConfig, getCRMConfig } from '@/lib/api';
import { InlineAlert } from './InlineAlert';

// URL de producción por defecto
const PRODUCTION_URL = 'https://crm.amersursac.com';
const LOCAL_URL = 'http://localhost:3000';

// Logo de la empresa (mismo asset que el botón flotante y la cabecera).
const LOGO_URL =
  typeof chrome !== 'undefined' && chrome.runtime?.getURL
    ? chrome.runtime.getURL('icons/icon128.png')
    : 'icons/icon128.png';

interface LoginFormProps {
  onLogin: (crmUrl: string, token: string) => void;
  /** Muestra un aviso de "tu sesión expiró" arriba del formulario. */
  sessionExpired?: boolean;
}

export function LoginForm({ onLogin, sessionExpired = false }: LoginFormProps) {
  const [crmUrl, setCrmUrl] = useState(PRODUCTION_URL);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDevMode, setShowDevMode] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(false);

  // Cargar la última URL usada al iniciar
  useEffect(() => {
    getCRMConfig().then((config) => {
      if (config.url && config.url !== PRODUCTION_URL) {
        setCrmUrl(config.url);
        setShowDevMode(true);
        setIsLocalMode(config.url === LOCAL_URL);
      }
    });
  }, []);

  // Cambiar entre local y producción
  function toggleLocalMode() {
    const newIsLocal = !isLocalMode;
    setIsLocalMode(newIsLocal);
    setCrmUrl(newIsLocal ? LOCAL_URL : PRODUCTION_URL);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const client = new CRMApiClient(crmUrl);
      const authState = await client.login(username, password);

      // Guardar configuración
      await saveCRMConfig(crmUrl, authState.token!);

      // Notificar login exitoso
      onLogin(crmUrl, authState.token!);
    } catch (err) {
      console.error('[LoginForm] Error:', err);
      setError(err instanceof Error ? err.message : 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-crm-bg-primary to-crm-accent/20 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <img
            src={LOGO_URL}
            alt="Amersur"
            className="w-20 h-20 mx-auto mb-3 object-contain rounded-2xl shadow-sm animate-fade-in"
          />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">AmersurChat</h1>
          <p className="text-gray-600 dark:text-gray-300">Iniciar sesión en el CRM</p>
        </div>

        {sessionExpired && (
          <div className="mb-4">
            <InlineAlert variant="warning" message="Tu sesión expiró. Iniciá sesión de nuevo para continuar." />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Toggle para modo desarrollo */}
          <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {isLocalMode ? '🔧 Modo Local' : '🌐 Producción'}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]">
                {crmUrl}
              </span>
            </div>
            <button
              type="button"
              onClick={toggleLocalMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isLocalMode
                  ? 'bg-orange-500 focus:ring-orange-500'
                  : 'bg-crm-primary focus:ring-crm-primary'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                  isLocalMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Campo URL personalizada (oculto por defecto) */}
          {showDevMode && !isLocalMode && crmUrl !== PRODUCTION_URL && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                URL personalizada
              </label>
              <input
                type="url"
                value={crmUrl}
                onChange={(e) => setCrmUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-crm-primary text-sm"
                placeholder="https://..."
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-crm-primary"
              placeholder="admin2"
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-crm-primary"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-md p-3">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-crm-primary text-white py-2 px-4 rounded-md hover:bg-crm-primary-hover disabled:bg-gray-400 disabled:cursor-not-allowed transition ease-out-strong active:scale-[0.98] font-medium"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Usa tus credenciales del CRM Amersur
          </p>
        </div>
      </div>
    </div>
  );
}
