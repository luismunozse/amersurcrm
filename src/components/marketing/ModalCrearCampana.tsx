"use client";

import { useState, useEffect } from "react";
import { X, Send, Users, Calendar, Zap } from "lucide-react";
import { crearCampana, obtenerPlantillas, verificarCredencialesWhatsApp } from "@/app/dashboard/admin/marketing/_actions";
import type { MarketingTemplate, EstadoCampana } from "@/types/whatsapp-marketing";
import toast from "react-hot-toast";

interface ModalCrearCampanaProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ModalCrearCampana({ open, onClose, onSuccess }: ModalCrearCampanaProps) {
  const [loading, setLoading] = useState(false);
  const [plantillas, setPlantillas] = useState<MarketingTemplate[]>([]);
  const [loadingPlantillas, setLoadingPlantillas] = useState(true);
  const [tieneCredenciales, setTieneCredenciales] = useState(false);

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    template_id: "",
    enviar_inmediatamente: true,
    fecha_inicio: "",
    max_envios_por_segundo: 10,
  });

  const [variables, setVariables] = useState<Record<string, string>>({});
  const [destinatarios, setDestinatarios] = useState({
    tipo: "todos", // "todos", "proyecto", "manual"
    proyecto_id: "",
    numeros: "",
  });

  useEffect(() => {
    if (open) {
      cargarDatos();
    }
  }, [open]);

  const cargarDatos = async () => {
    setLoadingPlantillas(true);

    // Cargar plantillas
    const resultPlantillas = await obtenerPlantillas();
    if (resultPlantillas.data) {
      const plantillasAprobadas = resultPlantillas.data.filter(p => p.estado_aprobacion === 'APPROVED');
      setPlantillas(plantillasAprobadas);
    }

    // Verificar credenciales de Twilio
    const resultCred = await verificarCredencialesWhatsApp();
    setTieneCredenciales(resultCred.tieneCredenciales);

    setLoadingPlantillas(false);
  };

  const plantillaSeleccionada = plantillas.find(p => p.id === formData.template_id);

  // Inicializar variables cuando se selecciona una plantilla
  useEffect(() => {
    if (plantillaSeleccionada && plantillaSeleccionada.variables) {
      const nuevasVariables: Record<string, string> = {};
      plantillaSeleccionada.variables.forEach((variable, index) => {
        nuevasVariables[variable] = "";
      });
      setVariables(nuevasVariables);
    }
  }, [plantillaSeleccionada]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tieneCredenciales) {
      toast.error("No hay credenciales de Twilio configuradas. Verifica tu archivo .env.local");
      return;
    }

    if (!formData.template_id) {
      toast.error("Selecciona una plantilla");
      return;
    }

    // Validar que todas las variables estén completas
    if (plantillaSeleccionada?.variables) {
      const variablesIncompletas = plantillaSeleccionada.variables.filter(
        v => !variables[v] || variables[v].trim() === ""
      );
      if (variablesIncompletas.length > 0) {
        toast.error(`Completa todas las variables: ${variablesIncompletas.join(", ")}`);
        return;
      }
    }

    // Validar destinatarios según tipo
    if (destinatarios.tipo === "manual") {
      const numeros = destinatarios.numeros.trim();
      if (!numeros) {
        toast.error("Ingresa al menos un número de WhatsApp");
        return;
      }
    }

    setLoading(true);

    try {
      // Crear campaña con Twilio (sin credential_id porque usamos variables de entorno)
      const campanaData = {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        template_id: formData.template_id,
        credential_id: undefined, // Con Twilio no necesitamos credential_id (credenciales en .env.local)
        variables_valores: variables,
        enviar_inmediatamente: formData.enviar_inmediatamente,
        fecha_inicio: formData.fecha_inicio || undefined,
        max_envios_por_segundo: formData.max_envios_por_segundo,
        estado: (formData.enviar_inmediatamente ? 'RUNNING' : 'DRAFT') as EstadoCampana,
        // Guardar config de destinatarios temporalmente (lo procesaremos en el backend)
        objetivo: `Destinatarios: ${destinatarios.tipo}${destinatarios.tipo === 'manual' ? ` - ${destinatarios.numeros.split('\n').length} números` : ''}`,
      };

      const result = await crearCampana(campanaData);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Campaña creada exitosamente");

        // Si se debe enviar inmediatamente, ejecutar la campaña con Twilio
        if (formData.enviar_inmediatamente && result.data?.id) {
          try {
            const ejecutarResponse = await fetch('/api/twilio/campanas/ejecutar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                campana_id: result.data.id,
                canal: 'whatsapp',
                destinatarios_config: destinatarios
              })
            });

            const ejecutarResult = await ejecutarResponse.json();

            if (ejecutarResult.success) {
              toast.success(
                `Mensajes enviados: ${ejecutarResult.enviados}/${ejecutarResult.total}`,
                { duration: 5000 }
              );
            } else {
              toast.error(`Error ejecutando campaña: ${ejecutarResult.error}`);
            }
          } catch (execError) {
            console.error('Error ejecutando campaña:', execError);
            toast.error('Error al enviar los mensajes');
          }
        }

        onSuccess();
        onClose();
        resetForm();
      }
    } catch (error) {
      console.error("Error creando campaña:", error);
      toast.error("Error creando campaña");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: "",
      descripcion: "",
      template_id: "",
      enviar_inmediatamente: true,
      fecha_inicio: "",
      max_envios_por_segundo: 10,
    });
    setVariables({});
    setDestinatarios({
      tipo: "todos",
      proyecto_id: "",
      numeros: "",
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-3xl bg-crm-card rounded-xl shadow-xl border border-crm-border max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-crm-card border-b border-crm-border p-6 flex items-center justify-between z-10">
            <div>
              <h3 className="text-xl font-semibold text-crm-text-primary flex items-center gap-2">
                <Send className="w-5 h-5" />
                Nueva Campaña de WhatsApp
              </h3>
              <p className="text-sm text-crm-text-secondary mt-1">
                Envía mensajes masivos usando plantillas aprobadas
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-crm-text-muted hover:text-crm-text-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Información básica */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-crm-text-primary flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Información de la Campaña
              </h4>

              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Nombre de la Campaña *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-bg-primary text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                  placeholder="Ej: Lanzamiento Proyecto Los Álamos"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Descripción (Opcional)
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-bg-primary text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                  placeholder="Breve descripción del objetivo de la campaña"
                />
              </div>
            </div>

            {/* Plantilla */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-crm-text-primary flex items-center gap-2">
                <Send className="w-4 h-4" />
                Plantilla de Mensaje
              </h4>

              {loadingPlantillas ? (
                <div className="animate-pulse">
                  <div className="h-10 bg-crm-border rounded"></div>
                </div>
              ) : plantillas.length === 0 ? (
                <div className="p-4 bg-crm-warning/10 border border-crm-warning/30 rounded-lg">
                  <p className="text-sm text-crm-warning">
                    No tienes plantillas aprobadas. Ve al tab "Plantillas" para agregar una.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-crm-text-primary mb-2">
                      Selecciona Plantilla *
                    </label>
                    <select
                      required
                      value={formData.template_id}
                      onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
                      className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-bg-primary text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                    >
                      <option value="">-- Seleccionar plantilla --</option>
                      {plantillas.map((plantilla) => (
                        <option key={plantilla.id} value={plantilla.id}>
                          {plantilla.nombre} ({plantilla.categoria})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Vista previa de la plantilla */}
                  {plantillaSeleccionada && (
                    <div className="p-4 bg-crm-bg-secondary border border-crm-border rounded-lg">
                      <p className="text-xs font-medium text-crm-text-muted mb-2">Vista Previa:</p>
                      <p className="text-sm text-crm-text-primary whitespace-pre-wrap">
                        {plantillaSeleccionada.body_texto}
                      </p>
                      {plantillaSeleccionada.footer_texto && (
                        <p className="text-xs text-crm-text-muted mt-2 pt-2 border-t border-crm-border">
                          {plantillaSeleccionada.footer_texto}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Variables */}
                  {plantillaSeleccionada && plantillaSeleccionada.variables && plantillaSeleccionada.variables.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-crm-text-primary">Completa las Variables:</p>
                      {plantillaSeleccionada.variables.map((variable, index) => (
                        <div key={index}>
                          <label className="block text-sm text-crm-text-secondary mb-1">
                            {`{{${index + 1}}}`} - {variable}
                          </label>
                          <input
                            type="text"
                            required
                            value={variables[variable] || ""}
                            onChange={(e) => setVariables({ ...variables, [variable]: e.target.value })}
                            className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-bg-primary text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                            placeholder={`Valor para ${variable}`}
                          />
                        </div>
                      ))}
                      <div className="p-3 bg-crm-info/10 border border-crm-info/30 rounded-lg">
                        <p className="text-xs text-crm-info">
                          💡 <strong>Tip:</strong> Puedes usar valores fijos (ej: "Los Álamos") o campos dinámicos como {`{nombre}`}, {`{telefono}`} que se reemplazan automáticamente por cliente.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Destinatarios */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-crm-text-primary flex items-center gap-2">
                <Users className="w-4 h-4" />
                Destinatarios
              </h4>

              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Método de Selección
                </label>
                <select
                  value={destinatarios.tipo}
                  onChange={(e) => setDestinatarios({ ...destinatarios, tipo: e.target.value })}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-bg-primary text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                >
                  <option value="todos">Todos los clientes activos</option>
                  <option value="proyecto">Clientes de un proyecto específico</option>
                  <option value="manual">Lista manual de números</option>
                </select>
              </div>

              {destinatarios.tipo === "manual" && (
                <div>
                  <label className="block text-sm font-medium text-crm-text-primary mb-2">
                    Números de WhatsApp
                  </label>
                  <textarea
                    value={destinatarios.numeros}
                    onChange={(e) => setDestinatarios({ ...destinatarios, numeros: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-bg-primary text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary font-mono text-sm"
                    placeholder="+51987654321&#10;+51976543210&#10;+51965432109"
                  />
                  <p className="text-xs text-crm-text-muted mt-1">
                    Ingresa un número por línea en formato internacional (con +)
                  </p>
                </div>
              )}
            </div>

            {/* Programación */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-crm-text-primary flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Programación
              </h4>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="enviar_inmediatamente"
                  checked={formData.enviar_inmediatamente}
                  onChange={(e) => setFormData({ ...formData, enviar_inmediatamente: e.target.checked })}
                  className="w-4 h-4 text-crm-primary border-crm-border rounded focus:ring-crm-primary"
                />
                <label htmlFor="enviar_inmediatamente" className="text-sm text-crm-text-primary">
                  Enviar inmediatamente
                </label>
              </div>

              {!formData.enviar_inmediatamente && (
                <div>
                  <label className="block text-sm font-medium text-crm-text-primary mb-2">
                    Fecha y Hora de Inicio
                  </label>
                  <input
                    type="datetime-local"
                    required={!formData.enviar_inmediatamente}
                    value={formData.fecha_inicio}
                    onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                    className="crm-datetime-input"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Velocidad de Envío
                </label>
                <select
                  value={formData.max_envios_por_segundo}
                  onChange={(e) => setFormData({ ...formData, max_envios_por_segundo: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-bg-primary text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                >
                  <option value={5}>Lento (5 mensajes/seg)</option>
                  <option value={10}>Normal (10 mensajes/seg) - Recomendado</option>
                  <option value={20}>Rápido (20 mensajes/seg)</option>
                </select>
                <p className="text-xs text-crm-text-muted mt-1">
                  Mayor velocidad puede activar límites de WhatsApp
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-crm-border">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-crm-text-muted hover:text-crm-text-primary border border-crm-border rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || loadingPlantillas || plantillas.length === 0}
                className="px-6 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Creando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {formData.enviar_inmediatamente ? "Crear y Enviar" : "Crear Campaña"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
