// Dynamic imports para reducir bundle size (~180KB ahorrados)
import type jsPDFType from 'jspdf';

// =====================================================
// Paleta de colores CRM Amersur
// =====================================================
const CRM = {
  primary:     [134, 144, 31]  as [number, number, number], // #86901F
  primaryHover:[107, 115, 25]  as [number, number, number], // #6B7319
  secondary:   [158, 166, 76]  as [number, number, number], // #9EA64C
  accent:      [176, 183, 109] as [number, number, number], // #B0B76D
  dark:        [15, 23, 42]    as [number, number, number],  // #0f172a
  textPrimary: [15, 23, 42]    as [number, number, number],  // #0f172a
  textSecondary:[100, 116, 139] as [number, number, number], // #64748b
  textMuted:   [148, 163, 184] as [number, number, number],  // #94a3b8
  border:      [226, 232, 240] as [number, number, number],  // #e2e8f0
  bgLight:     [248, 250, 252] as [number, number, number],  // #f8fafc
  white:       [255, 255, 255] as [number, number, number],
  success:     [34, 197, 94]   as [number, number, number],  // #22C55E
  warning:     [245, 158, 11]  as [number, number, number],  // #F59E0B
  danger:      [220, 38, 38]   as [number, number, number],  // #DC2626
};

// Logo en base64 se carga una vez
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

// =====================================================
// Helpers de diseño compartidos
// =====================================================

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;

function drawHeaderBand(doc: jsPDFType, logo: string | null) {
  // Banda superior verde
  doc.setFillColor(CRM.primary[0], CRM.primary[1], CRM.primary[2]);
  doc.rect(0, 0, PAGE_W, 3, 'F');

  // Línea accent debajo
  doc.setFillColor(CRM.accent[0], CRM.accent[1], CRM.accent[2]);
  doc.rect(0, 3, PAGE_W, 0.5, 'F');

  // Logo
  if (logo) {
    doc.addImage(logo, 'PNG', MARGIN, 7, 12, 9.6);
  }

  // Nombre empresa
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(CRM.primary[0], CRM.primary[1], CRM.primary[2]);
  doc.text('AMERSUR', logo ? MARGIN + 14 : MARGIN, 13);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(CRM.textMuted[0], CRM.textMuted[1], CRM.textMuted[2]);
  doc.text('INMOBILIARIA', logo ? MARGIN + 14 : MARGIN, 16.5);
}

