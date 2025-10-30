/**
 * Export utilities for Proyectos module
 *
 * Provides functionality to export projects, lots, sales, and reservations
 * to Excel (XLSX) and CSV formats.
 */

import * as XLSX from 'xlsx';
import type {
  Proyecto,
  Lote,
  Venta,
  Reserva,
  ExportConfig,
  ExportData,
} from '@/types/proyectos';

// ============================================================================
// FORMATTERS
// ============================================================================

/**
 * Formats a date to DD/MM/YYYY format
 */
function formatDate(date: string | null | undefined): string {
  if (!date) return '';
  try {
    const d = new Date(date);
    return d.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return date;
  }
}

/**
 * Formats a currency value
 */
function formatCurrency(value: number | null | undefined, moneda: string = 'PEN'): string {
  if (value === null || value === undefined) return '';
  try {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: moneda === 'USD' ? 'USD' : 'PEN',
    }).format(value);
  } catch {
    return `${moneda} ${value.toFixed(2)}`;
  }
}

/**
 * Formats a number with thousand separators
 */
function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return new Intl.NumberFormat('es-PE').format(value);
}

// ============================================================================
// DATA TRANSFORMERS
// ============================================================================

/**
 * Transforms Proyecto data for export
 */
function transformProyecto(proyecto: Proyecto): Record<string, any> {
  return {
    'Código': proyecto.id,
    'Nombre': proyecto.nombre,
    'Descripción': proyecto.descripcion || '',
    'Ubicación': proyecto.ubicacion || '',
    'Tipo de Terreno': proyecto.tipo_terreno || '',
    'Área Total (m²)': formatNumber(proyecto.area_total),
    'Precio Desde': formatCurrency(proyecto.precio_desde, 'PEN'),
    'Precio Hasta': formatCurrency(proyecto.precio_hasta, 'PEN'),
    'Estado': proyecto.estado,
    'Fecha Creación': formatDate(proyecto.created_at),
  };
}

/**
 * Transforms Lote data for export
 */
function transformLote(lote: Lote): Record<string, any> {
  return {
    'Código': lote.numero_lote,
    'Proyecto': lote.proyecto?.nombre || '',
    'Etapa': lote.etapa || '',
    'Manzana': lote.manzana || '',
    'Área (m²)': formatNumber(lote.area),
    'Precio Lista': formatCurrency(lote.precio_lista, 'PEN'),
    'Precio Venta': formatCurrency(lote.precio_venta, 'PEN'),
    'Estado': lote.estado,
    'Descripción': lote.descripcion || '',
    'Fecha Creación': formatDate(lote.created_at),
    'Última Actualización': formatDate(lote.updated_at),
  };
}

/**
 * Transforms Venta data for export
 */
function transformVenta(venta: Venta): Record<string, any> {
  return {
    'ID': venta.id,
    'Lote': venta.lote?.numero_lote || '',
    'Cliente': venta.cliente ? `${venta.cliente.nombre} ${venta.cliente.apellido || ''}`.trim() : '',
    'Cliente DNI': venta.cliente?.dni || '',
    'Vendedor': venta.vendedor_username || '',
    'Precio Venta': formatCurrency(venta.precio_venta, 'PEN'),
    'Modalidad Pago': venta.modalidad_pago,
    'Cuota Inicial': formatCurrency(venta.cuota_inicial),
    'Número Cuotas': venta.numero_cuotas || '',
    'Monto Cuota': formatCurrency(venta.monto_cuota),
    'Fecha Venta': formatDate(venta.fecha_venta),
    'Estado': venta.estado,
    'Notas': venta.notas || '',
    'Fecha Registro': formatDate(venta.created_at),
  };
}

/**
 * Transforms Reserva data for export
 */
