"use client";

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type PDFTextField,
} from "pdf-lib";
import type { ProformaDatos, ProformaMoneda, ProformaRecord } from "@/types/proforma";

const TEMPLATE_PATH = "/proforma/plantilla-proforma.pdf";
const PAGE_WIDTH = 595.2;
const PAGE_HEIGHT = 841.92;
const ORIGINAL_WIDTH = 1240;
const SCALE = PAGE_WIDTH / ORIGINAL_WIDTH;
const DEFAULT_FONT_SIZE = 10;
const CELL_PADDING_PX = 14;
const LINE_GAP = 2;

const COLOR_TEXT = rgb(29 / 255, 41 / 255, 59 / 255);

const CELLS = {
  cliente: {
    nombre: bounds(103, 358, 411, 396),
    dni: bounds(103, 396, 411, 434),
    telefono: bounds(103, 434, 411, 473),
    email: bounds(103, 473, 411, 512),
  },
  asesor: {
    nombre: bounds(704, 358, 1131, 396),
    celular: bounds(704, 396, 1131, 434),
  },
  terreno: {
    proyecto: bounds(103, 646, 318, 683),
    lote: bounds(318, 646, 418, 683),
    etapa: bounds(418, 646, 828, 683),
    area: bounds(828, 646, 1009, 683),
    precioLista: bounds(1009, 646, 1131, 683),
  },
  precios: {
    lista: bounds(103, 799, 561, 839),
    descuento: bounds(103, 839, 561, 878),
    final: bounds(103, 878, 561, 917),
  },
  formaPago: {
    separacion: bounds(704, 799, 1131, 839),
    abonoPrincipal: bounds(704, 839, 1131, 878),
    cuotas: bounds(704, 878, 1131, 917),
  },
  mediosPago: {
    soles: bounds(103, 955, 411, 990),
    dolares: bounds(704, 955, 1131, 990),
  },
  firmas: {
    cliente: bounds(103, 1338, 320, 1387),
    asesor: bounds(420, 1338, 820, 1387),
  },
  comentarios: bounds(103, 1188, 1131, 1265),
  numeroProforma: bounds(940, 300, 1131, 335),
  fechaEmision: bounds(940, 330, 1131, 365),
};

const DEFAULT_DATOS: ProformaDatos = {
  cliente: { nombre: "", dni: "", telefono: "", email: "" },
  asesor: { nombre: "", celular: "" },
  terreno: {},
  precios: {},
  formaPago: {},
  condicionesComerciales: [],
  mediosPago: { soles: "", dolares: "" },
  requisitosContrato: [],
  cuentasEmpresa: [],
  comentariosAdicionales: "",
  validezDias: 3,
};

export interface ProformaPdfInput {
  numero?: string | null;
  moneda: ProformaMoneda;
  total?: number | null;
  datos: ProformaDatos;
  created_at?: string | Date | null;
  updated_at?: string | Date | null;
}

interface ProformaPdfResult {
  bytes: Uint8Array;
  fileName: string;
}

