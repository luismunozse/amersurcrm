"use client";

import { useState, useTransition } from "react";
import { crearLote } from "@/app/dashboard/proyectos/[id]/_actions";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import ImageUpload from "./ImageUpload";
import { uploadMultipleFiles, uploadFile, getPublicUrl, BUCKETS } from "@/lib/storage";

interface LoteWizardProps {
  proyectoId: string;
  proyectos: Array<{
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
  etapa: string;
  
  // Paso 2: Datos del lote/propiedad
  identificador: string;
  manzana: string;
  numero: string;
  superficie: number | null;
  estado: "disponible" | "reservado" | "vendido";
  
  // Paso 3: Precio y condiciones de venta
  precio: number | null;
  moneda: string;
  condiciones: string;
  descuento: number | null;
  
  // Paso 4: Multimedia
  fotos: File[];
  plano: File | null;
  renders: File[];
  links3D: string[];
}

const initialData: LoteData = {
  proyecto: "",
  ubicacion: "",
  etapa: "",
  identificador: "",
  manzana: "",
  numero: "",
  superficie: null,
  estado: "disponible",
  precio: null,
  moneda: "PEN",
  condiciones: "",
  descuento: null,
  fotos: [],
  plano: null,
  renders: [],
  links3D: [],
};

export default function LoteWizard({ proyectoId, proyectos, onClose }: LoteWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<LoteData>(initialData);
  const [isPending, startTransition] = useTransition();

  const totalSteps = 5;

  const updateData = (updates: Partial<LoteData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
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
        
        // Generar ID único para el lote
        const loteId = crypto.randomUUID();
        const basePath = `lote-${loteId}`;
        
        // Subir archivos a Supabase Storage
        let fotosUrls: string[] = [];
        let rendersUrls: string[] = [];
        let planoUrl: string | null = null;

        // Subir fotos
        if (data.fotos.length > 0) {
          const { urls, errors } = await uploadMultipleFiles(
            BUCKETS.LOTES,
            data.fotos,
            `${basePath}/fotos`
          );
          
          if (errors.length > 0) {
            console.warn("Algunas fotos no se pudieron subir:", errors);
          }
          
          fotosUrls = urls;
        }

        // Subir renders
        if (data.renders.length > 0) {
          const { urls, errors } = await uploadMultipleFiles(
            BUCKETS.RENDERS,
            data.renders,
            `${basePath}/renders`
          );
          
          if (errors.length > 0) {
            console.warn("Algunos renders no se pudieron subir:", errors);
          }
          
          rendersUrls = urls;
        }

        // Subir plano
        if (data.plano) {
          const fileName = `${Date.now()}-${data.plano.name}`;
          const { data: uploadData, error } = await uploadFile(
            BUCKETS.PLANOS,
            data.plano,
            `${basePath}/${fileName}`
          );
          
          if (!error && uploadData) {
            planoUrl = getPublicUrl(BUCKETS.PLANOS, uploadData.path);
          }
        }
        
        // Crear FormData con los datos del lote
        const formData = new FormData();
        formData.append("codigo", `${data.manzana}-${data.numero}`);
        formData.append("sup_m2", data.superficie?.toString() || "");
        formData.append("precio", data.precio?.toString() || "");
        formData.append("moneda", data.moneda);
        formData.append("estado", data.estado);

        // Agregar datos adicionales como JSON con URLs de Storage
        const additionalData = {
          proyecto: data.proyecto,
          ubicacion: data.ubicacion,
          etapa: data.etapa,
          identificador: data.identificador,
          manzana: data.manzana,
          numero: data.numero,
          condiciones: data.condiciones,
          descuento: data.descuento,
          links3D: data.links3D,
          fotos: fotosUrls, // URLs públicas de las fotos
          renders: rendersUrls, // URLs públicas de los renders
          plano: planoUrl, // URL pública del plano
        };
        formData.append("data", JSON.stringify(additionalData));

        await crearLote(proyectoSeleccionado, formData);
        toast.success("Lote creado exitosamente con multimedia");
        onClose();
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || "No se pudo crear el lote");
      }
    });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1 data={data} updateData={updateData} proyectos={proyectos} />;
      case 2:
        return <Step2 data={data} updateData={updateData} />;
      case 3:
        return <Step3 data={data} updateData={updateData} />;
      case 4:
        return <Step4 data={data} updateData={updateData} />;
      case 5:
        return <Step5 data={data} onConfirm={handleSubmit} isPending={isPending} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-crm-primary text-white p-6">
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
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
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
                disabled={isPending}
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
          <svg className="w-8 h-8 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
          </svg>
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
                ubicacion: proyectoSeleccionado?.ubicacion || "",
                etapa: proyectoSeleccionado?.estado || ""
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

        <div className="space-y-2">
          <label className="block text-sm font-medium text-crm-text-primary">Etapa del Proyecto *</label>
          <select
            value={data.etapa}
            onChange={(e) => updateData({ etapa: e.target.value })}
            className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
            required
          >
            <option value="">Seleccionar etapa</option>
            <option value="preventa">Preventa</option>
            <option value="en_construccion">En Construcción</option>
            <option value="terminado">Terminado</option>
            <option value="entregado">Entregado</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// Paso 2: Datos del lote/propiedad
