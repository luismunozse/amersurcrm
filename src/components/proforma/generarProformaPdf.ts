"use client";

import { jsPDF } from "jspdf";
import type { ProformaRecord } from "@/types/proforma";

const PRIMARY_COLOR = { r: 92, g: 140, b: 33 };
const DARK_COLOR = { r: 27, g: 44, b: 61 };
const BORDER_COLOR = { r: 210, g: 215, b: 222 };

async function loadImageAsDataURL(src: string): Promise<string | null> {
  try {
    const response = await fetch(src);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("No se pudo cargar la imagen", src, error);
    return null;
  }
}

function formatCurrency(value: number | null | undefined, currency: string) {
  if (value === null || value === undefined) return "—";
  try {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: currency === "USD" ? "USD" : "PEN",
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function textOrDash(value: string | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  return value;
}

function drawFieldBlock(
  doc: jsPDF,
  opts: {
    x: number;
    y: number;
    width: number;
    label: string;
    value: string;
    height?: number;
  },
) {
  const height = opts.height ?? 8;
  doc.setDrawColor(BORDER_COLOR.r, BORDER_COLOR.g, BORDER_COLOR.b);
  doc.rect(opts.x, opts.y, opts.width, height);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text(opts.label.toUpperCase(), opts.x + 2, opts.y + 3.2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(34, 41, 57);
  const textY = opts.y + height - 2;
  doc.text(opts.value || "—", opts.x + 2, textY);
}

function drawSectionTitle(doc: jsPDF, title: string, x: number, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(PRIMARY_COLOR.r, PRIMARY_COLOR.g, PRIMARY_COLOR.b);
  doc.text(title.toUpperCase(), x, y);
}

function drawList(doc: jsPDF, items: string[], x: number, y: number, width: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(34, 41, 57);
  let currentY = y;
  items.forEach((item) => {
    const lines = doc.splitTextToSize(`• ${item}`, width);
    doc.text(lines, x, currentY);
    currentY += lines.length * 4.2;
  });
  return currentY;
}

export async function generarProformaPdf(proforma: ProformaRecord) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;

  // Cabecera
  doc.setFillColor(DARK_COLOR.r, DARK_COLOR.g, DARK_COLOR.b);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setFillColor(PRIMARY_COLOR.r, PRIMARY_COLOR.g, PRIMARY_COLOR.b);
  doc.rect(0, 28, pageWidth, 10, "F");

  const logo = await loadImageAsDataURL("/amersur-logo-b.png");
  if (logo) {
    doc.addImage(logo, "PNG", margin, 5, 40, 20);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("+51 969 306 754", pageWidth - margin, 9, { align: "right" });
  doc.text("www.amersurac.com", pageWidth - margin, 14, { align: "right" });
  doc.text("info@amersurac.com", pageWidth - margin, 19, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text("#TuPropiedadSinFrontera", pageWidth - margin, 24, { align: "right" });

  // Título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(34, 41, 57);
  doc.text("PROFORMA DE AMERSUR", pageWidth / 2, 48, { align: "center" });

  let cursorY = 60;
  const columnWidth = (pageWidth - margin * 2) / 2;

  const datos = proforma.datos ?? {
    cliente: { nombre: "", dni: "", telefono: "", email: "" },
    asesor: { nombre: "", celular: "" },
    terreno: {},
    precios: {},
    formaPago: {},
    condicionesComerciales: [],
    mediosPago: {},
    requisitosContrato: [],
    cuentasEmpresa: [],
  };

  // Datos del cliente y asesor
  drawSectionTitle(doc, "Datos del Cliente", margin, cursorY);
  drawSectionTitle(doc, "Atendido por", margin + columnWidth, cursorY);
  cursorY += 4;

  const blockHeight = 28;
  const rowHeight = blockHeight / 4;

  const clienteFields = [
    { label: "Nombre y Apellido", value: textOrDash(datos?.cliente?.nombre) },
    { label: "DNI", value: textOrDash(datos?.cliente?.dni) },
    { label: "Teléfono", value: textOrDash(datos?.cliente?.telefono) },
    { label: "Correo Electrónico", value: textOrDash(datos?.cliente?.email) },
  ];

  clienteFields.forEach((field, index) => {
    drawFieldBlock(doc, {
      x: margin,
      y: cursorY + index * rowHeight,
      width: columnWidth - 3,
      height: rowHeight,
      label: field.label,
      value: field.value,
    });
  });

  const asesorFields = [
    { label: "Asesor(a) de Ventas", value: textOrDash(datos?.asesor?.nombre) },
    { label: "Celular", value: textOrDash(datos?.asesor?.celular) },
  ];

  asesorFields.forEach((field, index) => {
    drawFieldBlock(doc, {
      x: margin + columnWidth + 3,
      y: cursorY + index * rowHeight,
      width: columnWidth - 3,
      height: rowHeight,
      label: field.label,
      value: field.value,
    });
  });

  cursorY += blockHeight + 12;

  // Terreno
  drawSectionTitle(doc, "Características del Terreno", margin, cursorY);
  cursorY += 4;

  const terrenoFields = [
    { label: "Proyecto", value: textOrDash(datos?.terreno?.proyecto) },
    { label: "Lote", value: textOrDash(datos?.terreno?.lote) },
    { label: "Etapa / Sector", value: textOrDash(datos?.terreno?.etapa) },
    {
      label: "Área del Terreno",
      value: textOrDash(datos?.terreno?.area),
    },
    {
      label: "Precio en Lista",
      value: formatCurrency(datos?.terreno?.precioLista ?? datos?.precios?.precioLista, proforma.moneda),
    },
  ];

  const terrenoRowHeight = 8.5;
  terrenoFields.forEach((field, index) => {
    drawFieldBlock(doc, {
      x: margin + (index % 3) * ((pageWidth - margin * 2) / 3),
      y: cursorY + Math.floor(index / 3) * terrenoRowHeight,
      width: (pageWidth - margin * 2) / 3 - 2,
      height: terrenoRowHeight,
      label: field.label,
      value: field.value,
    });
  });

  cursorY += terrenoRowHeight * Math.ceil(terrenoFields.length / 3) + 12;

  // Descuentos y promociones / Forma de pago
  drawSectionTitle(doc, "Descuentos y Promociones", margin, cursorY);
  drawSectionTitle(doc, "Forma de Pago", margin + columnWidth, cursorY);
  cursorY += 4;

  const preciosFields = [
    { label: "Precio en Lista", value: formatCurrency(datos?.precios?.precioLista, proforma.moneda) },
    { label: "Descuento", value: formatCurrency(datos?.precios?.descuento, proforma.moneda) },
    { label: "Precio Final", value: formatCurrency(datos?.precios?.precioFinal ?? proforma.total, proforma.moneda) },
  ];

  preciosFields.forEach((field, index) => {
    drawFieldBlock(doc, {
      x: margin,
      y: cursorY + index * rowHeight,
      width: columnWidth - 3,
      height: rowHeight,
      label: field.label,
      value: field.value,
    });
  });

  const formaPagoFields = [
    { label: "Separación", value: formatCurrency(datos?.formaPago?.separacion, proforma.moneda) },
    { label: "Abono Principal", value: formatCurrency(datos?.formaPago?.abonoPrincipal, proforma.moneda) },
    { label: "Número de Cuotas", value: textOrDash(datos?.formaPago?.numeroCuotas?.toString()) },
  ];

  formaPagoFields.forEach((field, index) => {
    drawFieldBlock(doc, {
      x: margin + columnWidth + 3,
      y: cursorY + index * rowHeight,
      width: columnWidth - 3,
      height: rowHeight,
      label: field.label,
      value: field.value,
    });
  });

  cursorY += rowHeight * preciosFields.length + 12;

  // Condiciones comerciales
  drawSectionTitle(doc, "Condiciones Comerciales", margin, cursorY);
  cursorY += 6;
  const condiciones = datos.condicionesComerciales?.length
    ? datos.condicionesComerciales
    : [
        "Validez de oferta: 3 días hábiles desde su recepción.",
        "Pagos mediante transferencia o depósito bancario.",
        "La reserva asegura el lote seleccionado.",
      ];
  cursorY = drawList(doc, condiciones, margin, cursorY, pageWidth - margin * 2);
  cursorY += 6;

  // Medios de pago
  drawSectionTitle(doc, "Medios de Pago", margin, cursorY);
  cursorY += 5;
  drawFieldBlock(doc, {
    x: margin,
    y: cursorY,
    width: columnWidth - 3,
    height: 10,
    label: "Soles",
    value: textOrDash(datos.mediosPago?.soles),
  });
  drawFieldBlock(doc, {
    x: margin + columnWidth + 3,
    y: cursorY,
    width: columnWidth - 3,
    height: 10,
    label: "Dólares",
    value: textOrDash(datos.mediosPago?.dolares),
  });
  cursorY += 16;

  // Requisitos
  drawSectionTitle(doc, "Requisitos para Emisión de Contrato", margin, cursorY);
  cursorY += 6;
  const requisitos = datos.requisitosContrato?.length
    ? datos.requisitosContrato
    : ["DNI (anverso y reverso)", "Recibo de servicios", "Profesión u ocupación", "Número de celular", "Correo electrónico"];
  cursorY = drawList(doc, requisitos, margin, cursorY, pageWidth - margin * 2);
  cursorY += 6;

  // Cuentas de la empresa
  drawSectionTitle(doc, "Cuentas de la Empresa", margin, cursorY);
  cursorY += 6;
  const cuentas = datos.cuentasEmpresa?.length ? datos.cuentasEmpresa : ["Inversiones de América del Sur S.A.C."];
  cursorY = drawList(doc, cuentas, margin, cursorY, pageWidth - margin * 2);
  cursorY += 8;

  // Comentarios adicionales
  if (datos.comentariosAdicionales) {
    drawSectionTitle(doc, "Comentarios", margin, cursorY);
    cursorY += 6;
    const lines = doc.splitTextToSize(datos.comentariosAdicionales, pageWidth - margin * 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(lines, margin, cursorY);
    cursorY += lines.length * 4.5 + 6;
  }

  // Firmas
  const footerY = doc.internal.pageSize.getHeight() - 45;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Firma del Cliente", margin + 20, footerY);
  doc.text("Asesor(a) de Ventas - AMERSUR S.A.C.", pageWidth - margin - 70, footerY);
  doc.setDrawColor(180, 188, 196);
  doc.line(margin, footerY + 25, margin + 70, footerY + 25);
  doc.line(pageWidth - margin - 70, footerY + 25, pageWidth - margin, footerY + 25);

  // Pie
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 130, 140);
  doc.text(
    `Generado el ${new Date().toLocaleString("es-PE")} · Validez ${datos.validezDias ?? 3} días`,
    margin,
    doc.internal.pageSize.getHeight() - 12,
  );
  doc.text("AMERSUR CRM · Sistema de Gestión Comercial", margin, doc.internal.pageSize.getHeight() - 7);

  const fileName = `${proforma.numero ?? "proforma"}_${clienteSlug(
    proforma.datos?.cliente?.nombre ?? "cliente",
  )}.pdf`.replace(/\s+/g, "_");
  doc.save(fileName);
}

function clienteSlug(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}
