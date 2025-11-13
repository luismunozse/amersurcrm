"use client";
import { useTransition, useState, useCallback } from "react";
import { crearProyecto } from "./_actions";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import UbicacionSelector from "@/components/UbicacionSelector";
import { compressImage, compressImages, formatFileSize } from "@/lib/imageCompression";

export default function NewProyectoForm() {
  const [pending, start] = useTransition();
  const { isAdmin, loading } = useAdminPermissions();
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState<string>("");

  // Estado para ubigeo
  const [ubigeoData, setUbigeoData] = useState({
    departamento: "",
    provincia: "",
    distrito: "",
    codigoDepartamento: "",
    codigoProvincia: "",
    codigoDistrito: "",
  });

  const handleUbicacionChange = useCallback((ubicacion: typeof ubigeoData) => {
    setUbigeoData(ubicacion);
  }, [setUbigeoData]);

  // No mostrar el formulario si no es admin
  if (loading) {
    return (
      <div className="crm-card p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-crm-border rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-crm-border rounded"></div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="crm-card p-4 md:p-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between group hover:bg-crm-card-hover rounded-lg p-3 transition-all"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-crm-primary to-crm-accent rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-all">
            <svg className="w-5 h-5 text-white transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isExpanded ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4"/>
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              )}
            </svg>
          </div>
          <div className="text-left">
            <h2 className="text-base md:text-lg font-semibold text-crm-text-primary">
              {isExpanded ? "Nuevo Proyecto" : "Agregar Nuevo Proyecto"}
            </h2>
            <p className="text-xs text-crm-text-muted">
              {isExpanded ? "Completa los datos del proyecto" : "Haz clic para crear un nuevo proyecto inmobiliario"}
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-crm-text-muted group-hover:text-crm-primary transition-all duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const originalFormData = new FormData(form);

            try {
              setIsCompressing(true);

              // Obtener archivos originales
              const imagenFile = originalFormData.get("imagen") as File | null;
              const logoFile = originalFormData.get("logo") as File | null;
              const galeriaFiles = originalFormData.getAll("galeria").filter((f): f is File => f instanceof File && f.size > 0);

              // Comprimir imagen principal si existe
              if (imagenFile && imagenFile.size > 0) {
                setCompressionProgress("Comprimiendo imagen principal...");
                const compressed = await compressImage(imagenFile, 'portada');
                originalFormData.set("imagen", compressed);
                console.log(`Imagen comprimida: ${formatFileSize(imagenFile.size)} → ${formatFileSize(compressed.size)}`);
              }

              // Comprimir logo si existe
              if (logoFile && logoFile.size > 0) {
                setCompressionProgress("Comprimiendo logo...");
                const compressed = await compressImage(logoFile, 'logo');
                originalFormData.set("logo", compressed);
                console.log(`Logo comprimido: ${formatFileSize(logoFile.size)} → ${formatFileSize(compressed.size)}`);
              }

              // Comprimir galería si existe
              if (galeriaFiles.length > 0) {
                setCompressionProgress(`Comprimiendo galería (${galeriaFiles.length} imágenes)...`);
                const compressedGaleria = await compressImages(galeriaFiles, 'galeria');

                // Remover archivos originales de galería
                originalFormData.delete("galeria");

                // Agregar archivos comprimidos
                compressedGaleria.forEach(file => {
                  originalFormData.append("galeria", file);
                });

                galeriaFiles.forEach((original, i) => {
                  console.log(`Galería [${i + 1}]: ${formatFileSize(original.size)} → ${formatFileSize(compressedGaleria[i].size)}`);
                });
              }

              setIsCompressing(false);
              setCompressionProgress("");

              // Enviar formulario con imágenes comprimidas
              start(async () => {
                try {
                  const result = await crearProyecto(originalFormData);
                  if (result.success) {
                    toast.success("Proyecto creado correctamente");
                    setIsExpanded(false);
                    form.reset();
                    router.push(`/dashboard/proyectos/${result.proyecto.id}`);
                  }
                } catch (error) {
                  console.error("Error creando proyecto:", error);
                  toast.error(error instanceof Error ? error.message : "Error al crear el proyecto");
                }
              });
            } catch (compressionError) {
              setIsCompressing(false);
              setCompressionProgress("");
              console.error("Error comprimiendo imágenes:", compressionError);
              toast.error("Error al comprimir las imágenes. Intenta con imágenes más pequeñas.");
            }
          }}
          className="mt-6 space-y-4"
        >

        {/* Primera fila: Nombre del Proyecto */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-crm-text-primary">
            Nombre del Proyecto <span className="text-red-500">*</span>
          </label>
          <input
            name="nombre"
            required
            className="w-full px-3 py-2 border border-crm-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50"
            disabled={pending}
            placeholder="Ej: Residencial Los Pinos"
          />
        </div>

        {/* Segunda fila: Tipo, Estado */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-crm-text-primary">
              Tipo de Proyecto <span className="text-red-500">*</span>
            </label>
            <select
              name="tipo"
              required
              className="w-full px-3 py-2 border border-crm-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50"
              defaultValue="propio"
              disabled={pending}
            >
              <option value="propio">Proyecto Propio</option>
              <option value="corretaje">Corretaje</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-crm-text-primary">Estado</label>
            <select
              name="estado"
              className="w-full px-3 py-2 border border-crm-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50"
              defaultValue="activo"
              disabled={pending}
            >
              <option value="activo">Activo</option>
              <option value="pausado">Pausado</option>
              <option value="cerrado">Cerrado</option>
            </select>
          </div>
        </div>

        {/* Ubicación con Ubigeo */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-crm-text-primary">
            Ubicación (Ubigeo) <span className="text-red-500">*</span>
          </label>
          <UbicacionSelector
            departamento={ubigeoData.codigoDepartamento}
            provincia={ubigeoData.codigoProvincia}
            distrito={ubigeoData.codigoDistrito}
            onUbicacionChange={handleUbicacionChange}
            className="w-full"
          />

          {/* Campos ocultos para enviar datos de ubigeo */}
          <input type="hidden" name="departamento" value={ubigeoData.departamento} />
          <input type="hidden" name="provincia" value={ubigeoData.provincia} />
          <input type="hidden" name="distrito" value={ubigeoData.distrito} />
          <input type="hidden" name="departamento_code" value={ubigeoData.codigoDepartamento} />
          <input type="hidden" name="provincia_code" value={ubigeoData.codigoProvincia} />
          <input type="hidden" name="distrito_code" value={ubigeoData.codigoDistrito} />
        </div>

        {/* Imagen del Proyecto */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-crm-text-primary">Imagen del Proyecto</label>
          <input
            type="file"
            name="imagen"
            accept="image/*"
            className="w-full px-3 py-2 border border-crm-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 file:mr-3 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-crm-primary/10 file:text-crm-primary hover:file:bg-crm-primary/20"
            disabled={pending}
          />
          <p className="text-[10px] text-crm-text-muted">
            Formatos: JPG, PNG, WEBP. Las imágenes se comprimen automáticamente.
          </p>
        </div>

        {/* Logo del Proyecto */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-crm-text-primary">Logo del Proyecto</label>
          <input
            type="file"
            name="logo"
            accept="image/png,image/jpeg,image/webp"
            className="w-full px-3 py-2 border border-crm-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 file:mr-3 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-crm-primary/10 file:text-crm-primary hover:file:bg-crm-primary/20"
            disabled={pending || isCompressing}
          />
          <p className="text-[10px] text-crm-text-muted">
            PNG recomendado. Se comprime automáticamente a 500KB.
          </p>
        </div>

        {/* Galería de Imágenes */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-crm-text-primary">Galería de imágenes adicionales</label>
          <input
            type="file"
            name="galeria"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="w-full px-3 py-2 border border-crm-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 file:mr-3 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-crm-primary/10 file:text-crm-primary hover:file:bg-crm-primary/20"
            disabled={pending || isCompressing}
          />
          <p className="text-[10px] text-crm-text-muted">
            Hasta 6 imágenes. Se comprimen automáticamente para optimizar la carga.
          </p>
        </div>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t border-crm-border">
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="px-4 py-2 text-xs font-medium text-crm-text-secondary bg-crm-card-hover hover:bg-crm-border rounded-lg transition-all"
              disabled={pending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="crm-button-primary px-6 py-2 rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              disabled={pending || isCompressing}
            >
              {isCompressing ? (
                <>
                  <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{compressionProgress || "Comprimiendo..."}</span>
                </>
              ) : pending ? (
                <>
                  <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Creando...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                  </svg>
                  <span>Agregar Proyecto</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