function drawCoverPage(
  doc: jsPDFType,
  logo: string | null,
  titulo: string,
  subtitulo: string | null,
  periodoTexto: string | null
) {
  // Fondo completo blanco
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // Banda superior gruesa
  doc.setFillColor(CRM.primary[0], CRM.primary[1], CRM.primary[2]);
  doc.rect(0, 0, PAGE_W, 60, 'F');

  // Degradado visual (franja accent)
  doc.setFillColor(CRM.primaryHover[0], CRM.primaryHover[1], CRM.primaryHover[2]);
  doc.rect(0, 55, PAGE_W, 5, 'F');

  // Logo centrado grande
  if (logo) {
    doc.addImage(logo, 'PNG', PAGE_W / 2 - 15, 10, 30, 24);
  }

  // Título empresa
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('AMERSUR INMOBILIARIA', PAGE_W / 2, logo ? 42 : 28, { align: 'center' });

  // Línea decorativa
  const lineY = 70;
  doc.setDrawColor(CRM.accent[0], CRM.accent[1], CRM.accent[2]);
  doc.setLineWidth(0.5);
  doc.line(PAGE_W / 2 - 30, lineY, PAGE_W / 2 + 30, lineY);

  // Título del reporte
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(CRM.dark[0], CRM.dark[1], CRM.dark[2]);
  doc.text(titulo, PAGE_W / 2, 85, { align: 'center' });

  // Subtítulo
  if (subtitulo) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(CRM.textSecondary[0], CRM.textSecondary[1], CRM.textSecondary[2]);
    doc.text(subtitulo, PAGE_W / 2, 94, { align: 'center' });
  }

  // Box de información del período
  const boxY = 110;
  const boxW = 120;
  const boxX = (PAGE_W - boxW) / 2;

  // Fondo del box
  doc.setFillColor(CRM.bgLight[0], CRM.bgLight[1], CRM.bgLight[2]);
  doc.roundedRect(boxX, boxY, boxW, 30, 3, 3, 'F');

  // Borde del box
  doc.setDrawColor(CRM.border[0], CRM.border[1], CRM.border[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, boxY, boxW, 30, 3, 3, 'S');

  // Acento izquierdo del box
  doc.setFillColor(CRM.primary[0], CRM.primary[1], CRM.primary[2]);
  doc.rect(boxX, boxY, 3, 30, 'F');
  // Redondear esquinas izquierdas
  doc.setFillColor(CRM.bgLight[0], CRM.bgLight[1], CRM.bgLight[2]);

  if (periodoTexto) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(CRM.primary[0], CRM.primary[1], CRM.primary[2]);
    doc.text('PERÍODO DEL REPORTE', PAGE_W / 2, boxY + 10, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(CRM.dark[0], CRM.dark[1], CRM.dark[2]);
    doc.text(periodoTexto, PAGE_W / 2, boxY + 18, { align: 'center' });
  }

  // Fecha de generación
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(CRM.textMuted[0], CRM.textMuted[1], CRM.textMuted[2]);
  doc.text(`Generado: ${new Date().toLocaleString('es-PE')}`, PAGE_W / 2, boxY + 26, { align: 'center' });

  // Línea decorativa inferior
  doc.setDrawColor(CRM.accent[0], CRM.accent[1], CRM.accent[2]);
  doc.setLineWidth(0.3);
  doc.line(MARGIN + 20, 155, PAGE_W - MARGIN - 20, 155);

  // Footer de portada
  doc.setFillColor(CRM.primary[0], CRM.primary[1], CRM.primary[2]);
  doc.rect(0, PAGE_H - 8, PAGE_W, 8, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('Documento generado automáticamente por AMERSUR CRM', PAGE_W / 2, PAGE_H - 3, { align: 'center' });
}

function drawPageFooter(doc: jsPDFType, pageNum: number, totalPages: number, label: string) {
  // Línea separadora
  doc.setDrawColor(CRM.border[0], CRM.border[1], CRM.border[2]);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, PAGE_H - 14, PAGE_W - MARGIN, PAGE_H - 14);

  // Acento verde pequeño
  doc.setFillColor(CRM.primary[0], CRM.primary[1], CRM.primary[2]);
  doc.rect(MARGIN, PAGE_H - 14, 20, 0.5, 'F');

  // Texto izquierdo
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(CRM.textMuted[0], CRM.textMuted[1], CRM.textMuted[2]);
  doc.text(`AMERSUR CRM  |  ${label}`, MARGIN, PAGE_H - 9);

  // Paginación derecha
  doc.text(`Página ${pageNum} de ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 9, { align: 'right' });
}

function drawSectionTitle(doc: jsPDFType, titulo: string, yPos: number): number {
  // Fondo del título de sección
  doc.setFillColor(CRM.bgLight[0], CRM.bgLight[1], CRM.bgLight[2]);
  doc.roundedRect(MARGIN, yPos - 1, CONTENT_W, 9, 1.5, 1.5, 'F');

  // Acento lateral
  doc.setFillColor(CRM.primary[0], CRM.primary[1], CRM.primary[2]);
  doc.rect(MARGIN, yPos - 1, 2.5, 9, 'F');

  // Texto
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(CRM.dark[0], CRM.dark[1], CRM.dark[2]);
  doc.text(titulo, MARGIN + 6, yPos + 5.5);

  return yPos + 14;
}

const TABLE_STYLES = {
  headStyles: {
    fillColor: CRM.primary,
    textColor: [255, 255, 255] as [number, number, number],
    fontStyle: 'bold' as const,
    fontSize: 9,
    cellPadding: 4,
    halign: 'left' as const,
  },
  bodyStyles: {
    fontSize: 9,
    textColor: CRM.dark,
    cellPadding: 3.5,
  },
  alternateRowStyles: {
    fillColor: [245, 247, 242] as [number, number, number], // Verde muy sutil
  },
  styles: {
    lineColor: CRM.border,
    lineWidth: 0.2,
    font: 'helvetica',
  },
  margin: { left: MARGIN, right: MARGIN },
  tableLineColor: CRM.border,
  tableLineWidth: 0.2,
};

function checkPageBreak(doc: jsPDFType, yPos: number, needed: number, logo: string | null): number {
  if (yPos + needed > PAGE_H - 20) {
    doc.addPage();
    drawHeaderBand(doc, logo);
    return 24;
  }
  return yPos;
}

// =====================================================
// Interfaces
// =====================================================

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

// =====================================================
// Generador de Reporte Completo (rediseñado)
// =====================================================

export async function generarReportePDF(data: ReporteData): Promise<jsPDFType> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF();
  const logo = await getLogoBase64();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0 }).format(value);

  const fechaInicio = new Date(data.periodo.inicio).toLocaleDateString('es-PE');
  const fechaFin = new Date(data.periodo.fin).toLocaleDateString('es-PE');
  const periodoTexto = `${fechaInicio}  —  ${fechaFin}  (${data.periodo.dias} días)`;

  // ── Portada ──
  drawCoverPage(doc, logo, 'Reporte General', 'Análisis detallado y métricas del sistema', periodoTexto);

  // ── Página 2: Resumen Ejecutivo ──
  doc.addPage();
  drawHeaderBand(doc, logo);
  let yPos = 24;

  yPos = drawSectionTitle(doc, 'RESUMEN EJECUTIVO', yPos);

  // KPI Cards (2x3 grid)
  const kpis = [
    { label: 'Ventas Totales', value: formatCurrency(data.metricas.ventas.valorTotal), color: CRM.primary },
    { label: 'Propiedades Vendidas', value: data.metricas.ventas.propiedadesVendidas.toString(), color: CRM.secondary },
    { label: 'Ticket Promedio', value: formatCurrency(data.metricas.ventas.promedioVenta), color: CRM.accent },
    { label: 'Clientes Nuevos', value: data.metricas.clientes.nuevos.toString(), color: CRM.success },
    { label: 'Clientes Activos', value: data.metricas.clientes.activos.toString(), color: CRM.primary },
    { label: 'Tasa de Conversión', value: `${data.metricas.clientes.tasaConversion.toFixed(1)}%`, color: CRM.warning },
  ];

  const cardW = (CONTENT_W - 8) / 3;
  const cardH = 22;

  kpis.forEach((kpi, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = MARGIN + col * (cardW + 4);
    const y = yPos + row * (cardH + 4);

    // Card background
    doc.setFillColor(CRM.bgLight[0], CRM.bgLight[1], CRM.bgLight[2]);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, 'F');

    // Top accent bar
    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.rect(x, y, cardW, 2, 'F');

    // Label
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(CRM.textSecondary[0], CRM.textSecondary[1], CRM.textSecondary[2]);
    doc.text(kpi.label.toUpperCase(), x + cardW / 2, y + 9, { align: 'center' });

    // Value
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(CRM.dark[0], CRM.dark[1], CRM.dark[2]);
    doc.text(kpi.value, x + cardW / 2, y + 18, { align: 'center' });
  });

  yPos += Math.ceil(kpis.length / 3) * (cardH + 4) + 8;

  // ── Inventario de Propiedades ──
  yPos = checkPageBreak(doc, yPos, 60, logo);
  yPos = drawSectionTitle(doc, 'INVENTARIO DE PROPIEDADES', yPos);

  autoTable(doc, {
    startY: yPos,
    head: [['Concepto', 'Cantidad']],
    body: [
      ['Total Propiedades', data.metricas.propiedades.total.toString()],
      ['Disponibles', data.metricas.propiedades.disponibles.toString()],
      ['Vendidas', data.metricas.propiedades.vendidas.toString()],
      ['Propiedades Nuevas', data.metricas.propiedades.nuevas.toString()],
      ['Valor Total Inventario', formatCurrency(data.metricas.propiedades.valorTotal)],
    ],
    ...TABLE_STYLES,
  });
  yPos = (doc as any).lastAutoTable.finalY + 12;

  // ── Top Vendedores ──
  if (data.metricas.vendedores.topVendedores.length > 0) {
    yPos = checkPageBreak(doc, yPos, 60, logo);
    yPos = drawSectionTitle(doc, 'TOP VENDEDORES', yPos);

    autoTable(doc, {
      startY: yPos,
      head: [['Vendedor', 'Ventas', 'Props.', 'Meta', '% Cumpl.']],
      body: data.metricas.vendedores.topVendedores.map(v => [
        v.nombre,
        formatCurrency(v.ventas),
        v.propiedades.toString(),
        formatCurrency(v.meta),
        v.meta > 0 ? `${((v.ventas / v.meta) * 100).toFixed(1)}%` : 'N/A',
      ]),
      ...TABLE_STYLES,
    });
    yPos = (doc as any).lastAutoTable.finalY + 12;
  }

  // ── Métricas de Equipo ──
  yPos = checkPageBreak(doc, yPos, 50, logo);
  yPos = drawSectionTitle(doc, 'MÉTRICAS DE EQUIPO', yPos);

  autoTable(doc, {
    startY: yPos,
    head: [['Métrica', 'Valor']],
    body: [
      ['Vendedores Activos', data.metricas.vendedores.activos.toString()],
      ['Vendedores con Ventas', data.metricas.vendedores.topVendedores.filter(v => v.ventas > 0).length.toString()],
      ['Promedio Ventas/Vendedor', data.metricas.vendedores.topVendedores.length > 0
        ? formatCurrency(data.metricas.ventas.valorTotal / data.metricas.vendedores.topVendedores.length)
        : formatCurrency(0)],
    ],
    ...TABLE_STYLES,
  });
  yPos = (doc as any).lastAutoTable.finalY + 12;

  // ── Proyectos ──
  if (data.metricas.proyectos) {
    yPos = checkPageBreak(doc, yPos, 50, logo);
    yPos = drawSectionTitle(doc, 'PROYECTOS', yPos);

    autoTable(doc, {
      startY: yPos,
      head: [['Concepto', 'Cantidad']],
      body: [
        ['Total Proyectos', data.metricas.proyectos.total.toString()],
        ['Proyectos Nuevos (en período)', data.metricas.proyectos.nuevos.toString()],
      ],
      ...TABLE_STYLES,
    });
    yPos = (doc as any).lastAutoTable.finalY + 12;
  }

  // ── Tendencias Mensuales ──
  if (data.tendencias && data.tendencias.length > 0) {
    yPos = checkPageBreak(doc, yPos, 60, logo);
    yPos = drawSectionTitle(doc, 'TENDENCIAS MENSUALES', yPos);

    autoTable(doc, {
      startY: yPos,
      head: [['Mes', 'Ventas', 'Propiedades', 'Clientes']],
      body: data.tendencias.map(t => [
        t.mes,
        formatCurrency(t.ventas),
        t.propiedades.toString(),
        t.clientes.toString(),
      ]),
      ...TABLE_STYLES,
    });
  }

  // ── Pie de página en todas (excepto portada) ──
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);
    drawPageFooter(doc, i - 1, pageCount - 1, 'Reporte General');
  }

  return doc;
}

// =====================================================
// Exportación por bloques - PDF individual por sección
// =====================================================

export async function generarBloquePDF(bloque: BloqueReporte): Promise<jsPDFType> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF();
  const logo = await getLogoBase64();

  const periodoTexto = bloque.periodo
    ? `${new Date(bloque.periodo.inicio).toLocaleDateString('es-PE')}  —  ${new Date(bloque.periodo.fin).toLocaleDateString('es-PE')}`
    : null;

  // ── Portada ──
  drawCoverPage(doc, logo, bloque.titulo, bloque.subtitulo || null, periodoTexto);

  // ── Contenido ──
  doc.addPage();
  drawHeaderBand(doc, logo);
  let yPos = 24;

  bloque.tablas.forEach((tabla) => {
    yPos = checkPageBreak(doc, yPos, 40, logo);

    if (tabla.titulo) {
      yPos = drawSectionTitle(doc, tabla.titulo, yPos);
    }

    autoTable(doc, {
      startY: yPos,
      head: [tabla.encabezados],
      body: tabla.filas,
      ...TABLE_STYLES,
    });

    yPos = (doc as any).lastAutoTable.finalY + 12;
  });

  // Footer
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);
    drawPageFooter(doc, i - 1, pageCount - 1, bloque.titulo);
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

/**
 * Busca el mejor punto de corte en la imagen escaneando filas de píxeles.
 * Busca filas que sean mayoritariamente blancas/uniformes (espacios entre secciones).
 * Retorna la coordenada Y ideal para cortar sin partir contenido.
 */
function findCleanBreakPoint(
  canvas: HTMLCanvasElement,
  idealY: number,
  imgWidth: number,
  searchRange: number = 80 // rango de búsqueda en px hacia arriba
): number {
  const ctx = canvas.getContext('2d');
  if (!ctx) return idealY;

  // Buscar hacia arriba desde idealY para encontrar una fila "limpia"
  const sampleWidth = Math.min(imgWidth, 200); // muestrear solo parte central
  const startX = Math.floor((imgWidth - sampleWidth) / 2);
  const minY = Math.max(0, idealY - searchRange);

  let bestY = idealY;
  let bestScore = -1;

  for (let y = idealY; y >= minY; y--) {
    const rowData = ctx.getImageData(startX, y, sampleWidth, 1).data;

    // Contar cuántos píxeles son blancos o casi blancos (fondo)
    let whiteCount = 0;
    for (let i = 0; i < rowData.length; i += 4) {
      const r = rowData[i], g = rowData[i + 1], b = rowData[i + 2];
      // Píxel cercano a blanco (#f8fafc o #ffffff)
      if (r > 240 && g > 240 && b > 240) {
        whiteCount++;
      }
    }

    const score = whiteCount / (sampleWidth);

    // Si la fila es >95% blanca, es un punto de corte perfecto
    if (score > 0.95) {
      // Verificar que las filas adyacentes también sean claras (gap real)
      let gapScore = score;
      for (let dy = 1; dy <= 3 && y + dy < canvas.height; dy++) {
        const adjData = ctx.getImageData(startX, y + dy, sampleWidth, 1).data;
        let adjWhite = 0;
        for (let i = 0; i < adjData.length; i += 4) {
          if (adjData[i] > 240 && adjData[i + 1] > 240 && adjData[i + 2] > 240) adjWhite++;
        }
        gapScore += adjWhite / sampleWidth;
      }

      if (gapScore > bestScore) {
        bestScore = gapScore;
        bestY = y;
      }

      // Si tenemos un gap perfecto (>3.5 filas blancas consecutivas), usar este
      if (gapScore > 3.5) return bestY;
    }
  }

  return bestY;
}

export async function exportarSeccionVisualPDF(
  elemento: HTMLElement,
  titulo: string,
  periodo?: { inicio: string; fin: string }
): Promise<void> {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  const logo = await getLogoBase64();

  // Capturar el elemento completo como canvas
  const canvas = await html2canvas(elemento, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    ignoreElements: (el) => {
      if (el.hasAttribute('data-pdf-ignore')) return true;
      const tag = el.tagName?.toLowerCase();
      if (tag === 'button' || tag === 'select') return true;
      return false;
    },
  });

  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  const headerH = 22;
  const footerH = 16;
  const usableH = PAGE_H - headerH - footerH; // ~259mm

  // Escala base: ancho de imagen → ancho de contenido PDF
  const baseScale = CONTENT_W / imgWidth; // px → mm
  const totalHeightMm = imgHeight * baseScale;

  // ── Fit-to-page: si el contenido excede N páginas por ≤30%,
  //    reducir escala para que quepa en N páginas exactas ──
  const rawPages = totalHeightMm / usableH;
  const targetPages = Math.ceil(rawPages);
  const overflow = rawPages - Math.floor(rawPages); // fracción que sobra

  let finalScale = baseScale;
  let finalContentW = CONTENT_W;

  // Si sobra ≤30% de una página, comprimir para caber en una página menos
  // (ej: 1.25 páginas → 1 página, 2.20 páginas → 2 páginas)
  if (overflow > 0 && overflow <= 0.30 && targetPages > 1) {
    const fitPages = targetPages - 1;
    const neededHeight = fitPages * usableH;
    finalScale = neededHeight / imgHeight;
    finalContentW = imgWidth * finalScale;
  } else if (targetPages === 1 || (overflow > 0 && overflow <= 0.30 && targetPages === 1)) {
    // Contenido cabe en 1 página o apenas lo excede → forzar 1 página
    if (totalHeightMm <= usableH * 1.30) {
      finalScale = usableH / imgHeight;
      finalContentW = imgWidth * finalScale;
    }
  }

  // Asegurar que no estiramos más allá del ancho disponible
  if (finalContentW > CONTENT_W) {
    finalScale = baseScale;
    finalContentW = CONTENT_W;
  }

  const finalTotalH = imgHeight * finalScale;
  const actualPages = Math.ceil(finalTotalH / usableH);

  const doc = new jsPDF('p', 'mm', 'a4');

  const periodoTexto = periodo
    ? `${new Date(periodo.inicio).toLocaleDateString('es-PE')}  —  ${new Date(periodo.fin).toLocaleDateString('es-PE')}`
    : null;

  // ── Portada ──
  drawCoverPage(doc, logo, titulo, 'Reporte de sección con gráficos', periodoTexto);

  // ── Centrado horizontal si se redujo el ancho ──
  const offsetX = MARGIN + (CONTENT_W - finalContentW) / 2;

  // ── Páginas de contenido ──
  let currentY = 0; // posición en px de la imagen original

  for (let page = 0; page < actualPages; page++) {
    doc.addPage();
    drawHeaderBand(doc, logo);

    // Info en header
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(CRM.dark[0], CRM.dark[1], CRM.dark[2]);
    doc.text(titulo, PAGE_W - MARGIN, 13, { align: 'right' });

    if (periodoTexto) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(CRM.textMuted[0], CRM.textMuted[1], CRM.textMuted[2]);
      doc.text(periodoTexto, PAGE_W - MARGIN, 17, { align: 'right' });
    }

    // Cuántos px de imagen caben en esta página
    const maxSlicePx = usableH / finalScale;
    let sliceEndY = Math.min(currentY + maxSlicePx, imgHeight);

    // Corte inteligente solo si hay más contenido después
    if (sliceEndY < imgHeight && page < actualPages - 1) {
      sliceEndY = findCleanBreakPoint(
        canvas, Math.floor(sliceEndY), imgWidth,
        Math.floor(maxSlicePx * 0.20) // buscar en 20% del alto de página
      );
    }

    const sliceH = Math.max(1, sliceEndY - currentY);

    // Crear slice
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = imgWidth;
    sliceCanvas.height = Math.ceil(sliceH);
    const ctx = sliceCanvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(
      canvas,
      0, Math.floor(currentY),
      imgWidth, Math.ceil(sliceH),
      0, 0,
      imgWidth, Math.ceil(sliceH)
    );

    const sliceData = sliceCanvas.toDataURL('image/png');
    const sliceMmH = sliceH * finalScale;

    doc.addImage(sliceData, 'PNG', offsetX, headerH, finalContentW, sliceMmH);

    currentY = sliceEndY;
    if (currentY >= imgHeight) break;
  }

  // Footer en todas excepto portada
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);
    drawPageFooter(doc, i - 1, pageCount - 1, titulo);
  }

  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  window.open(url, '_blank');
}

// =====================================================
// Funciones de acceso público
// =====================================================

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
