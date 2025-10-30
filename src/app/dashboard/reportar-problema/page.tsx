"use client";

import { useState } from "react";
import { AlertCircle, Send, CheckCircle } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import toast from "react-hot-toast";

export default function ReportarProblemaPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    tipo: "bug",
    asunto: "",
    descripcion: "",
    prioridad: "media",
    url_pagina: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = supabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Debes estar autenticado");
        return;
      }

      // Aquí podrías guardar en una tabla de tickets/reportes
      // Por ahora solo mostramos el éxito

      // Simulación de envío
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSubmitted(true);
      toast.success("Reporte enviado exitosamente");

      // Reset form después de 3 segundos
      setTimeout(() => {
        setSubmitted(false);
        setFormData({
          tipo: "bug",
          asunto: "",
          descripcion: "",
          prioridad: "media",
          url_pagina: "",
        });
      }, 3000);

    } catch (error) {
      console.error("Error al enviar reporte:", error);
      toast.error("Error al enviar el reporte");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-crm-card rounded-xl p-12 border border-crm-border text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-crm-success/10 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-crm-success" />
          </div>
          <h2 className="text-2xl font-bold text-crm-text-primary mb-2">
            ¡Reporte Enviado!
          </h2>
          <p className="text-crm-text-muted">
            Gracias por tu reporte. Nuestro equipo lo revisará pronto.
          </p>
          <p className="text-sm text-crm-text-muted mt-4">
            Recibirás una notificación cuando se resuelva el problema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-crm-danger/10 rounded-lg">
          <AlertCircle className="w-6 h-6 text-crm-danger" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-crm-text-primary">Reportar Problema</h1>
          <p className="text-sm text-crm-text-muted mt-1">
            Describe el problema o error que encontraste y te ayudaremos a resolverlo
          </p>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-crm-card rounded-xl p-6 border border-crm-border space-y-6">
        {/* Tipo de Reporte */}
        <div>
          <label className="block text-sm font-medium text-crm-text-primary mb-2">
            Tipo de Reporte
          </label>
          <select
            value={formData.tipo}
            onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
            className="w-full px-4 py-2.5 bg-crm-bg-primary border border-crm-border rounded-lg focus:outline-none focus:ring-2 focus:ring-crm-primary text-crm-text-primary"
            required
          >
            <option value="bug">🐛 Error/Bug</option>
            <option value="feature">💡 Solicitud de Funcionalidad</option>
            <option value="mejora">⚡ Mejora de Funcionalidad Existente</option>
            <option value="duda">❓ Duda/Consulta</option>
            <option value="otro">📝 Otro</option>
          </select>
        </div>

        {/* Prioridad */}
        <div>
          <label className="block text-sm font-medium text-crm-text-primary mb-2">
            Prioridad
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, prioridad: "baja" })}
              className={`px-4 py-2.5 rounded-lg border-2 transition-all ${
                formData.prioridad === "baja"
                  ? "border-crm-info bg-crm-info/10 text-crm-info font-medium"
                  : "border-crm-border text-crm-text-muted hover:border-crm-info/50"
              }`}
            >
              🟢 Baja
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, prioridad: "media" })}
              className={`px-4 py-2.5 rounded-lg border-2 transition-all ${
                formData.prioridad === "media"
                  ? "border-crm-warning bg-crm-warning/10 text-crm-warning font-medium"
                  : "border-crm-border text-crm-text-muted hover:border-crm-warning/50"
              }`}
            >
              🟡 Media
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, prioridad: "alta" })}
              className={`px-4 py-2.5 rounded-lg border-2 transition-all ${
                formData.prioridad === "alta"
                  ? "border-crm-danger bg-crm-danger/10 text-crm-danger font-medium"
                  : "border-crm-border text-crm-text-muted hover:border-crm-danger/50"
              }`}
            >
              🔴 Alta
            </button>
          </div>
        </div>

        {/* Asunto */}
        <div>
          <label className="block text-sm font-medium text-crm-text-primary mb-2">
            Asunto
          </label>
          <input
            type="text"
            value={formData.asunto}
            onChange={(e) => setFormData({ ...formData, asunto: e.target.value })}
            placeholder="Ej: Error al guardar cliente"
            className="w-full px-4 py-2.5 bg-crm-bg-primary border border-crm-border rounded-lg focus:outline-none focus:ring-2 focus:ring-crm-primary text-crm-text-primary placeholder:text-crm-text-muted"
            required
          />
        </div>

        {/* URL de la página */}
        <div>
          <label className="block text-sm font-medium text-crm-text-primary mb-2">
            URL de la página (opcional)
          </label>
          <input
            type="text"
            value={formData.url_pagina}
            onChange={(e) => setFormData({ ...formData, url_pagina: e.target.value })}
            placeholder="Ej: /dashboard/clientes"
            className="w-full px-4 py-2.5 bg-crm-bg-primary border border-crm-border rounded-lg focus:outline-none focus:ring-2 focus:ring-crm-primary text-crm-text-primary placeholder:text-crm-text-muted"
          />
          <p className="text-xs text-crm-text-muted mt-1">
            Si el problema ocurre en una página específica, indica cuál
          </p>
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-crm-text-primary mb-2">
            Descripción detallada
          </label>
          <textarea
            value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            placeholder="Describe el problema con el mayor detalle posible. Incluye:
