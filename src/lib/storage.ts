import { supabaseBrowser } from "@/lib/supabaseBrowser";

export const supabaseStorage = supabaseBrowser();

// Configuración de buckets
export const BUCKETS = {
  LOTES: 'lotes',
  RENDERS: 'renders',
  PLANOS: 'planos'
} as const;

// Función para subir archivo a Storage
export async function uploadFile(
  bucket: string,
  file: File,
  path: string
): Promise<{ data: any; error: any }> {
  const { data, error } = await supabaseStorage.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

  return { data, error };
}

// Función para obtener URL pública de un archivo
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabaseStorage.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return data.publicUrl;
}

// Función para eliminar archivo de Storage
export async function deleteFile(
  bucket: string,
  path: string
): Promise<{ data: any; error: any }> {
  const { data, error } = await supabaseStorage.storage
    .from(bucket)
    .remove([path]);

  return { data, error };
}

// Función para subir múltiples archivos
export async function uploadMultipleFiles(
  bucket: string,
  files: File[],
  basePath: string
): Promise<{ paths: string[]; urls: string[]; errors: any[] }> {
  const paths: string[] = [];
  const urls: string[] = [];
  const errors: any[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileName = `${Date.now()}-${i}-${file.name}`;
    const fullPath = `${basePath}/${fileName}`;
    
    const { data, error } = await uploadFile(bucket, file, fullPath);
    
    if (error) {
      errors.push({ file: file.name, error });
    } else {
      paths.push(fullPath);
      urls.push(getPublicUrl(bucket, fullPath));
    }
  }

  return { paths, urls, errors };
}
