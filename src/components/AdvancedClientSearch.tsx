"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface SearchFilters {
  query: string;
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

export default function AdvancedClientSearch({ clientes, onFiltersChange }: AdvancedClientSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const [filters, setFilters] = useState<SearchFilters>({
    query: searchParams.get('q') || '',
    estado: searchParams.get('estado') || '',
    tipo: searchParams.get('tipo') || '',
    vendedor: searchParams.get('vendedor') || '',
    estado_civil: searchParams.get('estado_civil') || '',
    fecha_desde: searchParams.get('fecha_desde') || '',
    fecha_hasta: searchParams.get('fecha_hasta') || '',
    propiedades_reservadas: searchParams.get('propiedades_reservadas') || '',
    propiedades_compradas: searchParams.get('propiedades_compradas') || '',
    origen_lead: searchParams.get('origen_lead') || '',
    interes_principal: searchParams.get('interes_principal') || '',
  });



  // Manejar cambios en el input de búsqueda
  const handleQueryChange = (value: string) => {
    setFilters(prev => ({ ...prev, query: value }));
  };

  // Aplicar filtros automáticamente cuando cambie la query
  useEffect(() => {
    if (filters.query.length >= 2 || filters.query.length === 0) {
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
  }, [filters.query]);


  // Aplicar filtros (solo query)
  const applyFilters = () => {
    const params = new URLSearchParams();
    
    if (filters.query) {
      params.set('q', filters.query);
    }

    const newUrl = `/dashboard/clientes?${params.toString()}`;
    router.push(newUrl);
    onFiltersChange?.(filters);
  };

  // Limpiar filtros
  const clearFilters = () => {
    setFilters(prev => ({ ...prev, query: '' }));
    router.push('/dashboard/clientes');
    onFiltersChange?.({ ...filters, query: '' });
  };


  // Contar resultados filtrados (solo por nombre y DNI)
  const filteredCount = useMemo(() => {
    return clientes.filter(cliente => {
      const matchesQuery = !filters.query || 
        cliente.nombre?.toLowerCase().includes(filters.query.toLowerCase()) ||
        cliente.documento_identidad?.toLowerCase().includes(filters.query.toLowerCase());
      
      return matchesQuery;
    }).length;
  }, [clientes, filters.query]);

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda principal */}
      <div className="crm-card p-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {isSearching ? (
                  <div className="w-5 h-5 border-2 border-crm-primary border-t-transparent rounded-full animate-spin"></div>
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
                placeholder="Buscar por nombre o DNI... (búsqueda automática)"
                className="w-full pl-10 pr-4 py-3 border border-crm-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
              />
            </div>
          </div>
          
          {filters.query && (
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
