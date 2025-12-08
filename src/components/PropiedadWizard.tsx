"use client";

import { useState, useTransition } from "react";
import { crearPropiedad } from "@/app/dashboard/propiedades/_actions";
import { crearLote } from "@/app/dashboard/proyectos/[id]/_actions";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import UbicacionSelector from "./UbicacionSelector";
import { 
  TipoPropiedad, 
  TipoOperacion,
  PropiedadWizardData
} from "@/types/propiedades";

interface PropiedadWizardProps {
  proyectos: Array<{
    id: string;
    nombre: string;
    ubicacion: string | null;
    estado: string;
  }>;
  onClose: () => void;
}

// Datos iniciales del wizard simplificado
const initialData: PropiedadWizardData = {
  // Paso 1: Tipo de operación y propiedad
  tipo: "lote",
  tipo_operacion: "venta",

  // Paso 2: Datos generales
  proyecto: "",
  identificador: "",
  ubicacion: "",
  calle: "",
  numero: "",
  barrio: "",
  geolocalizacion: null,
  superficie_total: 0,
  antiguedad_anos: 0,
  disponibilidad_inmediata: true,
  disponibilidad_desde: "",

  // Datos de ubigeo
  departamento: "",
  provincia: "",
  distrito: "",

  // Paso 3: Características específicas
  caracteristicas: {},

  // Paso 4: Precios y condiciones comerciales
  precio_venta: 0,
  precio_alquiler: 0,
  condiciones_venta: {},
  condiciones_alquiler: {},

  // Paso 5: Marketing (sin multimedia)
  etiquetas: [],
  destacado: false,
  premium: false,

  // Paso 6: Confirmación
  confirmado: false
};