export async function buildProformaPdf(proforma: ProformaPdfInput): Promise<ProformaPdfResult> {
  const response = await fetch(TEMPLATE_PATH);
  if (!response.ok) {
    throw new Error("No se pudo cargar la plantilla de proforma.");
  }

  const templateBytes = await response.arrayBuffer();
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPage(0);
  const form = pdfDoc.getForm();

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const fields = collectTextFields(form);
  const datos = mergeDatos(DEFAULT_DATOS, proforma.datos);

  const fechaEmision = formatFecha(proforma.created_at ?? proforma.updated_at ?? new Date());
  fillField(fields, "numero_proforma", proforma.numero ?? "", () => {
    if (proforma.numero) {
      drawTextInBounds(page, regularFont, `N° ${proforma.numero}`, CELLS.numeroProforma, {
        fontSize: 11,
        paddingPx: 6,
        maxLines: 1,
      });
    }
  });
  fillField(fields, "fecha_emision", fechaEmision, () => {
    drawTextInBounds(page, regularFont, `Emitida el ${fechaEmision}`, CELLS.fechaEmision, {
      fontSize: 9,
      paddingPx: 6,
      maxLines: 1,
    });
  });

  fillField(fields, "cliente_nombre", datos.cliente.nombre, () => {
    drawTextInBounds(page, regularFont, textOrDash(datos.cliente.nombre), CELLS.cliente.nombre, {
      verticalAlign: "center",
    });
  });
  fillField(fields, "cliente_dni", datos.cliente.dni, () => {
    drawTextInBounds(page, regularFont, textOrDash(datos.cliente.dni), CELLS.cliente.dni, { verticalAlign: "center" });
  });
  fillField(fields, "cliente_telefono", datos.cliente.telefono, () => {
    drawTextInBounds(page, regularFont, textOrDash(datos.cliente.telefono), CELLS.cliente.telefono, {
      verticalAlign: "center",
    });
  });
  fillField(fields, "cliente_email", datos.cliente.email, () => {
    drawTextInBounds(page, regularFont, textOrDash(datos.cliente.email), CELLS.cliente.email, {
      verticalAlign: "center",
    });
  });

  fillField(fields, "asesor_nombre", datos.asesor.nombre, () => {
    drawTextInBounds(page, regularFont, textOrDash(datos.asesor.nombre), CELLS.asesor.nombre, { verticalAlign: "center" });
  });
  fillField(fields, "asesor_celular", datos.asesor.celular, () => {
    drawTextInBounds(page, regularFont, textOrDash(datos.asesor.celular), CELLS.asesor.celular, {
      verticalAlign: "center",
    });
  });

  setFieldText(fields, "terreno_proyecto", datos.terreno.proyecto) ||
    drawTextInBounds(page, regularFont, textOrDash(datos.terreno.proyecto), CELLS.terreno.proyecto, {
      verticalAlign: "center",
    });
  setFieldText(fields, "terreno_lote", datos.terreno.lote) ||
    drawTextInBounds(page, regularFont, textOrDash(datos.terreno.lote), CELLS.terreno.lote, { verticalAlign: "center" });
  setFieldText(fields, "terreno_etapa", datos.terreno.etapa) ||
    drawTextInBounds(page, regularFont, textOrDash(datos.terreno.etapa), CELLS.terreno.etapa, { verticalAlign: "center" });
  setFieldText(fields, "terreno_area", datos.terreno.area) ||
    drawTextInBounds(page, regularFont, textOrDash(datos.terreno.area), CELLS.terreno.area, { verticalAlign: "center" });

  const terrenoPrecio = formatCurrencyValue(datos.terreno.precioLista ?? datos.precios.precioLista, proforma.moneda);
  setFieldText(fields, "terreno_precio_lista", terrenoPrecio) ||
    drawTextInBounds(page, regularFont, terrenoPrecio || textOrDash(null), CELLS.terreno.precioLista, {
      verticalAlign: "center",
    });

  const precioLista = formatCurrencyValue(datos.precios.precioLista, proforma.moneda);
  setFieldText(fields, "precio_lista", precioLista) ||
    drawTextInBounds(page, regularFont, precioLista || textOrDash(null), CELLS.precios.lista, { verticalAlign: "center" });

  const precioDesc = formatCurrencyValue(datos.precios.descuento, proforma.moneda);
  setFieldText(fields, "precio_descuento", precioDesc) ||
    drawTextInBounds(page, regularFont, precioDesc || textOrDash(null), CELLS.precios.descuento, {
      verticalAlign: "center",
    });

  const precioFinal = formatCurrencyValue(datos.precios.precioFinal ?? proforma.total, proforma.moneda);
  setFieldText(fields, "precio_final", precioFinal) ||
    drawTextInBounds(page, regularFont, precioFinal || textOrDash(null), CELLS.precios.final, { verticalAlign: "center" });

  const separacion = formatCurrencyValue(datos.formaPago.separacion, proforma.moneda);
  setFieldText(fields, "forma_separacion", separacion) ||
    drawTextInBounds(page, regularFont, separacion || textOrDash(null), CELLS.formaPago.separacion, {
      verticalAlign: "center",
    });

  const abono = formatCurrencyValue(datos.formaPago.abonoPrincipal, proforma.moneda);
  setFieldText(fields, "forma_abono_principal", abono) ||
    drawTextInBounds(page, regularFont, abono || textOrDash(null), CELLS.formaPago.abonoPrincipal, {
      verticalAlign: "center",
    });

  const cuotas = datos.formaPago.numeroCuotas != null ? `${datos.formaPago.numeroCuotas}` : "";
  setFieldText(fields, "forma_numero_cuotas", cuotas) ||
    drawTextInBounds(page, regularFont, textOrDash(cuotas), CELLS.formaPago.cuotas, { verticalAlign: "center" });

  setFieldText(fields, "medios_soles", datos.mediosPago.soles) ||
    drawTextInBounds(page, regularFont, textOrDash(datos.mediosPago.soles), CELLS.mediosPago.soles, {
      verticalAlign: "center",
    });
  setFieldText(fields, "medios_dolares", datos.mediosPago.dolares) ||
    drawTextInBounds(page, regularFont, textOrDash(datos.mediosPago.dolares), CELLS.mediosPago.dolares, {
      verticalAlign: "center",
    });

  const cuentas = datos.cuentasEmpresa.join("\n");
  setFieldText(fields, "cuentas_empresa", cuentas) ||
    drawParagraph(page, regularFont, cuentas, bounds(103, 1100, 411, 1180), {
      fontSize: 8.5,
      paddingPx: 12,
      maxLines: 6,
    });

  if (datos.condicionesComerciales.length > 0) {
    drawParagraph(page, regularFont, datos.condicionesComerciales.join("\n"), bounds(103, 1015, 561, 1100), {
      fontSize: 8.5,
      paddingPx: 12,
      maxLines: 10,
    });
  }

  if (datos.requisitosContrato.length > 0) {
    drawParagraph(page, regularFont, datos.requisitosContrato.join("\n"), bounds(704, 1015, 1131, 1100), {
      fontSize: 8,
      paddingPx: 12,
      maxLines: 10,
    });
  }

  if (datos.comentariosAdicionales) {
    drawParagraph(page, regularFont, datos.comentariosAdicionales, CELLS.comentarios, {
      fontSize: 9,
      paddingPx: 12,
    });
  }

  setFieldText(fields, "firma_cliente", datos.cliente.nombre) ||
    drawTextInBounds(page, regularFont, textOrDash(datos.cliente.nombre), CELLS.firmas.cliente, {
      fontSize: 9,
      paddingPx: 6,
      verticalAlign: "center",
    });
  setFieldText(fields, "firma_asesor", datos.asesor.nombre) ||
    drawTextInBounds(page, regularFont, textOrDash(datos.asesor.nombre), CELLS.firmas.asesor, {
      fontSize: 9,
      paddingPx: 6,
      verticalAlign: "center",
    });

  const nota = `Oferta válida por ${datos.validezDias ?? 3} día(s) hábil(es) desde la fecha de emisión.`;
  drawText(page, regularFont, nota, px(103), pxY(1275), { fontSize: 8 });

  form.updateFieldAppearances(regularFont);

  const pdfBytes = await pdfDoc.save();
  return {
    bytes: pdfBytes,
    fileName: buildFileName(proforma.numero ?? null, datos),
  };
}

