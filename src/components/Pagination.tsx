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
    <nav className={`flex items-center justify-center space-x-2 ${className}`}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-4 py-2 text-sm border border-crm-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-crm-card-hover text-crm-text-primary transition-all duration-200"
      >
        Anterior
      </button>

      {visiblePages.map((page, index) => (
        <React.Fragment key={index}>
          {page === '...' ? (
            <span className="px-3 py-2 text-sm text-crm-text-muted">...</span>
          ) : (
            <button
              onClick={() => onPageChange(page as number)}
              className={`px-4 py-2 text-sm border rounded-lg transition-all duration-200 ${
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
        className="px-4 py-2 text-sm border border-crm-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-crm-card-hover text-crm-text-primary transition-all duration-200"
      >
        Siguiente
      </button>
    </nav>
  );
});