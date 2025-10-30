/**
 * Utilidades para exportar resultados filtrados a Excel y CSV
 *
 * Este módulo permite exportar solo los datos que están actualmente
 * visibles según los filtros aplicados por el usuario.
 *
 * Características:
 * - Exporta solo resultados filtrados
 * - Múltiples formatos (Excel, CSV, PDF)
 * - Respeta todos los filtros activos (búsqueda, rangos, estado)
 * - Incluye metadatos de los filtros aplicados
 * - Generación del lado del cliente para mejor rendimiento
 *
 * @example
 * ```tsx
 * import { exportFilteredProyectos } from '@/lib/export/filteredExport';
 *
 * const filters = {
 *   q: 'residencial',
 *   estado: 'activo',
 *   tipo: 'residencial',
 * };
 *
 * await exportFilteredProyectos(proyectos, filters, 'excel');
 * ```
 */

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Filtros para exportación de proyectos
 */
export interface ProyectoExportFilters {
  q?: string;
  estado?: string;
  tipo?: string;
  sort?: string;
  fecha_inicio_min?: string;
  fecha_inicio_max?: string;
}

/**
 * Filtros para exportación de lotes
 */
export interface LoteExportFilters {
  q?: string;
  estado?: string;
  sort?: string;
  precio_min?: string;
  precio_max?: string;
  area_min?: string;
  area_max?: string;
}

/**
 * Tipo de formato de exportación
 */
export type ExportFormat = 'excel' | 'csv' | 'pdf';

/**
 * Opciones para la exportación
 */
export interface ExportOptions {
  /** Nombre del archivo (sin extensión) */
  fileName?: string;
  /** Incluir filtros aplicados como hoja/sección adicional */
  includeFiltersSheet?: boolean;
  /** Incluir timestamp en el nombre del archivo */
  includeTimestamp?: boolean;
  /** Configuración personalizada de columnas */
  columns?: ExportColumn[];
}

/**
 * Configuración de columna para exportación
 */
export interface ExportColumn {
  /** Clave del campo en el objeto */
  key: string;
  /** Etiqueta visible en la exportación */
  label: string;
  /** Función para formatear el valor */
  format?: (value: any) => string;
  /** Ancho de la columna (solo para Excel) */
  width?: number;
}

/**
 * Exportar proyectos filtrados a Excel, CSV o PDF
 *
 * @param proyectos - Array de proyectos a exportar
 * @param filters - Filtros aplicados
 * @param format - Formato de exportación
 * @param options - Opciones adicionales
 *
 * @example
 * ```tsx
 * await exportFilteredProyectos(
 *   proyectos,
 *   { q: 'residencial', estado: 'activo' },
 *   'excel',
 *   { fileName: 'proyectos-activos', includeFiltersSheet: true }
 * );
 * ```
 */
export async function exportFilteredProyectos(
  proyectos: any[],
  filters: ProyectoExportFilters,
  format: ExportFormat = 'excel',
  options: ExportOptions = {}
): Promise<void> {
  const {
    fileName = 'proyectos-filtrados',
    includeFiltersSheet = true,
    includeTimestamp = true,
    columns = getDefaultProyectoColumns(),
  } = options;

  const finalFileName = buildFileName(fileName, format, includeTimestamp);

  // Transformar datos según columnas configuradas
  const transformedData = proyectos.map((proyecto) =>
    transformRowData(proyecto, columns)
  );

  // Crear metadatos de los filtros
  const filterMetadata = buildFilterMetadata(filters);

  // Exportar según el formato
  switch (format) {
    case 'excel':
      exportToExcelWithFilters(transformedData, filterMetadata, finalFileName, columns, includeFiltersSheet);
      break;
    case 'csv':
      exportToCSVWithFilters(transformedData, filterMetadata, finalFileName, includeFiltersSheet);
      break;
    case 'pdf':
      await exportToPDFWithFilters(transformedData, filterMetadata, finalFileName, columns);
      break;
  }
}

/**
 * Exportar lotes filtrados a Excel, CSV o PDF
 *
 * @param lotes - Array de lotes a exportar
 * @param filters - Filtros aplicados
 * @param format - Formato de exportación
 * @param options - Opciones adicionales
 */