export async function generarProformaPdf(proforma: ProformaRecord) {
  const { bytes, fileName } = await buildProformaPdf({
    numero: proforma.numero,
    total: proforma.total,
    moneda: proforma.moneda,
    datos: proforma.datos,
    created_at: proforma.created_at,
    updated_at: proforma.updated_at,
  });
  downloadPdf(bytes, fileName);
}

function bounds(left: number, top: number, right: number, bottom: number) {
  return { left, top, right, bottom };
}

function px(value: number) {
  return value * SCALE;
}

function pxY(pixelY: number) {
  return PAGE_HEIGHT - pixelY * SCALE;
}

function boundsToRect(boundsPx: { left: number; top: number; right: number; bottom: number }) {
  const widthPx = boundsPx.right - boundsPx.left;
  const heightPx = boundsPx.bottom - boundsPx.top;
  return {
    x: px(boundsPx.left),
    y: PAGE_HEIGHT - px(boundsPx.bottom),
    width: px(widthPx),
    height: px(heightPx),
  };
}

function drawTextInBounds(
  page: PDFPage,
  font: PDFFont,
  rawValue: string,
  boundsPx: { left: number; top: number; right: number; bottom: number },
  options: {
    fontSize?: number;
    paddingPx?: number;
    maxLines?: number;
    color?: ReturnType<typeof rgb>;
    verticalAlign?: "bottom" | "center";
  } = {},
) {
  const value = rawValue || "";
  const rect = boundsToRect(boundsPx);
  const fontSize = options.fontSize ?? DEFAULT_FONT_SIZE;
  const padding = px(options.paddingPx ?? CELL_PADDING_PX);
  const maxWidth = rect.width - padding * 2;
  const maxLines = options.maxLines ?? Math.max(1, Math.floor((rect.height - padding * 2) / (fontSize + LINE_GAP)));

  const lines = wrapText(value, font, fontSize, maxWidth, maxLines);
  const lineHeight = fontSize + LINE_GAP;
  const totalHeight = lineHeight * lines.length - LINE_GAP;

  let cursorY: number;
  if (options.verticalAlign === "center") {
    const space = rect.height - totalHeight;
    cursorY = rect.y + Math.max(space / 2, 0) + totalHeight - fontSize;
  } else {
    cursorY = rect.y + rect.height - padding - fontSize;
  }

  lines.forEach((line) => {
    page.drawText(line, {
      x: rect.x + padding,
      y: cursorY,
      font,
      size: fontSize,
      color: options.color ?? COLOR_TEXT,
    });
    cursorY -= lineHeight;
  });
}