function Step2({ data, updateData }: { data: LoteData; updateData: (updates: Partial<LoteData>) => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-crm-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-crm-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"/>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z"/>
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-crm-text-primary mb-2">Datos del Lote/Propiedad</h3>
        <p className="text-crm-text-muted">Información específica del lote o propiedad</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-crm-text-primary">Identificador Único *</label>
          <input
            type="text"
            value={data.identificador}
            onChange={(e) => updateData({ identificador: e.target.value })}
            className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
            placeholder="Ej: LOTE-001"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-crm-text-primary">Manzana *</label>
          <input
            type="text"
            value={data.manzana}
            onChange={(e) => updateData({ manzana: e.target.value })}
            className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
            placeholder="Ej: MzA"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-crm-text-primary">Número de Lote *</label>
          <input
            type="text"
            value={data.numero}
            onChange={(e) => updateData({ numero: e.target.value })}
            className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
            placeholder="Ej: 01"
            required
          />
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

        <div className="space-y-2 md:col-span-2">
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
      </div>
    </div>
  );
}

// Paso 3: Precio y condiciones de venta
function Step3({ data, updateData }: { data: LoteData; updateData: (updates: Partial<LoteData>) => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-crm-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-crm-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-crm-text-primary mb-2">Precio y Condiciones de Venta</h3>
        <p className="text-crm-text-muted">Información comercial y financiera</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="block text-sm font-medium text-crm-text-primary">Condiciones de Venta</label>
          <textarea
            value={data.condiciones}
            onChange={(e) => updateData({ condiciones: e.target.value })}
            className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
            rows={4}
            placeholder="Ej: Financiación hasta 20 años, 30% de entrada, cuotas en pesos..."
          />
        </div>
      </div>
    </div>
  );
}

