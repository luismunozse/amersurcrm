"use client";

import { useState, useTransition } from "react";
import { X, Building2, Home, CheckCircle2, AlertTriangle } from "lucide-react";
import { crearLote } from "@/app/dashboard/proyectos/[id]/_actions";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";

interface LoteWizardProps {
  proyectoId?: string;
  proyectoNombre?: string;
  proyectoUbicacion?: string;
  proyectos?: Array<{
    id: string;
    nombre: string;
    ubicacion: string | null;
    estado: string;
  }>;
  onClose: () => void;
}

interface LoteData {
  // Paso 1: Datos generales del proyecto
  proyecto: string;
  ubicacion: string;
  
  // Paso 2: Datos del lote/propiedad
  nombre: string;
  superficie: number | null;
  estado: "disponible" | "reservado" | "vendido";
  
  // Paso 3: Precio y condiciones de venta
  precio: number | null;
  moneda: string;
  condiciones: string;
  descuento: number | null;
}

const initialData: LoteData = {
  proyecto: "",
  ubicacion: "",
  nombre: "",
  superficie: null,
  estado: "disponible",
  precio: null,
  moneda: "PEN",
  condiciones: "",
  descuento: null,
};

export default function LoteWizard({ proyectoId, proyectoNombre, proyectoUbicacion, proyectos = [], onClose }: LoteWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<LoteData>(() => {
    // Si estamos dentro de un proyecto específico, inicializar con esos datos
    if (proyectoId && proyectoNombre) {
      return {
        ...initialData,
        proyecto: proyectoId,
        ubicacion: proyectoUbicacion || ""
      };
    }
    return initialData;
  });
  const [isPending, startTransition] = useTransition();

  const totalSteps = proyectoId ? 2 : 3; // Si estamos en un proyecto, solo 2 pasos
  const isWithinProject = !!proyectoId;
  
  // Validar datos requeridos
  const hasRequiredData = !!(data.nombre?.trim() && data.superficie && data.superficie > 0 && data.precio && data.precio > 0);

  const updateData = (updates: Partial<LoteData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    // Validar datos antes de avanzar
    if (currentStep === 1) {
      // Validar datos del lote
      if (!data.nombre?.trim()) {
        toast.error("El nombre del lote es obligatorio");
        return;
      }
      if (!data.superficie || data.superficie <= 0) {
        toast.error("La superficie debe ser mayor a 0");
        return;
      }
      if (!data.precio || data.precio <= 0) {
        toast.error("El precio debe ser mayor a 0");
        return;
      }
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    startTransition(async () => {
      try {
        // Usar el proyecto seleccionado en lugar del proyectoId fijo
        const proyectoSeleccionado = data.proyecto || proyectoId;
        
        // Generar código del lote usando el nombre
        let codigoLote = '';
        if (data.nombre && data.nombre.trim()) {
          // Usar el nombre del lote como código
          codigoLote = data.nombre.trim();
        } else {
          // Fallback: usar timestamp
          codigoLote = `LOTE-${Date.now()}`;
        }

        // Crear FormData con los datos del lote
        const formData = new FormData();
        formData.append("proyecto_id", proyectoSeleccionado || "");
        formData.append("codigo", codigoLote);
        formData.append("sup_m2", data.superficie?.toString() || "");
        formData.append("precio", data.precio?.toString() || "");
        formData.append("moneda", data.moneda);
        formData.append("estado", data.estado);

        // Agregar datos adicionales como JSON
        const additionalData = {
          proyecto: data.proyecto,
          ubicacion: data.ubicacion,
          nombre: data.nombre,
          condiciones: data.condiciones,
          descuento: data.descuento,
        };
        formData.append("data", JSON.stringify(additionalData));

        await crearLote(formData);
        toast.success("Lote creado exitosamente");
        onClose();
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || "No se pudo crear el lote");
      }
    });
  };

  const renderStep = () => {
    if (isWithinProject) {
      // Flujo dentro de un proyecto: solo datos del lote + confirmación
      switch (currentStep) {
        case 1:
          return <Step2 data={data} updateData={updateData} proyectoNombre={proyectoNombre} proyectoUbicacion={proyectoUbicacion} />;
        case 2:
          return <Step3 data={data} onConfirm={handleSubmit} isPending={isPending} proyectoNombre={proyectoNombre} hasRequiredData={hasRequiredData} proyectos={proyectos} />;
        default:
          return null;
      }
    } else {
      // Flujo general: proyecto + datos del lote + confirmación
      switch (currentStep) {
        case 1:
          return <Step1 data={data} updateData={updateData} proyectos={proyectos} />;
        case 2:
          return <Step2 data={data} updateData={updateData} />;
        case 3:
          return <Step3 data={data} onConfirm={handleSubmit} isPending={isPending} hasRequiredData={hasRequiredData} proyectos={proyectos} />;
        default:
          return null;
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-gray-800 rounded-t-xl sm:rounded-xl shadow-2xl w-full sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden pb-[env(safe-area-inset-bottom)] sm:pb-0 animate-in slide-in-from-bottom-4 sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-200">
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0 bg-crm-primary">
          <span className="h-1 w-10 rounded-full bg-white/30" aria-hidden />
        </div>
        {/* Header */}
        <div className="bg-crm-primary text-white p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Crear Nuevo Lote</h2>
              <p className="text-crm-primary-hover mt-1">
                Paso {currentStep} de {totalSteps}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex space-x-2">
              {Array.from({ length: totalSteps }, (_, i) => (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    i + 1 <= currentStep ? 'bg-white' : 'bg-white/30'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className="px-4 py-2 text-crm-text-secondary bg-crm-card-hover hover:bg-crm-border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-crm-text-secondary bg-crm-card-hover hover:bg-crm-border rounded-lg transition-colors"
            >
              Cancelar
            </button>
            
            {currentStep < totalSteps ? (
              <button
                onClick={nextStep}
                className="crm-button-primary px-6 py-2 rounded-lg font-medium"
              >
                Siguiente
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isPending || !hasRequiredData}
                className="crm-button-primary px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Creando..." : "Crear Lote"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Paso 1: Datos generales del proyecto
function Step1({ data, updateData, proyectos }: { 
  data: LoteData; 
  updateData: (updates: Partial<LoteData>) => void;
  proyectos: Array<{
    id: string;
    nombre: string;
    ubicacion: string | null;
    estado: string;
  }>;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-crm-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8 text-crm-primary" />
        </div>
        <h3 className="text-xl font-semibold text-crm-text-primary mb-2">Datos Generales del Proyecto</h3>
        <p className="text-crm-text-muted">Información básica del proyecto inmobiliario</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-crm-text-primary">Seleccionar Proyecto *</label>
          <select
            value={data.proyecto}
            onChange={(e) => {
              const proyectoSeleccionado = proyectos.find(p => p.id === e.target.value);
              updateData({ 
                proyecto: e.target.value,
                ubicacion: proyectoSeleccionado?.ubicacion || ""
              });
            }}
            className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
            required
          >
            <option value="">Seleccionar proyecto existente</option>
            {proyectos.map((proyecto) => (
              <option key={proyecto.id} value={proyecto.id}>
                {proyecto.nombre} {proyecto.ubicacion && `- ${proyecto.ubicacion}`}
              </option>
            ))}
          </select>
        </div>

        {data.proyecto && (
          <div className="crm-card p-4">
            <h4 className="font-semibold text-crm-text-primary mb-2">Información del Proyecto Seleccionado</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-crm-text-muted">Proyecto:</span>
                <span className="ml-2 font-medium text-crm-text-primary">
                  {proyectos.find(p => p.id === data.proyecto)?.nombre}
                </span>
              </div>
              <div>
                <span className="text-crm-text-muted">Ubicación:</span>
                <span className="ml-2 font-medium text-crm-text-primary">
                  {proyectos.find(p => p.id === data.proyecto)?.ubicacion || 'No especificada'}
                </span>
              </div>
              <div>
                <span className="text-crm-text-muted">Estado:</span>
                <span className={`ml-2 font-medium ${
                  proyectos.find(p => p.id === data.proyecto)?.estado === 'activo' ? 'text-crm-success' :
                  proyectos.find(p => p.id === data.proyecto)?.estado === 'pausado' ? 'text-crm-warning' :
                  'text-crm-danger'
                }`}>
                  {proyectos.find(p => p.id === data.proyecto)?.estado}
                </span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// Paso 2: Datos del lote/propiedad
function Step2({ data, updateData, proyectoNombre, proyectoUbicacion }: { 
  data: LoteData; 
  updateData: (updates: Partial<LoteData>) => void;
  proyectoNombre?: string;
  proyectoUbicacion?: string;
}) {
  return (
    <div className="space-y-6">
      {/* Información del proyecto si estamos dentro de uno */}
      {proyectoNombre && (
        <div className="bg-crm-primary/5 border border-crm-primary/20 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-crm-primary/10 rounded-full flex items-center justify-center">
              <Building2 className="w-5 h-5 text-crm-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-crm-text-primary">{proyectoNombre}</h4>
              {proyectoUbicacion && (
                <p className="text-sm text-crm-text-muted">{proyectoUbicacion}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="text-center">
        <div className="w-16 h-16 bg-crm-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Home className="w-8 h-8 text-crm-success" />
        </div>
        <h3 className="text-xl font-semibold text-crm-text-primary mb-2">Datos del Lote/Propiedad</h3>
        <p className="text-crm-text-muted">Información específica del lote o propiedad</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-crm-text-primary">Nombre del Lote *</label>
          <input
            type="text"
            value={data.nombre}
            onChange={(e) => updateData({ nombre: e.target.value })}
            className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
            placeholder="Ej: Lote A-15, Casa 23, Apartamento 45"
            required
          />
          <p className="text-xs text-crm-text-muted">
            Este será el nombre único del lote. Puede incluir manzana, número o cualquier identificador.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-crm-text-primary">Superficie (m²) *</label>
          <input
            type="number"
            step="0.01"
            value={data.superficie || ""}
            onChange={(e) => updateData({ superficie: e.target.value ? parseFloat(e.target.value) : null })}
            className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
            placeholder="120.50"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-crm-text-primary">Precio *</label>
          <input
            type="number"
            step="0.01"
            value={data.precio || ""}
            onChange={(e) => updateData({ precio: e.target.value ? parseFloat(e.target.value) : null })}
            className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
            placeholder="150000.00"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-crm-text-primary">Moneda *</label>
          <select
            value={data.moneda}
            onChange={(e) => updateData({ moneda: e.target.value })}
            className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
            required
          >
            <option value="PEN">Soles Peruanos (PEN)</option>
            <option value="USD">Dólares (USD)</option>
            <option value="EUR">Euros (EUR)</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-crm-text-primary">Estado *</label>
          <select
            value={data.estado}
            onChange={(e) => updateData({ estado: e.target.value as LoteData["estado"] })}
            className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
            required
          >
            <option value="disponible">Disponible</option>
            <option value="reservado">Reservado</option>
            <option value="vendido">Vendido</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-crm-text-primary">Descuento (%)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={data.descuento || ""}
            onChange={(e) => updateData({ descuento: e.target.value ? parseFloat(e.target.value) : null })}
            className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
            placeholder="5.00"
          />
          <p className="text-xs text-crm-text-muted">
            Descuento opcional en porcentaje (0-100%)
          </p>
        </div>
      </div>
    </div>
  );
}

// Paso 3: Precio y condiciones de venta
function Step3({ data, onConfirm: _onConfirm, isPending: _isPending, proyectoNombre, hasRequiredData, proyectos = [] }: { 
  data: LoteData; 
  onConfirm: () => void; 
  isPending: boolean;
  proyectoNombre?: string;
  hasRequiredData: boolean;
  proyectos?: Array<{
    id: string;
    nombre: string;
    ubicacion: string | null;
    estado: string;
  }>;
}) {
  const proyectoSeleccionado = data.proyecto;
  
  // Generar código del lote usando el nombre
  let codigoLote = '';
  if (data.nombre && data.nombre.trim()) {
    codigoLote = data.nombre.trim();
  } else {
    codigoLote = `LOTE-${Date.now()}`;
  }


  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-crm-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-crm-success" />
        </div>
        <h3 className="text-xl font-semibold text-crm-text-primary mb-2">Confirmar Creación</h3>
        <p className="text-crm-text-muted">Revisa los datos antes de crear el lote</p>
      </div>

      {!hasRequiredData && (
        <div className="bg-crm-warning/10 border border-crm-warning/20 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-crm-warning" />
            <p className="text-sm text-crm-warning font-medium">
              Faltan datos requeridos. Por favor, completa el nombre, superficie y precio del lote.
            </p>
          </div>
        </div>
      )}

      <div className="bg-crm-card/50 rounded-lg p-6 space-y-4">
        <h4 className="font-semibold text-crm-text-primary border-b border-crm-border pb-2">Resumen del Lote</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-crm-text-muted">Nombre:</span>
            <span className="ml-2 text-crm-text-primary">{codigoLote}</span>
          </div>
          
          <div>
            <span className="font-medium text-crm-text-muted">Proyecto:</span>
            <span className="ml-2 text-crm-text-primary">
              {proyectoNombre || (proyectos.find(p => p.id === proyectoSeleccionado)?.nombre) || 'Proyecto no especificado'}
            </span>
          </div>
          
          <div>
            <span className="font-medium text-crm-text-muted">Superficie:</span>
            <span className="ml-2 text-crm-text-primary">{data.superficie ? `${data.superficie} m²` : 'No especificada'}</span>
          </div>
          
          <div>
            <span className="font-medium text-crm-text-muted">Estado:</span>
            <span className="ml-2 text-crm-text-primary capitalize">{data.estado}</span>
          </div>
          
          <div>
            <span className="font-medium text-crm-text-muted">Precio:</span>
            <span className="ml-2 text-crm-text-primary">
              {data.precio ? `${data.precio.toLocaleString()} ${data.moneda}` : 'No especificado'}
            </span>
          </div>
          
          <div>
            <span className="font-medium text-crm-text-muted">Descuento:</span>
            <span className="ml-2 text-crm-text-primary">{data.descuento ? `${data.descuento}%` : 'Ninguno'}</span>
          </div>
        </div>
        
        {data.condiciones && (
          <div>
            <span className="font-medium text-crm-text-muted">Condiciones:</span>
            <p className="mt-1 text-crm-text-primary text-sm">{data.condiciones}</p>
          </div>
        )}
      </div>

      {/* No mostrar botón aquí, se maneja en el footer del modal */}
    </div>
  );
}