function drawParagraph(
  page: PDFPage,
  font: PDFFont,
  text: string,
  boundsPx: { left: number; top: number; right: number; bottom: number },
  options: { fontSize?: number; paddingPx?: number; maxLines?: number; color?: ReturnType<typeof rgb> } = {},
) {
  const rect = boundsToRect(boundsPx);
  const padding = px(options.paddingPx ?? CELL_PADDING_PX);
  const fontSize = options.fontSize ?? 9;
  const maxWidth = rect.width - padding * 2;
  const maxLines = options.maxLines ?? Math.floor((rect.height - padding * 2) / (fontSize + LINE_GAP));
  const lines = wrapText(text, font, fontSize, maxWidth, maxLines);

  let cursorY = rect.y + rect.height - padding - fontSize;
  lines.forEach((line) => {
    page.drawText(line, {
      x: rect.x + padding,
      y: cursorY,
      font,
      size: fontSize,
      color: options.color ?? COLOR_TEXT,
    });
    cursorY -= fontSize + LINE_GAP;
  });
}

function drawText(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  options: { fontSize?: number; color?: ReturnType<typeof rgb> } = {},
) {
  if (!text) return;
  page.drawText(text, {
    x,
    y,
    font,
    size: options.fontSize ?? DEFAULT_FONT_SIZE,
    color: options.color ?? COLOR_TEXT,
  });
}

function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
  maxLines: number,
): string[] {
  const sanitized = text.replace(/\s+/g, " ").trim();
  if (!sanitized) return [""];

  const words = sanitized.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      if (lines.length === maxLines) return lines;
    }

    if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
      let buffer = "";
      for (const char of word) {
        const candidateWord = buffer + char;
        if (font.widthOfTextAtSize(candidateWord, fontSize) > maxWidth && buffer) {
          lines.push(buffer);
          buffer = char;
          if (lines.length === maxLines) return lines;
        } else {
          buffer = candidateWord;
        }
      }
      current = buffer;
    } else {
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, maxLines);
}

function formatCurrencyValue(value: number | null | undefined, currency: ProformaMoneda): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "";
  }
  const currencyCode = currency === "USD" ? "USD" : "PEN";
  try {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currencyCode} ${value.toFixed(2)}`;
  }
}

function formatFecha(value: string | Date) {
  try {
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleDateString("es-PE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return "";
  }
}

function textOrDash(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "—";
  const str = typeof value === "number" ? value.toString() : value.trim();
  return str.length > 0 ? str : "—";
}

function collectTextFields(form: ReturnType<PDFDocument["getForm"]>) {
  const map = new Map<string, PDFTextField>();
  form.getFields().forEach((field) => {
    try {
      const textField = field as PDFTextField;
      textField.getText();
      map.set(field.getName(), textField);
    } catch {
      /* ignore non-text fields */
    }
  });
  return map;
}

function setFieldText(fields: Map<string, PDFTextField>, name: string, value: string | null | undefined) {
  const field = fields.get(name);
  if (!field) return false;
  field.setText(value ? value.toString() : "");
  return true;
}

function mergeDatos<T>(defaults: T, source: unknown): T {
  const result = clone(defaults);
  if (!source || typeof source !== "object") {
    return result;
  }
  deepAssign(result as Record<string, unknown>, source as Record<string, unknown>);
  return result;
}

function deepAssign(target: Record<string, unknown>, source: Record<string, unknown>) {
  Object.entries(source).forEach(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== "object") {
        target[key] = {};
      }
      deepAssign(target[key] as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      target[key] = value as unknown;
    }
  });
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildFileName(numero: string | null, datos: ProformaDatos) {
  const base = numero ?? "proforma";
  const clienteNombre = clienteSlug(datos?.cliente?.nombre ?? "cliente");
  return `${base}_${clienteNombre}.pdf`.replace(/\s+/g, "_");
}

function clienteSlug(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}
