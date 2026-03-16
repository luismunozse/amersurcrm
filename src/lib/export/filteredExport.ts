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
  fechaDesde?: string;
  fechaHasta?: string;
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
    fechaDesde: 'Fecha Desde',
    fechaHasta: 'Fecha Hasta',
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

// ============================================================================
// Paleta de colores CRM Amersur (misma que pdfGenerator.ts)
// ============================================================================
const CRM_COLORS = {
  primary:      [134, 144, 31]  as [number, number, number],
  primaryHover: [107, 115, 25]  as [number, number, number],
  secondary:    [158, 166, 76]  as [number, number, number],
  accent:       [176, 183, 109] as [number, number, number],
  dark:         [15, 23, 42]    as [number, number, number],
  textSecondary:[100, 116, 139] as [number, number, number],
  textMuted:    [148, 163, 184] as [number, number, number],
  border:       [226, 232, 240] as [number, number, number],
  bgLight:      [248, 250, 252] as [number, number, number],
  white:        [255, 255, 255] as [number, number, number],
};

let cachedLogoBase64: string | null = null;
async function getLogoBase64(): Promise<string | null> {
  if (cachedLogoBase64) return cachedLogoBase64;
  try {
    const response = await fetch('/logo-amersur-horizontal.png');
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        cachedLogoBase64 = reader.result as string;
        resolve(cachedLogoBase64);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Exportar a PDF con estilo de reportes AMERSUR
 */
async function exportToPDFWithFilters(
  data: any[],
  filterMetadata: any[],
  fileName: string,
  columns: ExportColumn[]
): Promise<void> {
  const JsPDF = await getJsPDF();
  const { default: autoTable } = await import('jspdf-autotable');
  const logo = await getLogoBase64();
  const doc = new JsPDF(); // Portrait, como los reportes
  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN = 16;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  // ── Helpers de diseño (mismos que pdfGenerator.ts) ──
  const drawHeaderBand = () => {
    doc.setFillColor(...CRM_COLORS.primary);
    doc.rect(0, 0, PAGE_W, 3, 'F');
    doc.setFillColor(...CRM_COLORS.accent);
    doc.rect(0, 3, PAGE_W, 0.5, 'F');
    if (logo) {
      doc.addImage(logo, 'PNG', MARGIN, 7, 12, 9.6);
    }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...CRM_COLORS.primary);
    doc.text('AMERSUR', logo ? MARGIN + 14 : MARGIN, 13);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...CRM_COLORS.textMuted);
    doc.text('INMOBILIARIA', logo ? MARGIN + 14 : MARGIN, 16.5);
  };

  const drawPageFooter = (pageNum: number, totalPages: number) => {
    doc.setDrawColor(...CRM_COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, PAGE_H - 14, PAGE_W - MARGIN, PAGE_H - 14);
    doc.setFillColor(...CRM_COLORS.primary);
    doc.rect(MARGIN, PAGE_H - 14, 20, 0.5, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...CRM_COLORS.textMuted);
    doc.text(`AMERSUR CRM  |  Listado de Clientes`, MARGIN, PAGE_H - 9);
    doc.text(`Página ${pageNum} de ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 9, { align: 'right' });
  };

  // ── Portada ──
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // Banda superior
  doc.setFillColor(...CRM_COLORS.primary);
  doc.rect(0, 0, PAGE_W, 60, 'F');
  doc.setFillColor(...CRM_COLORS.primaryHover);
  doc.rect(0, 55, PAGE_W, 5, 'F');

  // Logo centrado
  if (logo) {
    doc.addImage(logo, 'PNG', PAGE_W / 2 - 15, 10, 30, 24);
  }

  // Título empresa
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('AMERSUR INMOBILIARIA', PAGE_W / 2, logo ? 42 : 28, { align: 'center' });

  // Línea decorativa
  doc.setDrawColor(...CRM_COLORS.accent);
  doc.setLineWidth(0.5);
  doc.line(PAGE_W / 2 - 30, 70, PAGE_W / 2 + 30, 70);

  // Título del reporte
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...CRM_COLORS.dark);
  doc.text('Listado de Clientes', PAGE_W / 2, 85, { align: 'center' });

  // Subtítulo con período si hay filtro de fecha
  const fechaDesde = filterMetadata.find(m => m.filtro === 'Fecha Desde')?.valor;
  const fechaHasta = filterMetadata.find(m => m.filtro === 'Fecha Hasta')?.valor;
  let periodoTexto: string | null = null;
  if (fechaDesde || fechaHasta) {
    const desde = fechaDesde || 'Inicio';
    const hasta = fechaHasta || 'Actualidad';
    periodoTexto = `${desde}  —  ${hasta}`;
  }

  // Subtítulo
  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...CRM_COLORS.textSecondary);
  doc.text(`${data.length} clientes exportados`, PAGE_W / 2, 94, { align: 'center' });

  // Box de información
  const boxY = 110;
  const boxW = 120;
  const boxX = (PAGE_W - boxW) / 2;
  doc.setFillColor(...CRM_COLORS.bgLight);
  doc.roundedRect(boxX, boxY, boxW, 30, 3, 3, 'F');
  doc.setDrawColor(...CRM_COLORS.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, boxY, boxW, 30, 3, 3, 'S');
  doc.setFillColor(...CRM_COLORS.primary);
  doc.rect(boxX, boxY, 3, 30, 'F');

  if (periodoTexto) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...CRM_COLORS.primary);
    doc.text('PERÍODO DEL REPORTE', PAGE_W / 2, boxY + 10, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...CRM_COLORS.dark);
    doc.text(periodoTexto, PAGE_W / 2, boxY + 18, { align: 'center' });
  } else {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...CRM_COLORS.primary);
    doc.text('REGISTROS TOTALES', PAGE_W / 2, boxY + 10, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...CRM_COLORS.dark);
    doc.text(`${data.length} clientes`, PAGE_W / 2, boxY + 18, { align: 'center' });
  }

  // Fecha de generación
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...CRM_COLORS.textMuted);
  doc.text(`Generado: ${new Date().toLocaleString('es-PE')}`, PAGE_W / 2, boxY + 26, { align: 'center' });

  // Línea decorativa inferior
  doc.setDrawColor(...CRM_COLORS.accent);
  doc.setLineWidth(0.3);
  doc.line(MARGIN + 20, 155, PAGE_W - MARGIN - 20, 155);

  // Footer portada
  doc.setFillColor(...CRM_COLORS.primary);
  doc.rect(0, PAGE_H - 8, PAGE_W, 8, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('Documento generado automáticamente por AMERSUR CRM', PAGE_W / 2, PAGE_H - 3, { align: 'center' });

  // ── Página 2: Filtros aplicados (si hay) ──
  const visibleFilters = filterMetadata.filter(
    (meta) => meta.valor && meta.valor !== '0' && meta.filtro !== 'Registros Exportados'
  );

  doc.addPage();
  drawHeaderBand();
  let yPos = 24;

  // Título de sección - Filtros
  if (visibleFilters.length > 0) {
    doc.setFillColor(...CRM_COLORS.bgLight);
    doc.roundedRect(MARGIN, yPos - 1, CONTENT_W, 9, 1.5, 1.5, 'F');
    doc.setFillColor(...CRM_COLORS.primary);
    doc.rect(MARGIN, yPos - 1, 2.5, 9, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...CRM_COLORS.dark);
    doc.text('FILTROS APLICADOS', MARGIN + 6, yPos + 5.5);
    yPos += 14;

    autoTable(doc, {
      startY: yPos,
      head: [['Filtro', 'Valor']],
      body: visibleFilters.map((meta) => [meta.filtro, meta.valor]),
      headStyles: {
        fillColor: CRM_COLORS.primary,
        textColor: [255, 255, 255] as [number, number, number],
        fontStyle: 'bold' as const,
        fontSize: 9,
        cellPadding: 4,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: CRM_COLORS.dark,
        cellPadding: 3.5,
      },
      alternateRowStyles: {
        fillColor: [245, 247, 242] as [number, number, number],
      },
      styles: {
        lineColor: CRM_COLORS.border,
        lineWidth: 0.2,
        font: 'helvetica',
      },
      margin: { left: MARGIN, right: MARGIN },
      columnStyles: {
        0: { cellWidth: 50 },
      },
    });
    yPos = (doc as any).lastAutoTable.finalY + 12;
  }

  // ── Título de sección - Datos ──
  doc.setFillColor(...CRM_COLORS.bgLight);
  doc.roundedRect(MARGIN, yPos - 1, CONTENT_W, 9, 1.5, 1.5, 'F');
  doc.setFillColor(...CRM_COLORS.primary);
  doc.rect(MARGIN, yPos - 1, 2.5, 9, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...CRM_COLORS.dark);
  doc.text('LISTADO DE CLIENTES', MARGIN + 6, yPos + 5.5);
  yPos += 14;

  // Columnas reducidas para formato portrait (las más importantes)
  const pdfColumns = columns.filter(col =>
    ['nombre', 'codigo_cliente', 'estado_cliente', 'telefono', 'vendedor_asignado', 'fecha_alta', 'origen_lead'].includes(col.key)
  );
  // Si no hay columnas filtradas, usar todas
  const finalColumns = pdfColumns.length > 0 ? pdfColumns : columns;

  const headers = finalColumns.map((col) => col.label);
  const rows = data.map((row) =>
    finalColumns.map((col) => {
      const value = row[col.label];
      if (value === null || value === undefined || value === '') return '-';
      return value;
    })
  );

  // Tabla principal con estilo AMERSUR
  autoTable(doc, {
    startY: yPos,
    head: [headers],
    body: rows,
    headStyles: {
      fillColor: CRM_COLORS.primary,
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: 'bold' as const,
      fontSize: 8,
      cellPadding: 3,
      halign: 'left' as const,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: CRM_COLORS.dark,
      cellPadding: 2.5,
    },
    alternateRowStyles: {
      fillColor: [245, 247, 242] as [number, number, number],
    },
    styles: {
      lineColor: CRM_COLORS.border,
      lineWidth: 0.2,
      font: 'helvetica',
      overflow: 'linebreak' as const,
    },
    margin: { left: MARGIN, right: MARGIN, top: 24 },
    didDrawPage: (hookData: any) => {
      // Redibujar header en cada página nueva (excepto portada)
      if (hookData.pageNumber > 1) {
        drawHeaderBand();
      }
    },
  });

  // ── Pie de página en todas las páginas (excepto portada) ──
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);
    drawPageFooter(i - 1, pageCount - 1);
  }

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
  if (filters.fechaDesde) activeFilters.push(`Desde: ${filters.fechaDesde}`);
  if (filters.fechaHasta) activeFilters.push(`Hasta: ${filters.fechaHasta}`);
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
