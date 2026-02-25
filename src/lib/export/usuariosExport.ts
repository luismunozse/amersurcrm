/**
 * Configuración de exportación para usuarios del CRM
 */

import type { ExportColumn, ExportFormat, ExportOptions } from './filteredExport';

export interface UsuarioExportFilters {
  q?: string;
  rol?: string;
  estado?: string;
}

function getDefaultUsuarioColumns(): ExportColumn[] {
  return [
    { key: 'nombre_completo', label: 'Nombre Completo', width: 28 },
    { key: 'username', label: 'Username', width: 18 },
    { key: 'email', label: 'Email', width: 28 },
    { key: 'dni', label: 'DNI', width: 12, format: (v) => v || '-' },
    { key: 'telefono', label: 'Teléfono', width: 15, format: (v) => v || '-' },
    {
      key: 'rol',
      label: 'Rol',
      width: 18,
      format: (v) => {
        if (!v) return '-';
        const nombre = typeof v === 'object' ? v.nombre : v;
        return nombre ? nombre.replace('ROL_', '').replace('_', ' ') : '-';
      },
    },
    {
      key: 'activo',
      label: 'Estado',
      width: 12,
      format: (v) => (v ? 'Activo' : 'Inactivo'),
    },
    {
      key: 'meta_mensual',
      label: 'Meta Mensual (S/.)',
      width: 18,
      format: (v) => (typeof v === 'number' ? `S/ ${v.toLocaleString()}` : '-'),
    },
    {
      key: 'comision_porcentaje',
      label: 'Comisión (%)',
      width: 14,
      format: (v) => (typeof v === 'number' ? `${v}%` : '-'),
    },
    {
      key: 'created_at',
      label: 'Fecha Creación',
      width: 16,
      format: (v) => (v ? new Date(v).toLocaleDateString('es-PE') : '-'),
    },
    {
      key: 'last_sign_in_at',
      label: 'Último Acceso',
      width: 18,
      format: (v) => (v ? new Date(v).toLocaleString('es-PE') : 'Nunca'),
    },
  ];
}

/**
 * Transforma y exporta usuarios filtrados.
 * Reutiliza la infraestructura interna de filteredExport.
 */
export async function exportFilteredUsuarios(
  usuarios: any[],
  filters: UsuarioExportFilters,
  format: ExportFormat = 'excel',
  options: ExportOptions = {}
): Promise<void> {
  // Importar dinámicamente para evitar circular dependency
  const mod = await import('./filteredExport');

  const {
    fileName = 'usuarios',
    includeFiltersSheet = true,
    includeTimestamp = true,
    columns = getDefaultUsuarioColumns(),
  } = options;

  const timestamp = includeTimestamp
    ? `-${new Date().toISOString().slice(0, 10)}-${Date.now()}`
    : '';
  const ext = format === 'excel' ? 'xlsx' : format;
  const finalFileName = `${fileName}${timestamp}.${ext}`;

  // Transform rows
  const transformedData = usuarios.map((u) => {
    const row: Record<string, string> = {};
    for (const col of columns) {
      let value = u[col.key];
      if (col.key.includes('.')) {
        value = col.key.split('.').reduce((o: any, k: string) => o?.[k], u);
      }
      row[col.label] = col.format ? col.format(value) : (value || '-');
    }
    return row;
  });

  // Build filter metadata
  const filterMetadata: Array<{ filtro: string; valor: string }> = [];
  if (filters.q) filterMetadata.push({ filtro: 'Búsqueda', valor: filters.q });
  if (filters.rol) filterMetadata.push({ filtro: 'Rol', valor: filters.rol });
  if (filters.estado) filterMetadata.push({ filtro: 'Estado', valor: filters.estado });
  filterMetadata.push(
    { filtro: 'Fecha de Exportación', valor: new Date().toLocaleString('es-PE') },
    { filtro: 'Registros Exportados', valor: String(usuarios.length) }
  );

  // Use xlsx for excel/csv
  if (format === 'excel' || format === 'csv') {
    const XLSX = await import('xlsx');

    if (format === 'excel') {
      const workbook = XLSX.utils.book_new();
      const dataSheet = XLSX.utils.json_to_sheet(transformedData);
      dataSheet['!cols'] = columns.map((col) => ({ wch: col.width || 15 }));
      XLSX.utils.book_append_sheet(workbook, dataSheet, 'Usuarios');

      if (includeFiltersSheet && filterMetadata.length > 0) {
        const filtersSheet = XLSX.utils.json_to_sheet(filterMetadata);
        filtersSheet['!cols'] = [{ wch: 25 }, { wch: 40 }];
        XLSX.utils.book_append_sheet(workbook, filtersSheet, 'Filtros Aplicados');
      }

      XLSX.writeFile(workbook, finalFileName);
    } else {
      let csvContent = '';
      if (includeFiltersSheet && filterMetadata.length > 0) {
        csvContent += '# FILTROS APLICADOS\n';
        filterMetadata.forEach((m) => { csvContent += `# ${m.filtro}: ${m.valor}\n`; });
        csvContent += '\n';
      }
      const ws = XLSX.utils.json_to_sheet(transformedData);
      csvContent += XLSX.utils.sheet_to_csv(ws);

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = finalFileName;
      link.click();
      URL.revokeObjectURL(link.href);
    }
  } else {
    // PDF
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 14;

    // Header
    doc.setFillColor(12, 25, 59);
    doc.roundedRect(marginX - 4, 10, pageWidth - (marginX - 4) * 2, 24, 4, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('AMERSUR CRM', marginX, 20);
    doc.setFontSize(16);
    doc.text('Reporte de Usuarios', marginX, 30);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado: ${new Date().toLocaleString('es-PE')}`, pageWidth - marginX, 20, { align: 'right' });
    doc.text(`Registros: ${usuarios.length}`, pageWidth - marginX, 27, { align: 'right' });

    doc.setTextColor(0, 0, 0);

    // Data table
    const headers = columns.map((c) => c.label);
    const rows = transformedData.map((row) => columns.map((c) => row[c.label] || '-'));

    autoTable(doc, {
      startY: 42,
      head: [headers],
      body: rows,
      theme: 'striped',
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [12, 25, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [247, 249, 252] },
      margin: { left: marginX, right: marginX },
    });

    doc.save(finalFileName);
  }
}
