// Optimizaciones de importaciones para Turbopack
// Re-exportar módulos frecuentemente usados para mejor tree-shaking

// Supabase
export { createClient } from '@supabase/supabase-js';
export { createServerClient } from '@supabase/ssr';

// React hooks optimizados
export { 
  useState, 
  useEffect, 
  useMemo, 
  useCallback, 
  useTransition,
  memo 
} from 'react';

// Next.js optimizado
export { useRouter, useSearchParams, usePathname } from 'next/navigation';
export { revalidatePath, revalidateTag } from 'next/cache';

// Toast optimizado
export { toast } from 'react-hot-toast';

// Utilidades optimizadas
export { getErrorMessage, handleError } from './errors';
export { errorLogger } from './errorLogger';
