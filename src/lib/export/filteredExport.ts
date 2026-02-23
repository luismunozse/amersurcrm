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

// Dynamic imports: xlsx (~600KB), jsPDF (~150KB), jspdf-autotable (~30KB)
// Se cargan solo cuando el usuario realmente exporta, no al cargar la página
async function getXLSX() {
  return await import('xlsx');
}
async function getJsPDF() {
  const { jsPDF } = await import('jspdf');
  await import('jspdf-autotable');
  return jsPDF;
}

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
 * Filtros para exportación de clientes
 */
export interface ClienteExportFilters {
  q?: string;
  telefono?: string;
  dni?: string;
  estado?: string;
  tipo?: string;
  vendedor?: string;
  origen?: string;  // Filtro por origen del lead
  sortBy?: string;
  sortOrder?: string;
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
      await exportToExcelWithFilters(transformedData, filterMetadata, finalFileName, columns, includeFiltersSheet);
      break;
    case 'csv':
      await exportToCSVWithFilters(transformedData, filterMetadata, finalFileName, includeFiltersSheet);
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
      await exportToExcelWithFilters(transformedData, filterMetadata, finalFileName, columns, includeFiltersSheet);
      break;
    case 'csv':
      await exportToCSVWithFilters(transformedData, filterMetadata, finalFileName, includeFiltersSheet);
      break;
    case 'pdf':
      await exportToPDFWithFilters(transformedData, filterMetadata, finalFileName, columns);
      break;
  }
}

/**
 * Exportar clientes filtrados a Excel, CSV o PDF
 */