export default function PropiedadWizard({ proyectos, onClose }: PropiedadWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<PropiedadWizardData>(initialData);
  const [isPending, startTransition] = useTransition();

  const updateData = (updates: Partial<PropiedadWizardData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const getTotalSteps = () => {
    return data.tipo === 'lote' ? 2 : 3;
  };

  const nextStep = () => {
    const totalSteps = getTotalSteps();
    if (currentStep < totalSteps) setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = () => {
    startTransition(async () => {
      try {
        // Crear FormData para el servidor (sin multimedia)
        const formData = new FormData();
        formData.append("codigo", data.identificador);
        formData.append("tipo", data.tipo);
        formData.append("proyecto_id", data.proyecto || "");
        formData.append("identificacion_interna", data.identificador);
        
        // Para lotes, usar ubicación simplificada
        if (data.tipo === 'lote') {
          formData.append("ubicacion_ciudad", data.proyecto ? "" : data.ubicacion); // Solo si es independiente
          formData.append("ubicacion_direccion", ""); // Los lotes no tienen dirección específica
        } else {
          // Para propiedades, usar ubigeo si está disponible, sino usar ubicación manual
          const ubicacionCompleta = [data.distrito, data.provincia, data.departamento]
            .filter(Boolean)
            .join(', ');
          formData.append("ubicacion_ciudad", ubicacionCompleta || data.ubicacion);
          formData.append("ubicacion_direccion", `${data.calle} ${data.numero}`);
        }
        
        formData.append("superficie_total", data.superficie_total.toString());
        formData.append("superficie_construida", (data.caracteristicas?.superficie_construida as number | undefined)?.toString() || "");
        formData.append("precio", data.precio_venta.toString());
        formData.append("moneda", "PEN");
        formData.append("estado_comercial", "disponible");
        
        // Agregar solo etiquetas básicas (sin archivos multimedia)
        data.etiquetas.forEach(etiqueta => formData.append("etiquetas", etiqueta));

        if (data.tipo === 'lote') {
          // Para lotes, usar crearLote
          const result = await crearLote(formData);
          if (result.success) {
            toast.success("Lote creado correctamente");
            onClose();
            // Redirigir al proyecto si pertenece a uno
            if (data.proyecto) {
              window.location.href = `/dashboard/proyectos/${data.proyecto}`;
            } else {
              window.location.href = '/dashboard/propiedades';
            }
          }
        } else {
          // Para propiedades, usar crearPropiedad
          const result = await crearPropiedad(formData);
          if (result.success) {
            toast.success("Propiedad creada correctamente");
            onClose();
            // Redirigir después de cerrar el modal
            if (data.proyecto) {
              window.location.href = `/dashboard/proyectos/${data.proyecto}`;
            } else {
              window.location.href = '/dashboard/propiedades';
            }
          }
        }
      } catch (error) {
        console.error("Error creando propiedad:", error);
        toast.error(getErrorMessage(error) || "Error creando propiedad");
      }
    });
  };

  const renderStep = () => {
    // Si es lote, usar flujo simplificado (2 pasos)
    if (data.tipo === 'lote') {
      switch (currentStep) {
        case 1:
          return <Paso1Tipo data={data} updateData={updateData} />;
        case 2:
          return <Paso2DatosGenerales data={data} updateData={updateData} proyectos={proyectos} />;
      default:
          return null;
      }
    }
    
    // Para otros tipos, usar flujo completo (4 pasos, sin marketing)
    switch (currentStep) {
      case 1:
        return <Paso1Tipo data={data} updateData={updateData} />;
      case 2:
        return <Paso2DatosGenerales data={data} updateData={updateData} proyectos={proyectos} />;
      case 3:
        return <Paso4Precios data={data} updateData={updateData} proyectos={proyectos} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="crm-card rounded-2xl shadow-crm-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-crm-primary to-crm-primary/80 text-white px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Nueva Propiedad</h2>
              <p className="text-white/80 text-sm">Paso {currentStep} de {getTotalSteps()}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white/90">Progreso</span>
              <span className="text-sm text-white/70">{Math.round((currentStep / getTotalSteps()) * 100)}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / getTotalSteps()) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="bg-crm-background border-t border-crm-border px-6 py-4 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-6 py-3 bg-crm-border text-crm-text-primary rounded-lg hover:bg-crm-border/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Anterior
            </button>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-3 text-crm-text-muted hover:text-crm-text-primary hover:bg-crm-border/50 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              {currentStep < getTotalSteps() ? (
                <button
                  onClick={nextStep}
                  className="px-6 py-3 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover transition-colors flex items-center gap-2"
                >
                  Siguiente
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isPending}
                  className="px-6 py-3 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isPending ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creando...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Crear Propiedad
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Paso 1: Tipo de propiedad y operación
function Paso1Tipo({ data, updateData }: { data: PropiedadWizardData; updateData: (updates: Partial<PropiedadWizardData>) => void }) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-crm-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-crm-text-primary mb-2">Tipo de Propiedad</h3>
        <p className="text-crm-text-muted">Selecciona el tipo de propiedad que deseas crear</p>
      </div>

        {/* Tipo de Propiedad */}
      <div className="crm-card p-6">
        <h4 className="text-lg font-semibold text-crm-text-primary mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
          </svg>
          Tipo de Propiedad
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {(['lote', 'casa', 'departamento', 'oficina', 'otro'] as TipoPropiedad[]).map((tipo) => (
            <button
              key={tipo}
              onClick={() => updateData({ tipo })}
              className={`p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
                data.tipo === tipo
                  ? 'border-crm-primary bg-crm-primary/10 text-crm-primary shadow-crm-lg'
                  : 'border-crm-border hover:border-crm-primary/50 hover:bg-crm-primary/5'
              }`}
            >
              <div className="text-center">
                <div className="text-3xl mb-3">
                  {tipo === 'lote' && '🏞️'}
                  {tipo === 'casa' && '🏠'}
                  {tipo === 'departamento' && '🏢'}
                  {tipo === 'oficina' && '🏢'}
                  {tipo === 'otro' && '🏗️'}
        </div>
                <div className="font-semibold capitalize text-sm">{tipo}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tipo de Operación */}
      <div className="crm-card p-6">
        <h4 className="text-lg font-semibold text-crm-text-primary mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          Tipo de Operación
        </h4>
        <div className="grid grid-cols-3 gap-4">
          {(['venta', 'alquiler', 'ambos'] as TipoOperacion[]).map((operacion) => (
            <button
              key={operacion}
              onClick={() => updateData({ tipo_operacion: operacion })}
              className={`p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
                data.tipo_operacion === operacion
                  ? 'border-crm-primary bg-crm-primary/10 text-crm-primary shadow-crm-lg'
                  : 'border-crm-border hover:border-crm-primary/50 hover:bg-crm-primary/5'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">
                  {operacion === 'venta' && '💰'}
                  {operacion === 'alquiler' && '📅'}
                  {operacion === 'ambos' && '🔄'}
                </div>
                <div className="font-semibold capitalize text-sm">{operacion}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Paso 2: Datos generales
function Paso2DatosGenerales({ data, updateData, proyectos }: { 
  data: PropiedadWizardData; 
  updateData: (updates: Partial<PropiedadWizardData>) => void;
  proyectos: Array<{ id: string; nombre: string; ubicacion: string | null; estado: string; }>;
}) {
  // Si es lote, usar el formulario simplificado como en LoteWizard
  if (data.tipo === 'lote') {
  return (
      <div className="space-y-8">
      <div className="text-center">
          <div className="w-16 h-16 bg-crm-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-crm-text-primary mb-2">Datos del Lote</h3>
          <p className="text-crm-text-muted">Información básica del lote</p>
      </div>

        <div className="crm-card p-6">
          <h4 className="text-lg font-semibold text-crm-text-primary mb-6 flex items-center">
            <svg className="w-5 h-5 mr-2 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Información del Lote
          </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Proyecto */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Proyecto
              </label>
          <select
            value={data.proyecto}
            onChange={(e) => updateData({ proyecto: e.target.value })}
                className="w-full px-4 py-3 border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
          >
                <option value="">Lote Independiente</option>
            {proyectos.map((proyecto) => (
              <option key={proyecto.id} value={proyecto.id}>
                    {proyecto.nombre}
              </option>
            ))}
          </select>
        </div>

            {/* Nombre del Lote */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Nombre del Lote
              </label>
          <input
            type="text"
            value={data.identificador}
            onChange={(e) => updateData({ identificador: e.target.value })}
                className="w-full px-4 py-3 border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
                placeholder="Ej: LOTE-001, MZ5-LT10"
          />
        </div>

            {/* Superficie */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Superficie (m²)
              </label>
          <input
            type="number"
                value={data.superficie_total || ''}
                onChange={(e) => updateData({ superficie_total: Number(e.target.value) || 0 })}
                className="w-full px-4 py-3 border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
                placeholder="150"
          />
        </div>

            {/* Precio */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Precio (S/.)
              </label>
          <input
            type="number"
                value={data.precio_venta || ''}
                onChange={(e) => updateData({ precio_venta: Number(e.target.value) || 0 })}
                className="w-full px-4 py-3 border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
                placeholder="150000"
          />
        </div>
          </div>
        </div>
      </div>
    );
  }

  // Para otros tipos de propiedad, usar el formulario completo
  return (
    <div className="space-y-8">
          <div className="text-center">
        <div className="w-16 h-16 bg-crm-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
        <h3 className="text-2xl font-bold text-crm-text-primary mb-2">Datos Generales</h3>
        <p className="text-crm-text-muted">Información básica de la propiedad</p>
          </div>

      <div className="crm-card p-6">
        <h4 className="text-lg font-semibold text-crm-text-primary mb-6 flex items-center">
          <svg className="w-5 h-5 mr-2 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
          </svg>
          Información de la Propiedad
        </h4>
    <div className="space-y-6">
          {/* Ubicación - En este flujo ya no es lote, siempre mostrar */}
          <div className="w-full">
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Ubicación (Ubigeo)
            </label>
            <UbicacionSelector
              key={`ubigeo-${data.tipo}`}
              departamento={data.departamento}
              provincia={data.provincia}
              distrito={data.distrito}
              onUbigeoChange={(departamento, provincia, distrito) => {
                updateData({ 
                  departamento, 
                  provincia, 
                  distrito,
                  ubicacion: [distrito, provincia, departamento].filter(Boolean).join(', ')
                });
              }}
              className="w-full"
            />
          </div>

          {/* Grid de 2 columnas para el resto de campos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Proyecto */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Proyecto
              </label>
          <select
                value={data.proyecto}
                onChange={(e) => updateData({ proyecto: e.target.value })}
                className="w-full px-4 py-3 border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
              >
                <option value="">Propiedad Independiente</option>
                {proyectos.map((proyecto) => (
                  <option key={proyecto.id} value={proyecto.id}>
                    {proyecto.nombre}
                  </option>
                ))}
          </select>
        </div>

            {/* Identificador */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Código/Identificador
              </label>
          <input
                type="text"
                value={data.identificador}
                onChange={(e) => updateData({ identificador: e.target.value })}
                className="w-full px-4 py-3 border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
                placeholder="Ej: CASA-A1, DEP-102"
          />
        </div>

          {/* Campo de ubicación simple solo aplica en flujo de lotes (se maneja en el paso correspondiente) */}

          {/* Calle */}
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Calle
            </label>
        <input
          type="text"
              value={data.calle}
              onChange={(e) => updateData({ calle: e.target.value })}
              className="w-full px-4 py-3 border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
              placeholder="Nombre de la calle"
        />
      </div>

          {/* Número */}
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Número
          </label>
            <input
              type="text"
              value={data.numero}
              onChange={(e) => updateData({ numero: e.target.value })}
              className="w-full px-4 py-3 border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
              placeholder="123"
            />
      </div>


          {/* Superficie Total */}
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Superficie Total (m²)
            </label>
        <input
          type="number"
              value={data.superficie_total || ''}
              onChange={(e) => updateData({ superficie_total: Number(e.target.value) || 0 })}
              className="w-full px-4 py-3 border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
              placeholder="150"
        />
      </div>

          {/* Superficie Construida */}
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Superficie Construida (m²)
            </label>
        <input
          type="number"
              value={(data.caracteristicas as any)?.superficie_construida ?? ''}
              onChange={(e) =>
                updateData({
                  caracteristicas: {
                    ...data.caracteristicas,
                    superficie_construida: Number(e.target.value) || 0,
                  } as any,
                })
              }
              className="w-full px-4 py-3 border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
              placeholder="120"
        />
      </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// Paso 3: Precios y confirmación final
function Paso4Precios({ data, updateData, proyectos }: { 
  data: PropiedadWizardData; 
  updateData: (updates: Partial<PropiedadWizardData>) => void;
  proyectos: Array<{ id: string; nombre: string; ubicacion: string | null; estado: string; }>;
}) {
  const proyectoSeleccionado = proyectos.find(p => p.id === data.proyecto);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-crm-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
                </div>
        <h3 className="text-2xl font-bold text-crm-text-primary mb-2">Precios y Confirmación</h3>
        <p className="text-crm-text-muted">Información comercial y confirmación final</p>
      </div>

      {/* Precios */}
      <div className="crm-card p-6">
        <h4 className="text-lg font-semibold text-crm-text-primary mb-6 flex items-center">
          <svg className="w-5 h-5 mr-2 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          Información Comercial
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Precio de Venta */}
                <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Precio de Venta (S/.)
            </label>
            <input
              type="number"
              value={data.precio_venta || ''}
              onChange={(e) => updateData({ precio_venta: Number(e.target.value) || 0 })}
              className="w-full px-4 py-3 border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
              placeholder="150000"
            />
          </div>

          {/* Precio de Alquiler */}
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Precio de Alquiler (S/./mes)
            </label>
                <input
              type="number"
              value={data.precio_alquiler || ''}
              onChange={(e) => updateData({ precio_alquiler: Number(e.target.value) || 0 })}
              className="w-full px-4 py-3 border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary bg-crm-card text-crm-text-primary"
              placeholder="2500"
            />
            </div>
          </div>
        </div>

      {/* Resumen de la Propiedad */}
      <div className="crm-card p-6">
        <h4 className="text-lg font-semibold text-crm-text-primary mb-6 flex items-center">
          <svg className="w-5 h-5 mr-2 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Resumen de la Propiedad
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <span className="text-sm font-medium text-crm-text-muted">Tipo:</span>
              <p className="text-crm-text-primary capitalize">{data.tipo}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-crm-text-muted">Código:</span>
              <p className="text-crm-text-primary">{data.identificador}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-crm-text-muted">Proyecto:</span>
              <p className="text-crm-text-primary">{proyectoSeleccionado?.nombre || 'Propiedad Independiente'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-crm-text-muted">Ubicación:</span>
              <p className="text-crm-text-primary">{data.ubicacion || 'No especificada'}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <span className="text-sm font-medium text-crm-text-muted">Superficie Total:</span>
              <p className="text-crm-text-primary">{data.superficie_total} m²</p>
            </div>
            {data.caracteristicas?.superficie_construida ? (
            <div>
                <span className="text-sm font-medium text-crm-text-muted">Superficie Construida:</span>
                <p className="text-crm-text-primary">{String(data.caracteristicas.superficie_construida)} m²</p>
            </div>
            ) : null}
            <div>
              <span className="text-sm font-medium text-crm-text-muted">Precio Venta:</span>
              <p className="text-crm-text-primary font-semibold">S/. {data.precio_venta?.toLocaleString()}</p>
            </div>
            {data.precio_alquiler && (
            <div>
                <span className="text-sm font-medium text-crm-text-muted">Precio Alquiler:</span>
                <p className="text-crm-text-primary font-semibold">S/. {data.precio_alquiler}/mes</p>
                  </div>
                )}
                  </div>
        </div>
      </div>
    </div>
  );
}