function transformReserva(reserva: Reserva): Record<string, any> {
  return {
    'ID': reserva.id,
    'Lote': reserva.lote?.numero_lote || '',
    'Cliente': reserva.cliente ? `${reserva.cliente.nombre} ${reserva.cliente.apellido || ''}`.trim() : '',
    'Cliente DNI': reserva.cliente?.dni || '',
    'Vendedor': reserva.vendedor_username || '',
    'Monto Reserva': formatCurrency(reserva.monto_reserva),
    'Fecha Reserva': formatDate(reserva.fecha_reserva),
    'Fecha Vencimiento': formatDate(reserva.fecha_vencimiento),
    'Estado': reserva.estado,
    'Notas': reserva.notas || '',
    'Fecha Registro': formatDate(reserva.created_at),
  };
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Exports data to Excel format (XLSX)
 */
export function exportToExcel(data: ExportData, fileName: string = 'export.xlsx'): void {
  const workbook = XLSX.utils.book_new();

  // Add Proyectos sheet
  if (data.proyectos && data.proyectos.length > 0) {
    const proyectosData = data.proyectos.map(transformProyecto);
    const proyectosSheet = XLSX.utils.json_to_sheet(proyectosData);
    XLSX.utils.book_append_sheet(workbook, proyectosSheet, 'Proyectos');
  }

  // Add Lotes sheet
  if (data.lotes && data.lotes.length > 0) {
    const lotesData = data.lotes.map(transformLote);
    const lotesSheet = XLSX.utils.json_to_sheet(lotesData);
    XLSX.utils.book_append_sheet(workbook, lotesSheet, 'Lotes');
  }

  // Add Ventas sheet
  if (data.ventas && data.ventas.length > 0) {
    const ventasData = data.ventas.map(transformVenta);
    const ventasSheet = XLSX.utils.json_to_sheet(ventasData);
    XLSX.utils.book_append_sheet(workbook, ventasSheet, 'Ventas');
  }

  // Add Reservas sheet
  if (data.reservas && data.reservas.length > 0) {
    const reservasData = data.reservas.map(transformReserva);
    const reservasSheet = XLSX.utils.json_to_sheet(reservasData);
    XLSX.utils.book_append_sheet(workbook, reservasSheet, 'Reservas');
  }

  // Generate and download
  XLSX.writeFile(workbook, fileName);
}

/**
 * Exports data to CSV format
 */
export function exportToCSV(
  data: ExportData,
  fileName: string = 'export.csv',
  dataType: 'proyectos' | 'lotes' | 'ventas' | 'reservas' = 'lotes'
): void {
  let csvData: Record<string, any>[] = [];

  switch (dataType) {
    case 'proyectos':
      if (data.proyectos && data.proyectos.length > 0) {
        csvData = data.proyectos.map(transformProyecto);
      }
      break;
    case 'lotes':
      if (data.lotes && data.lotes.length > 0) {
        csvData = data.lotes.map(transformLote);
      }
      break;
    case 'ventas':
      if (data.ventas && data.ventas.length > 0) {
        csvData = data.ventas.map(transformVenta);
      }
      break;
    case 'reservas':
      if (data.reservas && data.reservas.length > 0) {
        csvData = data.reservas.map(transformReserva);
      }
      break;
  }

  if (csvData.length === 0) {
    console.warn(`No ${dataType} data to export`);
    return;
  }

  // Convert to CSV
  const worksheet = XLSX.utils.json_to_sheet(csvData);
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports data based on ExportConfig
 */
export function exportData(data: ExportData, config: ExportConfig): void {
  const timestamp = new Date().toISOString().split('T')[0];
  const baseFileName = `proyectos-${timestamp}`;

  if (config.format === 'excel') {
    exportToExcel(data, `${baseFileName}.xlsx`);
  } else if (config.format === 'csv') {
    // Export each type to a separate CSV
    if (data.proyectos && data.proyectos.length > 0) {
      exportToCSV({ proyectos: data.proyectos }, `${baseFileName}-proyectos.csv`, 'proyectos');
    }
    if (data.lotes && data.lotes.length > 0) {
      exportToCSV({ lotes: data.lotes }, `${baseFileName}-lotes.csv`, 'lotes');
    }
    if (data.ventas && data.ventas.length > 0) {
      exportToCSV({ ventas: data.ventas }, `${baseFileName}-ventas.csv`, 'ventas');
    }
    if (data.reservas && data.reservas.length > 0) {
      exportToCSV({ reservas: data.reservas }, `${baseFileName}-reservas.csv`, 'reservas');
    }
  }
}

// ============================================================================
// STATISTICS EXPORT
// ============================================================================

/**
 * Exports project statistics to Excel
 */
export function exportProyectoStats(proyecto: Proyecto, lotes: Lote[]): void {
  const workbook = XLSX.utils.book_new();

  // Summary sheet
  const stats = {
    'Proyecto': proyecto.nombre,
    'Total Lotes': lotes.length,
    'Disponibles': lotes.filter((l) => l.estado === 'disponible').length,
    'Reservados': lotes.filter((l) => l.estado === 'reservado').length,
    'Vendidos': lotes.filter((l) => l.estado === 'vendido').length,
    'Área Total (m²)': formatNumber(
      lotes.reduce((sum, l) => sum + (l.area || 0), 0)
    ),
    'Valor Total Lista': formatCurrency(
      lotes.reduce((sum, l) => sum + (l.precio_lista || 0), 0)
    ),
    'Valor Total Venta': formatCurrency(
      lotes.filter((l) => l.estado === 'vendido').reduce((sum, l) => sum + (l.precio_venta || 0), 0)
    ),
  };

  const summarySheet = XLSX.utils.json_to_sheet([stats]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

  // Lotes detail sheet
  const lotesData = lotes.map(transformLote);
  const lotesSheet = XLSX.utils.json_to_sheet(lotesData);
  XLSX.utils.book_append_sheet(workbook, lotesSheet, 'Detalle Lotes');

  // Stats by estado
  const estadoStats = [
    {
      'Estado': 'Disponible',
      'Cantidad': lotes.filter((l) => l.estado === 'disponible').length,
      'Porcentaje': `${((lotes.filter((l) => l.estado === 'disponible').length / lotes.length) * 100).toFixed(1)}%`,
    },
    {
      'Estado': 'Reservado',
      'Cantidad': lotes.filter((l) => l.estado === 'reservado').length,
      'Porcentaje': `${((lotes.filter((l) => l.estado === 'reservado').length / lotes.length) * 100).toFixed(1)}%`,
    },
    {
      'Estado': 'Vendido',
      'Cantidad': lotes.filter((l) => l.estado === 'vendido').length,
      'Porcentaje': `${((lotes.filter((l) => l.estado === 'vendido').length / lotes.length) * 100).toFixed(1)}%`,
    },
  ];
  const estadoSheet = XLSX.utils.json_to_sheet(estadoStats);
  XLSX.utils.book_append_sheet(workbook, estadoSheet, 'Por Estado');

  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `reporte-${proyecto.nombre.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.xlsx`);
}

/**
 * Prepares data for export based on filters
 */
export async function prepareExportData(
  proyectoId?: string,
  includeStats: boolean = true
): Promise<ExportData> {
  // This would typically fetch data from the server
  // For now, return a structure that can be filled by the calling code
  return {
    proyectos: [],
    lotes: [],
    ventas: [],
    reservas: [],
  };
}

// ============================================================================
// IMPORT FUNCTIONS
// ============================================================================

/**
 * Parses an Excel/CSV file and returns lote data
 */
export function parseImportFile(file: File): Promise<Array<Record<string, any>>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Array<Record<string, any>>;

        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsBinaryString(file);
  });
}