// Paso 4: Multimedia
function Step4({ data, updateData }: { data: LoteData; updateData: (updates: Partial<LoteData>) => void }) {
  const handleFileUpload = (files: FileList, type: 'fotos' | 'renders') => {
    const fileArray = Array.from(files);
    updateData({ [type]: [...data[type], ...fileArray] });
  };

  const handleImagesChange = (images: File[], type: 'fotos' | 'renders') => {
    updateData({ [type]: images });
  };

  const addLink3D = () => {
    updateData({ links3D: [...data.links3D, ""] });
  };

  const updateLink3D = (index: number, value: string) => {
    const newLinks = [...data.links3D];
    newLinks[index] = value;
    updateData({ links3D: newLinks });
  };

  const removeLink3D = (index: number) => {
    const newLinks = data.links3D.filter((_, i) => i !== index);
    updateData({ links3D: newLinks });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-crm-info/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-crm-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-crm-text-primary mb-2">Multimedia</h3>
        <p className="text-crm-text-muted">Fotos, planos, renders y enlaces 3D</p>
      </div>

      <div className="space-y-6">
        {/* Fotos */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-crm-text-primary">Fotos del Lote</label>
          <ImageUpload
            onImagesChange={(images) => handleImagesChange(images, 'fotos')}
            maxImages={10}
            className="w-full"
          />
          {data.fotos.length > 0 && (
            <div className="text-sm text-crm-text-muted">
              {data.fotos.length} foto(s) seleccionada(s)
            </div>
          )}
        </div>

        {/* Plano */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-crm-text-primary">Plano del Lote</label>
          <div className="border-2 border-dashed border-crm-border rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => e.target.files && updateData({ plano: e.target.files[0] })}
              className="hidden"
              id="plano-upload"
            />
            <label htmlFor="plano-upload" className="cursor-pointer">
              <svg className="w-12 h-12 text-crm-text-muted mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <p className="text-crm-text-muted">Haz clic para subir plano</p>
              <p className="text-sm text-crm-text-muted">PDF, PNG, JPG hasta 10MB</p>
            </label>
          </div>
          {data.plano && (
            <div className="text-sm text-crm-text-muted">
              Plano: {data.plano.name}
            </div>
          )}
        </div>

        {/* Renders */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-crm-text-primary">Renders 3D</label>
          <ImageUpload
            onImagesChange={(images) => handleImagesChange(images, 'renders')}
            maxImages={5}
            className="w-full"
          />
          {data.renders.length > 0 && (
            <div className="text-sm text-crm-text-muted">
              {data.renders.length} render(s) seleccionado(s)
            </div>
          )}
        </div>

        {/* Links 3D */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-crm-text-primary">Enlaces 3D</label>
            <button
              type="button"
              onClick={addLink3D}
              className="text-crm-primary hover:text-crm-primary-hover text-sm font-medium"
            >
              + Agregar enlace
            </button>
          </div>
          {data.links3D.map((link, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="url"
                value={link}
                onChange={(e) => updateLink3D(index, e.target.value)}
                className="flex-1 px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
                placeholder="https://example.com/3d-view"
              />
              <button
                type="button"
                onClick={() => removeLink3D(index)}
                className="px-3 py-2 text-crm-danger bg-crm-danger/10 hover:bg-crm-danger/20 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Paso 5: Confirmación
function Step5({ data, onConfirm, isPending }: { data: LoteData; onConfirm: () => void; isPending: boolean }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-crm-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-crm-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-crm-text-primary mb-2">Confirmación</h3>
        <p className="text-crm-text-muted">Revisa los datos antes de crear el lote</p>
      </div>

      <div className="space-y-4">
        {/* Resumen de datos */}
        <div className="crm-card p-4">
          <h4 className="font-semibold text-crm-text-primary mb-3">Resumen del Lote</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-crm-text-muted">Código:</span>
              <span className="ml-2 font-medium text-crm-text-primary">{data.manzana}-{data.numero}</span>
            </div>
            <div>
              <span className="text-crm-text-muted">Superficie:</span>
              <span className="ml-2 font-medium text-crm-text-primary">{data.superficie} m²</span>
            </div>
            <div>
              <span className="text-crm-text-muted">Precio:</span>
              <span className="ml-2 font-medium text-crm-text-primary">
                {data.precio ? `${data.precio.toLocaleString()} ${data.moneda}` : 'No especificado'}
              </span>
            </div>
            <div>
              <span className="text-crm-text-muted">Estado:</span>
              <span className={`ml-2 font-medium ${
                data.estado === 'disponible' ? 'text-crm-success' :
                data.estado === 'reservado' ? 'text-crm-warning' :
                'text-crm-danger'
              }`}>
                {data.estado}
              </span>
            </div>
          </div>
        </div>

        <div className="crm-card p-4">
          <h4 className="font-semibold text-crm-text-primary mb-3">Multimedia</h4>
          <div className="text-sm text-crm-text-muted">
            <p>Fotos: {data.fotos.length}</p>
            <p>Renders: {data.renders.length}</p>
            <p>Enlaces 3D: {data.links3D.filter(link => link.trim()).length}</p>
            {data.plano && <p>Plano: {data.plano.name}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
