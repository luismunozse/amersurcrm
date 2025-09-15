"use client";

import { useState, FormEvent } from "react";
import { crearCliente, actualizarCliente } from "@/app/dashboard/clientes/_actions";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import { 
  TIPOS_CLIENTE_OPTIONS, 
  ESTADOS_CLIENTE_OPTIONS, 
  ORIGENES_LEAD_OPTIONS, 
  FORMAS_PAGO_OPTIONS, 
  INTERESES_PRINCIPALES_OPTIONS, 
  PROXIMAS_ACCIONES_OPTIONS 
} from "@/lib/types/clientes";

interface ClienteFormProps {
  cliente?: {
    id: string;
    nombre: string;
    email?: string;
    telefono?: string;
    tipo_cliente?: string;
    documento_identidad?: string;
    telefono_whatsapp?: string;
    direccion?: any;
    estado_cliente?: string;
    origen_lead?: string;
    vendedor_asignado?: string;
    proxima_accion?: string;
    interes_principal?: string;
    capacidad_compra_estimada?: number;
    forma_pago_preferida?: string;
    notas?: string;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
  isEditing?: boolean;
}

export default function ClienteForm({ 
  cliente, 
  onSuccess, 
  onCancel, 
  isEditing = false 
}: ClienteFormProps) {
  const [pending, setPending] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    
    try {
      if (isEditing && cliente?.id) {
        fd.set("id", cliente.id);
        await actualizarCliente(fd);
        toast.success("Cliente actualizado");
      } else {
        await crearCliente(fd);
        toast.success("Cliente creado");
      }
      
      form.reset();
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "No se pudo guardar el cliente");
    } finally {
      setPending(false);
    }
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="crm-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-crm-primary rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-crm-text-primary">
            {isEditing ? "Editar Cliente" : "Nuevo Cliente"}
          </h2>
        </div>
        
