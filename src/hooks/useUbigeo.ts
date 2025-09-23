import { useState, useEffect } from 'react';

export interface Departamento {
  code: string;
  name: string;
}

export interface Provincia {
  code: string;
  name: string;
  departamento_code: string;
}

export interface Distrito {
  code: string;
  name: string;
  provincia_code: string;
  departamento_code: string;
}

export interface UbigeoData {
  departamentos: Departamento[];
  provincias: Provincia[];
  distritos: Distrito[];
}

export function useUbigeo() {
  const [data, setData] = useState<UbigeoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUbigeoData = async () => {
      try {
        setLoading(true);
        console.log('Cargando datos de ubigeo...');
        
        // Cargar departamentos
        const departamentosResponse = await fetch('/api/ubigeo/departamentos');
        if (!departamentosResponse.ok) {
          throw new Error(`Error cargando departamentos: ${departamentosResponse.status}`);
        }
        const departamentos: Departamento[] = await departamentosResponse.json();
        console.log('Departamentos cargados:', departamentos.length);
        
        // Cargar provincias
        const provinciasResponse = await fetch('/api/ubigeo/provincias');
        if (!provinciasResponse.ok) {
          throw new Error(`Error cargando provincias: ${provinciasResponse.status}`);
        }
        const provincias: Provincia[] = await provinciasResponse.json();
        console.log('Provincias cargadas:', provincias.length);
        
        // Cargar distritos
        const distritosResponse = await fetch('/api/ubigeo/distritos');
        if (!distritosResponse.ok) {
          throw new Error(`Error cargando distritos: ${distritosResponse.status}`);
        }
        const distritos: Distrito[] = await distritosResponse.json();
        console.log('Distritos cargados:', distritos.length);
        
        const ubigeoData = {
          departamentos,
          provincias,
          distritos
        };
        
        console.log('Datos de ubigeo completos:', ubigeoData);
        setData(ubigeoData);
        
        setError(null);
      } catch (err) {
        console.error('Error cargando datos de ubigeo:', err);
        setError(err instanceof Error ? err.message : 'Error cargando datos de ubigeo');
      } finally {
        setLoading(false);
      }
    };

    loadUbigeoData();
  }, []);

  const getProvinciasByDepartamento = (departamentoCode: string): Provincia[] => {
    if (!data) return [];
    return data.provincias.filter(p => p.departamento_code === departamentoCode);
  };

  const getDistritosByProvincia = (provinciaCode: string): Distrito[] => {
    if (!data) return [];
    return data.distritos.filter(d => d.provincia_code === provinciaCode);
  };

  const getDistritosByDepartamento = (departamentoCode: string): Distrito[] => {
    if (!data) return [];
    return data.distritos.filter(d => d.departamento_code === departamentoCode);
  };

  const findUbigeoByCodes = (departamentoCode: string, provinciaCode?: string, distritoCode?: string) => {
    if (!data) return null;
    
    const departamento = data.departamentos.find(d => d.code === departamentoCode);
    if (!departamento) return null;
    
    const result: any = { departamento };
    
    if (provinciaCode) {
      const provincia = data.provincias.find(p => p.code === provinciaCode && p.departamento_code === departamentoCode);
      if (provincia) {
        result.provincia = provincia;
        
        if (distritoCode) {
          const distrito = data.distritos.find(d => d.code === distritoCode && d.provincia_code === provinciaCode);
          if (distrito) {
            result.distrito = distrito;
          }
        }
      }
    }
    
    return result;
  };

  return {
    data,
    loading,
    error,
    getProvinciasByDepartamento,
    getDistritosByProvincia,
    getDistritosByDepartamento,
    findUbigeoByCodes
  };
}