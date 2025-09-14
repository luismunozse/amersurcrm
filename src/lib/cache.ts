import { cache } from 'react';
import { createOptimizedServerClient } from './supabaseOptimized';

// Cache para clientes
export const getCachedClientes = cache(async (searchTerm?: string) => {
  const supabase = await createOptimizedServerClient();
  
  let query = supabase
    .from('cliente')
    .select('id,nombre,email,telefono,created_at')
    .order('created_at', { ascending: false });

  if (searchTerm) {
    query = query.or(`nombre.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
  }

  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
});

// Cache para proyectos
export const getCachedProyectos = cache(async () => {
  const supabase = await createOptimizedServerClient();
  
  const { data, error } = await supabase
    .from('proyecto')
    .select('id,nombre,estado,ubicacion,created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
});

// Cache para lotes de un proyecto
export const getCachedLotes = cache(async (proyectoId: string) => {
  const supabase = await createOptimizedServerClient();
  
  const { data, error } = await supabase
    .from('lote')
    .select('id,codigo,sup_m2,precio,moneda,estado')
    .eq('proyecto_id', proyectoId)
    .order('codigo');

  if (error) throw error;
  return data || [];
});

// Cache para un proyecto específico
export const getCachedProyecto = cache(async (proyectoId: string) => {
  const supabase = await createOptimizedServerClient();
  
  const { data, error } = await supabase
    .from('proyecto')
    .select('id,nombre,estado,ubicacion,created_at')
    .eq('id', proyectoId)
    .single();

  if (error) throw error;
  return data;
});

// Función para invalidar caché (opcional)
export function invalidateCache() {
  // En Next.js 15, el caché se invalida automáticamente con revalidatePath
  // Esta función es para casos específicos
}