        {/* Indicador de pasos */}
        <div className="flex items-center space-x-2">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i + 1 <= currentStep
                  ? "bg-crm-primary text-white"
                  : "bg-crm-card-hover text-crm-text-muted"
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Paso 1: Identificación Básica */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-6 h-6 bg-crm-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-crm-text-primary">Identificación Básica</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-crm-text-primary">Tipo de Cliente *</label>
                <select 
                  name="tipo_cliente" 
                  required 
                  defaultValue={cliente?.tipo_cliente || "persona"}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50"
                  disabled={pending}
                >
                  {TIPOS_CLIENTE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-crm-text-primary">Nombre Completo / Razón Social *</label>
                <input 
                  name="nombre" 
                  required 
                  defaultValue={cliente?.nombre || ""}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50" 
                  disabled={pending}
                  placeholder="Nombre completo o razón social"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-crm-text-primary">DNI / CUIT / RUC</label>
                <input 
                  name="documento_identidad" 
                  defaultValue={cliente?.documento_identidad || ""}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50" 
                  disabled={pending}
                  placeholder="12345678"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-crm-text-primary">Email</label>
                <input 
                  name="email" 
                  type="email"
                  defaultValue={cliente?.email || ""}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50" 
                  disabled={pending}
                  placeholder="cliente@ejemplo.com"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-crm-text-primary">Teléfono</label>
                <input 
                  name="telefono" 
                  defaultValue={cliente?.telefono || ""}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50" 
                  disabled={pending}
                  placeholder="+51 987 654 321"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-crm-text-primary">WhatsApp</label>
                <input 
                  name="telefono_whatsapp" 
                  defaultValue={cliente?.telefono_whatsapp || ""}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50" 
                  disabled={pending}
                  placeholder="+51 987 654 321"
                />
              </div>
            </div>

            {/* Dirección */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-crm-text-primary">Dirección</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-crm-text-primary">Calle</label>
                  <input 
                    name="direccion_calle" 
                    defaultValue={cliente?.direccion?.calle || ""}
                    className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50" 
                    disabled={pending}
                    placeholder="Av. Principal"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-crm-text-primary">Número</label>
                  <input 
                    name="direccion_numero" 
                    defaultValue={cliente?.direccion?.numero || ""}
                    className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50" 
                    disabled={pending}
                    placeholder="123"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-crm-text-primary">Barrio</label>
                  <input 
                    name="direccion_barrio" 
                    defaultValue={cliente?.direccion?.barrio || ""}
                    className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50" 
                    disabled={pending}
                    placeholder="Centro"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-crm-text-primary">Ciudad</label>
                  <input 
                    name="direccion_ciudad" 
                    defaultValue={cliente?.direccion?.ciudad || ""}
                    className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50" 
                    disabled={pending}
                    placeholder="Huaral"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-crm-text-primary">Provincia</label>
                  <input 
                    name="direccion_provincia" 
                    defaultValue={cliente?.direccion?.provincia || ""}
                    className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50" 
                    disabled={pending}
                    placeholder="Lima"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-crm-text-primary">País</label>
                  <input 
                    name="direccion_pais" 
                    defaultValue={cliente?.direccion?.pais || "Perú"}
                    className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50" 
                    disabled={pending}
                    placeholder="Perú"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Paso 2: Estado Comercial */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-6 h-6 bg-crm-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-crm-text-primary">Estado Comercial</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-crm-text-primary">Estado del Cliente *</label>
                <select 
                  name="estado_cliente" 
                  required 
                  defaultValue={cliente?.estado_cliente || "prospecto"}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50"
                  disabled={pending}
                >
                  {ESTADOS_CLIENTE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-crm-text-primary">Origen del Lead</label>
                <select 
                  name="origen_lead" 
                  defaultValue={cliente?.origen_lead || ""}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50"
                  disabled={pending}
                >
                  <option value="">Seleccionar origen</option>
                  {ORIGENES_LEAD_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-crm-text-primary">Vendedor Asignado</label>
                <input 
                  name="vendedor_asignado" 
                  defaultValue={cliente?.vendedor_asignado || ""}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50" 
                  disabled={pending}
                  placeholder="ID del vendedor"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-crm-text-primary">Próxima Acción</label>
                <select 
                  name="proxima_accion" 
                  defaultValue={cliente?.proxima_accion || ""}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50"
                  disabled={pending}
                >
                  <option value="">Seleccionar acción</option>
                  {PROXIMAS_ACCIONES_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Paso 3: Información Financiera */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-6 h-6 bg-crm-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-crm-text-primary">Información Financiera</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-crm-text-primary">Interés Principal</label>
                <select 
                  name="interes_principal" 
                  defaultValue={cliente?.interes_principal || ""}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50"
                  disabled={pending}
                >
                  <option value="">Seleccionar interés</option>
                  {INTERESES_PRINCIPALES_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-crm-text-primary">Capacidad de Compra (S/)</label>
                <input 
                  name="capacidad_compra_estimada" 
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={cliente?.capacidad_compra_estimada || ""}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50" 
                  disabled={pending}
                  placeholder="100000"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-crm-text-primary">Forma de Pago Preferida</label>
                <select 
                  name="forma_pago_preferida" 
                  defaultValue={cliente?.forma_pago_preferida || ""}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50"
                  disabled={pending}
                >
                  <option value="">Seleccionar forma de pago</option>
                  {FORMAS_PAGO_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-crm-text-primary">Notas Adicionales</label>
                <textarea 
                  name="notas" 
                  rows={3}
                  defaultValue={cliente?.notas || ""}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50" 
                  disabled={pending}
                  placeholder="Información adicional sobre el cliente..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Navegación de pasos */}
        <div className="flex justify-between pt-6 border-t border-crm-border">
          <div className="flex space-x-2">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="px-4 py-2 text-sm font-medium text-crm-text-secondary bg-crm-card-hover hover:bg-crm-border rounded-lg transition-colors"
                disabled={pending}
              >
                Anterior
              </button>
            )}
            {currentStep < totalSteps && (
              <button
                type="button"
                onClick={nextStep}
                className="px-4 py-2 text-sm font-medium text-crm-primary bg-crm-primary/10 hover:bg-crm-primary/20 rounded-lg transition-colors"
                disabled={pending}
              >
                Siguiente
              </button>
            )}
          </div>

          <div className="flex space-x-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-crm-text-secondary bg-crm-card-hover hover:bg-crm-border rounded-lg transition-colors"
                disabled={pending}
              >
                Cancelar
              </button>
            )}
            <button 
              type="submit"
              disabled={pending} 
              className="crm-button-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? "Guardando..." : (isEditing ? "Actualizar Cliente" : "Crear Cliente")}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
