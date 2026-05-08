"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Send, Users, Calendar, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  crearCampana,
  obtenerPlantillas,
  obtenerAudiencias,
} from "@/app/dashboard/admin/marketing/_actions";
import { extractVariables, renderTemplate } from "@/lib/marketing/whatsapp";
import type {
  MarketingTemplate,
  MarketingAudiencia,
  EstadoCampana,
} from "@/types/whatsapp-marketing";
import DateTimePicker from "@/components/ui/DateTimePicker";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const FORM_DEFAULTS = {
  nombre: "",
  descripcion: "",
  template_id: "",
  audiencia_id: "",
  enviar_inmediatamente: true,
  fecha_inicio: "",
  objetivo: "",
};

export default function ModalCrearCampana({ open, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [plantillas, setPlantillas] = useState<MarketingTemplate[]>([]);
  const [audiencias, setAudiencias] = useState<MarketingAudiencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState(FORM_DEFAULTS);
  const [variables, setVariables] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setForm(FORM_DEFAULTS);
    setVariables({});
    setCargando(true);
    Promise.all([obtenerPlantillas(), obtenerAudiencias()]).then(
      ([resPlant, resAud]) => {
        setPlantillas((resPlant.data ?? []).filter((p) => p.activo));
        setAudiencias((resAud.data ?? []).filter((a) => a.activo));
        setCargando(false);
      },
    );
  }, [open]);

  const plantillaSeleccionada = useMemo(
    () => plantillas.find((p) => p.id === form.template_id),
    [plantillas, form.template_id],
  );

  const audienciaSeleccionada = useMemo(
    () => audiencias.find((a) => a.id === form.audiencia_id),
    [audiencias, form.audiencia_id],
  );

  const variablesPlantilla = useMemo(() => {
    if (!plantillaSeleccionada) return [];
    return plantillaSeleccionada.variables?.length
      ? plantillaSeleccionada.variables
      : extractVariables(plantillaSeleccionada.body_texto);
  }, [plantillaSeleccionada]);

  // No incluir 'cliente' (se completa por contacto en runtime)
  const variablesEditables = variablesPlantilla.filter((v) => v !== "cliente");

  useEffect(() => {
    if (!plantillaSeleccionada) return;
    const init: Record<string, string> = {};
    for (const v of variablesEditables) init[v] = variables[v] ?? "";
    setVariables(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantillaSeleccionada?.id]);

  if (!open) return null;

  const previewSample = plantillaSeleccionada
    ? renderTemplate(plantillaSeleccionada.body_texto, {
        cliente: "[cliente]",
        ...variables,
      })
    : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nombre.trim()) {
      toast.error("Nombre obligatorio");
      return;
    }
    if (!form.template_id) {
      toast.error("Selecciona una plantilla");
      return;
    }
    if (!form.audiencia_id) {
      toast.error("Selecciona una audiencia");
      return;
    }

    const faltantes = variablesEditables.filter((v) => !variables[v]?.trim());
    if (faltantes.length > 0) {
      toast.error(`Faltan variables: ${faltantes.join(", ")}`);
      return;
    }

    setLoading(true);
    try {
      const estado: EstadoCampana = form.enviar_inmediatamente
        ? "RUNNING"
        : form.fecha_inicio
          ? "SCHEDULED"
          : "DRAFT";

      const result = await crearCampana({
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || undefined,
        template_id: form.template_id,
        audiencia_id: form.audiencia_id,
        variables_valores: variables,
        objetivo: form.objetivo.trim() || undefined,
        enviar_inmediatamente: form.enviar_inmediatamente,
        fecha_inicio: form.fecha_inicio || undefined,
        estado,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Campaña creada");
      onSuccess();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        <div className="relative w-full max-w-2xl bg-crm-card rounded-xl shadow-xl border border-crm-border max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-crm-card border-b border-crm-border p-6 flex items-center justify-between z-10">
            <div>
              <h3 className="text-xl font-semibold text-crm-text-primary flex items-center gap-2">
                <Send className="w-5 h-5" />
                Nueva campaña WhatsApp
              </h3>
              <p className="text-sm text-crm-text-secondary mt-1">
                Modo asistente: vendedor envía contacto por contacto desde
                WhatsApp Web.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-crm-text-muted hover:text-crm-text-primary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-1">
                Nombre *
              </label>
              <input
                type="text"
                required
                value={form.nombre}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nombre: e.target.value }))
                }
                placeholder="Ej: Lanzamiento Los Álamos"
                className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-bg-primary text-crm-text-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-1">
                Descripción (opcional)
              </label>
              <textarea
                value={form.descripcion}
                onChange={(e) =>
                  setForm((f) => ({ ...f, descripcion: e.target.value }))
                }
                rows={2}
                className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-bg-primary text-crm-text-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-1">
                Plantilla *
              </label>
              {cargando ? (
                <div className="flex items-center gap-2 text-sm text-crm-text-secondary">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cargando…
                </div>
              ) : plantillas.length === 0 ? (
                <p className="text-sm text-crm-warning">
                  Sin plantillas activas. Crea una primero en Plantillas.
                </p>
              ) : (
                <select
                  required
                  value={form.template_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, template_id: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-bg-primary text-crm-text-primary"
                >
                  <option value="">-- Seleccionar --</option>
                  {plantillas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                      {p.categoria ? ` · ${p.categoria}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-crm-text-primary mb-1">
                <Users className="w-4 h-4" />
                Audiencia *
              </label>
              {audiencias.length === 0 ? (
                <p className="text-sm text-crm-warning">
                  Sin audiencias. Crea una en Audiencias.
                </p>
              ) : (
                <select
                  required
                  value={form.audiencia_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, audiencia_id: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-bg-primary text-crm-text-primary"
                >
                  <option value="">-- Seleccionar --</option>
                  {audiencias.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre} ({a.contactos_count} contactos)
                    </option>
                  ))}
                </select>
              )}
              {audienciaSeleccionada && (
                <p className="text-xs text-crm-text-muted mt-1">
                  {audienciaSeleccionada.contactos_count} contactos serán
                  procesados uno por uno en modo asistente.
                </p>
              )}
            </div>

            {variablesEditables.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-crm-text-primary">
                  Variables fijas
                </p>
                {variablesEditables.map((v) => (
                  <div key={v}>
                    <label className="block text-xs text-crm-text-secondary mb-1">
                      {`{{${v}}}`}
                    </label>
                    <input
                      type="text"
                      value={variables[v] ?? ""}
                      onChange={(e) =>
                        setVariables((prev) => ({
                          ...prev,
                          [v]: e.target.value,
                        }))
                      }
                      placeholder={`Valor para ${v}`}
                      className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-bg-primary text-crm-text-primary"
                    />
                  </div>
                ))}
                <p className="text-xs text-crm-text-muted">
                  El valor de <code>{`{{cliente}}`}</code> se completa
                  automáticamente con el nombre de cada contacto.
                </p>
              </div>
            )}

            {plantillaSeleccionada && (
              <div>
                <p className="text-xs font-medium text-crm-text-muted uppercase mb-1">
                  Vista previa
                </p>
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-3 text-sm text-green-900 dark:text-green-50 whitespace-pre-wrap">
                  {previewSample}
                </div>
              </div>
            )}

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-crm-text-primary mb-2">
                <Calendar className="w-4 h-4" />
                Programación
              </label>
              <label className="flex items-center gap-2 text-sm text-crm-text-primary mb-2">
                <input
                  type="checkbox"
                  checked={form.enviar_inmediatamente}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      enviar_inmediatamente: e.target.checked,
                    }))
                  }
                  className="w-4 h-4"
                />
                Iniciar campaña ahora
              </label>
              {!form.enviar_inmediatamente && (
                <DateTimePicker
                  value={form.fecha_inicio}
                  onChange={(value) =>
                    setForm((f) => ({ ...f, fecha_inicio: value }))
                  }
                  placeholder="Programar inicio"
                  minDate={new Date()}
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-1">
                Objetivo (opcional)
              </label>
              <input
                type="text"
                value={form.objetivo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, objetivo: e.target.value }))
                }
                placeholder="Ej: Generar 20 visitas"
                className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-bg-primary text-crm-text-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-crm-border">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-crm-text-muted border border-crm-border rounded-lg disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || cargando}
                className="px-6 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Crear campaña
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