/**
 * Validates imported lote data
 */
export function validateImportedLotes(
  data: Array<Record<string, any>>
): { valid: Array<any>; invalid: Array<{ row: number; errors: string[] }> } {
  const valid: Array<any> = [];
  const invalid: Array<{ row: number; errors: string[] }> = [];

  data.forEach((row, index) => {
    const errors: string[] = [];

    // Required fields
    if (!row['Código'] && !row['codigo']) {
      errors.push('Falta código de lote');
    }

    // Validate numbers
    if (row['Área (m²)'] || row['area']) {
      const area = Number(row['Área (m²)'] || row['area']);
      if (isNaN(area) || area <= 0) {
        errors.push('Área inválida');
      }
    }

    if (row['Precio Lista'] || row['precio_lista']) {
      const precio = Number(row['Precio Lista'] || row['precio_lista']);
      if (isNaN(precio) || precio < 0) {
        errors.push('Precio inválido');
      }
    }

    // Validate estado
    const estado = row['Estado'] || row['estado'];
    if (estado && !['disponible', 'reservado', 'vendido'].includes(estado.toLowerCase())) {
      errors.push('Estado inválido (debe ser: disponible, reservado, vendido)');
    }

    if (errors.length > 0) {
      invalid.push({ row: index + 2, errors }); // +2 for header and 0-index
    } else {
      valid.push({
        codigo: row['Código'] || row['codigo'],
        etapa: row['Etapa'] || row['etapa'] || null,
        manzana: row['Manzana'] || row['manzana'] || null,
        area: row['Área (m²)'] || row['area'] || null,
        precio_lista: row['Precio Lista'] || row['precio_lista'] || null,
        precio_venta: row['Precio Venta'] || row['precio_venta'] || null,
        estado: (row['Estado'] || row['estado'] || 'disponible').toLowerCase(),
        descripcion: row['Descripción'] || row['descripcion'] || null,
      });
    }
  });

  return { valid, invalid };
}
