"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { crearPlantilla } from "@/app/dashboard/admin/marketing/_actions";
import type { CategoriaTemplate, EstadoAprobacion } from "@/types/whatsapp-marketing";
import toast from "react-hot-toast";

interface ModalCrearPlantillaProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ModalCrearPlantilla({ open, onClose, onSuccess }: ModalCrearPlantillaProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    whatsapp_template_id: "",
    categoria: "MARKETING" as CategoriaTemplate,
    idioma: "es",
    body_texto: "",
    footer_texto: "",
    estado_aprobacion: "APPROVED" as EstadoAprobacion,
    objetivo: "",
    activo: true
  });

  const [variables, setVariables] = useState<string[]>([]);
  const [newVariable, setNewVariable] = useState("");

  const [botones, setBotones] = useState<Array<{
    tipo: "URL" | "QUICK_REPLY" | "PHONE_NUMBER";
    texto: string;
    url?: string;
    phone_number?: string;
  }>>([]);

  if (!open) return null;

  const handleAddVariable = () => {
    if (newVariable.trim()) {
      setVariables([...variables, newVariable.trim()]);
      setNewVariable("");
    }
  };

  const handleRemoveVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const handleAddBoton = () => {
    setBotones([...botones, { tipo: "URL", texto: "", url: "" }]);
  };

  const handleRemoveBoton = (index: number) => {
    setBotones(botones.filter((_, i) => i !== index));
  };

  const handleBotonChange = (index: number, field: string, value: string) => {
    const newBotones = [...botones];
    newBotones[index] = { ...newBotones[index], [field]: value };
    setBotones(newBotones);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const plantillaData = {
        ...formData,
        variables,
        botones: botones.filter(b => b.texto.trim() !== ""),
        tags: []
      };

      const result = await crearPlantilla(plantillaData);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Plantilla creada exitosamente");
        onSuccess();
        onClose();

        // Reset form
        setFormData({
          nombre: "",
          whatsapp_template_id: "",
          categoria: "MARKETING",
          idioma: "es",
          body_texto: "",
          footer_texto: "",
          estado_aprobacion: "APPROVED",
          objetivo: "",
          activo: true
        });
        setVariables([]);
        setBotones([]);
      }
    } catch (error) {
      console.error("Error creando plantilla:", error);
      toast.error("Error creando plantilla");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-3xl bg-crm-card rounded-xl shadow-xl border border-crm-border">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-crm-border">
            <div>
              <h3 className="text-xl font-semibold text-crm-text-primary">
                Agregar Plantilla de WhatsApp
              </h3>
              <p className="text-sm text-crm-text-secondary mt-1">
                Registra una plantilla que ya fue aprobada en Meta Business Suite
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
              <h4 className="text-sm font-medium text-crm-text-primary">Información Básica</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-crm-text-primary mb-2">
                    Nombre de la Plantilla *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-bg-primary text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                    placeholder="Ej: Bienvenida AMERSUR"
                  />
                  <p className="text-xs text-crm-text-muted mt-1">
                    Nombre descriptivo para identificar la plantilla en el CRM
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-crm-text-primary mb-2">
                    Código de WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.whatsapp_template_id}
                    onChange={(e) => setFormData({ ...formData, whatsapp_template_id: e.target.value })}
                    className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-bg-primary text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                    placeholder="ej: bienvenida_amersur"
                  />
                  <p className="text-xs text-crm-text-muted mt-1">
                    Nombre exacto de la plantilla en Meta (minúsculas, sin espacios)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-crm-text-primary mb-2">
                    Categoría *
                  </label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value as CategoriaTemplate })}
                    className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-bg-primary text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                  >
                    <option value="MARKETING">Marketing</option>
                    <option value="UTILITY">Utility</option>
                    <option value="AUTHENTICATION">Authentication</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-crm-text-primary mb-2">
                    Idioma *
                  </label>
                  <select
                    value={formData.idioma}
                    onChange={(e) => setFormData({ ...formData, idioma: e.target.value })}
                    className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-bg-primary text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                  >
                    <option value="es">Español (es)</option>
                    <option value="es_ES">Español - España (es_ES)</option>
                    <option value="es_MX">Español - México (es_MX)</option>
                    <option value="en">English (en)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-crm-text-primary mb-2">
                    Estado *
                  </label>
                  <select
                    value={formData.estado_aprobacion}
                    onChange={(e) => setFormData({ ...formData, estado_aprobacion: e.target.value as EstadoAprobacion })}
                    className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-bg-primary text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                  >
                    <option value="APPROVED">Aprobada</option>
                    <option value="PENDING">Pendiente</option>
                    <option value="REJECTED">Rechazada</option>
                    <option value="DRAFT">Borrador</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Contenido */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-crm-text-primary">Contenido del Mensaje</h4>

              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Cuerpo del Mensaje *
                </label>
                <textarea
                  required
                  value={formData.body_texto}
                  onChange={(e) => setFormData({ ...formData, body_texto: e.target.value })}
                  rows={5}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-bg-primary text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                  placeholder="Hola {{1}}, bienvenido a AMERSUR Inmobiliaria..."
                />
                <p className="text-xs text-crm-text-muted mt-1">
                  Usa {{"{{"}}1{{"}}"}}, {{"{{"}}2{{"}}"}} para variables
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Pie de Página (Opcional)
                </label>
                <input
                  type="text"
                  value={formData.footer_texto}
                  onChange={(e) => setFormData({ ...formData, footer_texto: e.target.value })}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-bg-primary text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                  placeholder="AMERSUR - Tu hogar, nuestra pasión"
                />
              </div>
            </div>

            {/* Variables */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-crm-text-primary">Variables</h4>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newVariable}
                  onChange={(e) => setNewVariable(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddVariable())}
                  className="flex-1 px-3 py-2 border border-crm-border rounded-lg bg-crm-bg-primary text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                  placeholder="nombre_cliente, nombre_vendedor, proyecto..."
                />
                <button
                  type="button"
                  onClick={handleAddVariable}
                  className="px-4 py-2 bg-crm-secondary text-white rounded-lg hover:bg-crm-secondary-hover transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Agregar
                </button>
              </div>

              {variables.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {variables.map((variable, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-crm-info/10 text-crm-info rounded-lg border border-crm-info/30"
                    >
                      <span className="text-sm font-medium">{`{{${index + 1}}}`} = {variable}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveVariable(index)}
                        className="text-crm-danger hover:text-crm-danger-hover"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-crm-text-muted">
                Las variables te permiten personalizar el mensaje para cada cliente
              </p>
            </div>

            {/* Botones de acción (opcional) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-crm-text-primary">Botones (Opcional)</h4>
                <button
                  type="button"
                  onClick={handleAddBoton}
                  className="text-sm text-crm-primary hover:text-crm-primary-hover flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Agregar Botón
                </button>
              </div>

              {botones.map((boton, index) => (
                <div key={index} className="flex gap-2 p-3 bg-crm-bg-secondary rounded-lg border border-crm-border">
                  <div className="flex-1 space-y-2">
                    <select
                      value={boton.tipo}
                      onChange={(e) => handleBotonChange(index, 'tipo', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-crm-border rounded-lg bg-crm-bg-primary text-crm-text-primary"
                    >
                      <option value="URL">URL</option>
                      <option value="QUICK_REPLY">Respuesta Rápida</option>
                      <option value="PHONE_NUMBER">Teléfono</option>
                    </select>

                    <input
                      type="text"
                      value={boton.texto}
                      onChange={(e) => handleBotonChange(index, 'texto', e.target.value)}
                      placeholder="Texto del botón"
                      className="w-full px-3 py-2 text-sm border border-crm-border rounded-lg bg-crm-bg-primary text-crm-text-primary"
                    />

                    {boton.tipo === 'URL' && (
                      <input
                        type="url"
                        value={boton.url || ''}
                        onChange={(e) => handleBotonChange(index, 'url', e.target.value)}
                        placeholder="https://ejemplo.com"
                        className="w-full px-3 py-2 text-sm border border-crm-border rounded-lg bg-crm-bg-primary text-crm-text-primary"
                      />
                    )}

                    {boton.tipo === 'PHONE_NUMBER' && (
                      <input
                        type="tel"
                        value={boton.phone_number || ''}
                        onChange={(e) => handleBotonChange(index, 'phone_number', e.target.value)}
                        placeholder="+51987654321"
                        className="w-full px-3 py-2 text-sm border border-crm-border rounded-lg bg-crm-bg-primary text-crm-text-primary"
                      />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveBoton(index)}
                    className="text-crm-danger hover:text-crm-danger-hover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Objetivo */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Objetivo de la Plantilla (Opcional)
              </label>
              <input
                type="text"
                value={formData.objetivo}
                onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
                className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-bg-primary text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                placeholder="Ej: Dar bienvenida a nuevos clientes interesados"
              />
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
                disabled={loading}
                className="px-6 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creando..." : "Crear Plantilla"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
