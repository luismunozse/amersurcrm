"use client";

import { useState } from "react";
import { Send, CheckCircle, XCircle, Loader2, MessageSquare } from "lucide-react";

export default function TwilioTestPage() {
  const [telefono, setTelefono] = useState("+51");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{
    tipo: "success" | "error";
    mensaje: string;
    detalles?: any;
  } | null>(null);

  const enviarWhatsApp = async () => {
    if (!telefono || telefono.length < 10) {
      setResultado({
        tipo: "error",
        mensaje: "Por favor ingresa un número válido (ej: +51987654321)",
      });
      return;
    }

    if (!mensaje || mensaje.trim().length === 0) {
      setResultado({
        tipo: "error",
        mensaje: "Por favor escribe un mensaje",
      });
      return;
    }

    setEnviando(true);
    setResultado(null);

    try {
      const respuesta = await fetch("/api/twilio/send-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telefono: telefono,
          contenido_texto: mensaje,
        }),
      });

      const data = await respuesta.json();

      if (respuesta.ok) {
        setResultado({
          tipo: "success",
          mensaje: "✅ Mensaje enviado correctamente",
          detalles: data,
        });
        setMensaje(""); // Limpiar el mensaje
      } else {
        setResultado({
          tipo: "error",
          mensaje: `❌ Error: ${data.error || "Error desconocido"}`,
          detalles: data.details,
        });
      }
    } catch (error) {
      setResultado({
        tipo: "error",
        mensaje: "❌ Error de conexión. Verifica que el servidor esté corriendo.",
        detalles: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setEnviando(false);
    }
  };

  const enviarSMS = async () => {
    if (!telefono || telefono.length < 10) {
      setResultado({
        tipo: "error",
        mensaje: "Por favor ingresa un número válido (ej: +51987654321)",
      });
      return;
    }

    if (!mensaje || mensaje.trim().length === 0) {
      setResultado({
        tipo: "error",
        mensaje: "Por favor escribe un mensaje",
      });
      return;
    }

    setEnviando(true);
    setResultado(null);

    try {
      const respuesta = await fetch("/api/twilio/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telefono: telefono,
          contenido_texto: mensaje,
        }),
      });

      const data = await respuesta.json();

      if (respuesta.ok) {
        setResultado({
          tipo: "success",
          mensaje: "✅ SMS enviado correctamente",
          detalles: data,
        });
        setMensaje(""); // Limpiar el mensaje
      } else {
        setResultado({
          tipo: "error",
          mensaje: `❌ Error: ${data.error || "Error desconocido"}`,
          detalles: data.details,
        });
      }
    } catch (error) {
      setResultado({
        tipo: "error",
        mensaje: "❌ Error de conexión. Verifica que el servidor esté corriendo.",
        detalles: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-crm-text-primary font-display flex items-center gap-3">
          <div className="p-2 bg-blue-500 rounded-xl">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          Prueba de Twilio
        </h1>
        <p className="text-crm-text-secondary mt-1">
          Envía mensajes de prueba usando Twilio WhatsApp y SMS
        </p>
      </div>

      {/* Instrucciones */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
          📱 Configuración del WhatsApp Sandbox
        </h3>
        <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
          Para recibir mensajes de WhatsApp del sandbox, primero debes unirte:
        </p>
        <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-2 list-decimal list-inside">
          <li>Abre WhatsApp en tu celular</li>
          <li>
            Envía un mensaje a: <strong>+1 415 523 8886</strong>
          </li>
          <li>
            Escribe exactamente: <code className="bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded">join curious-remarkable</code>
          </li>
          <li>Espera la confirmación de Twilio</li>
          <li>Ahora ya puedes recibir mensajes del CRM en ese número</li>
        </ol>
        <p className="text-xs text-blue-700 dark:text-blue-300 mt-3">
          ⚠️ Solo los números que se unieron al sandbox pueden recibir mensajes
        </p>
      </div>

      {/* Formulario */}
      <div className="crm-card p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-crm-text-primary mb-2">
            Número de teléfono
          </label>
          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="+51987654321"
            className="w-full px-4 py-3 rounded-lg border border-crm-border bg-crm-bg-primary text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
            disabled={enviando}
          />
          <p className="text-xs text-crm-text-muted mt-1">
            Incluye el código de país (ej: +51 para Perú, +1 para USA)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-crm-text-primary mb-2">
            Mensaje
          </label>
          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Escribe tu mensaje aquí..."
            rows={4}
            className="w-full px-4 py-3 rounded-lg border border-crm-border bg-crm-bg-primary text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary resize-none"
            disabled={enviando}
          />
          <p className="text-xs text-crm-text-muted mt-1">
            Caracteres: {mensaje.length}/1600
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={enviarWhatsApp}
            disabled={enviando}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enviando ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Enviar WhatsApp
              </>
            )}
          </button>

          <button
            onClick={enviarSMS}
            disabled={enviando}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enviando ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Enviar SMS
              </>
            )}
          </button>
        </div>
      </div>

      {/* Resultado */}
      {resultado && (
        <div
          className={`rounded-xl p-6 ${
            resultado.tipo === "success"
              ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
          }`}
        >
          <div className="flex items-start gap-3">
            {resultado.tipo === "success" ? (
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p
                className={`font-medium ${
                  resultado.tipo === "success"
                    ? "text-green-900 dark:text-green-100"
                    : "text-red-900 dark:text-red-100"
                }`}
              >
                {resultado.mensaje}
              </p>
              {resultado.detalles && (
                <details className="mt-2">
                  <summary
                    className={`text-sm cursor-pointer ${
                      resultado.tipo === "success"
                        ? "text-green-700 dark:text-green-300"
                        : "text-red-700 dark:text-red-300"
                    }`}
                  >
                    Ver detalles
                  </summary>
                  <pre
                    className={`mt-2 p-3 rounded text-xs overflow-auto ${
                      resultado.tipo === "success"
                        ? "bg-green-100 dark:bg-green-900/40 text-green-900 dark:text-green-100"
                        : "bg-red-100 dark:bg-red-900/40 text-red-900 dark:text-red-100"
                    }`}
                  >
                    {JSON.stringify(resultado.detalles, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info adicional */}
      <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          ℹ️ Información
        </h3>
        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
          <li>
            • <strong>WhatsApp Sandbox:</strong> Gratis, ilimitado, pero los destinatarios deben unirse primero
          </li>
          <li>
            • <strong>SMS:</strong> Requiere número de teléfono Twilio comprado (~$1 USD/mes)
          </li>
          <li>
            • <strong>Producción:</strong> Para WhatsApp sin sandbox, solicita WhatsApp Business API en Twilio
          </li>
          <li>
            • <strong>Costos:</strong> WhatsApp ~$0.004 USD/mensaje, SMS Perú ~$0.05 USD/mensaje
          </li>
        </ul>
      </div>

      {/* Siguiente paso */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
          🚀 Siguiente Paso
        </h3>
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Una vez que confirmes que Twilio funciona, podemos integrar el selector de proveedor
          (Meta vs Twilio) en el módulo principal de Marketing.
        </p>
      </div>
    </div>
  );
}
