'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Image as ImageIcon, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BlueprintUploaderProps {
  onFileSelect: (file: File) => void;
  isUploading: boolean;
  currentFile?: string | null;
  onDelete?: () => void;
  maxSize?: number; // en MB
  acceptedTypes?: string[];
}

const convertPdfToPng = async (pdfFile: File): Promise<File> => {
  const pdfjsLib = await import('pdfjs-dist');
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear contexto canvas');
  // pdfjs-dist v4 espera canvasContext como Object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await page.render({ canvasContext: ctx as unknown as object, viewport } as any).promise;
  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Canvas to Blob falló'));
      resolve(new File([blob], pdfFile.name.replace(/\.pdf$/i, '.png'), { type: 'image/png' }));
    }, 'image/png', 0.95);
  });
};

export default function BlueprintUploader({
  onFileSelect,
  isUploading,
  currentFile,
  onDelete,
  maxSize = 10,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
}: BlueprintUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number; type: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isConverting, setIsConverting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Limpiar intervalo al desmontar el componente
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Limpiar intervalo cuando se complete la carga
  useEffect(() => {
    if (uploadProgress >= 100 && progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, [uploadProgress]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Validar tipo de archivo
    if (!acceptedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Tipo de archivo no válido. Formatos permitidos: ${acceptedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')}`
      };
    }

    // Validar tamaño
    if (file.size > maxSize * 1024 * 1024) {
      return {
        valid: false,
        error: `El archivo es demasiado grande. Tamaño máximo: ${maxSize}MB`
      };
    }

    return { valid: true };
  };

  const startProgress = useCallback(() => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setUploadProgress(0);
    progressIntervalRef.current = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          if (progressIntervalRef.current) { clearInterval(progressIntervalRef.current); progressIntervalRef.current = null; }
          return 100;
        }
        return prev + Math.random() * 30;
      });
    }, 100);
  }, []);

  const handleFile = useCallback(async (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) { toast.error(validation.error!); return; }

    if (file.type === 'application/pdf') {
      setIsConverting(true);
      setFileInfo({ name: file.name, size: file.size, type: file.type });
      try {
        const pngFile = await convertPdfToPng(file);
        setIsConverting(false);
        setFileInfo({ name: pngFile.name, size: pngFile.size, type: pngFile.type });
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(pngFile);
        startProgress();
        onFileSelect(pngFile);
      } catch {
        setIsConverting(false);
        setFileInfo(null);
        toast.error('No se pudo convertir el PDF. Intenta con una imagen PNG o JPG.');
      }
      return;
    }

    setFileInfo({ name: file.name, size: file.size, type: file.type });
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
    startProgress();
    onFileSelect(file);
  }, [onFileSelect, maxSize, acceptedTypes, startProgress]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleDelete = () => {
    // Limpiar intervalo si existe
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    
    setPreview(null);
    setFileInfo(null);
    setUploadProgress(0);
    onDelete?.();
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <ImageIcon className="w-8 h-8 text-blue-500" />;
    } else if (type === 'application/pdf') {
      return <FileText className="w-8 h-8 text-red-500" />;
    }
    return <FileText className="w-8 h-8 text-gray-500" />;
  };

  useEffect(() => {
    if (currentFile) {
      setPreview(currentFile);
      if (!fileInfo) {
        const guessedName = currentFile.split('/').pop() || 'plano-actual';
        setFileInfo({ name: guessedName, size: 0, type: 'image/*' });
      }
    } else if (!fileInfo) {
      setPreview(null);
    }
  }, [currentFile, fileInfo]);

  return (
    <div className="w-full">
      {/* Zona de carga principal */}
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer
          ${dragActive 
            ? 'border-blue-400 bg-blue-50 scale-105' 
            : currentFile 
              ? 'border-green-400 bg-green-50' 
              : 'border-gray-300 bg-gray-50 hover:border-blue-300 hover:bg-blue-50'
          }
          ${isUploading ? 'pointer-events-none opacity-75' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
          className="hidden"
          disabled={isUploading}
        />

        {isConverting ? (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-700">Convirtiendo PDF a imagen...</h3>
              <p className="text-sm text-gray-500">Esto puede tomar unos segundos</p>
            </div>
          </div>
        ) : isUploading ? (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-700">Subiendo plano...</h3>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500">{Math.round(uploadProgress)}% completado</p>
            </div>
          </div>
        ) : currentFile ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-700 mb-2">Plano cargado exitosamente</h3>
              <p className="text-sm text-gray-600">El plano está listo para ser calibrado</p>
            </div>
            {preview && (
              <div className="mt-4">
                <img 
                  src={preview} 
                  alt="Preview del plano" 
                  className="max-w-full max-h-48 mx-auto rounded-lg shadow-md"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <Upload className="w-12 h-12 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Arrastra tu plano aquí
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                o haz clic para seleccionar un archivo
              </p>
              <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
                <span className="flex items-center">
                  <ImageIcon className="w-4 h-4 mr-1" />
                  JPG, PNG, WEBP
                </span>
                <span className="flex items-center">
                  <FileText className="w-4 h-4 mr-1" />
                  PDF
                </span>
                <span>Máx. {maxSize}MB</span>
              </div>
            </div>
          </div>
        )}

        {/* Efecto de drag activo */}
        {dragActive && (
          <div className="absolute inset-0 bg-blue-100 bg-opacity-50 rounded-xl flex items-center justify-center">
            <div className="text-blue-600 font-semibold text-lg">
              ¡Suelta el archivo aquí!
            </div>
          </div>
        )}
      </div>

      {/* Información del archivo seleccionado */}
      {fileInfo && !currentFile && (
        <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getFileIcon(fileInfo.type)}
              <div>
                <p className="font-medium text-gray-900">{fileInfo.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(fileInfo.size)}</p>
              </div>
            </div>
            <button
              onClick={handleDelete}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Botón de eliminar plano actual */}
      {currentFile && onDelete && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={handleDelete}
            className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Eliminar plano actual</span>
          </button>
        </div>
      )}

      {/* Instrucciones adicionales */}
      {!currentFile && !fileInfo && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Recomendaciones para el plano:</p>
              <ul className="space-y-1 text-xs">
                <li>• Usa imágenes de alta resolución para mejor calidad</li>
                <li>• El plano debe mostrar claramente los lotes y sus códigos</li>
                <li>• Formatos recomendados: PNG o JPG para mejor compatibilidad</li>
                <li>• Tamaño ideal: entre 1MB y 5MB</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
