"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Spinner } from '@/components/ui/Spinner';
import { useRouter } from "next/navigation";

interface SearchFilters {
  query: string;
  telefono: string;
  dni: string;
  estado: string;
  tipo: string;
  vendedor: string;
  estado_civil: string;
  fecha_desde: string;
  fecha_hasta: string;
  propiedades_reservadas: string;
  propiedades_compradas: string;
  origen_lead: string;
  interes_principal: string;
}

interface AdvancedClientSearchProps {
  clientes: any[];
  onFiltersChange?: (filters: SearchFilters) => void;
}

// Lee los parámetros de URL una sola vez sin suscribirse a cambios (evita re-renders innecesarios)
function getInitialParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

export default function AdvancedClientSearch({ clientes, onFiltersChange }: AdvancedClientSearchProps) {
  const router = useRouter();
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const [filters, setFilters] = useState<SearchFilters>(() => {
    const params = getInitialParams();
    return {
      query: params.get('q') || '',
      telefono: params.get('telefono') || '',
      dni: params.get('dni') || '',
      estado: params.get('estado') || '',
      tipo: params.get('tipo') || '',
      vendedor: params.get('vendedor') || '',
      estado_civil: params.get('estado_civil') || '',
      fecha_desde: params.get('fecha_desde') || '',
      fecha_hasta: params.get('fecha_hasta') || '',
      propiedades_reservadas: params.get('propiedades_reservadas') || '',
      propiedades_compradas: params.get('propiedades_compradas') || '',
      origen_lead: params.get('origen_lead') || '',
      interes_principal: params.get('interes_principal') || '',
    };
  });



  // Manejar cambios en los inputs de búsqueda
  const handleQueryChange = (value: string) => {
    setFilters(prev => ({ ...prev, query: value }));
  };

  const handleTelefonoChange = (value: string) => {
    setFilters(prev => ({ ...prev, telefono: value }));
  };

  const handleDniChange = (value: string) => {
    setFilters(prev => ({ ...prev, dni: value }));
  };

  // Aplicar filtros automáticamente cuando cambien los campos de búsqueda
  useEffect(() => {
    const hasSearchCriteria = filters.query.length >= 2 || 
                             filters.telefono.length >= 3 || 
                             filters.dni.length >= 3 ||
                             (filters.query.length === 0 && filters.telefono.length === 0 && filters.dni.length === 0);
    
    if (hasSearchCriteria) {
      setIsSearching(true);
      const timeoutId = setTimeout(() => {
        applyFilters();
        setIsSearching(false);
      }, 300); // 300ms de delay para evitar demasiadas búsquedas

      return () => {
        clearTimeout(timeoutId);
        setIsSearching(false);
      };
    }
  }, [filters.query, filters.telefono, filters.dni]);


  // Aplicar filtros
  const applyFilters = () => {
    const params = new URLSearchParams();
    
    if (filters.query) {
      params.set('q', filters.query);
    }
    if (filters.telefono) {
      params.set('telefono', filters.telefono);
    }
    if (filters.dni) {
      params.set('dni', filters.dni);
    }

    const newUrl = `/dashboard/clientes?${params.toString()}`;
    router.push(newUrl);
    onFiltersChange?.(filters);
  };

  // Limpiar filtros
  const clearFilters = () => {
    setFilters(prev => ({ 
      ...prev, 
      query: '', 
      telefono: '', 
      dni: '' 
    }));
    router.push('/dashboard/clientes');
    onFiltersChange?.({ 
      ...filters, 
      query: '', 
      telefono: '', 
      dni: '' 
    });
  };


  // Contar resultados filtrados
  const filteredCount = useMemo(() => {
    return clientes.filter(cliente => {
      const matchesQuery = !filters.query || 
        cliente.nombre?.toLowerCase().includes(filters.query.toLowerCase());
      
      const matchesTelefono = !filters.telefono || 
        cliente.telefono?.includes(filters.telefono) ||
        cliente.telefono_whatsapp?.includes(filters.telefono);
      
      const matchesDni = !filters.dni || 
        cliente.documento_identidad?.includes(filters.dni);
      
      return matchesQuery && matchesTelefono && matchesDni;
    }).length;
  }, [clientes, filters.query, filters.telefono, filters.dni]);

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda principal */}
      <div className="crm-card p-6">
        <div className="space-y-4">
          {/* Fila principal de búsqueda */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {isSearching ? (
                    <Spinner size="md" color="primary" />
                  ) : (
                    <svg className="h-5 w-5 text-crm-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                  )}
                </div>
                <input
                  ref={searchRef}
                  type="text"
                  value={filters.query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="Buscar por nombre... (búsqueda automática)"
                  className="w-full pl-10 pr-4 py-3 border border-crm-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
                />
              </div>
            </div>
            
            {(filters.query || filters.telefono || filters.dni) && (
              <button
                onClick={clearFilters}
                className="px-4 py-3 text-sm font-medium text-crm-text-secondary bg-crm-card-hover hover:bg-crm-border rounded-xl transition-colors flex items-center gap-2"
                title="Limpiar búsqueda"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
                Limpiar
              </button>
            )}
          </div>

          {/* Filtros específicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Búsqueda por teléfono */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-crm-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                </svg>
              </div>
              <input
                type="text"
                value={filters.telefono}
                onChange={(e) => handleTelefonoChange(e.target.value)}
                placeholder="Buscar por teléfono..."
                className="w-full pl-10 pr-4 py-3 border border-crm-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
              />
            </div>

            {/* Búsqueda por DNI */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-crm-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/>
                </svg>
              </div>
              <input
                type="text"
                value={filters.dni}
                onChange={(e) => handleDniChange(e.target.value)}
                placeholder="Buscar por DNI..."
                className="w-full pl-10 pr-4 py-3 border border-crm-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
              />
            </div>
          </div>
        </div>

        {/* Resumen de resultados */}
        {filteredCount !== clientes.length && (
          <div className="mt-4 p-3 bg-crm-primary/5 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-crm-text-primary">
                Mostrando <span className="font-semibold">{filteredCount}</span> de <span className="font-semibold">{clientes.length}</span> clientes
              </span>
              <button
                onClick={clearFilters}
                className="text-sm text-crm-primary hover:text-crm-primary/80 font-medium"
              >
                Ver todos
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
