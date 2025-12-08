"use client";

import { useState, useEffect } from 'react';
import { useUbigeo, Provincia, Distrito } from '@/hooks/useUbigeo';

interface UbigeoSelectorProps {
  value?: {
    departamento?: string;
    provincia?: string;
    distrito?: string;
  };
  onChange?: (ubigeo: {
    departamento?: string;
    provincia?: string;
    distrito?: string;
  }) => void;
  className?: string;
  required?: boolean;
}

export default function UbigeoSelector({ 
  value = {}, 
  onChange, 
  className = '',
  required = false 
}: UbigeoSelectorProps) {
  const { data, loading, error, getProvinciasByDepartamento, getDistritosByProvincia } = useUbigeo();
  
  const [selectedDepartamento, setSelectedDepartamento] = useState<string>(value.departamento || '');
  const [selectedProvincia, setSelectedProvincia] = useState<string>(value.provincia || '');
  const [selectedDistrito, setSelectedDistrito] = useState<string>(value.distrito || '');

  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [distritos, setDistritos] = useState<Distrito[]>([]);

  // Actualizar provincias cuando cambia el departamento
  useEffect(() => {
    if (data && selectedDepartamento) {
      const nuevasProvincias = getProvinciasByDepartamento(selectedDepartamento);
      setProvincias(nuevasProvincias);
      
      // Reset provincia y distrito si no están en la nueva lista
      if (!nuevasProvincias.find(p => p.code === selectedProvincia)) {
        setSelectedProvincia('');
        setSelectedDistrito('');
      }
    } else {
      setProvincias([]);
      setSelectedProvincia('');
      setSelectedDistrito('');
    }
  }, [data, selectedDepartamento, getProvinciasByDepartamento, selectedProvincia]);

  // Actualizar distritos cuando cambia la provincia
  useEffect(() => {
    if (data && selectedProvincia) {
      const nuevosDistritos = getDistritosByProvincia(selectedProvincia);
      setDistritos(nuevosDistritos);
      
      // Reset distrito si no está en la nueva lista
      if (!nuevosDistritos.find(d => d.code === selectedDistrito)) {
        setSelectedDistrito('');
      }
    } else {
      setDistritos([]);
      setSelectedDistrito('');
    }
  }, [data, selectedProvincia, getDistritosByProvincia, selectedDistrito]);

  // Notificar cambios al componente padre
  useEffect(() => {
    if (onChange) {
      onChange({
        departamento: selectedDepartamento || undefined,
        provincia: selectedProvincia || undefined,
        distrito: selectedDistrito || undefined,
      });
    }
  }, [selectedDepartamento, selectedProvincia, selectedDistrito, onChange]);

  const handleDepartamentoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDepartamento(e.target.value);
  };

  const handleProvinciaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProvincia(e.target.value);
  };

  const handleDistritoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDistrito(e.target.value);
  };

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="animate-pulse bg-gray-200 h-10 rounded"></div>
        <div className="animate-pulse bg-gray-200 h-10 rounded"></div>
        <div className="animate-pulse bg-gray-200 h-10 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-red-600 text-sm ${className}`}>
        Error cargando datos de ubicación: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`text-gray-500 text-sm ${className}`}>
        No se pudieron cargar los datos de ubicación
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Departamento */}
      <div>
        <label className="block text-sm font-medium text-crm-text-primary mb-2">
          Departamento {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={selectedDepartamento}
          onChange={handleDepartamentoChange}
          className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent"
          required={required}
        >
          <option value="">Seleccionar departamento</option>
          {data.departamentos.map((dept) => (
            <option key={dept.code} value={dept.code}>
              {dept.name}
            </option>
          ))}
        </select>
      </div>

      {/* Provincia */}
      <div>
        <label className="block text-sm font-medium text-crm-text-primary mb-2">
          Provincia {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={selectedProvincia}
          onChange={handleProvinciaChange}
          disabled={!selectedDepartamento || provincias.length === 0}
          className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
          required={required}
        >
          <option value="">Seleccionar provincia</option>
          {provincias.map((prov) => (
            <option key={prov.code} value={prov.code}>
              {prov.name}
            </option>
          ))}
        </select>
      </div>

      {/* Distrito */}
      <div>
        <label className="block text-sm font-medium text-crm-text-primary mb-2">
          Distrito {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={selectedDistrito}
          onChange={handleDistritoChange}
          disabled={!selectedProvincia || distritos.length === 0}
          className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
          required={required}
        >
          <option value="">Seleccionar distrito</option>
          {distritos.map((dist) => (
            <option key={dist.code} value={dist.code}>
              {dist.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
