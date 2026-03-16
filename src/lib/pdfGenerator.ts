// Dynamic imports para reducir bundle size (~180KB ahorrados)
import type jsPDFType from 'jspdf';

interface ReporteData {
  periodo: {
    inicio: string;
    fin: string;
    dias: number;
  };
  metricas: {
    ventas: {
      valorTotal: number;
      propiedadesVendidas: number;
      promedioVenta: number;
    };
    clientes: {
      nuevos: number;
      activos: number;
      tasaConversion: number;
    };
    propiedades: {
      total: number;
      nuevas: number;
      vendidas: number;
      disponibles: number;
      valorTotal: number;
    };
    proyectos?: {
      nuevos: number;
      total: number;
    };
    vendedores: {
      activos: number;
      topVendedores: Array<{
        username: string;
        nombre: string;
        ventas: number;
        propiedades: number;
        meta: number;
      }>;
    };
  };
  tendencias?: Array<{
    mes: string;
    ventas: number;
    propiedades: number;
    clientes: number;
  }>;
}

export async function generarReportePDF(data: ReporteData): Promise<jsPDFType> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF();

  // Configuración de fuente y colores
  const primaryColor: [number, number, number] = [0, 123, 255]; // Azul
  const secondaryColor: [number, number, number] = [108, 117, 125]; // Gris

  // Título principal
  doc.setFontSize(20);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('REPORTE AMERSUR CRM', 105, 20, { align: 'center' });

  // Subtítulo con período
  doc.setFontSize(12);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  const fechaInicio = new Date(data.periodo.inicio).toLocaleDateString('es-PE');
  const fechaFin = new Date(data.periodo.fin).toLocaleDateString('es-PE');
  doc.text(`Período: ${fechaInicio} - ${fechaFin} (${data.periodo.dias} días)`, 105, 28, { align: 'center' });

  // Fecha de generación
  doc.setFontSize(10);
  doc.text(`Generado el: ${new Date().toLocaleString('es-PE')}`, 105, 34, { align: 'center' });

  let yPos = 45;

  // Función helper para formatear moneda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 0
    }).format(value);
  };

  // SECCIÓN 1: Resumen Ejecutivo
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('1. RESUMEN EJECUTIVO', 14, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  const resumenData = [
    ['Ventas Totales', formatCurrency(data.metricas.ventas.valorTotal)],
    ['Propiedades Vendidas', data.metricas.ventas.propiedadesVendidas.toString()],
    ['Ticket Promedio', formatCurrency(data.metricas.ventas.promedioVenta)],
    ['Clientes Nuevos', data.metricas.clientes.nuevos.toString()],
    ['Clientes Activos', data.metricas.clientes.activos.toString()],
    ['Tasa de Conversión', `${data.metricas.clientes.tasaConversion.toFixed(1)}%`]
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Métrica', 'Valor']],
    body: resumenData,
    theme: 'striped',
    headStyles: { fillColor: primaryColor },
    margin: { left: 14, right: 14 }
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // SECCIÓN 2: Inventario de Propiedades
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('2. INVENTARIO DE PROPIEDADES', 14, yPos);
  yPos += 8;

  const propiedadesData = [
    ['Total Propiedades', data.metricas.propiedades.total.toString()],
    ['Disponibles', data.metricas.propiedades.disponibles.toString()],
    ['Vendidas', data.metricas.propiedades.vendidas.toString()],
    ['Propiedades Nuevas', data.metricas.propiedades.nuevas.toString()],
    ['Valor Total Inventario', formatCurrency(data.metricas.propiedades.valorTotal)]
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Concepto', 'Cantidad']],
    body: propiedadesData,
    theme: 'striped',
    headStyles: { fillColor: primaryColor },
    margin: { left: 14, right: 14 }
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // SECCIÓN 3: Top Vendedores
  if (data.metricas.vendedores.topVendedores.length > 0) {
    // Nueva página si es necesario
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('3. TOP VENDEDORES', 14, yPos);
    yPos += 8;

    const vendedoresData = data.metricas.vendedores.topVendedores.map(v => [
      v.nombre,
      formatCurrency(v.ventas),
      v.propiedades.toString(),
      formatCurrency(v.meta),
      v.meta > 0 ? `${((v.ventas / v.meta) * 100).toFixed(1)}%` : 'N/A'
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Vendedor', 'Ventas', 'Propiedades', 'Meta', 'Cumplimiento']],
      body: vendedoresData,
      theme: 'striped',
      headStyles: { fillColor: primaryColor },
      margin: { left: 14, right: 14 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // SECCIÓN 4: Métricas de Equipo
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('4. MÉTRICAS DE EQUIPO', 14, yPos);
  yPos += 8;

  const equipoData = [
    ['Vendedores Activos', data.metricas.vendedores.activos.toString()],
    ['Vendedores con Ventas', data.metricas.vendedores.topVendedores.filter(v => v.ventas > 0).length.toString()],
    ['Promedio de Ventas/Vendedor', data.metricas.vendedores.topVendedores.length > 0
      ? formatCurrency(data.metricas.ventas.valorTotal / data.metricas.vendedores.topVendedores.length)
      : formatCurrency(0)]
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Métrica', 'Valor']],
    body: equipoData,
    theme: 'striped',
    headStyles: { fillColor: primaryColor },
    margin: { left: 14, right: 14 }
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // SECCIÓN 5: Proyectos
  if (data.metricas.proyectos) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('5. PROYECTOS', 14, yPos);
    yPos += 8;

    const proyectosData = [
      ['Total Proyectos', data.metricas.proyectos.total.toString()],
      ['Proyectos Nuevos (en período)', data.metricas.proyectos.nuevos.toString()],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Concepto', 'Cantidad']],
      body: proyectosData,
      theme: 'striped',
      headStyles: { fillColor: primaryColor },
      margin: { left: 14, right: 14 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // SECCIÓN 6: Tendencias Mensuales
  if (data.tendencias && data.tendencias.length > 0) {
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }

    const seccionNum = data.metricas.proyectos ? '6' : '5';
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`${seccionNum}. TENDENCIAS MENSUALES`, 14, yPos);
    yPos += 8;

    const tendenciasData = data.tendencias.map(t => [
      t.mes,
      formatCurrency(t.ventas),
      t.propiedades.toString(),
      t.clientes.toString()
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Mes', 'Ventas', 'Propiedades', 'Clientes']],
      body: tendenciasData,
      theme: 'striped',
      headStyles: { fillColor: primaryColor },
      margin: { left: 14, right: 14 }
    });
  }

  // Pie de página en todas las páginas
  const pageCount = doc.internal.pages.length - 1; // Excluir página en blanco
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(
      `AMERSUR CRM - Página ${i} de ${pageCount}`,
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  return doc;
}

// =====================================================
// Exportación por bloques - PDF individual por sección
// =====================================================

export interface BloqueReporte {
  titulo: string;
  subtitulo?: string;
  periodo?: { inicio: string; fin: string };
  tablas: Array<{
    titulo?: string;
    encabezados: string[];
    filas: string[][];
  }>;
}

export async function generarBloquePDF(bloque: BloqueReporte): Promise<jsPDFType> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF();

  const primaryColor: [number, number, number] = [0, 123, 255];
  const secondaryColor: [number, number, number] = [108, 117, 125];

  // Título
  doc.setFontSize(18);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`AMERSUR CRM - ${bloque.titulo}`, 105, 20, { align: 'center' });

  // Subtítulo
  if (bloque.subtitulo) {
    doc.setFontSize(11);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(bloque.subtitulo, 105, 28, { align: 'center' });
  }

  // Período
  if (bloque.periodo) {
    doc.setFontSize(10);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    const fi = new Date(bloque.periodo.inicio).toLocaleDateString('es-PE');
    const ff = new Date(bloque.periodo.fin).toLocaleDateString('es-PE');
    doc.text(`Período: ${fi} - ${ff}`, 105, bloque.subtitulo ? 34 : 28, { align: 'center' });
  }

  // Fecha generación
  doc.setFontSize(9);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  const yFecha = bloque.periodo ? (bloque.subtitulo ? 40 : 34) : (bloque.subtitulo ? 34 : 28);
  doc.text(`Generado el: ${new Date().toLocaleString('es-PE')}`, 105, yFecha, { align: 'center' });

  let yPos = yFecha + 10;

  // Tablas
  bloque.tablas.forEach((tabla, index) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    if (tabla.titulo) {
      doc.setFontSize(13);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`${index + 1}. ${tabla.titulo}`, 14, yPos);
      yPos += 8;
    }

    autoTable(doc, {
      startY: yPos,
      head: [tabla.encabezados],
      body: tabla.filas,
      theme: 'striped',
      headStyles: { fillColor: primaryColor },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  });

  // Pie de página
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(
      `AMERSUR CRM - ${bloque.titulo} - Página ${i} de ${pageCount}`,
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  return doc;
}

export async function exportarBloquePDF(bloque: BloqueReporte): Promise<void> {
  const doc = await generarBloquePDF(bloque);
  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  window.open(url, '_blank');
}

export async function descargarBloquePDF(bloque: BloqueReporte, nombreArchivo?: string): Promise<void> {
  const doc = await generarBloquePDF(bloque);
  const slug = bloque.titulo.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const fileName = nombreArchivo || `reporte-${slug}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

// =====================================================
// Exportación visual - captura gráficos del DOM
// =====================================================

export async function exportarSeccionVisualPDF(
  elemento: HTMLElement,
  titulo: string,
  periodo?: { inicio: string; fin: string }
): Promise<void> {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  const primaryColor: [number, number, number] = [0, 123, 255];
  const secondaryColor: [number, number, number] = [108, 117, 125];

  // Capturar el elemento completo como canvas
  const canvas = await html2canvas(elemento, {
    scale: 2, // Alta resolución
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    // Ignorar elementos interactivos (botones de filtro, paginación)
    ignoreElements: (el) => {
      return el.hasAttribute('data-pdf-ignore');
    },
  });

  const imgData = canvas.toDataURL('image/png');
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // Dimensiones del PDF (A4)
  const pdfWidth = 210; // mm
  const pdfHeight = 297; // mm
  const margin = 14;
  const headerHeight = periodo ? 48 : 38; // espacio para header
  const footerHeight = 15;
  const contentWidth = pdfWidth - margin * 2;
  const contentHeightPerPage = pdfHeight - headerHeight - footerHeight;

  // Escala: ancho de la imagen al ancho del contenido PDF
  const scale = contentWidth / imgWidth;
  const scaledImgHeight = imgHeight * scale;

  // Calcular cuántas páginas necesitamos
  const totalPages = Math.ceil(scaledImgHeight / contentHeightPerPage);

  const doc = new jsPDF('p', 'mm', 'a4');

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) doc.addPage();

    // Header en cada página
    doc.setFontSize(16);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`AMERSUR CRM - ${titulo}`, pdfWidth / 2, 16, { align: 'center' });

    if (periodo) {
      doc.setFontSize(10);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      const fi = new Date(periodo.inicio).toLocaleDateString('es-PE');
      const ff = new Date(periodo.fin).toLocaleDateString('es-PE');
      doc.text(`Período: ${fi} - ${ff}`, pdfWidth / 2, 23, { align: 'center' });
    }

    doc.setFontSize(9);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    const yGen = periodo ? 29 : 23;
    doc.text(`Generado el: ${new Date().toLocaleString('es-PE')}`, pdfWidth / 2, yGen, { align: 'center' });

    // Recortar y posicionar la porción correspondiente de la imagen
    // Usamos un canvas temporal para recortar cada "página" de la imagen
    const sourceY = page * (contentHeightPerPage / scale);
    const sourceHeight = Math.min(contentHeightPerPage / scale, imgHeight - sourceY);

    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = imgWidth;
    sliceCanvas.height = Math.ceil(sourceHeight);
    const ctx = sliceCanvas.getContext('2d')!;
    ctx.drawImage(
      canvas,
      0, Math.floor(sourceY),           // source x, y
      imgWidth, Math.ceil(sourceHeight), // source w, h
      0, 0,                              // dest x, y
      imgWidth, Math.ceil(sourceHeight)  // dest w, h
    );

    const sliceData = sliceCanvas.toDataURL('image/png');
    const sliceScaledHeight = sourceHeight * scale;

    doc.addImage(sliceData, 'PNG', margin, headerHeight, contentWidth, sliceScaledHeight);
  }

  // Pie de página
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(
      `AMERSUR CRM - ${titulo} - Página ${i} de ${pageCount}`,
      pdfWidth / 2,
      pdfHeight - 8,
      { align: 'center' }
    );
  }

  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  window.open(url, '_blank');
}

export async function descargarReportePDF(data: ReporteData, nombreArchivo?: string): Promise<void> {
  const doc = await generarReportePDF(data);
  const fileName = nombreArchivo || `reporte-amersur-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

export async function abrirReportePDF(data: ReporteData): Promise<void> {
  const doc = await generarReportePDF(data);
  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  window.open(url, '_blank');
}
