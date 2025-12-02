import React, { useState, useEffect } from 'react';
import { WhatsAppContact, Cliente } from '@/types/crm';
import { CRMApiClient, getCRMConfig } from '@/lib/api';
import { LoginForm } from './LoginForm';
import { ContactInfo } from './ContactInfo';
import { CreateLeadForm } from './CreateLeadForm';
import { MessageTemplates } from './MessageTemplates';
import { ClientHistory } from './ClientHistory';
import { UpdateLeadStatus } from './UpdateLeadStatus';
import { ProjectInterest } from './ProjectInterest';
import { QuickNotes } from './QuickNotes';

export function Sidebar() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState<WhatsAppContact | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [searchingCliente, setSearchingCliente] = useState(false);
  const [apiClient, setApiClient] = useState<CRMApiClient | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [lastProcessedPhone, setLastProcessedPhone] = useState<string | null>(null); // Último teléfono procesado

  // Inicializar autenticación
  useEffect(() => {
    initAuth();
  }, []);

  // Solicitar info del contacto cuando se autentica y periódicamente para detectar cambios
  useEffect(() => {
    if (!isAuthenticated) return;

    // Solicitar inmediatamente al autenticarse
    requestContactInfo();

    // Luego verificar cambios cada 10 segundos (más eficiente)
    const interval = setInterval(() => {
      requestContactInfo();
    }, 10000); // Cambiado de 2000 a 10000 (10 segundos)

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Buscar cliente cuando cambia el contacto
  useEffect(() => {
    if (contact && apiClient) {
      // Solo buscar si el teléfono cambió (evita búsquedas redundantes)
      if (contact.phone !== lastProcessedPhone) {
        console.log('[Sidebar] Nuevo contacto detectado:', contact.phone);
        setLastProcessedPhone(contact.phone);
        searchCliente(contact.phone);
      }
    } else if (!contact) {
      // Si no hay contacto, limpiar estado
      setCliente(null);
      setLastProcessedPhone(null);
    }
  }, [contact, apiClient]);

  // Verificar pendientes cuando cambia el cliente
  useEffect(() => {
    async function checkPendientes() {
      if (cliente && apiClient) {
        try {
          const { pendientes } = await apiClient.getPendientes(cliente.id);
          // Enviar mensaje al content script para actualizar badge
          window.parent.postMessage({
            type: 'AMERSURCHAT_UPDATE_BADGE',
            count: pendientes,
          }, '*');
        } catch (error) {
          console.error('[Sidebar] Error verificando pendientes:', error);
        }
      } else {
        // Sin cliente, limpiar badge
        window.parent.postMessage({
          type: 'AMERSURCHAT_UPDATE_BADGE',
          count: 0,
        }, '*');
      }
    }

    checkPendientes();
  }, [cliente, apiClient]);

  async function initAuth() {
    try {
      const config = await getCRMConfig();
      if (config.token) {
        const client = new CRMApiClient(config.url, config.token);
        setApiClient(client);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('[Sidebar] Error inicializando auth:', error);
    } finally {
      setLoading(false);
    }
  }

  async function requestContactInfo() {
    // Solicitar información del contacto al content script
    window.parent.postMessage({ type: 'AMERSURCHAT_GET_CONTACT' }, '*');
  }

  async function searchCliente(phone: string) {
    if (!apiClient || !phone) return;

    setSearchingCliente(true);
    try {
      const found = await apiClient.searchClienteByPhone(phone);

      if (found) {
        // Cliente existe en el CRM
        setCliente(found);
        // Reflejar nombre del CRM en el contacto para mostrarlo en el encabezado
        setContact((prev) => {
          if (!prev) return prev;
          const normalizedName = (found.nombre || '').trim();
          if (!normalizedName) return prev;
          return { ...prev, name: normalizedName };
        });
        console.log('[Sidebar] Cliente encontrado en CRM:', found.id);
      } else {
        // Cliente NO existe - mostrar formulario para crear lead manualmente
        console.log('[Sidebar] Cliente no encontrado. Mostrar formulario de creación manual.');
        setCliente(null);
      }
    } catch (error) {
      console.error('[Sidebar] Error buscando cliente:', error);
      setCliente(null);
    } finally {
      setSearchingCliente(false);
    }
  }

  // Escuchar respuestas del content script
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data.type === 'AMERSURCHAT_CONTACT_INFO') {
        setContact(event.data.contact);
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  async function handleLogin(crmUrl: string, token: string) {
    const client = new CRMApiClient(crmUrl, token);

    try {
      // Obtener información del usuario
      const user = await client.getCurrentUser();
      setUserName(user.username || user.email?.split('@')[0] || 'Usuario');
    } catch (error) {
      console.error('[Sidebar] Error obteniendo usuario:', error);
      setUserName('Usuario');
    }

    setApiClient(client);
    setIsAuthenticated(true);
  }

  async function handleLogout() {
    setIsAuthenticated(false);
    setApiClient(null);
    setContact(null);
    setCliente(null);
  }

  async function handleLeadCreated() {
    // Refrescar información del cliente
    if (contact && apiClient) {
      await searchCliente(contact.phone);
    }
  }

  async function handleClientUpdate() {
    // Refrescar información del cliente después de actualización
    if (contact && apiClient) {
      await searchCliente(contact.phone);
    }
  }

  function handleSelectTemplate(mensaje: string) {
    console.log('[Sidebar] Insertando plantilla en WhatsApp:', mensaje.substring(0, 50));

    // Enviar mensaje al content script para insertar en WhatsApp
    window.parent.postMessage({
      type: 'AMERSURCHAT_INSERT_TEMPLATE',
      text: mensaje,
    }, '*');

    // También copiar al portapapeles como fallback
    navigator.clipboard.writeText(mensaje).catch((error) => {
      console.error('[Sidebar] Error copiando plantilla:', error);
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crm-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-crm-primary text-white p-4 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <img
              src={chrome.runtime.getURL('icons/icon48.png')}
              alt="Amersur Logo"
              className="w-10 h-10"
            />
            <h1 className="text-xl font-bold">AmersurChat</h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm hover:bg-white/20 px-3 py-1 rounded transition"
          >
            Cerrar sesión
          </button>
        </div>
        <p className="text-sm opacity-90">CRM WhatsApp Integration</p>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!contact && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Selecciona un chat de WhatsApp para ver la información del contacto
            </p>
          </div>
        )}

        {contact && (
          <>
            <ContactInfo
              contact={contact}
              cliente={cliente}
              loading={searchingCliente}
              apiClient={apiClient!}
            />

            {!cliente && (
              <CreateLeadForm
                contact={contact}
                apiClient={apiClient!}
                onLeadCreated={handleLeadCreated}
              />
            )}

            {cliente && (
              <>
                {/* Herramientas para cliente existente */}
                <UpdateLeadStatus
                  cliente={cliente}
                  apiClient={apiClient!}
                  onUpdate={handleClientUpdate}
                />

                <ProjectInterest
                  clienteId={cliente.id}
                  apiClient={apiClient!}
                />

                <QuickNotes
                  clienteId={cliente.id}
                  apiClient={apiClient!}
                  onNotaAdded={() => searchCliente(contact.phone)}
                />

                <ClientHistory
                  clienteId={cliente.id}
                  apiClient={apiClient!}
                />
              </>
            )}

            {/* Plantillas de mensajes (siempre disponibles) */}
            <MessageTemplates
              onSelectTemplate={handleSelectTemplate}
              userName={userName || undefined}
            />
          </>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Amersur CRM v1.0.0
        </p>
      </div>
    </div>
  );
}
