"use client";

import { useState, useEffect } from 'react';
import { useUbigeo } from '@/hooks/useUbigeo';

interface UbicacionSelectorProps {
  onUbicacionChange?: (ubicacion: {
    departamento: string;
    provincia: string;
    distrito: string;
    codigoDepartamento: string;
    codigoProvincia: string;
    codigoDistrito: string;
  }) => void;
  valoresIniciales?: {
    departamento?: string;
    provincia?: string;
    distrito?: string;
  };
  disabled?: boolean;
  className?: string;
}

export default function UbicacionSelector({
  onUbicacionChange,
  valoresIniciales,
  disabled = false,
  className = ""
}: UbicacionSelectorProps) {
  const { deps, provs, dists, loading, loadProvs, loadDists } = useUbigeo();
  
  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState(valoresIniciales?.departamento || '');
  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState(valoresIniciales?.provincia || '');
  const [distritoSeleccionado, setDistritoSeleccionado] = useState(valoresIniciales?.distrito || '');

  // Efecto para cargar provincias cuando cambia el departamento
  useEffect(() => {
    if (departamentoSeleccionado) {
      loadProvs(departamentoSeleccionado);
      setProvinciaSeleccionada(''); // Reset provincia
      setDistritoSeleccionado(''); // Reset distrito
    }
  }, [departamentoSeleccionado, loadProvs]);

  // Efecto para cargar distritos cuando cambia la provincia
  useEffect(() => {
    if (provinciaSeleccionada) {
      loadDists(provinciaSeleccionada);
      setDistritoSeleccionado(''); // Reset distrito
    }
  }, [provinciaSeleccionada, loadDists]);

  // Efecto para notificar cambios
  useEffect(() => {
    if (onUbicacionChange && departamentoSeleccionado && provinciaSeleccionada && distritoSeleccionado) {
      const ubicacion = {
        departamento: deps.find(d => d.code === departamentoSeleccionado)?.nombre || '',
        provincia: provs.find(p => p.code === provinciaSeleccionada)?.nombre || '',
        distrito: dists.find(d => d.code === distritoSeleccionado)?.nombre || '',
        codigoDepartamento: departamentoSeleccionado,
        codigoProvincia: provinciaSeleccionada,
        codigoDistrito: distritoSeleccionado
      };
      onUbicacionChange(ubicacion);
    }
  }, [departamentoSeleccionado, provinciaSeleccionada, distritoSeleccionado, deps, provs, dists]);

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`}>
      {/* Departamento */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-crm-text-primary">
          Departamento <span className="text-red-500">*</span>
        </label>
            <select
              value={departamentoSeleccionado}
              onChange={(e) => setDepartamentoSeleccionado(e.target.value)}
              disabled={disabled || loading}
              className="w-full px-4 py-3 border border-crm-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 transition-all"
            >
              <option value="">Seleccionar departamento</option>
              {deps.map((departamento) => (
                <option key={departamento.code} value={departamento.code}>
                  {departamento.nombre}
                </option>
              ))}
            </select>
      </div>

      {/* Provincia */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-crm-text-primary">
          Provincia <span className="text-red-500">*</span>
        </label>
            <select
              value={provinciaSeleccionada}
              onChange={(e) => setProvinciaSeleccionada(e.target.value)}
              disabled={disabled || loading || !departamentoSeleccionado}
              className="w-full px-4 py-3 border border-crm-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 transition-all"
            >
              <option value="">Seleccionar provincia</option>
              {provs.map((provincia) => (
                <option key={provincia.code} value={provincia.code}>
                  {provincia.nombre}
                </option>
              ))}
            </select>
      </div>

      {/* Distrito */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-crm-text-primary">
          Distrito <span className="text-red-500">*</span>
        </label>
            <select
              value={distritoSeleccionado}
              onChange={(e) => setDistritoSeleccionado(e.target.value)}
              disabled={disabled || loading || !provinciaSeleccionada}
              className="w-full px-4 py-3 border border-crm-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 transition-all"
            >
              <option value="">Seleccionar distrito</option>
              {dists.map((distrito) => (
                <option key={distrito.code} value={distrito.code}>
                  {distrito.nombre}
                </option>
              ))}
            </select>
      </div>
    </div>
  );
}
