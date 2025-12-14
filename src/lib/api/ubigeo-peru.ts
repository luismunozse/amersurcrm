// API para obtener datos de ubicaciones de Perú
// Usa datos locales del JSON

import ubigeoData from '@/lib/data/ubigeo-peru-completo.json';

interface UbigeoItem {
  codigo: string;
  nombre: string;
}

// Cache en memoria
const cache = new Map<string, { data: UbigeoItem[]; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

function getLocalData(endpoint: string, params?: string): UbigeoItem[] {
  if (endpoint === 'departamentos') {
    return ubigeoData.departamentos.map(dept => ({
      codigo: dept.codigo,
      nombre: dept.nombre
    }));
  }

  if (endpoint === 'provincias' && params) {
    const departamento = ubigeoData.departamentos.find(d => d.codigo === params);
    if (departamento) {
      return departamento.provincias.map(prov => ({
        codigo: prov.codigo,
        nombre: prov.nombre
      }));
    }
  }

  if (endpoint === 'distritos' && params) {
    const [departamentoCodigo, provinciaCodigo] = params.split('/');
    const departamento = ubigeoData.departamentos.find(d => d.codigo === departamentoCodigo);
    if (departamento) {
      const provincia = departamento.provincias.find(p => p.codigo === provinciaCodigo);
      if (provincia) {
        return provincia.distritos;
      }
    }
  }

  return [];
}

async function fetchUbigeoData(endpoint: string, params?: string): Promise<UbigeoItem[]> {
  const cacheKey = `ubigeo_${endpoint}_${params || ''}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const data = getLocalData(endpoint, params);

  cache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });

  return data;
}

export async function getDepartamentos(): Promise<UbigeoItem[]> {
  const data = await fetchUbigeoData('departamentos');
  return data;
}

export async function getProvincias(codigoDepartamento: string): Promise<UbigeoItem[]> {
  const data = await fetchUbigeoData('provincias', codigoDepartamento);
  return data;
}

export async function getDistritos(codigoDepartamento: string, codigoProvincia: string): Promise<UbigeoItem[]> {
  const data = await fetchUbigeoData('distritos', `${codigoDepartamento}/${codigoProvincia}`);
  return data;
}

// Función para limpiar cache si es necesario
export function clearCache(): void {
  cache.clear();
}

// Función para obtener estadísticas del cache
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys())
  };
}
