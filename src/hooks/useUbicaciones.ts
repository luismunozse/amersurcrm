import { useState, useEffect, useCallback } from 'react';

interface Departamento {
  codigo: string;
  nombre: string;
}

interface Provincia {
  codigo: string;
  nombre: string;
  distritos: Distrito[];
}

interface Distrito {
  codigo: string;
  nombre: string;
}

export interface UbicacionSeleccionada {
  departamento: string;
  provincia: string;
  distrito: string;
  codigoDepartamento: string;
  codigoProvincia: string;
  codigoDistrito: string;
}

export function useUbicaciones() {
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [distritos, setDistritos] = useState<Distrito[]>([]);
  const [loading, setLoading] = useState(false);

  // Cargar departamentos al inicializar
  useEffect(() => {
    setLoading(true);
    fetch('/api/ubicaciones')
      .then(response => response.json())
      .then(data => {
        setDepartamentos(data.departamentos || []);
      })
      .catch(error => {
        console.error('Error cargando departamentos:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Función para cargar provincias cuando se selecciona un departamento
  const cargarProvincias = useCallback((codigoDepartamento: string) => {
    if (!codigoDepartamento) {
      setProvincias([]);
      setDistritos([]);
      return;
    }

    setLoading(true);
    fetch(`/api/ubicaciones?departamento=${codigoDepartamento}`)
      .then(response => response.json())
      .then(data => {
        setProvincias(data.provincias || []);
        setDistritos([]); // Limpiar distritos cuando cambia la provincia
      })
      .catch(error => {
        console.error('Error cargando provincias:', error);
        setProvincias([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Función para cargar distritos cuando se selecciona una provincia
  const cargarDistritos = useCallback((codigoDepartamento: string, codigoProvincia: string) => {
    if (!codigoDepartamento || !codigoProvincia) {
      setDistritos([]);
      return;
    }

    setLoading(true);
    fetch(`/api/ubicaciones?departamento=${codigoDepartamento}&provincia=${codigoProvincia}`)
      .then(response => response.json())
      .then(data => {
        setDistritos(data.distritos || []);
      })
      .catch(error => {
        console.error('Error cargando distritos:', error);
        setDistritos([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Función para obtener ubicación completa
  const getUbicacionCompleta = (codigoDepartamento: string, codigoProvincia: string, codigoDistrito: string): UbicacionSeleccionada | null => {
    try {
      const departamento = departamentos.find(d => d.codigo === codigoDepartamento);
      const provincia = provincias.find(p => p.codigo === codigoProvincia);
      const distrito = distritos.find(d => d.codigo === codigoDistrito);

      if (!departamento || !provincia || !distrito) return null;

      return {
        departamento: departamento.nombre,
        provincia: provincia.nombre,
        distrito: distrito.nombre,
        codigoDepartamento,
        codigoProvincia,
        codigoDistrito
      };
    } catch (error) {
      console.error('Error obteniendo ubicación completa:', error);
      return null;
    }
  };

  return {
    departamentos,
    provincias,
    distritos,
    loading,
    cargarProvincias,
    cargarDistritos,
    getUbicacionCompleta
  };
}
