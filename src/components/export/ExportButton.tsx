'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, FileType, Loader2 } from 'lucide-react';
import {
  exportFilteredProyectos,
  exportFilteredLotes,
  type ExportFormat,
  type ProyectoExportFilters,
  type LoteExportFilters,
  formatFilterSummary,
  addCountToFilters,
} from '@/lib/export/filteredExport';

/**
 * Props para el componente ExportButton
 */
export interface ExportButtonProps {
  /** Tipo de datos a exportar */
  type: 'proyectos' | 'lotes';
  /** Datos a exportar */
  data: any[];
  /** Filtros actuales aplicados */
  filters: ProyectoExportFilters | LoteExportFilters;
  /** Nombre base del archivo */
  fileName?: string;
  /** Texto del botón */
  label?: string;
  /** Tamaño del botón */
  size?: 'sm' | 'md' | 'lg';
  /** Variante del botón */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Mostrar dropdown con opciones de formato */
  showFormatOptions?: boolean;
  /** Incluir hoja de filtros en la exportación */
  includeFiltersSheet?: boolean;
}

/**
 * Botón para exportar datos filtrados a Excel, CSV o PDF
 *
 * Características:
 * - Múltiples formatos de exportación
 * - Respeta todos los filtros activos
 * - Indicador de carga durante exportación
 * - Dropdown con opciones de formato
 * - Totalmente customizable
 *
 * @example
 * ```tsx
 * <ExportButton
 *   type="proyectos"
 *   data={proyectosFiltrados}
 *   filters={{ q: 'residencial', estado: 'activo' }}
 *   fileName="proyectos-activos"
 *   showFormatOptions={true}
 * />
 * ```
 */
export default function ExportButton({
  type,
  data,
  filters,
  fileName,
  label = 'Exportar',
  size = 'md',
  variant = 'secondary',
  showFormatOptions = true,
  includeFiltersSheet = true,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  /**
   * Manejar la exportación en el formato seleccionado
   */
  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    setShowDropdown(false);

    try {
      // Agregar el conteo a los filtros
      const filtersWithCount = addCountToFilters(filters, data.length);

      if (type === 'proyectos') {
        await exportFilteredProyectos(
          data,
          filtersWithCount as ProyectoExportFilters,
          format,
          {
            fileName: fileName || 'proyectos',
            includeFiltersSheet,
            includeTimestamp: true,
          }
        );
      } else {
        await exportFilteredLotes(
          data,
          filtersWithCount as LoteExportFilters,
          format,
          {
            fileName: fileName || 'lotes',
            includeFiltersSheet,
            includeTimestamp: true,
          }
        );
      }

    } catch (error) {
      console.error('Error al exportar:', error);
      alert('Error al exportar los datos. Por favor, intenta nuevamente.');
    } finally {
      setIsExporting(false);
    }
  };

  // Estilos según variante
  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600',
    secondary: 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 border-transparent',
  };

  // Estilos según tamaño
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  // Si no hay datos, deshabilitar el botón
  if (data.length === 0) {
    return (
      <button
        disabled
        className={`${sizeStyles[size]} ${variantStyles.secondary} border rounded-lg font-medium transition-colors opacity-50 cursor-not-allowed flex items-center gap-2`}
      >
        <Download className={iconSizes[size]} />
        {label}
      </button>
    );
  }

  // Botón simple sin dropdown
  if (!showFormatOptions) {
    return (
      <button
        onClick={() => handleExport('excel')}
        disabled={isExporting}
        className={`${sizeStyles[size]} ${variantStyles[variant]} border rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isExporting ? (
          <Loader2 className={`${iconSizes[size]} animate-spin`} />
        ) : (
          <Download className={iconSizes[size]} />
        )}
        {isExporting ? 'Exportando...' : label}
      </button>
    );
  }

  // Botón con dropdown de opciones
  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={isExporting}
        className={`${sizeStyles[size]} ${variantStyles[variant]} border rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isExporting ? (
          <Loader2 className={`${iconSizes[size]} animate-spin`} />
        ) : (
          <Download className={iconSizes[size]} />
        )}
        {isExporting ? 'Exportando...' : label}
        {!isExporting && (
          <svg
            className={`${iconSizes[size]} transition-transform ${showDropdown ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Dropdown con opciones de formato */}
      {showDropdown && !isExporting && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
          {/* Header con resumen de filtros */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-xs font-medium text-gray-700 mb-1">Exportar {data.length} registros</p>
            <p className="text-xs text-gray-500 truncate" title={formatFilterSummary(filters)}>
              {formatFilterSummary(filters)}
            </p>
          </div>

          {/* Opciones de formato */}
          <div className="py-2">
            <button
              onClick={() => handleExport('excel')}
              className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 group"
            >
              <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded group-hover:bg-green-200 transition-colors">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">Excel (.xlsx)</div>
                <div className="text-xs text-gray-500">Recomendado para análisis</div>
              </div>
            </button>

            <button
              onClick={() => handleExport('csv')}
              className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 group"
            >
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded group-hover:bg-blue-200 transition-colors">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">CSV (.csv)</div>
                <div className="text-xs text-gray-500">Compatible con todo</div>
              </div>
            </button>

            <button
              onClick={() => handleExport('pdf')}
              className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 group"
            >
              <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded group-hover:bg-red-200 transition-colors">
                <FileType className="h-4 w-4 text-red-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">PDF (.pdf)</div>
                <div className="text-xs text-gray-500">Para compartir/imprimir</div>
              </div>
            </button>
          </div>

          {/* Footer con info */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              {includeFiltersSheet
                ? '✓ Incluye filtros aplicados'
                : 'Sin información de filtros'}
            </p>
          </div>
        </div>
      )}

      {/* Backdrop para cerrar el dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}

/**
 * Botón compacto de exportación rápida (solo Excel)
 */
export function QuickExportButton({
  type,
  data,
  filters,
  fileName,
}: Pick<ExportButtonProps, 'type' | 'data' | 'filters' | 'fileName'>) {
  return (
    <ExportButton
      type={type}
      data={data}
      filters={filters}
      fileName={fileName}
      label="Excel"
      size="sm"
      variant="ghost"
      showFormatOptions={false}
      includeFiltersSheet={false}
    />
  );
}

/**
 * Botón con dropdown compacto
 */
export function CompactExportButton({
  type,
  data,
  filters,
  fileName,
}: Pick<ExportButtonProps, 'type' | 'data' | 'filters' | 'fileName'>) {
  return (
    <ExportButton
      type={type}
      data={data}
      filters={filters}
      fileName={fileName}
      label=""
      size="sm"
      variant="ghost"
      showFormatOptions={true}
      includeFiltersSheet={true}
    />
  );
}
