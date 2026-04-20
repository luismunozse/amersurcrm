"use client";

import { useState, useEffect } from "react";
import { Recordatorio, RecordatorioFormData, TIPOS_RECORDATORIO_OPTIONS, PRIORIDADES_OPTIONS } from "@/lib/types/agenda";
import { crearRecordatorio } from "./actions";
import toast from "react-hot-toast";
import {
  X as XMarkIcon,
  Home,
  User,
  Phone,
  FileText,
  Users,
  Pencil,
  type LucideIcon,
} from "lucide-react";

const TIPO_RECORDATORIO_ICON: Record<string, LucideIcon> = {
  seguimiento_cliente: User,
  llamada_prospecto: Phone,
  envio_documentos: FileText,
  visita_propiedad: Home,
  reunion_equipo: Users,
  personalizado: Pencil,
};
import DateTimePicker from "@/components/ui/DateTimePicker";

interface RecordatorioModalProps {
  recordatorio?: Recordatorio | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientes?: Array<{ id: string; nombre: string; telefono?: string; email?: string }>;
  propiedades?: Array<{ id: string; identificacion_interna: string; tipo: string }>;
}

export default function RecordatorioModal({ 
  recordatorio, 
  isOpen, 
  onClose, 
  onSuccess, 
  clientes = [], 
  propiedades = [] 
}: RecordatorioModalProps) {
  const [formData, setFormData] = useState<RecordatorioFormData>({
    titulo: "",
    descripcion: "",
    tipo: "personalizado",
    prioridad: "media",
    fecha_recordatorio: "",
    cliente_id: "",
    propiedad_id: "",
    evento_id: "",
    notificar_email: true,
    notificar_push: false,
    notas: "",
    etiquetas: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (recordatorio) {
      setFormData({
        titulo: recordatorio.titulo,
        descripcion: recordatorio.descripcion || "",
        tipo: recordatorio.tipo,
        prioridad: recordatorio.prioridad,
        fecha_recordatorio: recordatorio.fecha_recordatorio,
        cliente_id: recordatorio.cliente_id || "",
        propiedad_id: recordatorio.propiedad_id || "",
        evento_id: recordatorio.evento_id || "",
        notificar_email: recordatorio.notificar_email,
        notificar_push: recordatorio.notificar_push,
        notas: recordatorio.notas || "",
        etiquetas: recordatorio.etiquetas
      });
    } else {
      // Reset form for new recordatorio
      setFormData({
        titulo: "",
        descripcion: "",
        tipo: "personalizado",
        prioridad: "media",
        fecha_recordatorio: "",
        cliente_id: "",
        propiedad_id: "",
        evento_id: "",
        notificar_email: true,
        notificar_push: false,
        notas: "",
        etiquetas: []
      });
    }
  }, [recordatorio, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formDataObj = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (typeof value === 'object') {
            formDataObj.append(key, JSON.stringify(value));
          } else {
            formDataObj.append(key, String(value));
          }
        }
      });

      const result = await crearRecordatorio(formDataObj);

      if (result.success) {
        toast.success(result.message);
        onSuccess();
        onClose();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error("Error al procesar el formulario");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof RecordatorioFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto pb-[env(safe-area-inset-bottom)] sm:pb-0 animate-in slide-in-from-bottom-4 sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-200">
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <span className="h-1 w-10 rounded-full bg-crm-border" aria-hidden />
        </div>
        <div className="p-5 sm:p-6 pt-3 sm:pt-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-crm-text-primary">
              Nuevo Recordatorio
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-crm-border rounded-lg transition-colors"
            >
              <XMarkIcon className="w-6 h-6 text-crm-text-muted" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Título y Tipo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => handleInputChange("titulo", e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Tipo *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TIPOS_RECORDATORIO_OPTIONS.map((option) => {
                    const Ic = TIPO_RECORDATORIO_ICON[option.value] ?? Pencil;
                    const activo = formData.tipo === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleInputChange("tipo", option.value)}
                        className={`p-2.5 rounded-lg border-2 transition-all text-center flex flex-col items-center gap-1 ${
                          activo
                            ? "border-crm-primary bg-crm-primary/10 text-crm-primary"
                            : "border-crm-border hover:border-crm-primary/50 text-crm-text-secondary"
                        }`}
                      >
                        <Ic className="w-5 h-5" aria-hidden />
                        <span className="text-xs leading-tight">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Descripción
              </label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => handleInputChange("descripcion", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
              />
            </div>

            {/* Fecha y Prioridad */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Fecha del Recordatorio *
                </label>
                <DateTimePicker
                  value={formData.fecha_recordatorio}
                  onChange={(value) => handleInputChange("fecha_recordatorio", value)}
                  placeholder="Seleccionar fecha y hora"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Prioridad
                </label>
                <select
                  value={formData.prioridad}
                  onChange={(e) => handleInputChange("prioridad", e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
                >
                  {PRIORIDADES_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cliente y Proyecto/Lote */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Cliente
                </label>
                <select
                  value={formData.cliente_id}
                  onChange={(e) => handleInputChange("cliente_id", e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
                >
                  <option value="">Seleccionar cliente</option>
                  {clientes.map(cliente => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2 inline-flex items-center gap-1.5">
                  <Home className="w-4 h-4" aria-hidden />
                  <span>Proyecto / Lote</span>
                </label>
                <select
                  value={formData.propiedad_id}
                  onChange={(e) => handleInputChange("propiedad_id", e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
                >
                  <option value="">Seleccionar proyecto / lote</option>
                  {propiedades.map(propiedad => (
                    <option key={propiedad.id} value={propiedad.id}>
                      {propiedad.identificacion_interna} - {propiedad.tipo}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notificaciones */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-crm-text-primary">Notificaciones</h3>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.notificar_email}
                    onChange={(e) => handleInputChange("notificar_email", e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-crm-text-primary">Email</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.notificar_push}
                    onChange={(e) => handleInputChange("notificar_push", e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-crm-text-primary">Push</span>
                </label>
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Notas adicionales
              </label>
              <textarea
                value={formData.notas}
                onChange={(e) => handleInputChange("notas", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
                placeholder="Información adicional sobre el recordatorio..."
              />
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-crm-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-crm-text-secondary bg-crm-border hover:bg-crm-border-hover rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-crm-primary hover:bg-crm-primary-hover rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Guardando..." : "Crear"} Recordatorio
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
