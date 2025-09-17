"use client";

import { useState, FormEvent } from "react";
import { crearCliente, actualizarCliente } from "@/app/dashboard/clientes/_actions";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import { 
  TIPOS_CLIENTE_OPTIONS, 
  ESTADOS_CLIENTE_OPTIONS, 
  ORIGENES_LEAD_OPTIONS, 
  INTERESES_PRINCIPALES_OPTIONS 
} from "@/lib/types/clientes";
import UbicacionSelector from "./UbicacionSelector";

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
    interes_principal?: string;
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
  const [tipoCliente, setTipoCliente] = useState(cliente?.tipo_cliente || "persona");
  const [ubicacion, setUbicacion] = useState({
    departamento: '',
    provincia: '',
    distrito: '',
    codigoDepartamento: '',
    codigoProvincia: '',
    codigoDistrito: ''
  });

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    
    try {
      if (isEditing && cliente?.id) {
        fd.set("id", cliente.id);
        await actualizarCliente(fd);
        toast.success("Cliente actualizado exitosamente");
      } else {
        await crearCliente(fd);
        toast.success("Cliente creado exitosamente");
      }
      
      form.reset();
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "No se pudo guardar el cliente");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="crm-card p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-crm-primary to-crm-primary/80 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-crm-text-primary">
            {isEditing ? "Editar Cliente" : "Nuevo Cliente"}
          </h2>
          <p className="text-sm text-crm-text-muted">
            {isEditing ? "Actualiza la información del cliente" : "Registra un nuevo cliente en el sistema"}
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-8">
        {/* Sección 1: Información Básica */}
        <div className="space-y-6">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-crm-primary/10 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-crm-text-primary">Información Básica</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tipo de Cliente */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-crm-text-primary">
                Tipo de Cliente <span className="text-red-500">*</span>
              </label>
              <select 
                name="tipo_cliente" 
                required 
                value={tipoCliente}
                onChange={(e) => setTipoCliente(e.target.value)}
                className="w-full px-4 py-3 border border-crm-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 transition-all"
                disabled={pending}
              >
                {TIPOS_CLIENTE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Nombre/Razón Social */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-crm-text-primary">
                {tipoCliente === 'persona' ? 'Nombre Completo' : 'Razón Social'} <span className="text-red-500">*</span>
              </label>
              <input 
                name="nombre" 
                required 
                defaultValue={cliente?.nombre || ""}
                className="w-full px-4 py-3 border border-crm-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 transition-all" 
                disabled={pending}
                placeholder={tipoCliente === 'persona' ? 'Juan Pérez García' : 'Empresa Constructora S.A.C.'}
              />
            </div>

            {/* DNI/RUC */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-crm-text-primary">
                {tipoCliente === 'persona' ? 'DNI' : 'RUC'} <span className="text-red-500">*</span>
              </label>
              <input 
                name="documento_identidad" 
                required
                defaultValue={cliente?.documento_identidad || ""}
                className="w-full px-4 py-3 border border-crm-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 transition-all" 
                disabled={pending}
                placeholder={tipoCliente === 'persona' ? '12345678' : '20123456789'}
                pattern={tipoCliente === 'persona' ? '[0-9]{8}' : '[0-9]{11}'}
                title={tipoCliente === 'persona' ? 'Ingrese 8 dígitos' : 'Ingrese 11 dígitos'}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-crm-text-primary">Email</label>
              <input 
                name="email" 
                type="email"
                defaultValue={cliente?.email || ""}
                className="w-full px-4 py-3 border border-crm-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 transition-all" 
                disabled={pending}
                placeholder="cliente@ejemplo.com"
              />
            </div>

            {/* Teléfono */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-crm-text-primary">Teléfono</label>
              <input 
                name="telefono" 
                defaultValue={cliente?.telefono || ""}
                className="w-full px-4 py-3 border border-crm-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 transition-all" 
                disabled={pending}
                placeholder="+51 987 654 321"
              />
            </div>

            {/* WhatsApp */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-crm-text-primary">WhatsApp</label>
              <input 
                name="telefono_whatsapp" 
                defaultValue={cliente?.telefono_whatsapp || ""}
                className="w-full px-4 py-3 border border-crm-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 transition-all" 
                disabled={pending}
                placeholder="+51 987 654 321"
              />
            </div>
          </div>
        </div>

        {/* Sección 2: Dirección */}
        <div className="space-y-6">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-crm-primary/10 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-crm-text-primary">Dirección</h3>
          </div>

          {/* Campos de dirección básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Calle */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-crm-text-primary">Calle</label>
              <input 
                name="direccion_calle" 
                defaultValue={cliente?.direccion?.calle || ""}
                className="w-full px-4 py-3 border border-crm-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 transition-all" 
                disabled={pending}
                placeholder="Av. Principal"
              />
            </div>

            {/* Número */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-crm-text-primary">Número</label>
              <input 
                name="direccion_numero" 
                defaultValue={cliente?.direccion?.numero || ""}
                className="w-full px-4 py-3 border border-crm-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 transition-all" 
                disabled={pending}
                placeholder="123"
              />
            </div>
          </div>

          {/* Selector de ubicación en cascada */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-crm-primary/20 rounded flex items-center justify-center">
                <svg className="w-2 h-2 text-crm-primary" fill="currentColor" viewBox="0 0 8 8">
                  <circle cx="4" cy="4" r="2"/>
                </svg>
              </div>
              <h4 className="text-md font-medium text-crm-text-primary">Ubicación</h4>
            </div>
            
            <UbicacionSelector
              onUbicacionChange={setUbicacion}
              disabled={pending}
            />
          </div>

          {/* Campos ocultos para enviar datos de ubicación */}
          <input type="hidden" name="direccion_departamento" value={ubicacion.departamento} />
          <input type="hidden" name="direccion_provincia" value={ubicacion.provincia} />
          <input type="hidden" name="direccion_distrito" value={ubicacion.distrito} />
          <input type="hidden" name="direccion_pais" value="Perú" />
        </div>

        {/* Sección 3: Información Comercial */}
        <div className="space-y-6">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-crm-primary/10 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-crm-text-primary">Información Comercial</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Estado del Cliente */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-crm-text-primary">
                Estado del Cliente <span className="text-red-500">*</span>
              </label>
              <select 
                name="estado_cliente" 
                required 
                defaultValue={cliente?.estado_cliente || "por_contactar"}
                className="w-full px-4 py-3 border border-crm-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 transition-all"
                disabled={pending}
              >
                {ESTADOS_CLIENTE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Origen del Lead */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-crm-text-primary">Origen del Lead</label>
              <select 
                name="origen_lead" 
                defaultValue={cliente?.origen_lead || ""}
                className="w-full px-4 py-3 border border-crm-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 transition-all"
                disabled={pending}
              >
                <option value="">Seleccionar origen</option>
                {ORIGENES_LEAD_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Vendedor */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-crm-text-primary">Vendedor</label>
              <input 
                name="vendedor_asignado" 
                defaultValue={cliente?.vendedor_asignado || ""}
                className="w-full px-4 py-3 border border-crm-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 transition-all" 
                disabled={pending}
                placeholder="Nombre del vendedor"
              />
            </div>

            {/* Interés Principal */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-crm-text-primary">Interés Principal</label>
              <select 
                name="interes_principal" 
                defaultValue={cliente?.interes_principal || ""}
                className="w-full px-4 py-3 border border-crm-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 transition-all"
                disabled={pending}
              >
                <option value="">Seleccionar interés</option>
                {INTERESES_PRINCIPALES_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notas Adicionales */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-crm-text-primary">Notas Adicionales</label>
            <textarea 
              name="notas" 
              rows={4}
              defaultValue={cliente?.notas || ""}
              className="w-full px-4 py-3 border border-crm-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 transition-all resize-none" 
              disabled={pending}
              placeholder="Información adicional sobre el cliente, preferencias, observaciones importantes..."
            />
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-crm-border">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 text-sm font-medium text-crm-text-secondary bg-crm-card-hover hover:bg-crm-border rounded-xl transition-all duration-200"
              disabled={pending}
            >
              Cancelar
            </button>
          )}
          <button 
            type="submit"
            disabled={pending} 
            className="crm-button-primary px-8 py-3 rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg"
          >
            {pending ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Guardando...</span>
              </div>
            ) : (
              isEditing ? "Actualizar Cliente" : "Crear Cliente"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