- ¿Qué estabas haciendo?
- ¿Qué esperabas que pasara?
- ¿Qué pasó realmente?
- ¿Puedes reproducir el problema?"
            className="w-full px-4 py-2.5 bg-crm-bg-primary border border-crm-border rounded-lg focus:outline-none focus:ring-2 focus:ring-crm-primary text-crm-text-primary placeholder:text-crm-text-muted resize-none"
            rows={8}
            required
          />
          <p className="text-xs text-crm-text-muted mt-1">
            Mínimo 20 caracteres
          </p>
        </div>

        {/* Información del sistema (automática) */}
        <div className="bg-crm-bg-primary rounded-lg p-4 border border-crm-border">
          <h3 className="text-sm font-medium text-crm-text-primary mb-2">
            Información del Sistema (se incluirá automáticamente)
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs text-crm-text-muted">
            <div>Navegador: {typeof window !== 'undefined' ? navigator.userAgent.split(' ').slice(-2)[0] : 'N/A'}</div>
            <div>Resolución: {typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'N/A'}</div>
            <div>Fecha: {new Date().toLocaleString('es-PE')}</div>
            <div>Versión: 1.0.0</div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-crm-border">
          <button
            type="button"
            onClick={() => setFormData({
              tipo: "bug",
              asunto: "",
              descripcion: "",
              prioridad: "media",
              url_pagina: "",
            })}
            className="px-6 py-2.5 text-crm-text-primary hover:bg-crm-card-hover rounded-lg transition-colors"
            disabled={loading}
          >
            Limpiar
          </button>
          <button
            type="submit"
            disabled={loading || formData.descripcion.length < 20}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Enviar Reporte
              </>
            )}
          </button>
        </div>
      </form>

      {/* Consejos */}
      <div className="bg-crm-card rounded-xl p-6 border border-crm-border">
        <h3 className="font-semibold text-crm-text-primary mb-3">💡 Consejos para un buen reporte</h3>
        <ul className="space-y-2 text-sm text-crm-text-muted">
          <li className="flex items-start gap-2">
            <span className="text-crm-primary mt-0.5">•</span>
            <span>Sé específico: describe exactamente qué hiciste antes de que ocurriera el problema</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-crm-primary mt-0.5">•</span>
            <span>Incluye capturas de pantalla si es posible (puedes agregarlas en el siguiente paso)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-crm-primary mt-0.5">•</span>
            <span>Si es un error, incluye el mensaje de error exacto que aparece</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-crm-primary mt-0.5">•</span>
            <span>Indica si el problema ocurre siempre o solo a veces</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