export async function exportFilteredClientes(
  clientes: any[],
  filters: ClienteExportFilters,
  format: ExportFormat = 'excel',
  options: ExportOptions = {}
): Promise<void> {
  const {
    fileName = 'clientes-filtrados',
    includeFiltersSheet = true,
    includeTimestamp = true,
    columns = getDefaultClienteColumns(),
  } = options;

  const finalFileName = buildFileName(fileName, format, includeTimestamp);
  const transformedData = clientes.map((cliente) => transformRowData(cliente, columns));
  const filterMetadata = buildFilterMetadata(filters);

  switch (format) {
    case 'excel':
      await exportToExcelWithFilters(transformedData, filterMetadata, finalFileName, columns, includeFiltersSheet);
      break;
    case 'csv':
      await exportToCSVWithFilters(transformedData, filterMetadata, finalFileName, includeFiltersSheet);
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

function getDefaultClienteColumns(): ExportColumn[] {
  return [
    { key: 'nombre', label: 'Nombre', width: 30 },
    { key: 'codigo_cliente', label: 'Código', width: 18 },
    { key: 'tipo_cliente', label: 'Tipo', width: 16 },
    { key: 'estado_cliente', label: 'Estado', width: 16 },
    { key: 'email', label: 'Email', width: 28, format: (value) => value || '-' },
    { key: 'telefono', label: 'Teléfono', width: 18, format: (value) => value || '-' },
    { key: 'telefono_whatsapp', label: 'WhatsApp', width: 18, format: (value) => value || '-' },
    { key: 'documento_identidad', label: 'Documento', width: 18, format: (value) => value || '-' },
    { key: 'vendedor_asignado', label: 'Vendedor', width: 20, format: (value) => value || '-' },
    { key: 'origen_lead', label: 'Origen', width: 18, format: (value) => value || '-' },
    {
      key: 'fecha_alta',
      label: 'Fecha Alta',
      width: 18,
      format: (value) => (value ? new Date(value).toLocaleDateString() : '-'),
    },
    {
      key: 'ultimo_contacto',
      label: 'Último Contacto',
      width: 18,
      format: (value) => (value ? new Date(value).toLocaleDateString() : '-'),
    },
    {
      key: 'proxima_accion',
      label: 'Próxima Acción',
      width: 24,
      format: (value) => value || '-',
    },
    {
      key: 'interes_principal',
      label: 'Interés Principal',
      width: 24,
      format: (value) => value || '-',
    },
    {
      key: 'capacidad_compra_estimada',
      label: 'Capacidad Compra',
      width: 20,
      format: (value) => (typeof value === 'number' ? `S/ ${value.toLocaleString()}` : '-'),
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
    sortBy: 'Ordenar por',
    sortOrder: 'Dirección',
    telefono: 'Teléfono',
    dni: 'Documento',
    vendedor: 'Vendedor',
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
async function exportToExcelWithFilters(
  data: any[],
  filterMetadata: any[],
  fileName: string,
  columns: ExportColumn[],
  includeFiltersSheet: boolean
): Promise<void> {
  const XLSX = await getXLSX();
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
async function exportToCSVWithFilters(
  data: any[],
  filterMetadata: any[],
  fileName: string,
  includeFiltersSheet: boolean
): Promise<void> {
  const XLSX = await getXLSX();
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
  const JsPDF = await getJsPDF();
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new JsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  const headerBg: [number, number, number] = [12, 25, 59];
  const accentColor: [number, number, number] = [149, 193, 31];
  const secondaryText: [number, number, number] = [71, 85, 105];

  // Cabecera
  const headerHeight = 24;
  doc.setFillColor(...headerBg);
  doc.roundedRect(marginX - 4, 10, pageWidth - (marginX - 4) * 2, headerHeight, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('AMERSUR CRM', marginX, 20);
  doc.setFontSize(16);
  doc.text('Reporte de Proyectos', marginX, 30);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const generatedText = `Generado: ${new Date().toLocaleString('es-PE')}`;
  doc.text(generatedText, pageWidth - marginX, 20, { align: 'right' });
  const countText = `Registros exportados: ${data.length}`;
  doc.text(countText, pageWidth - marginX, 27, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  // Resumen visual
  const summaryStartY = 10 + headerHeight + 8;
  const availableWidth = pageWidth - marginX * 2;
  const cardWidth = (availableWidth - 8) / 2;
  const cardHeight = 18;
  const activeFiltersCount = filterMetadata.filter(
    (meta) => meta.filtro !== 'Registros Exportados'
  ).length;

  const drawSummaryCard = (x: number, title: string, value: string) => {
    doc.setDrawColor(229, 231, 235);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, summaryStartY, cardWidth, cardHeight, 3, 3, 'FD');
    doc.setFontSize(9);
    doc.setTextColor(...secondaryText);
    doc.text(title, x + 6, summaryStartY + 7);
    doc.setFontSize(13);
    doc.setTextColor(...headerBg);
    doc.text(value, x + 6, summaryStartY + 15);
  };

  drawSummaryCard(marginX, 'Registros filtrados', String(data.length));
  drawSummaryCard(
    marginX + cardWidth + 8,
    'Filtros activos',
    activeFiltersCount.toString()
  );

  let currentY = summaryStartY + cardHeight + 10;

  // Tabla de filtros aplicada
  const visibleFilters = filterMetadata.filter((meta) => meta.valor && meta.valor !== '0');
  if (visibleFilters.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [['Filtro', 'Valor']],
      body: visibleFilters.map((meta) => [meta.filtro, meta.valor]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, textColor: [31, 41, 55] },
      headStyles: { fillColor: accentColor, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: marginX, right: marginX },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: availableWidth - 50 },
      },
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Tabla principal de datos
  const headers = columns.map((col) => col.label);
  const rows = data.map((row) =>
    columns.map((col) => {
      const value = row[col.label];
      if (value === null || value === undefined || value === '') return '-';
      return value;
    })
  );

  autoTable(doc, {
    startY: currentY,
    head: [headers],
    body: rows,
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: headerBg, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [247, 249, 252] },
    margin: { left: marginX, right: marginX, top: 20 },
    columnStyles: columns.reduce(
      (acc, col, idx) => {
        acc[idx] = {
          cellWidth: col.width ? col.width * 2 : 'auto',
          halign: 'left',
        };
        return acc;
      },
      {} as Record<number, any>
    ),
  });

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
  if (filters.telefono) activeFilters.push(`Teléfono: ${filters.telefono}`);
  if (filters.dni) activeFilters.push(`Documento: ${filters.dni}`);
  if (filters.vendedor) activeFilters.push(`Vendedor: ${filters.vendedor}`);
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
