"use client";
import { useTransition, useState, useCallback } from "react";
import { crearProyecto } from "./_actions";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import toast from "react-hot-toast";
import { Spinner } from "@/components/ui/Spinner";
import { useRouter } from "next/navigation";
import UbicacionSelector from "@/components/UbicacionSelector";
import { compressImage, compressImages, formatFileSize } from "@/lib/imageCompression";
import { Plus, Minus, ChevronDown, Image as PhotoIcon, X } from "lucide-react";
import { createClient } from "@/lib/supabase.client";
import {
  uploadProyectoAsset,
  removeProyectoAssets,
} from "@/lib/storage/proyectoUpload.client";

const MAX_GALERIA_ITEMS_NEW = 6;
const ALLOWED_IMAGE_TYPES_NEW = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES_NEW = 5 * 1024 * 1024;

type PendingGalleryEntry = { id: string; file: File; preview: string };

export default function NewProyectoForm() {
  const [pending, start] = useTransition();
  const { isAdmin: _isAdmin, loading, canCreateProjects } = useAdminPermissions();
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState<string>("");
  const [galleryEntries, setGalleryEntries] = useState<PendingGalleryEntry[]>([]);
  const [galleryDragOver, setGalleryDragOver] = useState(false);

  const galleryLimitReached = galleryEntries.length >= MAX_GALERIA_ITEMS_NEW;

  const clearGalleryEntries = useCallback(() => {
    setGalleryEntries((prev) => {
      prev.forEach((e) => URL.revokeObjectURL(e.preview));
      return [];
    });
  }, []);

  const addGalleryFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      const remaining = MAX_GALERIA_ITEMS_NEW - galleryEntries.length;
      if (remaining <= 0) {
        toast.error(`La galería ya tiene ${MAX_GALERIA_ITEMS_NEW} imágenes.`);
        return;
      }
      if (files.length > remaining) {
        toast(`Solo se agregaron ${remaining} de ${files.length} imágenes (límite ${MAX_GALERIA_ITEMS_NEW}).`);
      }
      const next: PendingGalleryEntry[] = [];
      for (const file of files.slice(0, remaining)) {
        if (!ALLOWED_IMAGE_TYPES_NEW.has(file.type)) {
          toast.error(`${file.name}: formato no permitido`);
          continue;
        }
        if (file.size > MAX_IMAGE_BYTES_NEW) {
          toast.error(`${file.name}: supera 5MB`);
          continue;
        }
        next.push({
          id: `gn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          preview: URL.createObjectURL(file),
        });
      }
      if (next.length === 0) return;
      setGalleryEntries((prev) => [...prev, ...next]);
    },
    [galleryEntries.length],
  );

  const removeGalleryEntry = (id: string) => {
    setGalleryEntries((prev) => {
      const next = prev.filter((e) => {
        if (e.id !== id) return true;
        URL.revokeObjectURL(e.preview);
        return false;
      });
      return next;
    });
  };

  // Imagen principal + logo
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [imagenDragOver, setImagenDragOver] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoDragOver, setLogoDragOver] = useState(false);

  const setImagen = (file: File | null) => {
    setImagenFile((prev) => {
      if (prev && imagenPreview) URL.revokeObjectURL(imagenPreview);
      return file;
    });
    if (file) {
      if (!ALLOWED_IMAGE_TYPES_NEW.has(file.type)) {
        toast.error(`${file.name}: formato no permitido`);
        return;
      }
      if (file.size > MAX_IMAGE_BYTES_NEW) {
        toast.error(`${file.name}: supera 5MB`);
        return;
      }
      setImagenPreview(URL.createObjectURL(file));
    } else {
      setImagenPreview(null);
    }
  };

  const setLogo = (file: File | null) => {
    setLogoFile((prev) => {
      if (prev && logoPreview) URL.revokeObjectURL(logoPreview);
      return file;
    });
    if (file) {
      if (!ALLOWED_IMAGE_TYPES_NEW.has(file.type)) {
        toast.error(`${file.name}: formato no permitido`);
        return;
      }
      if (file.size > MAX_IMAGE_BYTES_NEW) {
        toast.error(`${file.name}: supera 5MB`);
        return;
      }
      setLogoPreview(URL.createObjectURL(file));
    } else {
      setLogoPreview(null);
    }
  };

  // Estado para ubigeo
  const [ubigeoData, setUbigeoData] = useState({
    departamento: "",
    provincia: "",
    distrito: "",
    codigoDepartamento: "",
    codigoProvincia: "",
    codigoDistrito: "",
  });

  // Estado para coordenadas GPS
  const [coordenadas, setCoordenadas] = useState({
    latitud: "",
    longitud: "",
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

  if (!canCreateProjects) {
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
            {isExpanded ? (
              <Minus className="w-5 h-5 text-white transition-transform duration-200" />
            ) : (
              <Plus className="w-5 h-5 text-white transition-transform duration-200" />
            )}
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
        <ChevronDown
          className={`w-5 h-5 text-crm-text-muted group-hover:text-crm-primary transition-all duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {isExpanded && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const originalFormData = new FormData(form);

            const supabase = createClient();
            const proyectoId = crypto.randomUUID();
            const uploadedPaths: string[] = [];

            try {
              setIsCompressing(true);

              // imagenFile y logoFile vienen del estado controlled (dropzones)
              const galeriaFiles = galleryEntries.map((e) => e.file);

              let imagenComprimida: File | null = null;
              let logoComprimido: File | null = null;
              let galeriaComprimida: File[] = [];

              if (imagenFile && imagenFile.size > 0) {
                setCompressionProgress("Comprimiendo imagen principal...");
                imagenComprimida = await compressImage(imagenFile, "portada");
                console.log(
                  `Imagen comprimida: ${formatFileSize(imagenFile.size)} → ${formatFileSize(imagenComprimida.size)}`,
                );
              }

              if (logoFile && logoFile.size > 0) {
                setCompressionProgress("Comprimiendo logo...");
                logoComprimido = await compressImage(logoFile, "logo");
                console.log(
                  `Logo comprimido: ${formatFileSize(logoFile.size)} → ${formatFileSize(logoComprimido.size)}`,
                );
              }

              if (galeriaFiles.length > 0) {
                setCompressionProgress(
                  `Comprimiendo galería (${galeriaFiles.length} imágenes)...`,
                );
                galeriaComprimida = await compressImages(galeriaFiles, "galeria");
              }

              setIsCompressing(false);
              setCompressionProgress("Subiendo archivos...");

              let imagenUpload: { publicUrl: string; path: string } | null = null;
              let logoUpload: { publicUrl: string; path: string } | null = null;
              const galeriaUploads: Array<{ url: string; path: string; nombre: string }> = [];

              if (imagenComprimida) {
                const r = await uploadProyectoAsset(supabase, proyectoId, imagenComprimida, "portada");
                uploadedPaths.push(r.path);
                imagenUpload = { publicUrl: r.publicUrl, path: r.path };
              }
              if (logoComprimido) {
                const r = await uploadProyectoAsset(supabase, proyectoId, logoComprimido, "logo");
                uploadedPaths.push(r.path);
                logoUpload = { publicUrl: r.publicUrl, path: r.path };
              }
              for (const file of galeriaComprimida) {
                const r = await uploadProyectoAsset(supabase, proyectoId, file, "galeria");
                uploadedPaths.push(r.path);
                galeriaUploads.push({ url: r.publicUrl, path: r.path, nombre: r.nombre });
              }

              setCompressionProgress("");

              originalFormData.delete("imagen");
              originalFormData.delete("logo");
              originalFormData.delete("galeria");
              originalFormData.append("proyecto_id", proyectoId);
              if (imagenUpload) {
                originalFormData.append("imagen_url", imagenUpload.publicUrl);
                originalFormData.append("imagen_path", imagenUpload.path);
              }
              if (logoUpload) {
                originalFormData.append("logo_url", logoUpload.publicUrl);
                originalFormData.append("logo_path", logoUpload.path);
              }
              if (galeriaUploads.length > 0) {
                originalFormData.append("galeria_new", JSON.stringify(galeriaUploads));
              }

              start(async () => {
                try {
                  const result = await crearProyecto(originalFormData);
                  if (result.success) {
                    toast.success("Proyecto creado correctamente");
                    setIsExpanded(false);
                    form.reset();
                    clearGalleryEntries();
                    setImagen(null);
                    setLogo(null);
                    router.push(`/dashboard/proyectos/${result.proyecto.id}`);
                  }
                } catch (error) {
                  console.error("Error creando proyecto:", error);
                  toast.error(error instanceof Error ? error.message : "Error al crear el proyecto");
                  if (uploadedPaths.length > 0) {
                    await removeProyectoAssets(supabase, uploadedPaths);
                  }
                }
              });
            } catch (preError) {
              setIsCompressing(false);
              setCompressionProgress("");
              console.error("Error preparando archivos:", preError);
              toast.error(
                preError instanceof Error
                  ? preError.message
                  : "Error preparando archivos. Intenta con imágenes más pequeñas.",
              );
              if (uploadedPaths.length > 0) {
                await removeProyectoAssets(supabase, uploadedPaths);
              }
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

        {/* Coordenadas GPS del Proyecto */}
        <div className="space-y-2 bg-crm-card-hover p-3 rounded-lg border border-crm-border">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-crm-text-primary">
              📍 Coordenadas del Proyecto (Opcional)
            </label>
            <a
              href="https://www.google.com/maps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-crm-primary hover:underline"
            >
              Buscar en Google Maps →
            </a>
          </div>
          <p className="text-[10px] text-crm-text-muted mb-2">
            Ingresa las coordenadas para que el mapa se centre automáticamente al entrar al proyecto.
            En Google Maps, haz clic derecho en el mapa y copia las coordenadas.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-medium text-crm-text-secondary mb-1">
                Latitud (Ej: -11.498265)
              </label>
              <input
                type="number"
                step="any"
                name="latitud"
                value={coordenadas.latitud}
                onChange={(e) => setCoordenadas({ ...coordenadas, latitud: e.target.value })}
                placeholder="-12.0464"
                className="w-full px-3 py-2 border border-crm-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50"
                disabled={pending}
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-crm-text-secondary mb-1">
                Longitud (Ej: -77.226632)
              </label>
              <input
                type="number"
                step="any"
                name="longitud"
                value={coordenadas.longitud}
                onChange={(e) => setCoordenadas({ ...coordenadas, longitud: e.target.value })}
                placeholder="-77.0428"
                className="w-full px-3 py-2 border border-crm-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50"
                disabled={pending}
              />
            </div>
          </div>
        </div>

        {/* Imagen del Proyecto */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-crm-text-primary">Imagen del Proyecto</label>
          {imagenPreview && (
            <div className="relative inline-block">
              <img
                src={imagenPreview}
                alt="Preview imagen principal"
                className="w-32 h-32 object-cover rounded-lg border border-crm-border"
              />
              <button
                type="button"
                onClick={() => setImagen(null)}
                disabled={pending || isCompressing}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                title="Quitar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {!imagenPreview && (
            <label
              htmlFor="imagen-portada"
              tabIndex={pending || isCompressing ? -1 : 0}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setImagenDragOver(false);
                if (pending || isCompressing) return;
                const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/"));
                if (file) setImagen(file);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (pending || isCompressing) return;
                if (!imagenDragOver) setImagenDragOver(true);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (pending || isCompressing) return;
                if (!imagenDragOver) setImagenDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setImagenDragOver(false);
              }}
              onPaste={(e) => {
                if (pending || isCompressing) return;
                const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"));
                if (!file) return;
                e.preventDefault();
                setImagen(file);
              }}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-5 border-2 border-dashed rounded-lg text-center transition-colors ${
                pending || isCompressing
                  ? "opacity-50 cursor-not-allowed border-crm-border"
                  : imagenDragOver
                    ? "border-crm-primary bg-crm-primary/10 cursor-copy"
                    : "border-crm-border cursor-pointer hover:border-crm-primary/60 hover:bg-crm-card-hover/50"
              }`}
            >
              <PhotoIcon className={`w-6 h-6 ${imagenDragOver ? "text-crm-primary" : "text-crm-text-muted"}`} />
              <p className="text-xs font-medium text-crm-text-primary">
                {imagenDragOver ? "Suelte para usar" : "Arrastre o haga clic para seleccionar"}
              </p>
              <p className="text-[10px] text-crm-text-muted">JPG/PNG/WEBP · máx 5MB · Ctrl+V</p>
              <input
                type="file"
                id="imagen-portada"
                accept="image/jpeg,image/png,image/webp"
                disabled={pending || isCompressing}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setImagen(f);
                  e.target.value = "";
                }}
                className="hidden"
              />
            </label>
          )}
          <p className="text-[10px] text-crm-text-muted">
            Se comprime automáticamente al guardar.
          </p>
        </div>

        {/* Logo del Proyecto */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-crm-text-primary">Logo del Proyecto</label>
          {logoPreview && (
            <div className="relative inline-block">
              <img
                src={logoPreview}
                alt="Preview logo"
                className="w-28 h-28 object-contain rounded-lg border border-crm-border bg-white"
              />
              <button
                type="button"
                onClick={() => setLogo(null)}
                disabled={pending || isCompressing}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                title="Quitar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {!logoPreview && (
            <label
              htmlFor="logo-proyecto"
              tabIndex={pending || isCompressing ? -1 : 0}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setLogoDragOver(false);
                if (pending || isCompressing) return;
                const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/"));
                if (file) setLogo(file);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (pending || isCompressing) return;
                if (!logoDragOver) setLogoDragOver(true);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (pending || isCompressing) return;
                if (!logoDragOver) setLogoDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setLogoDragOver(false);
              }}
              onPaste={(e) => {
                if (pending || isCompressing) return;
                const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"));
                if (!file) return;
                e.preventDefault();
                setLogo(file);
              }}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-5 border-2 border-dashed rounded-lg text-center transition-colors ${
                pending || isCompressing
                  ? "opacity-50 cursor-not-allowed border-crm-border"
                  : logoDragOver
                    ? "border-crm-primary bg-crm-primary/10 cursor-copy"
                    : "border-crm-border cursor-pointer hover:border-crm-primary/60 hover:bg-crm-card-hover/50"
              }`}
            >
              <PhotoIcon className={`w-6 h-6 ${logoDragOver ? "text-crm-primary" : "text-crm-text-muted"}`} />
              <p className="text-xs font-medium text-crm-text-primary">
                {logoDragOver ? "Suelte para usar" : "Arrastre o haga clic para seleccionar"}
              </p>
              <p className="text-[10px] text-crm-text-muted">PNG transparente recomendado · máx 5MB</p>
              <input
                type="file"
                id="logo-proyecto"
                accept="image/png,image/jpeg,image/webp"
                disabled={pending || isCompressing}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setLogo(f);
                  e.target.value = "";
                }}
                className="hidden"
              />
            </label>
          )}
          <p className="text-[10px] text-crm-text-muted">
            Se comprime automáticamente al guardar.
          </p>
        </div>

        {/* Galería de Imágenes */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-crm-text-primary">
              Galería de imágenes adicionales ({galleryEntries.length}/{MAX_GALERIA_ITEMS_NEW})
            </label>
            <span className="text-[10px] text-crm-text-muted">
              {Math.max(0, MAX_GALERIA_ITEMS_NEW - galleryEntries.length)} espacios disponibles
            </span>
          </div>

          {galleryEntries.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {galleryEntries.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="relative aspect-square rounded-lg overflow-hidden border border-dashed border-crm-border"
                >
                  <img
                    src={entry.preview}
                    alt={`Nueva ${idx + 1}`}
                    className="h-full w-full object-cover opacity-90"
                  />
                  <button
                    type="button"
                    onClick={() => removeGalleryEntry(entry.id)}
                    disabled={pending || isCompressing}
                    className="absolute top-1 right-1 p-0.5 bg-black/60 text-white rounded-full hover:bg-black/80"
                    title="Quitar"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <span className="absolute bottom-0.5 left-0.5 text-[9px] font-semibold px-1 py-px bg-white/80 rounded text-gray-700">
                    #{idx + 1}
                  </span>
                </div>
              ))}
            </div>
          )}

          <label
            htmlFor="galeria-new"
            tabIndex={pending || isCompressing || galleryLimitReached ? -1 : 0}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setGalleryDragOver(false);
              if (pending || isCompressing || galleryLimitReached) return;
              const files = Array.from(e.dataTransfer.files).filter((f) =>
                f.type.startsWith("image/"),
              );
              addGalleryFiles(files);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (pending || isCompressing || galleryLimitReached) return;
              if (!galleryDragOver) setGalleryDragOver(true);
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (pending || isCompressing || galleryLimitReached) return;
              if (!galleryDragOver) setGalleryDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setGalleryDragOver(false);
            }}
            onPaste={(e) => {
              if (pending || isCompressing || galleryLimitReached) return;
              const files = Array.from(e.clipboardData.files).filter((f) =>
                f.type.startsWith("image/"),
              );
              if (files.length === 0) return;
              e.preventDefault();
              addGalleryFiles(files);
            }}
            className={`flex flex-col items-center justify-center gap-1 px-4 py-5 border-2 border-dashed rounded-lg text-center transition-colors ${
              pending || isCompressing || galleryLimitReached
                ? "opacity-50 cursor-not-allowed border-crm-border"
                : galleryDragOver
                  ? "border-crm-primary bg-crm-primary/10 cursor-copy"
                  : "border-crm-border cursor-pointer hover:border-crm-primary/60 hover:bg-crm-card-hover/50"
            }`}
          >
            <PhotoIcon
              className={`w-6 h-6 ${galleryDragOver ? "text-crm-primary" : "text-crm-text-muted"}`}
            />
            <p className="text-xs font-medium text-crm-text-primary">
              {galleryDragOver
                ? "Suelte para agregar"
                : "Arrastre imágenes aquí o haga clic para seleccionar"}
            </p>
            <p className="text-[10px] text-crm-text-muted">
              Hasta {MAX_GALERIA_ITEMS_NEW} · 5MB c/u · También Ctrl+V para pegar
            </p>
            <input
              type="file"
              id="galeria-new"
              accept="image/png,image/jpeg,image/webp"
              multiple
              disabled={pending || isCompressing || galleryLimitReached}
              onChange={(e) => {
                addGalleryFiles(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
              className="hidden"
            />
          </label>
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
                  <Spinner size="xs" color="white" />
                  <span>{compressionProgress || "Comprimiendo..."}</span>
                </>
              ) : pending ? (
                <>
                  <Spinner size="xs" color="white" />
                  <span>Creando...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
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
