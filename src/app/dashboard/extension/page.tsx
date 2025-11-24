import { Download, Chrome, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function ExtensionPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-crm-primary/10 dark:bg-crm-primary/20 mb-4">
          <Chrome className="w-10 h-10 text-crm-primary dark:text-crm-primary" />
        </div>
        <h1 className="text-4xl font-bold text-crm-text-primary dark:text-gray-100 mb-4">
          AmersurChat - Extensión de Chrome
        </h1>
        <p className="text-lg text-crm-text-muted dark:text-gray-400">
          Captura leads automáticamente desde WhatsApp Web
        </p>
      </div>

      {/* Instrucciones de instalación */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-crm-border dark:border-gray-700 p-8 mb-8">
        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2 dark:text-gray-100">
          <Download className="w-6 h-6 text-crm-primary" />
          Instalación Manual
        </h2>

        <ol className="space-y-6">
          <li className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-crm-primary text-white flex items-center justify-center font-semibold">
              1
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2 dark:text-gray-100">Descargar la extensión</h3>
              <a
                href="/extension/AmersurChat.zip"
                download
                className="inline-flex items-center gap-2 px-6 py-3 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-dark transition font-medium"
              >
                <Download className="w-5 h-5" />
                Descargar AmersurChat.zip
              </a>
            </div>
          </li>

          <li className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-crm-primary text-white flex items-center justify-center font-semibold">
              2
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2 dark:text-gray-100">Extraer el archivo</h3>
              <p className="text-crm-text-muted dark:text-gray-400">
                Descomprime el archivo ZIP en una carpeta de tu computadora.
                Recuerda la ubicación.
              </p>
            </div>
          </li>

          <li className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-crm-primary text-white flex items-center justify-center font-semibold">
              3
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2 dark:text-gray-100">Abrir Chrome Extensions</h3>
              <p className="text-crm-text-muted dark:text-gray-400 mb-2">
                Abre Google Chrome y navega a:
              </p>
              <code className="block bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded border border-gray-300 dark:border-gray-600 dark:text-gray-200 font-mono text-sm">
                chrome://extensions/
              </code>
              <p className="text-crm-text-muted dark:text-gray-400 mt-2 text-sm">
                O desde el menú: ⋮ → Extensiones → Administrar extensiones
              </p>
            </div>
          </li>

          <li className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-crm-primary text-white flex items-center justify-center font-semibold">
              4
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2 dark:text-gray-100">Activar modo desarrollador</h3>
              <p className="text-crm-text-muted dark:text-gray-400">
                En la esquina superior derecha, activa el interruptor "Modo de desarrollador"
              </p>
            </div>
          </li>

          <li className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-crm-primary text-white flex items-center justify-center font-semibold">
              5
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2 dark:text-gray-100">Cargar la extensión</h3>
              <p className="text-crm-text-muted dark:text-gray-400 mb-2">
                Haz click en "Cargar extensión sin empaquetar" y selecciona la carpeta que descomprimiste.
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-200 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded px-3 py-2">
                ⚠️ <strong>Importante:</strong> Selecciona la carpeta <code className="dark:bg-yellow-800/30 dark:text-yellow-100">dist/</code> dentro del archivo descomprimido.
              </p>
            </div>
          </li>

          <li className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2 dark:text-gray-100">¡Listo!</h3>
              <p className="text-crm-text-muted dark:text-gray-400 mb-3">
                Ya puedes usar AmersurChat en WhatsApp Web
              </p>
              <a
                href="https://web.whatsapp.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Abrir WhatsApp Web →
              </a>
            </div>
          </li>
        </ol>
      </div>

      {/* Video tutorial (opcional) */}
      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-6 mb-8">
        <h3 className="font-semibold text-lg mb-2 flex items-center gap-2 dark:text-gray-100">
          📹 Video Tutorial
        </h3>
        <p className="text-sm text-crm-text-muted dark:text-gray-400 mb-3">
          ¿Primera vez instalando una extensión? Mira este video:
        </p>
        <a
          href="#"
          className="text-crm-primary dark:text-blue-400 hover:underline font-medium"
        >
          Ver tutorial en video (3 minutos) →
        </a>
      </div>

      {/* Características */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-crm-border dark:border-gray-700 p-8">
        <h2 className="text-2xl font-semibold mb-6 dark:text-gray-100">¿Qué hace AmersurChat?</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold mb-1 dark:text-gray-100">Captura automática de leads</h4>
              <p className="text-sm text-crm-text-muted dark:text-gray-400">
                Los leads se crean solos cuando abres un chat nuevo
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold mb-1 dark:text-gray-100">Información del CRM en vivo</h4>
              <p className="text-sm text-crm-text-muted dark:text-gray-400">
                Ve el estado del cliente mientras chateas
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold mb-1 dark:text-gray-100">Plantillas de mensajes</h4>
              <p className="text-sm text-crm-text-muted dark:text-gray-400">
                8 plantillas listas para copiar y pegar
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold mb-1 dark:text-gray-100">Actualizar estados</h4>
              <p className="text-sm text-crm-text-muted dark:text-gray-400">
                Cambia el estado del lead sin salir de WhatsApp
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Soporte */}
      <div className="mt-8 text-center">
        <p className="text-sm text-crm-text-muted dark:text-gray-400 mb-2">
          ¿Problemas con la instalación?
        </p>
        <Link
          href="/dashboard/ayuda"
          className="text-crm-primary dark:text-blue-400 hover:underline font-medium"
        >
          Contactar soporte →
        </Link>
      </div>
    </div>
  );
}
