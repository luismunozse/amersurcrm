"use client";

import React, { memo } from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination = memo(function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const visiblePages = getVisiblePages();

  return (
    <nav className={`flex items-center justify-center gap-1 sm:gap-2 ${className}`}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="min-h-[44px] min-w-[44px] px-2 sm:px-4 py-2 text-sm border border-crm-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-crm-card-hover text-crm-text-primary transition-all duration-200"
        aria-label="Página anterior"
      >
        <span className="hidden sm:inline">Anterior</span>
        <span className="sm:hidden">&larr;</span>
      </button>

      {/* Mobile: solo muestra página actual / total */}
      <span className="sm:hidden text-sm text-crm-text-secondary font-medium px-2">
        {currentPage} / {totalPages}
      </span>

      {/* Desktop: muestra números de página */}
      {visiblePages.map((page, index) => (
        <React.Fragment key={index}>
          {page === '...' ? (
            <span className="hidden sm:inline px-2 py-2 text-sm text-crm-text-muted">...</span>
          ) : (
            <button
              onClick={() => onPageChange(page as number)}
              className={`hidden sm:inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-3 py-2 text-sm border rounded-lg transition-all duration-200 ${
                currentPage === page
                  ? 'bg-crm-primary text-white border-crm-primary hover:bg-crm-primary-hover font-medium'
                  : 'border-crm-border text-crm-text-primary hover:bg-crm-card-hover hover:border-crm-primary/30'
              }`}
            >
              {page}
            </button>
          )}
        </React.Fragment>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="min-h-[44px] min-w-[44px] px-2 sm:px-4 py-2 text-sm border border-crm-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-crm-card-hover text-crm-text-primary transition-all duration-200"
        aria-label="Página siguiente"
      >
        <span className="hidden sm:inline">Siguiente</span>
        <span className="sm:hidden">&rarr;</span>
      </button>
    </nav>
  );
});