"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PaginacionReporteProps {
  paginaActual: number;
  totalPaginas: number;
  totalItems: number;
  tamanioPagina: number;
  tieneSiguiente: boolean;
  tieneAnterior: boolean;
  irAPagina: (page: number) => void;
  paginaSiguiente: () => void;
  paginaAnterior: () => void;
  cambiarTamanioPagina: (size: number) => void;
}

export default function PaginacionReporte({
  paginaActual,
  totalPaginas,
  totalItems,
  tamanioPagina,
  tieneSiguiente,
  tieneAnterior,
  irAPagina,
  paginaSiguiente,
  paginaAnterior,
  cambiarTamanioPagina,
}: PaginacionReporteProps) {
  if (totalItems <= 5) return null;

  const inicio = (paginaActual - 1) * tamanioPagina + 1;
  const fin = Math.min(paginaActual * tamanioPagina, totalItems);

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPaginas <= 7) {
      for (let i = 1; i <= totalPaginas; i++) pages.push(i);
    } else {
      pages.push(1);
      if (paginaActual > 3) pages.push('...');
      for (let i = Math.max(2, paginaActual - 1); i <= Math.min(totalPaginas - 1, paginaActual + 1); i++) {
        pages.push(i);
      }
      if (paginaActual < totalPaginas - 2) pages.push('...');
      pages.push(totalPaginas);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-crm-border bg-crm-card-hover/50">
      <div className="flex items-center gap-3 text-sm text-crm-text-secondary">
        <span>
          {inicio}-{fin} de {totalItems}
        </span>
        <Select
          value={tamanioPagina.toString()}
          onValueChange={(v) => cambiarTamanioPagina(Number(v))}
        >
          <SelectTrigger className="w-[80px] h-8 text-xs bg-crm-card border-crm-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-crm-card border-crm-border">
            {[5, 10, 20, 50].map((size) => (
              <SelectItem
                key={size}
                value={size.toString()}
                className="text-crm-text-primary hover:bg-crm-card-hover focus:bg-crm-card-hover cursor-pointer text-xs"
              >
                {size} / pág
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={paginaAnterior}
          disabled={!tieneAnterior}
          className="p-1.5 rounded-lg text-crm-text-secondary hover:bg-crm-card-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {getPageNumbers().map((page, idx) =>
          page === '...' ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-crm-text-muted text-sm">
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => irAPagina(page as number)}
              className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${
                page === paginaActual
                  ? 'bg-crm-primary text-white'
                  : 'text-crm-text-secondary hover:bg-crm-card-hover'
              }`}
            >
              {page}
            </button>
          )
        )}

        <button
          onClick={paginaSiguiente}
          disabled={!tieneSiguiente}
          className="p-1.5 rounded-lg text-crm-text-secondary hover:bg-crm-card-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Página siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
