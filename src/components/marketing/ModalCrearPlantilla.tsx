"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Save, Loader2, MessageSquare, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  crearPlantilla,
  actualizarPlantilla,
} from "@/app/dashboard/admin/marketing/_actions";
import { extractVariables, renderTemplate } from "@/lib/marketing/whatsapp";
import type { MarketingTemplate } from "@/types/whatsapp-marketing";

interface ModalCrearPlantillaProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  plantilla?: MarketingTemplate;
}

const CATEGORIAS_SUGERIDAS = [
  "bienvenida",
  "seguimiento",
  "cobranza",
  "post_venta",
  "promocion",
  "recordatorio",
  "general",
];

const FORM_DEFAULTS = {
  nombre: "",
  categoria: "general",
  body_texto: "",
  objetivo: "",
  tags: [] as string[],
  activo: true,
};

export default function ModalCrearPlantilla({
  open,
  onClose,
  onSuccess,
  plantilla,
}: ModalCrearPlantillaProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(FORM_DEFAULTS);
  const [tagInput, setTagInput] = useState("");

  const esEdicion = !!plantilla;

  useEffect(() => {
    if (!open) return;
    if (plantilla) {
      setForm({
        nombre: plantilla.nombre,
        categoria: plantilla.categoria || "general",
        body_texto: plantilla.body_texto,
        objetivo: plantilla.objetivo ?? "",
        tags: plantilla.tags ?? [],
        activo: plantilla.activo,
      });
    } else {
      setForm(FORM_DEFAULTS);
    }
    setTagInput("");
  }, [open, plantilla]);

  const variablesDetectadas = useMemo(
    () => extractVariables(form.body_texto),
    [form.body_texto],
  );

  const previewSample = useMemo(() => {
    const sample: Record<string, string> = {};
    for (const v of variablesDetectadas) {
      sample[v] = `[${v}]`;
    }
    return renderTemplate(form.body_texto, sample);
  }, [form.body_texto, variablesDetectadas]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.body_texto.trim()) {
      toast.error("Nombre y mensaje son obligatorios");
      return;
    }

    setLoading(true);
    try {
      const payload: Partial<MarketingTemplate> = {
        nombre: form.nombre.trim(),
        categoria: form.categoria.trim() || "general",
        body_texto: form.body_texto,
        variables: variablesDetectadas,
        objetivo: form.objetivo.trim() || undefined,
        tags: form.tags,
        activo: form.activo,
      };

      const result = esEdicion
        ? await actualizarPlantilla(plantilla!.id, payload)
        : await crearPlantilla(payload);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(esEdicion ? "Plantilla actualizada" : "Plantilla creada");
      onSuccess();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const agregarTag = () => {
    const t = tagInput.trim();
    if (!t || form.tags.includes(t)) return;
    setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    setTagInput("");
  };

  const eliminarTag = (t: string) =>
    setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }));

  const insertarVariable = (v: string) => {
    setForm((f) => ({ ...f, body_texto: f.body_texto + `{{${v}}}` }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-crm-card border-t sm:border border-crm-border rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <span className="h-1 w-10 rounded-full bg-crm-border" />
        </div>

        <div className="flex items-start justify-between p-5 border-b border-crm-border">
          <div>
            <h4 className="text-lg font-semibold text-crm-text-primary flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-crm-primary" />
              {esEdicion ? "Editar plantilla" : "Nueva plantilla WhatsApp"}
            </h4>
            <p className="text-xs text-crm-text-muted mt-1">
              Texto enviable vía WhatsApp Web. Usa{" "}
              <code className="px-1 bg-crm-bg-secondary rounded">{`{{variable}}`}</code>{" "}
              para campos dinámicos.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-crm-text-muted hover:text-crm-text-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto p-5 space-y-4 flex-1"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-crm-text-muted uppercase mb-1">
                Nombre *
              </label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                required
                placeholder="Ej: Bienvenida cliente nuevo"
                className="w-full px-3 py-2 bg-crm-bg-secondary border border-crm-border rounded-lg text-sm text-crm-text-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-crm-text-muted uppercase mb-1">
                Categoría
              </label>
              <input
                type="text"
                list="categorias-marketing"
                value={form.categoria}
                onChange={(e) =>
                  setForm((f) => ({ ...f, categoria: e.target.value }))
                }
                placeholder="general"
                className="w-full px-3 py-2 bg-crm-bg-secondary border border-crm-border rounded-lg text-sm text-crm-text-primary"
              />
              <datalist id="categorias-marketing">
                {CATEGORIAS_SUGERIDAS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-crm-text-muted uppercase mb-1">
              Mensaje *
            </label>
            <textarea
              value={form.body_texto}
              onChange={(e) =>
                setForm((f) => ({ ...f, body_texto: e.target.value }))
              }
              required
              rows={6}
              placeholder={`Hola {{cliente}}, gracias por tu interés en {{proyecto}}...`}
              className="w-full px-3 py-2 bg-crm-bg-secondary border border-crm-border rounded-lg text-sm text-crm-text-primary font-mono"
            />
            <div className="flex flex-wrap gap-1 mt-2">
              <span className="text-xs text-crm-text-muted">
                Variables rápidas:
              </span>
              {["cliente", "proyecto", "vendedor", "monto", "fecha"].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertarVariable(v)}
                  className="px-2 py-0.5 text-xs bg-crm-info/10 text-crm-info rounded border border-crm-info/20 hover:bg-crm-info/20"
                >
                  + {`{{${v}}}`}
                </button>
              ))}
            </div>
          </div>

          {variablesDetectadas.length > 0 && (
            <div className="bg-crm-bg-secondary border border-crm-border rounded-lg p-3">
              <p className="text-xs font-medium text-crm-text-muted uppercase mb-1">
                Variables detectadas
              </p>
              <div className="flex flex-wrap gap-1">
                {variablesDetectadas.map((v) => (
                  <span
                    key={v}
                    className="px-2 py-0.5 text-xs bg-crm-info/10 text-crm-info rounded"
                  >
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {form.body_texto && (
            <div>
              <label className="block text-xs font-medium text-crm-text-muted uppercase mb-1">
                Vista previa
              </label>
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-3 text-sm text-green-900 dark:text-green-50 whitespace-pre-wrap">
                {previewSample}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-crm-text-muted uppercase mb-1">
              Objetivo (opcional)
            </label>
            <input
              type="text"
              value={form.objetivo}
              onChange={(e) =>
                setForm((f) => ({ ...f, objetivo: e.target.value }))
              }
              placeholder="Ej: Convertir lead a visita"
              className="w-full px-3 py-2 bg-crm-bg-secondary border border-crm-border rounded-lg text-sm text-crm-text-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-crm-text-muted uppercase mb-1">
              Tags
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    agregarTag();
                  }
                }}
                placeholder="Agregar tag…"
                className="flex-1 px-3 py-2 bg-crm-bg-secondary border border-crm-border rounded-lg text-sm text-crm-text-primary"
              />
              <button
                type="button"
                onClick={agregarTag}
                className="px-3 py-2 bg-crm-card-hover text-crm-text-primary rounded-lg hover:bg-crm-border"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-crm-primary/10 text-crm-primary rounded"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => eliminarTag(t)}
                      className="hover:text-crm-error"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-crm-text-primary">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) =>
                setForm((f) => ({ ...f, activo: e.target.checked }))
              }
              className="w-4 h-4"
            />
            Plantilla activa (disponible para envío)
          </label>
        </form>

        <div className="flex justify-end gap-3 p-5 border-t border-crm-border">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm text-crm-text-secondary border border-crm-border rounded-lg hover:bg-crm-card-hover"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {esEdicion ? "Guardar cambios" : "Crear plantilla"}
          </button>
        </div>
      </div>
    </div>
  );
}
