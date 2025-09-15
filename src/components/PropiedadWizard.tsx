"use client";

import { useState, useTransition } from "react";
import { crearPropiedad } from "@/app/dashboard/propiedades/_actions";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import ImageUpload from "./ImageUpload";
import { uploadMultipleFiles, uploadFile, getPublicUrl, BUCKETS } from "@/lib/storage";
import { 
  TipoPropiedad, 
  TipoOperacion,
  PropiedadWizardData,
  ESQUEMAS_CARACTERISTICAS,
  ETIQUETAS_PREDEFINIDAS,
  AMENITIES_PREDEFINIDOS,
  GARANTIAS_ALQUILER
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

// Datos iniciales del wizard
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
  
  // Paso 3: Características específicas
  caracteristicas: {},
  
  // Paso 4: Precios y condiciones comerciales
  precio_venta: 0,
  precio_alquiler: 0,
  condiciones_venta: {},
  condiciones_alquiler: {},
  
  // Paso 5: Marketing y multimedia
  fotos: [],
  renders: [],
  plano: null,
  videos: [],
  links3D: [],
  etiquetas: [],
  descripcion: "",
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

  const nextStep = () => {
    if (currentStep < 6) setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = () => {
    startTransition(async () => {
      try {
        // Subir archivos multimedia
        const propiedadId = crypto.randomUUID();
        const basePath = `propiedad-${propiedadId}`;

        let fotosUrls: string[] = [];
        let rendersUrls: string[] = [];
        let videosUrls: string[] = [];
        let planoUrl: string | null = null;

        // Subir fotos
        if (data.fotos.length > 0) {
          console.log("Subiendo fotos:", data.fotos.length, "archivos");
          const { urls, errors } = await uploadMultipleFiles(
            BUCKETS.LOTES,
            data.fotos,
            `${basePath}/fotos`
          );
          if (errors.length > 0) { console.warn("Algunas fotos no se pudieron subir:", errors); }
          console.log("URLs de fotos generadas:", urls);
          fotosUrls = urls;
        }

        // Subir renders
        if (data.renders.length > 0) {
          const { urls, errors } = await uploadMultipleFiles(
            BUCKETS.RENDERS,
            data.renders,
            `${basePath}/renders`
          );
          if (errors.length > 0) { console.warn("Algunos renders no se pudieron subir:", errors); }
          rendersUrls = urls;
        }

        // Subir videos
        if (data.videos.length > 0) {
          const { urls, errors } = await uploadMultipleFiles(
            BUCKETS.LOTES,
            data.videos,
            `${basePath}/videos`
          );
          if (errors.length > 0) { console.warn("Algunos videos no se pudieron subir:", errors); }
          videosUrls = urls;
        }

        // Subir plano
        if (data.plano) {
          const fileName = `${Date.now()}-${data.plano.name}`;
          const { data: uploadData, error } = await uploadFile(
            BUCKETS.PLANOS,
            data.plano,
            `${basePath}/${fileName}`
          );
          if (!error && uploadData) { planoUrl = getPublicUrl(BUCKETS.PLANOS, uploadData.path); }
        }

        // Crear FormData para el servidor
        const formData = new FormData();
        formData.append("tipo", data.tipo);
        formData.append("tipo_operacion", data.tipo_operacion);
        formData.append("proyecto_id", data.proyecto || "");
        formData.append("codigo", data.identificador);

        const additionalData = {
          // Datos generales
          identificador: data.identificador,
          ubicacion: data.ubicacion,
          calle: data.calle,
          numero: data.numero,
          barrio: data.barrio,
          geolocalizacion: data.geolocalizacion,
          superficie_total: data.superficie_total,
          antiguedad_anos: data.antiguedad_anos,
          disponibilidad_inmediata: data.disponibilidad_inmediata,
          disponibilidad_desde: data.disponibilidad_desde,
          
          // Características específicas
          caracteristicas: data.caracteristicas,
          
          // Precios y condiciones
          precio_venta: data.precio_venta,
          precio_alquiler: data.precio_alquiler,
          condiciones_venta: data.condiciones_venta,
          condiciones_alquiler: data.condiciones_alquiler,
          
          // Marketing
          fotos: fotosUrls,
          renders: rendersUrls,
          videos: videosUrls,
          plano: planoUrl,
          links3D: data.links3D,
          etiquetas: data.etiquetas,
          descripcion: data.descripcion,
          destacado: data.destacado,
          premium: data.premium,
          fecha_publicacion: new Date().toISOString()
        };

        formData.append("data", JSON.stringify(additionalData));

        console.log("Datos que se envían al servidor:", additionalData);

        await crearPropiedad(formData);
        toast.success("Propiedad creada exitosamente");
        onClose();
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || "No se pudo crear la propiedad");
      }
    });
  };

  // Función para obtener opciones de tipo de operación según el tipo de propiedad
  const getTipoOperacionOptions = (tipo: TipoPropiedad): { value: TipoOperacion; label: string }[] => {
    switch (tipo) {
      case 'lote':
        return [{ value: 'venta', label: 'Solo Venta' }];
      case 'casa':
      case 'departamento':
      case 'oficina':
        return [
          { value: 'venta', label: 'Solo Venta' },
          { value: 'alquiler', label: 'Solo Alquiler' },
          { value: 'ambos', label: 'Venta y Alquiler' }
        ];
      case 'otro':
        return [
          { value: 'venta', label: 'Solo Venta' },
          { value: 'alquiler', label: 'Solo Alquiler' },
          { value: 'ambos', label: 'Venta y Alquiler' }
        ];
      default:
        return [{ value: 'venta', label: 'Solo Venta' }];
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-crm-card rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-crm-card border-b border-crm-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-crm-text-primary">Nueva Propiedad</h2>
              <p className="text-crm-text-muted">Paso {currentStep} de 6</p>
            </div>
            <button
              onClick={onClose}
              className="text-crm-text-muted hover:text-crm-text-primary transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5, 6].map((step) => (
                <div
                  key={step}
                  className={`h-2 flex-1 rounded ${
                    step <= currentStep ? 'bg-crm-primary' : 'bg-crm-border'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 1 && <Paso1TipoOperacion data={data} updateData={updateData} />}
          {currentStep === 2 && <Paso2DatosGenerales data={data} updateData={updateData} proyectos={proyectos} />}
          {currentStep === 3 && <Paso3CaracteristicasEspecificas data={data} updateData={updateData} />}
          {currentStep === 4 && <Paso4PreciosCondiciones data={data} updateData={updateData} />}
          {currentStep === 5 && <Paso5Marketing data={data} updateData={updateData} />}
          {currentStep === 6 && <Paso6Confirmacion data={data} updateData={updateData} />}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-crm-card border-t border-crm-border p-6">
          <div className="flex justify-between">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-4 py-2 text-crm-text-muted hover:text-crm-text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <div className="space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-crm-text-muted hover:text-crm-text-primary transition-colors"
              >
                Cancelar
              </button>
              {currentStep < 6 ? (
                <button
                  onClick={nextStep}
                  className="crm-button-primary"
                >
                  Siguiente
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isPending || !data.confirmado}
                  className="crm-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? "Creando..." : "Crear Propiedad"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Paso 1: Tipo de operación y propiedad
function Paso1TipoOperacion({ data, updateData }: { data: PropiedadWizardData; updateData: (updates: Partial<PropiedadWizardData>) => void }) {
  const tipoOperacionOptions = getTipoOperacionOptions(data.tipo);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-crm-text-primary mb-2">Tipo de Propiedad y Operación</h3>
        <p className="text-crm-text-muted">Selecciona el tipo de propiedad y la operación comercial</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tipo de Propiedad */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-crm-text-primary">Tipo de Propiedad *</label>
          <select
            value={data.tipo}
            onChange={(e) => {
              const newTipo = e.target.value as TipoPropiedad;
              updateData({ 
                tipo: newTipo,
                tipo_operacion: getTipoOperacionOptions(newTipo)[0].value // Reset to first available option
              });
            }}
            className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
          >
            <option value="lote">Lote</option>
            <option value="casa">Casa</option>
            <option value="departamento">Departamento</option>
            <option value="oficina">Oficina</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        {/* Tipo de Operación */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-crm-text-primary">Tipo de Operación *</label>
          <select
            value={data.tipo_operacion}
            onChange={(e) => updateData({ tipo_operacion: e.target.value as TipoOperacion })}
            className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
          >
            {tipoOperacionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Información del tipo seleccionado */}
      <div className="crm-card p-4">
        <h4 className="font-semibold text-crm-text-primary mb-2">
          {data.tipo.charAt(0).toUpperCase() + data.tipo.slice(1)} - {tipoOperacionOptions.find(opt => opt.value === data.tipo_operacion)?.label}
        </h4>
        <p className="text-sm text-crm-text-muted">
          {data.tipo === 'lote' && 'Terreno para construcción o inversión'}
          {data.tipo === 'casa' && 'Vivienda unifamiliar independiente'}
          {data.tipo === 'departamento' && 'Unidad en edificio o condominio'}
          {data.tipo === 'oficina' && 'Espacio comercial o profesional'}
          {data.tipo === 'otro' && 'Propiedad con características especiales'}
        </p>
      </div>
    </div>
  );
}

// Paso 2: Datos generales
function Paso2DatosGenerales({ 
  data, 
  updateData, 
  proyectos 
}: { 
  data: PropiedadWizardData; 
  updateData: (updates: Partial<PropiedadWizardData>) => void;
  proyectos: Array<{ id: string; nombre: string; ubicacion: string | null; estado: string; }>;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-crm-text-primary mb-2">Datos Generales</h3>
        <p className="text-crm-text-muted">Información básica de la propiedad</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-crm-text-primary">Proyecto/Desarrollo</label>
          <select
            value={data.proyecto}
            onChange={(e) => updateData({ proyecto: e.target.value })}
            className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
          >
            <option value="">Sin proyecto (propiedad independiente)</option>
            {proyectos.map((proyecto) => (
              <option key={proyecto.id} value={proyecto.id}>
                {proyecto.nombre} {proyecto.ubicacion && `- ${proyecto.ubicacion}`}
              </option>
            ))}
          </select>
          <p className="text-xs text-crm-text-muted">
            Selecciona un proyecto existente o deja en blanco para propiedad independiente
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-crm-text-primary">Identificación Interna *</label>
          <input
            type="text"
            value={data.identificador}
            onChange={(e) => updateData({ identificador: e.target.value })}
            placeholder="Ej: MZ5-LT10, DEP-102, C-15"
            className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-crm-text-primary">Calle *</label>
          <input
            type="text"
            value={data.calle}
            onChange={(e) => updateData({ calle: e.target.value })}
            placeholder="Nombre de la calle"
            className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-crm-text-primary">Número</label>
          <input
            type="text"
            value={data.numero}
            onChange={(e) => updateData({ numero: e.target.value })}
            placeholder="Número de la propiedad"
            className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-crm-text-primary">Barrio/Zona *</label>
          <input
            type="text"
            value={data.barrio}
            onChange={(e) => updateData({ barrio: e.target.value })}
            placeholder="Barrio o zona"
            className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-crm-text-primary">Superficie Total (m²) *</label>
          <input
            type="number"
            value={data.superficie_total}
            onChange={(e) => updateData({ superficie_total: Number(e.target.value) })}
            placeholder="Superficie en metros cuadrados"
            className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-crm-text-primary">Años de Antigüedad</label>
          <input
            type="number"
            value={data.antiguedad_anos}
            onChange={(e) => updateData({ antiguedad_anos: Number(e.target.value) })}
            placeholder="0 si es a estrenar"
            min="0"
            className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-crm-text-primary">Disponibilidad</label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={data.disponibilidad_inmediata}
                onChange={(e) => updateData({ disponibilidad_inmediata: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-crm-text-primary">Disponible inmediatamente</span>
            </label>
            {!data.disponibilidad_inmediata && (
              <input
                type="date"
                value={data.disponibilidad_desde}
                onChange={(e) => updateData({ disponibilidad_desde: e.target.value })}
                className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
              />
            )}
          </div>
        </div>
      </div>

      {/* Información del proyecto seleccionado */}
      {data.proyecto ? (
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
      ) : (
        <div className="crm-card p-4 border-dashed border-2 border-crm-border">
          <div className="text-center">
            <div className="w-12 h-12 bg-crm-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
              </svg>
            </div>
            <h4 className="font-semibold text-crm-text-primary mb-2">Propiedad Independiente</h4>
            <p className="text-sm text-crm-text-muted">
              Esta propiedad no está vinculada a ningún proyecto específico. 
              Puedes gestionarla de forma independiente.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Paso 3: Características específicas
function Paso3CaracteristicasEspecificas({ data, updateData }: { data: PropiedadWizardData; updateData: (updates: Partial<PropiedadWizardData>) => void }) {
  const updateCaracteristica = (key: string, value: any) => {
    updateData({
      caracteristicas: {
        ...data.caracteristicas,
        [key]: value
      }
    });
  };

  const renderLoteForm = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-crm-text-primary">Frente (m) *</label>
        <input
          type="number"
          value={data.caracteristicas.frente || ''}
          onChange={(e) => updateCaracteristica('frente', Number(e.target.value))}
          placeholder="Metros de frente"
          className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-crm-text-primary">Fondo (m) *</label>
        <input
          type="number"
          value={data.caracteristicas.fondo || ''}
          onChange={(e) => updateCaracteristica('fondo', Number(e.target.value))}
          placeholder="Metros de fondo"
          className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-crm-text-primary">Orientación *</label>
        <select
          value={data.caracteristicas.orientacion || ''}
          onChange={(e) => updateCaracteristica('orientacion', e.target.value)}
          className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
          required
        >
          <option value="">Seleccionar orientación</option>
          <option value="N">Norte</option>
          <option value="S">Sur</option>
          <option value="E">Este</option>
          <option value="O">Oeste</option>
          <option value="NE">Noreste</option>
          <option value="NO">Noroeste</option>
          <option value="SE">Sureste</option>
          <option value="SO">Suroeste</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-crm-text-primary">Uso Permitido *</label>
        <select
          value={data.caracteristicas.uso_permitido || ''}
          onChange={(e) => updateCaracteristica('uso_permitido', e.target.value)}
          className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
          required
        >
          <option value="">Seleccionar uso</option>
          <option value="residencial">Residencial</option>
          <option value="comercial">Comercial</option>
          <option value="mixto">Mixto</option>
          <option value="industrial">Industrial</option>
        </select>
      </div>

      <div className="md:col-span-2 space-y-4">
        <label className="block text-sm font-medium text-crm-text-primary">Servicios Disponibles</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['agua', 'luz', 'gas', 'cloacas', 'internet', 'cable', 'telefono'].map((servicio) => (
            <label key={servicio} className="flex items-center">
              <input
                type="checkbox"
                checked={data.caracteristicas[`servicios_${servicio}`] || false}
                onChange={(e) => updateCaracteristica(`servicios_${servicio}`, e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-crm-text-primary capitalize">{servicio}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCasaForm = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-crm-text-primary">Dormitorios *</label>
        <input
          type="number"
          value={data.caracteristicas.dormitorios || ''}
          onChange={(e) => updateCaracteristica('dormitorios', Number(e.target.value))}
          placeholder="Número de dormitorios"
          className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-crm-text-primary">Baños *</label>
        <input
          type="number"
          value={data.caracteristicas.banos || ''}
          onChange={(e) => updateCaracteristica('banos', Number(e.target.value))}
          placeholder="Número de baños"
          className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-crm-text-primary">Ambientes Totales *</label>
        <input
          type="number"
          value={data.caracteristicas.ambientes_totales || ''}
          onChange={(e) => updateCaracteristica('ambientes_totales', Number(e.target.value))}
          placeholder="Total de ambientes"
          className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-crm-text-primary">Cochera (cantidad)</label>
        <input
          type="number"
          value={data.caracteristicas.cochera_cantidad || ''}
          onChange={(e) => updateCaracteristica('cochera_cantidad', Number(e.target.value))}
          placeholder="Cantidad de autos"
          min="0"
          className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-crm-text-primary">Pisos Totales</label>
        <input
          type="number"
          value={data.caracteristicas.pisos_totales || ''}
          onChange={(e) => updateCaracteristica('pisos_totales', Number(e.target.value))}
          placeholder="Número de pisos"
          min="1"
          className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
        />
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-crm-text-primary">Características Especiales</label>
        <div className="space-y-2">
          {[
            { key: 'patio_jardin', label: 'Patio/Jardín' },
            { key: 'pileta', label: 'Pileta' },
            { key: 'quincho_parrilla', label: 'Quincho/Parrilla' }
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center">
              <input
                type="checkbox"
                checked={data.caracteristicas[key] || false}
                onChange={(e) => updateCaracteristica(key, e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-crm-text-primary">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-crm-text-primary">Servicios</label>
        <div className="grid grid-cols-2 gap-2">
          {['agua', 'luz', 'gas', 'cloacas', 'internet', 'cable', 'telefono'].map((servicio) => (
            <label key={servicio} className="flex items-center">
              <input
                type="checkbox"
                checked={data.caracteristicas[`servicios_${servicio}`] || false}
                onChange={(e) => updateCaracteristica(`servicios_${servicio}`, e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-crm-text-primary capitalize">{servicio}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderDepartamentoForm = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-crm-text-primary">Piso *</label>
        <input
          type="number"
          value={data.caracteristicas.piso || ''}
          onChange={(e) => updateCaracteristica('piso', Number(e.target.value))}
          placeholder="Número de piso"
          className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-crm-text-primary">Número *</label>
        <input
          type="text"
          value={data.caracteristicas.numero || ''}
          onChange={(e) => updateCaracteristica('numero', e.target.value)}
          placeholder="Número del departamento"
          className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-crm-text-primary">Ambientes Totales *</label>
        <input
          type="number"
          value={data.caracteristicas.ambientes_totales || ''}
          onChange={(e) => updateCaracteristica('ambientes_totales', Number(e.target.value))}
          placeholder="Total de ambientes"
          className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-crm-text-primary">Dormitorios *</label>
        <input
          type="number"
          value={data.caracteristicas.dormitorios || ''}
          onChange={(e) => updateCaracteristica('dormitorios', Number(e.target.value))}
          placeholder="Número de dormitorios"
          className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-crm-text-primary">Baños *</label>
        <input
          type="number"
          value={data.caracteristicas.banos || ''}
          onChange={(e) => updateCaracteristica('banos', Number(e.target.value))}
          placeholder="Número de baños"
          className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-crm-text-primary">Expensas Mensual (S/.)</label>
        <input
          type="number"
          value={data.caracteristicas.expensas_mensual || ''}
          onChange={(e) => updateCaracteristica('expensas_mensual', Number(e.target.value))}
          placeholder="Monto de expensas"
          className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
        />
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-crm-text-primary">Características</label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={data.caracteristicas.cochera || false}
              onChange={(e) => updateCaracteristica('cochera', e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-crm-text-primary">Cochera</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={data.caracteristicas.ascensor || false}
              onChange={(e) => updateCaracteristica('ascensor', e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-crm-text-primary">Ascensor</span>
          </label>
        </div>
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-crm-text-primary">Amenities</label>
        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
          {AMENITIES_PREDEFINIDOS.map((amenity) => (
            <label key={amenity} className="flex items-center">
              <input
                type="checkbox"
                checked={data.caracteristicas.amenities?.includes(amenity) || false}
                onChange={(e) => {
                  const currentAmenities = data.caracteristicas.amenities || [];
                  const newAmenities = e.target.checked
                    ? [...currentAmenities, amenity]
                    : currentAmenities.filter(a => a !== amenity);
                  updateCaracteristica('amenities', newAmenities);
                }}
                className="mr-2"
              />
              <span className="text-sm text-crm-text-primary">{amenity}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderOficinaForm = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-crm-text-primary">Piso *</label>
        <input
          type="number"
          value={data.caracteristicas.piso || ''}
          onChange={(e) => updateCaracteristica('piso', Number(e.target.value))}
          placeholder="Número de piso"
          className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-crm-text-primary">Número *</label>
        <input
          type="text"
          value={data.caracteristicas.numero || ''}
          onChange={(e) => updateCaracteristica('numero', e.target.value)}
          placeholder="Número de oficina"
          className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-crm-text-primary">Ambientes/Salas *</label>
        <input
          type="number"
          value={data.caracteristicas.ambientes_salas || ''}
          onChange={(e) => updateCaracteristica('ambientes_salas', Number(e.target.value))}
          placeholder="Número de ambientes"
          className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-crm-text-primary">Baños</label>
        <input
          type="number"
          value={data.caracteristicas.banos || ''}
          onChange={(e) => updateCaracteristica('banos', Number(e.target.value))}
          placeholder="Número de baños"
          className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-crm-text-primary">Cocheras</label>
        <input
          type="number"
          value={data.caracteristicas.cocheras || ''}
          onChange={(e) => updateCaracteristica('cocheras', Number(e.target.value))}
          placeholder="Número de cocheras"
          className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-crm-text-primary">Expensas Mensual (S/.)</label>
        <input
          type="number"
          value={data.caracteristicas.expensas_mensual || ''}
          onChange={(e) => updateCaracteristica('expensas_mensual', Number(e.target.value))}
          placeholder="Monto de expensas"
          className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
        />
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-crm-text-primary">Características</label>
        <div className="space-y-2">
          {[
            { key: 'superficie_divisible', label: 'Superficie Divisible' },
            { key: 'recepcion', label: 'Recepción' },
            { key: 'kitchenette', label: 'Kitchenette' },
            { key: 'seguridad_vigilancia', label: 'Seguridad/Vigilancia' }
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center">
              <input
                type="checkbox"
                checked={data.caracteristicas[key] || false}
                onChange={(e) => updateCaracteristica(key, e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-crm-text-primary">{label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderOtroForm = () => (
    <div className="grid grid-cols-1 gap-6">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-crm-text-primary">Nombre de la Propiedad *</label>
        <input
          type="text"
          value={data.caracteristicas.nombre_propiedad || ''}
          onChange={(e) => updateCaracteristica('nombre_propiedad', e.target.value)}
          placeholder="Ej: Galpón Industrial, Campo Agrícola, Local Comercial"
          className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-crm-text-primary">Categoría Personalizada *</label>
        <input
          type="text"
          value={data.caracteristicas.categoria_custom || ''}
          onChange={(e) => updateCaracteristica('categoria_custom', e.target.value)}
          placeholder="Ej: Industrial, Agrícola, Comercial, Recreativo"
          className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-crm-text-primary">Descripción de Características</label>
        <textarea
          value={data.caracteristicas.descripcion_caracteristicas || ''}
          onChange={(e) => updateCaracteristica('descripcion_caracteristicas', e.target.value)}
          placeholder="Describe las características especiales de esta propiedad..."
          rows={4}
          className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-crm-text-primary mb-2">Características Específicas</h3>
        <p className="text-crm-text-muted">Detalles específicos según el tipo de propiedad: {data.tipo}</p>
      </div>

      {data.tipo === 'lote' && renderLoteForm()}
      {data.tipo === 'casa' && renderCasaForm()}
      {data.tipo === 'departamento' && renderDepartamentoForm()}
      {data.tipo === 'oficina' && renderOficinaForm()}
      {data.tipo === 'otro' && renderOtroForm()}
    </div>
  );
}

// Paso 4: Precios y condiciones comerciales
function Paso4PreciosCondiciones({ data, updateData }: { data: PropiedadWizardData; updateData: (updates: Partial<PropiedadWizardData>) => void }) {
  const updateCondicionVenta = (key: string, value: any) => {
    updateData({
      condiciones_venta: {
        ...data.condiciones_venta,
        [key]: value
      }
    });
  };

  const updateCondicionAlquiler = (key: string, value: any) => {
    updateData({
      condiciones_alquiler: {
        ...data.condiciones_alquiler,
        [key]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-crm-text-primary mb-2">Precios y Condiciones Comerciales</h3>
        <p className="text-crm-text-muted">Define los precios y condiciones según el tipo de operación: {data.tipo_operacion}</p>
      </div>

      {/* Precios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(data.tipo_operacion === 'venta' || data.tipo_operacion === 'ambos') && (
          <div className="crm-card p-6">
            <h4 className="font-semibold text-crm-text-primary mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              Precio de Venta
            </h4>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-crm-text-primary">Precio de Lista (S/.) *</label>
                <input
                  type="number"
                  value={data.precio_venta || ''}
                  onChange={(e) => updateData({ precio_venta: Number(e.target.value) })}
                  placeholder="Precio de venta"
                  className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-crm-text-primary">Anticipo (%)</label>
                <input
                  type="number"
                  value={data.condiciones_venta.anticipo_porcentaje || ''}
                  onChange={(e) => updateCondicionVenta('anticipo_porcentaje', Number(e.target.value))}
                  placeholder="Porcentaje de anticipo"
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-crm-text-primary">Cuotas</label>
                  <input
                    type="number"
                    value={data.condiciones_venta.cuotas || ''}
                    onChange={(e) => updateCondicionVenta('cuotas', Number(e.target.value))}
                    placeholder="Número de cuotas"
                    className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-crm-text-primary">Interés Anual (%)</label>
                  <input
                    type="number"
                    value={data.condiciones_venta.interes_anual || ''}
                    onChange={(e) => updateCondicionVenta('interes_anual', Number(e.target.value))}
                    placeholder="Tasa de interés"
                    step="0.01"
                    className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-crm-text-primary">Banco/Entidad Financiera</label>
                <input
                  type="text"
                  value={data.condiciones_venta.banco || ''}
                  onChange={(e) => updateCondicionVenta('banco', e.target.value)}
                  placeholder="Nombre del banco"
                  className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-crm-text-primary">Observaciones</label>
                <textarea
                  value={data.condiciones_venta.observaciones || ''}
                  onChange={(e) => updateCondicionVenta('observaciones', e.target.value)}
                  placeholder="Condiciones especiales de venta..."
                  rows={3}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
                />
              </div>
            </div>
          </div>
        )}

        {(data.tipo_operacion === 'alquiler' || data.tipo_operacion === 'ambos') && (
          <div className="crm-card p-6">
            <h4 className="font-semibold text-crm-text-primary mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Precio de Alquiler
            </h4>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-crm-text-primary">Precio Mensual (S/.) *</label>
                <input
                  type="number"
                  value={data.precio_alquiler || ''}
                  onChange={(e) => updateData({ precio_alquiler: Number(e.target.value) })}
                  placeholder="Precio mensual de alquiler"
                  className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-crm-text-primary">Duración Mínima (meses)</label>
                <input
                  type="number"
                  value={data.condiciones_alquiler.duracion_minima_meses || ''}
                  onChange={(e) => updateCondicionAlquiler('duracion_minima_meses', Number(e.target.value))}
                  placeholder="Meses mínimos de contrato"
                  className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-crm-text-primary">Tipo de Ajuste</label>
                <select
                  value={data.condiciones_alquiler.ajuste_tipo || ''}
                  onChange={(e) => updateCondicionAlquiler('ajuste_tipo', e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
                >
                  <option value="">Seleccionar tipo de ajuste</option>
                  <option value="fijo">Precio Fijo</option>
                  <option value="inflacion">Índice de Inflación</option>
                  <option value="semestral">Ajuste Semestral</option>
                  <option value="anual">Ajuste Anual</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={data.condiciones_alquiler.expensas_incluidas || false}
                    onChange={(e) => updateCondicionAlquiler('expensas_incluidas', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-crm-text-primary">Expensas Incluidas</span>
                </label>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-crm-text-primary">Observaciones</label>
                <textarea
                  value={data.condiciones_alquiler.observaciones || ''}
                  onChange={(e) => updateCondicionAlquiler('observaciones', e.target.value)}
                  placeholder="Condiciones especiales de alquiler..."
                  rows={3}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Paso 5: Marketing y multimedia
function Paso5Marketing({ data, updateData }: { data: PropiedadWizardData; updateData: (updates: Partial<PropiedadWizardData>) => void }) {
  const handleFileUpload = (type: 'fotos' | 'renders' | 'videos' | 'plano', files: File[]) => {
    if (type === 'plano') {
      updateData({ plano: files[0] || null });
    } else {
      updateData({ [type]: files });
    }
  };

  const removeFile = (type: 'fotos' | 'renders' | 'videos' | 'plano', index?: number) => {
    if (type === 'plano') {
      updateData({ plano: null });
    } else {
      const currentFiles = data[type] as File[];
      if (index !== undefined) {
        const newFiles = currentFiles.filter((_, i) => i !== index);
        updateData({ [type]: newFiles });
      }
    }
  };

  const addLink3D = (link: string) => {
    if (link.trim()) {
      updateData({ links3D: [...data.links3D, link.trim()] });
    }
  };

  const removeLink3D = (index: number) => {
    const newLinks = data.links3D.filter((_, i) => i !== index);
    updateData({ links3D: newLinks });
  };

  const toggleEtiqueta = (etiqueta: string) => {
    const currentEtiquetas = data.etiquetas;
    const newEtiquetas = currentEtiquetas.includes(etiqueta)
      ? currentEtiquetas.filter(e => e !== etiqueta)
      : [...currentEtiquetas, etiqueta];
    updateData({ etiquetas: newEtiquetas });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-crm-text-primary mb-2">Marketing y Multimedia</h3>
        <p className="text-crm-text-muted">Fotos, planos, renders y contenido promocional</p>
      </div>

      {/* Fotos */}
      <div className="crm-card p-6">
        <h4 className="font-semibold text-crm-text-primary mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Fotos de la Propiedad
        </h4>
        
        <ImageUpload
          onImagesChange={(files) => handleFileUpload('fotos', files)}
          existingImages={[]}
          maxImages={10}
          accept="image/*"
          className="w-full"
        />

        {data.fotos.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-crm-text-muted mb-2">Fotos seleccionadas ({data.fotos.length}):</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {data.fotos.map((file, index) => (
                <div key={index} className="relative group">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Foto ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border border-crm-border"
                  />
                  <button
                    onClick={() => removeFile('fotos', index)}
                    className="absolute -top-2 -right-2 bg-crm-danger text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-crm-danger/80 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Renders */}
      <div className="crm-card p-6">
        <h4 className="font-semibold text-crm-text-primary mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Renders y Visualizaciones
        </h4>
        
        <ImageUpload
          onImagesChange={(files) => handleFileUpload('renders', files)}
          existingImages={[]}
          maxImages={5}
          accept="image/*"
          className="w-full"
        />

        {data.renders.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-crm-text-muted mb-2">Renders seleccionados ({data.renders.length}):</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {data.renders.map((file, index) => (
                <div key={index} className="relative group">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Render ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border border-crm-border"
                  />
                  <button
                    onClick={() => removeFile('renders', index)}
                    className="absolute -top-2 -right-2 bg-crm-danger text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-crm-danger/80 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Plano */}
      <div className="crm-card p-6">
        <h4 className="font-semibold text-crm-text-primary mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Plano de la Propiedad
        </h4>
        
        <ImageUpload
          onImagesChange={(files) => handleFileUpload('plano', files)}
          existingImages={[]}
          maxImages={1}
          accept=".pdf,image/*"
          className="w-full"
        />

        {data.plano && (
          <div className="mt-4">
            <div className="flex items-center justify-between p-3 bg-crm-primary/10 rounded-lg">
              <div className="flex items-center">
                <svg className="w-8 h-8 text-crm-primary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-crm-text-primary">{data.plano.name}</p>
                  <p className="text-xs text-crm-text-muted">{(data.plano.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button
                onClick={() => removeFile('plano')}
                className="text-crm-danger hover:text-crm-danger/80 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Videos */}
      <div className="crm-card p-6">
        <h4 className="font-semibold text-crm-text-primary mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Videos
        </h4>
        
        <ImageUpload
          onImagesChange={(files) => handleFileUpload('videos', files)}
          existingImages={[]}
          maxImages={3}
          accept="video/*"
          className="w-full"
        />

        {data.videos.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-crm-text-muted mb-2">Videos seleccionados ({data.videos.length}):</p>
            <div className="space-y-2">
              {data.videos.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-crm-primary/10 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-8 h-8 text-crm-primary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-crm-text-primary">{file.name}</p>
                      <p className="text-xs text-crm-text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile('videos', index)}
                    className="text-crm-danger hover:text-crm-danger/80 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Links 3D */}
      <div className="crm-card p-6">
        <h4 className="font-semibold text-crm-text-primary mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Links 3D y Tours Virtuales
        </h4>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://ejemplo.com/tour-3d"
              className="flex-1 px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addLink3D(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
            />
            <button
              onClick={(e) => {
                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                addLink3D(input.value);
                input.value = '';
              }}
              className="crm-button-primary px-4 py-2"
            >
              Agregar
            </button>
          </div>

          {data.links3D.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-crm-text-muted">Links agregados ({data.links3D.length}):</p>
              {data.links3D.map((link, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-crm-primary/10 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-crm-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-crm-primary hover:text-crm-primary/80 underline"
                    >
                      {link}
                    </a>
                  </div>
                  <button
                    onClick={() => removeLink3D(index)}
                    className="text-crm-danger hover:text-crm-danger/80 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Etiquetas */}
      <div className="crm-card p-6">
        <h4 className="font-semibold text-crm-text-primary mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          Etiquetas de Marketing
        </h4>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {ETIQUETAS_PREDEFINIDAS.map((etiqueta) => (
            <label key={etiqueta} className="flex items-center">
              <input
                type="checkbox"
                checked={data.etiquetas.includes(etiqueta)}
                onChange={() => toggleEtiqueta(etiqueta)}
                className="mr-2"
              />
              <span className="text-sm text-crm-text-primary">{etiqueta}</span>
            </label>
          ))}
        </div>

        {data.etiquetas.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-crm-text-muted mb-2">Etiquetas seleccionadas:</p>
            <div className="flex flex-wrap gap-2">
              {data.etiquetas.map((etiqueta) => (
                <span
                  key={etiqueta}
                  className="px-3 py-1 bg-crm-primary text-white text-xs rounded-full"
                >
                  {etiqueta}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Descripción y opciones especiales */}
      <div className="crm-card p-6">
        <h4 className="font-semibold text-crm-text-primary mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Descripción y Opciones Especiales
        </h4>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-crm-text-primary">Descripción de la Propiedad</label>
            <textarea
              value={data.descripcion}
              onChange={(e) => updateData({ descripcion: e.target.value })}
              placeholder="Describe las características principales, ubicación, ventajas y cualquier detalle especial de la propiedad..."
              rows={4}
              className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
            />
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-crm-text-primary">Opciones de Destacado</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={data.destacado}
                  onChange={(e) => updateData({ destacado: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-crm-text-primary">Destacado</span>
                <span className="ml-2 text-xs text-crm-text-muted">(Aparecerá en la página principal)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={data.premium}
                  onChange={(e) => updateData({ premium: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-crm-text-primary">Premium</span>
                <span className="ml-2 text-xs text-crm-text-muted">(Propiedad de alta gama)</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Paso 6: Confirmación
function Paso6Confirmacion({ data, updateData }: { data: PropiedadWizardData; updateData: (updates: Partial<PropiedadWizardData>) => void }) {
  const getTipoOperacionLabel = (tipo: TipoOperacion) => {
    switch (tipo) {
      case 'venta': return 'Solo Venta';
      case 'alquiler': return 'Solo Alquiler';
      case 'ambos': return 'Venta y Alquiler';
      default: return tipo;
    }
  };

  const getEstadoComercialLabel = (estado: string) => {
    switch (estado) {
      case 'disponible': return 'Disponible';
      case 'reservado': return 'Reservado';
      case 'vendido': return 'Vendido';
      case 'alquilado': return 'Alquilado';
      case 'bloqueado': return 'Bloqueado';
      default: return estado;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-crm-text-primary mb-2">Confirmación</h3>
        <p className="text-crm-text-muted">Revisa todos los datos antes de crear la propiedad</p>
      </div>

      {/* Resumen General */}
      <div className="crm-card p-6">
        <h4 className="font-semibold text-crm-text-primary mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Resumen General
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <span className="text-sm text-crm-text-muted">Tipo de Propiedad:</span>
              <p className="font-medium text-crm-text-primary capitalize">{data.tipo}</p>
            </div>
            <div>
              <span className="text-sm text-crm-text-muted">Tipo de Operación:</span>
              <p className="font-medium text-crm-text-primary">{getTipoOperacionLabel(data.tipo_operacion)}</p>
            </div>
            <div>
              <span className="text-sm text-crm-text-muted">Identificación:</span>
              <p className="font-medium text-crm-text-primary">{data.identificador}</p>
            </div>
            <div>
              <span className="text-sm text-crm-text-muted">Superficie:</span>
              <p className="font-medium text-crm-text-primary">{data.superficie_total} m²</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <span className="text-sm text-crm-text-muted">Ubicación:</span>
              <p className="font-medium text-crm-text-primary">
                {data.calle} {data.numero}, {data.barrio}
              </p>
            </div>
            <div>
              <span className="text-sm text-crm-text-muted">Antigüedad:</span>
              <p className="font-medium text-crm-text-primary">
                {data.antiguedad_anos === 0 ? 'A estrenar' : `${data.antiguedad_anos} años`}
              </p>
            </div>
            <div>
              <span className="text-sm text-crm-text-muted">Disponibilidad:</span>
              <p className="font-medium text-crm-text-primary">
                {data.disponibilidad_inmediata ? 'Inmediata' : `Desde ${data.disponibilidad_desde}`}
              </p>
            </div>
            <div>
              <span className="text-sm text-crm-text-muted">Proyecto:</span>
              <p className="font-medium text-crm-text-primary">
                {data.proyecto ? 'Vinculado a proyecto' : 'Propiedad independiente'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Características Específicas */}
      <div className="crm-card p-6">
        <h4 className="font-semibold text-crm-text-primary mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Características Específicas
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(data.caracteristicas).map(([key, value]) => {
            if (value === null || value === undefined || value === '') return null;
            
            let displayValue = value;
            if (typeof value === 'boolean') {
              displayValue = value ? 'Sí' : 'No';
            } else if (Array.isArray(value)) {
              displayValue = value.join(', ');
            }
            
            return (
              <div key={key} className="space-y-1">
                <span className="text-sm text-crm-text-muted capitalize">
                  {key.replace(/_/g, ' ')}:
                </span>
                <p className="font-medium text-crm-text-primary">{String(displayValue)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Precios y Condiciones */}
      <div className="crm-card p-6">
        <h4 className="font-semibold text-crm-text-primary mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          Precios y Condiciones Comerciales
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(data.tipo_operacion === 'venta' || data.tipo_operacion === 'ambos') && data.precio_venta > 0 && (
            <div className="space-y-3">
              <h5 className="font-medium text-crm-text-primary">Venta</h5>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-crm-text-muted">Precio:</span>
                  <span className="font-medium text-crm-text-primary">S/ {data.precio_venta.toLocaleString()}</span>
                </div>
                {data.condiciones_venta.anticipo_porcentaje && (
                  <div className="flex justify-between">
                    <span className="text-sm text-crm-text-muted">Anticipo:</span>
                    <span className="font-medium text-crm-text-primary">{data.condiciones_venta.anticipo_porcentaje}%</span>
                  </div>
                )}
                {data.condiciones_venta.cuotas && (
                  <div className="flex justify-between">
                    <span className="text-sm text-crm-text-muted">Cuotas:</span>
                    <span className="font-medium text-crm-text-primary">{data.condiciones_venta.cuotas}</span>
                  </div>
                )}
                {data.condiciones_venta.banco && (
                  <div className="flex justify-between">
                    <span className="text-sm text-crm-text-muted">Banco:</span>
                    <span className="font-medium text-crm-text-primary">{data.condiciones_venta.banco}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {(data.tipo_operacion === 'alquiler' || data.tipo_operacion === 'ambos') && data.precio_alquiler > 0 && (
            <div className="space-y-3">
              <h5 className="font-medium text-crm-text-primary">Alquiler</h5>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-crm-text-muted">Precio mensual:</span>
                  <span className="font-medium text-crm-text-primary">S/ {data.precio_alquiler.toLocaleString()}</span>
                </div>
                {data.condiciones_alquiler.duracion_minima_meses && (
                  <div className="flex justify-between">
                    <span className="text-sm text-crm-text-muted">Duración mínima:</span>
                    <span className="font-medium text-crm-text-primary">{data.condiciones_alquiler.duracion_minima_meses} meses</span>
                  </div>
                )}
                {data.condiciones_alquiler.ajuste_tipo && (
                  <div className="flex justify-between">
                    <span className="text-sm text-crm-text-muted">Ajuste:</span>
                    <span className="font-medium text-crm-text-primary capitalize">{data.condiciones_alquiler.ajuste_tipo}</span>
                  </div>
                )}
                {data.condiciones_alquiler.expensas_incluidas !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-sm text-crm-text-muted">Expensas incluidas:</span>
                    <span className="font-medium text-crm-text-primary">{data.condiciones_alquiler.expensas_incluidas ? 'Sí' : 'No'}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Marketing y Multimedia */}
      <div className="crm-card p-6">
        <h4 className="font-semibold text-crm-text-primary mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Marketing y Multimedia
        </h4>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-crm-primary/10 rounded-lg">
            <div className="text-2xl font-bold text-crm-primary">{data.fotos.length}</div>
            <div className="text-sm text-crm-text-muted">Fotos</div>
          </div>
          <div className="text-center p-3 bg-crm-primary/10 rounded-lg">
            <div className="text-2xl font-bold text-crm-primary">{data.renders.length}</div>
            <div className="text-sm text-crm-text-muted">Renders</div>
          </div>
          <div className="text-center p-3 bg-crm-primary/10 rounded-lg">
            <div className="text-2xl font-bold text-crm-primary">{data.videos.length}</div>
            <div className="text-sm text-crm-text-muted">Videos</div>
          </div>
          <div className="text-center p-3 bg-crm-primary/10 rounded-lg">
            <div className="text-2xl font-bold text-crm-primary">{data.links3D.length}</div>
            <div className="text-sm text-crm-text-muted">Links 3D</div>
          </div>
        </div>

        {data.plano && (
          <div className="mt-4 p-3 bg-crm-primary/10 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-crm-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm text-crm-text-primary">Plano: {data.plano.name}</span>
            </div>
          </div>
        )}

        {data.etiquetas.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-crm-text-muted mb-2">Etiquetas seleccionadas:</p>
            <div className="flex flex-wrap gap-2">
              {data.etiquetas.map((etiqueta) => (
                <span
                  key={etiqueta}
                  className="px-2 py-1 bg-crm-primary text-white text-xs rounded-full"
                >
                  {etiqueta}
                </span>
              ))}
            </div>
          </div>
        )}

        {data.destacado && (
          <div className="mt-4 flex items-center text-crm-warning">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span className="text-sm font-medium">Propiedad Destacada</span>
          </div>
        )}

        {data.premium && (
          <div className="mt-2 flex items-center text-crm-primary">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <span className="text-sm font-medium">Propiedad Premium</span>
          </div>
        )}

        {data.descripcion && (
          <div className="mt-4">
            <p className="text-sm text-crm-text-muted mb-2">Descripción:</p>
            <p className="text-sm text-crm-text-primary bg-crm-primary/5 p-3 rounded-lg">
              {data.descripcion}
            </p>
          </div>
        )}
      </div>

      {/* Confirmación Final */}
      <div className="crm-card p-6 border-2 border-crm-primary/20">
        <div className="text-center">
          <div className="w-16 h-16 bg-crm-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="text-lg font-semibold text-crm-text-primary mb-2">¿Confirmar Creación de Propiedad?</h4>
          <p className="text-crm-text-muted mb-4">
            Se creará la propiedad con todos los datos ingresados. Esta acción no se puede deshacer.
          </p>
          <div className="flex items-center justify-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={data.confirmado}
                onChange={(e) => updateData({ confirmado: e.target.checked })}
                className="mr-2"
                required
              />
              <span className="text-sm text-crm-text-primary">
                Confirmo que todos los datos son correctos
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

// Función auxiliar para obtener opciones de tipo de operación
function getTipoOperacionOptions(tipo: TipoPropiedad): { value: TipoOperacion; label: string }[] {
  switch (tipo) {
    case 'lote':
      return [{ value: 'venta', label: 'Solo Venta' }];
    case 'casa':
    case 'departamento':
    case 'oficina':
      return [
        { value: 'venta', label: 'Solo Venta' },
        { value: 'alquiler', label: 'Solo Alquiler' },
        { value: 'ambos', label: 'Venta y Alquiler' }
      ];
    case 'otro':
      return [
        { value: 'venta', label: 'Solo Venta' },
        { value: 'alquiler', label: 'Solo Alquiler' },
        { value: 'ambos', label: 'Venta y Alquiler' }
      ];
    default:
      return [{ value: 'venta', label: 'Solo Venta' }];
  }
}