export async function exportFilteredLotes(
  lotes: any[],
  filters: LoteExportFilters,
  format: ExportFormat = 'excel',
  options: ExportOptions = {}
): Promise<void> {
  const {
    fileName = 'lotes-filtrados',
    includeFiltersSheet = true,
    includeTimestamp = true,
    columns = getDefaultLoteColumns(),
  } = options;

  const finalFileName = buildFileName(fileName, format, includeTimestamp);

  const transformedData = lotes.map((lote) => transformRowData(lote, columns));
  const filterMetadata = buildFilterMetadata(filters);

  switch (format) {
    case 'excel':
      exportToExcelWithFilters(transformedData, filterMetadata, finalFileName, columns, includeFiltersSheet);
      break;
    case 'csv':
      exportToCSVWithFilters(transformedData, filterMetadata, finalFileName, includeFiltersSheet);
      break;
    case 'pdf':
      await exportToPDFWithFilters(transformedData, filterMetadata, finalFileName, columns);
      break;
  }
}

// ============================================================================
// FUNCIONES INTERNAS
// ============================================================================

/**
 * Columnas por defecto para proyectos
 */
function getDefaultProyectoColumns(): ExportColumn[] {
  return [
    { key: 'nombre', label: 'Nombre', width: 30 },
    { key: 'ubicacion', label: 'Ubicación', width: 25 },
    { key: 'estado', label: 'Estado', width: 15 },
    { key: 'tipo', label: 'Tipo', width: 15 },
    { key: 'total_lotes', label: 'Total Lotes', width: 12 },
    {
      key: 'fecha_inicio',
      label: 'Fecha Inicio',
      width: 15,
      format: (value) => (value ? new Date(value).toLocaleDateString() : '-'),
    },
    {
      key: 'created_at',
      label: 'Fecha Creación',
      width: 15,
      format: (value) => new Date(value).toLocaleDateString(),
    },
  ];
}

/**
 * Columnas por defecto para lotes
 */
function getDefaultLoteColumns(): ExportColumn[] {
  return [
    { key: 'codigo', label: 'Código', width: 15 },
    { key: 'numero_lote', label: 'Número Lote', width: 15 },
    { key: 'manzana', label: 'Manzana', width: 12, format: (value) => value || '-' },
    { key: 'etapa', label: 'Etapa', width: 12, format: (value) => value || '-' },
    { key: 'estado', label: 'Estado', width: 12 },
    {
      key: 'sup_m2',
      label: 'Área (m²)',
      width: 12,
      format: (value) => (value ? value.toFixed(2) : '-'),
    },
    {
      key: 'precio',
      label: 'Precio',
      width: 15,
      format: (value) => (value ? `$${value.toLocaleString()}` : '-'),
    },
    {
      key: 'created_at',
      label: 'Fecha Creación',
      width: 15,
      format: (value) => new Date(value).toLocaleDateString(),
    },
  ];
}

/**
 * Transformar fila de datos según configuración de columnas
 */
function transformRowData(row: any, columns: ExportColumn[]): any {
  const transformed: any = {};

  columns.forEach((col) => {
    let value = row[col.key];

    // Si el key incluye punto, acceder a objeto anidado
    if (col.key.includes('.')) {
      const keys = col.key.split('.');
      value = keys.reduce((obj, key) => obj?.[key], row);
    }

    // Aplicar formato si existe
    transformed[col.label] = col.format ? col.format(value) : value || '-';
  });

  return transformed;
}

/**
 * Construir nombre de archivo con timestamp opcional
 */
function buildFileName(baseName: string, format: ExportFormat, includeTimestamp: boolean): string {
  const timestamp = includeTimestamp
    ? `-${new Date().toISOString().slice(0, 10)}-${Date.now()}`
    : '';

  const extension = format === 'excel' ? 'xlsx' : format;
  return `${baseName}${timestamp}.${extension}`;
}

/**
 * Construir metadatos de filtros aplicados
 */
function buildFilterMetadata(filters: any): Array<{ filtro: string; valor: string }> {
  const metadata: Array<{ filtro: string; valor: string }> = [];

  const filterLabels: Record<string, string> = {
    q: 'Búsqueda',
    estado: 'Estado',
    tipo: 'Tipo',
    sort: 'Ordenamiento',
    precio_min: 'Precio Mínimo',
    precio_max: 'Precio Máximo',
    area_min: 'Área Mínima',
    area_max: 'Área Máxima',
    fecha_inicio_min: 'Fecha Inicio Desde',
    fecha_inicio_max: 'Fecha Inicio Hasta',
  };

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      metadata.push({
        filtro: filterLabels[key] || key,
        valor: String(value),
      });
    }
  });

  // Agregar metadatos generales
  metadata.push(
    { filtro: 'Fecha de Exportación', valor: new Date().toLocaleString('es-ES') },
    { filtro: 'Registros Exportados', valor: String(filters.count || 0) }
  );

  return metadata;
}

/**
 * Exportar a Excel con hoja de filtros
 */
