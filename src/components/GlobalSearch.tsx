"use client";

import { useState, useEffect, useRef } from "react";
import { Spinner } from '@/components/ui/Spinner';
import { useRouter } from "next/navigation";
import { SearchResult, PropiedadSearchResult, EventoSearchResult } from "@/types/search";
import { globalSearch } from "@/app/dashboard/actions/search";

interface GlobalSearchProps {
  className?: string;
}

export default function GlobalSearch({ className = "" }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Búsqueda con debounce
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      try {
        const searchResponse = await globalSearch(query.trim());
        setResults(searchResponse.results);
        setIsOpen(true);
        setSelectedIndex(-1);
      } catch (error) {
        console.error("Error en búsqueda:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : results.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelectResult(results[selectedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
    setSelectedIndex(-1);
    router.push(result.url);
  };

  const getResultIcon = (result: SearchResult): string => {
    return result.icon;
  };

  const getResultTypeLabel = (result: SearchResult): string => {
    const labels: Record<string, string> = {
      'propiedad': 'Propiedad',
      'proyecto': 'Proyecto',
      'evento': 'Tarea/Evento'
    };
    return labels[result.type] || result.type;
  };

  const formatPrice = (precio?: number, moneda?: string): string => {
    if (!precio) return '';
    const formatter = new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: moneda || 'PEN'
    });
    return formatter.format(precio);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Input de búsqueda */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-crm-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          placeholder="Buscar propiedades, proyectos, tareas..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) {
              setIsOpen(true);
            }
          }}
          className="w-64 pl-10 pr-4 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent"
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <Spinner size="sm" color="primary" />
          </div>
        )}
      </div>

      {/* Dropdown de resultados */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-crm-card border border-crm-border rounded-lg shadow-crm-lg z-50 max-h-96 overflow-y-auto">
          {results.length === 0 && !isLoading ? (
            <div className="px-4 py-3 text-crm-text-muted text-sm">
              No se encontraron resultados para "{query}"
            </div>
          ) : (
            results.map((result, index) => (
              <div
                key={`${result.type}-${result.id}`}
                onClick={() => handleSelectResult(result)}
                className={`px-4 py-3 cursor-pointer border-b border-crm-border last:border-b-0 hover:bg-crm-card-hover transition-colors ${
                  index === selectedIndex ? 'bg-crm-card-hover' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 text-lg">
                    {getResultIcon(result)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-crm-text-primary truncate">
                        {result.title}
                      </h4>
                      <span className="ml-2 px-2 py-1 text-xs font-medium bg-crm-primary/10 text-crm-primary rounded-full">
                        {getResultTypeLabel(result)}
                      </span>
                    </div>
                    
                    {result.subtitle && (
                      <p className="text-xs text-crm-text-secondary mt-1">
                        {result.subtitle}
                      </p>
                    )}
                    
                    {result.description && (
                      <p className="text-xs text-crm-text-muted mt-1 truncate">
                        {result.description}
                      </p>
                    )}

                    {/* Información específica por tipo */}
                    {result.type === 'propiedad' && (
                      <div className="mt-1 flex items-center space-x-2 text-xs">
                        {(result as PropiedadSearchResult).precio && (
                          <span className="text-crm-success font-medium">
                            {formatPrice((result as PropiedadSearchResult).precio, (result as PropiedadSearchResult).moneda)}
                          </span>
                        )}
                        {(result as PropiedadSearchResult).proyecto_nombre && (
                          <span className="text-crm-text-muted">
                            • {(result as PropiedadSearchResult).proyecto_nombre}
                          </span>
                        )}
                      </div>
                    )}

                    {result.type === 'evento' && (
                      <div className="mt-1 flex items-center space-x-2 text-xs">
                        <span className="text-crm-text-muted">
                          {formatDate((result as EventoSearchResult).fecha_inicio)}
                        </span>
                        {(result as EventoSearchResult).cliente_nombre && (
                          <span className="text-crm-text-muted">
                            • {(result as EventoSearchResult).cliente_nombre}
                          </span>
                        )}
                        {(result as EventoSearchResult).propiedad_codigo && (
                          <span className="text-crm-text-muted">
                            • {(result as EventoSearchResult).propiedad_codigo}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
