/**
 * Utilidad para comprimir imágenes en el cliente antes de subirlas
 */
import imageCompression from 'browser-image-compression';

/**
 * Opciones de compresión por tipo de imagen
 */
const COMPRESSION_OPTIONS = {
  portada: {
    maxSizeMB: 1.5,          // Máximo 1.5MB para portadas
    maxWidthOrHeight: 1920,  // Full HD
    useWebWorker: true,
    fileType: 'image/webp',  // Convertir a WebP (mejor compresión)
  },
  logo: {
    maxSizeMB: 0.5,          // Máximo 500KB para logos
    maxWidthOrHeight: 800,   // Logos más pequeños
    useWebWorker: true,
    fileType: 'image/webp',
  },
  galeria: {
    maxSizeMB: 1,            // Máximo 1MB para galería
    maxWidthOrHeight: 1600,  // Buena calidad pero comprimida
    useWebWorker: true,
    fileType: 'image/webp',
  },
};

type ImageType = keyof typeof COMPRESSION_OPTIONS;

/**
 * Comprime una imagen según el tipo especificado
 */
export async function compressImage(
  file: File,
  type: ImageType = 'galeria',
  onProgress?: (progress: number) => void
): Promise<File> {
  try {
    const options = COMPRESSION_OPTIONS[type];

    // Si la imagen ya es pequeña, no comprimir
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB < options.maxSizeMB * 0.8) {
      console.log(`Imagen ${file.name} ya es pequeña (${fileSizeMB.toFixed(2)}MB), no se comprime`);
      return file;
    }

    console.log(`Comprimiendo ${file.name} (${fileSizeMB.toFixed(2)}MB)...`);

    const compressedFile = await imageCompression(file, {
      ...options,
      onProgress: onProgress ? (p) => onProgress(p) : undefined,
    });

    const compressedSizeMB = compressedFile.size / (1024 * 1024);
    const reduction = ((file.size - compressedFile.size) / file.size * 100).toFixed(1);

    console.log(`✓ Comprimido: ${compressedSizeMB.toFixed(2)}MB (reducción: ${reduction}%)`);

    return compressedFile;
  } catch (error) {
    console.error('Error comprimiendo imagen:', error);
    // Si falla la compresión, devolver archivo original
    return file;
  }
}

/**
 * Comprime múltiples imágenes en paralelo
 */
export async function compressImages(
  files: File[],
  type: ImageType = 'galeria',
  onProgress?: (fileIndex: number, progress: number) => void
): Promise<File[]> {
  const compressionPromises = files.map((file, index) =>
    compressImage(file, type, onProgress ? (p) => onProgress(index, p) : undefined)
  );

  return Promise.all(compressionPromises);
}

/**
 * Estima el tamaño final después de la compresión
 */
export function estimateCompressedSize(fileSizeMB: number, type: ImageType): number {
  const target = COMPRESSION_OPTIONS[type].maxSizeMB;
  return Math.min(fileSizeMB, target);
}

/**
 * Valida si un archivo es una imagen válida
 */
export function isValidImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  return validTypes.includes(file.type);
}

/**
 * Formatea el tamaño de archivo para mostrar
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
