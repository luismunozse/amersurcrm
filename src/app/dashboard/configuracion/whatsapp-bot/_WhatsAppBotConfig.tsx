"use client";

import { useWhatsAppBotStatus } from "@/hooks/useWhatsAppBotStatus";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2 } from "lucide-react";

export default function WhatsAppBotConfig() {
  const { connected, qr, phoneNumber, lastUpdate, error, isConnecting } = useWhatsAppBotStatus();

  return (
    <div className="space-y-6">
      {/* Estado del Bot */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Estado del Bot</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Estado de Conexión */}
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {isConnecting ? (
                <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" />
              ) : connected ? (
                <div className="w-3 h-3 rounded-full bg-green-500" />
              ) : (
                <div className="w-3 h-3 rounded-full bg-red-500" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Estado</p>
              <p className="font-medium">
                {isConnecting
                  ? "Conectando..."
                  : connected
                    ? "🟢 Conectado"
                    : "🔴 Desconectado"}
              </p>
            </div>
          </div>

          {/* Número de WhatsApp */}
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Número</p>
            <p className="font-medium">{phoneNumber || "—"}</p>
          </div>

          {/* Última Actualización */}
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Última actualización</p>
            <p className="font-medium text-sm" suppressHydrationWarning>
              {new Date(lastUpdate).toLocaleString("es-PE")}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="md:col-span-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Error</p>
              <p className="font-medium text-red-600">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* QR Code */}
      {qr && !connected && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Escanear QR</h2>

          <div className="flex flex-col items-center gap-4">
            <div className="bg-white p-4 rounded-lg">
              <QRCodeSVG value={qr} size={256} level="M" />
            </div>

            <div className="text-center space-y-2">
              <p className="font-medium">Pasos para conectar:</p>
              <ol className="text-sm text-gray-600 dark:text-gray-400 text-left space-y-1">
                <li>1. Abre WhatsApp en tu teléfono</li>
                <li>2. Ve a <strong>Menú (⋮)</strong> → <strong>Dispositivos vinculados</strong></li>
                <li>3. Toca <strong>Vincular dispositivo</strong></li>
                <li>4. Escanea este código QR</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje cuando está conectado */}
      {connected && !qr && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900 dark:text-green-100">
                Bot conectado y funcionando
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                El bot está escuchando mensajes entrantes de WhatsApp. Los leads se crearán
                automáticamente cuando alguien te escriba por primera vez.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Información */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          ℹ️ Información
        </h3>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• El bot captura automáticamente leads de publicidades de Facebook/Instagram</li>
          <li>• Los leads se crean cuando alguien te escribe por primera vez</li>
          <li>• Se asignan automáticamente a vendedores (round-robin)</li>
          <li>• La sesión dura aproximadamente 14-30 días</li>
        </ul>
      </div>
    </div>
  );
}