function exportToExcelWithFilters(
  data: any[],
  filterMetadata: any[],
  fileName: string,
  columns: ExportColumn[],
  includeFiltersSheet: boolean
): void {
  const workbook = XLSX.utils.book_new();

  // Hoja de datos
  const dataSheet = XLSX.utils.json_to_sheet(data);

  // Configurar anchos de columna
  const columnWidths = columns.map((col) => ({ wch: col.width || 15 }));
  dataSheet['!cols'] = columnWidths;

  XLSX.utils.book_append_sheet(workbook, dataSheet, 'Datos');

  // Hoja de filtros (opcional)
  if (includeFiltersSheet && filterMetadata.length > 0) {
    const filtersSheet = XLSX.utils.json_to_sheet(filterMetadata);
    filtersSheet['!cols'] = [{ wch: 25 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(workbook, filtersSheet, 'Filtros Aplicados');
  }

  // Descargar archivo
  XLSX.writeFile(workbook, fileName);
}

/**
 * Exportar a CSV con metadatos de filtros
 */
function exportToCSVWithFilters(
  data: any[],
  filterMetadata: any[],
  fileName: string,
  includeFiltersSheet: boolean
): void {
  let csvContent = '';

  // Agregar metadatos de filtros al inicio (opcional)
  if (includeFiltersSheet && filterMetadata.length > 0) {
    csvContent += '# FILTROS APLICADOS\n';
    filterMetadata.forEach((meta) => {
      csvContent += `# ${meta.filtro}: ${meta.valor}\n`;
    });
    csvContent += '\n';
  }

  // Convertir datos a CSV
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  csvContent += csv;

  // Crear blob y descargar
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Exportar a PDF con filtros
 */
async function exportToPDFWithFilters(
  data: any[],
  filterMetadata: any[],
  fileName: string,
  columns: ExportColumn[]
): Promise<void> {
  const doc = new jsPDF('landscape');

  // Título
  doc.setFontSize(16);
  doc.text('Reporte de Datos Filtrados', 14, 15);

  // Filtros aplicados
  if (filterMetadata.length > 0) {
    doc.setFontSize(10);
    doc.text('Filtros Aplicados:', 14, 25);

    const filtersTable = filterMetadata.map((meta) => [meta.filtro, meta.valor]);

    autoTable(doc, {
      startY: 30,
      head: [['Filtro', 'Valor']],
      body: filtersTable,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] },
      margin: { left: 14 },
    });
  }

  // Tabla de datos
  const headers = columns.map((col) => col.label);
  const rows = data.map((row) => columns.map((col) => row[col.label] || '-'));

  autoTable(doc, {
    startY: (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : 60,
    head: [headers],
    body: rows,
    theme: 'striped',
    styles: { fontSize: 7 },
    headStyles: { fillColor: [66, 139, 202], fontStyle: 'bold' },
    margin: { left: 14, right: 14 },
    columnStyles: columns.reduce(
      (acc, col, idx) => {
        acc[idx] = { cellWidth: col.width ? col.width * 2 : 'auto' };
        return acc;
      },
      {} as Record<number, any>
    ),
  });

  // Guardar PDF
  doc.save(fileName);
}

/**
 * Obtener conteo de registros para incluir en metadatos
 */
export function addCountToFilters<T extends Record<string, any>>(
  filters: T,
  count: number
): T & { count: number } {
  return { ...filters, count };
}

/**
 * Verificar si hay filtros activos
 */
export function hasActiveFilters(filters: Record<string, any>): boolean {
  const relevantKeys = Object.keys(filters).filter((key) => key !== 'sort' && key !== 'count');
  return relevantKeys.some((key) => filters[key] && String(filters[key]).trim() !== '');
}

/**
 * Formatear el nombre de los filtros para mostrar en UI
 */
export function formatFilterSummary(filters: Record<string, any>): string {
  const activeFilters: string[] = [];

  if (filters.q) activeFilters.push(`Búsqueda: "${filters.q}"`);
  if (filters.estado) activeFilters.push(`Estado: ${filters.estado}`);
  if (filters.tipo) activeFilters.push(`Tipo: ${filters.tipo}`);
  if (filters.precio_min || filters.precio_max) {
    const range = [
      filters.precio_min ? `$${filters.precio_min}` : 'Min',
      filters.precio_max ? `$${filters.precio_max}` : 'Max',
    ].join(' - ');
    activeFilters.push(`Precio: ${range}`);
  }
  if (filters.area_min || filters.area_max) {
    const range = [
      filters.area_min ? `${filters.area_min}m²` : 'Min',
      filters.area_max ? `${filters.area_max}m²` : 'Max',
    ].join(' - ');
    activeFilters.push(`Área: ${range}`);
  }

  return activeFilters.length > 0 ? activeFilters.join(' | ') : 'Sin filtros';
}
