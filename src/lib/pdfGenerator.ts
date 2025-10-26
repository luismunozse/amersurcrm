import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
}

export function generarReportePDF(data: ReporteData): jsPDF {
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

export function descargarReportePDF(data: ReporteData, nombreArchivo?: string): void {
  const doc = generarReportePDF(data);
  const fileName = nombreArchivo || `reporte-amersur-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

export function abrirReportePDF(data: ReporteData): void {
  const doc = generarReportePDF(data);
  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  window.open(url, '_blank');
}
