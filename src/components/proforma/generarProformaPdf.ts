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
    nombre: bounds(413, 397, 701, 432),
    dni: bounds(413, 435, 701, 471),
    telefono: bounds(413, 476, 701, 509),
    email: bounds(413, 513, 701, 548),
  },
  asesor: {
    nombre: bounds(995, 397, 1128, 432),
    celular: bounds(995, 435, 1128, 470),
  },
  terreno: {
    proyecto: bounds(105, 649, 316, 682),
    lote: bounds(321, 649, 416, 682),
    etapa: bounds(421, 649, 826, 682),
    area: bounds(831, 649, 1006, 682),
    precioLista: bounds(1006, 649, 1131, 682),
  },
  precios: {
    lista: bounds(354, 841, 558, 877),
    descuento: bounds(354, 881, 558, 915),
    final: bounds(354, 919, 558, 957),
  },
  formaPago: {
    separacion: bounds(805, 842, 906, 877),
    abonoPrincipal: bounds(805, 881, 906, 916),
    cuotas: bounds(805, 920, 906, 954),
  },
  mediosPago: {
    soles: bounds(618, 1035, 656, 1073),
    dolares: bounds(618, 1035, 656, 1073),
  },
  firmas: {
    cliente: bounds(145, 1455, 457, 1501),
    asesor: bounds(709, 1455, 1022, 1501),
  },
  comentarios: bounds(105, 1260, 1131, 1340),
  numeroProforma: bounds(1000, 345, 1131, 375),
  fechaEmision: bounds(1000, 375, 1131, 405),
  cuentas: bounds(584, 1339, 1129, 1438),
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

  const _fechaEmision = formatFecha(proforma.created_at ?? proforma.updated_at ?? new Date());
  fillField(fields, "numero_proforma", proforma.numero ?? "", () => {
    if (proforma.numero) {
      drawTextInBounds(page, regularFont, `N° ${proforma.numero}`, CELLS.numeroProforma, {
        fontSize: 11,
        paddingPx: 6,
        maxLines: 1,
      });
    }
  });
  // fecha_emision: no se dibuja manualmente, ya está en el template

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

  if (!setFieldText(fields, "terreno_proyecto_1", datos.terreno.proyecto)) {
    drawTextInBounds(page, regularFont, textOrDash(datos.terreno.proyecto), CELLS.terreno.proyecto, {
      verticalAlign: "center",
    });
  }
  if (!setFieldText(fields, "terreno_lote_1", datos.terreno.lote)) {
    drawTextInBounds(page, regularFont, textOrDash(datos.terreno.lote), CELLS.terreno.lote, { verticalAlign: "center" });
  }
  if (!setFieldText(fields, "terreno_etapa_1", datos.terreno.etapa)) {
    drawTextInBounds(page, regularFont, textOrDash(datos.terreno.etapa), CELLS.terreno.etapa, { verticalAlign: "center" });
  }
  if (!setFieldText(fields, "terreno_area_1", datos.terreno.area)) {
    drawTextInBounds(page, regularFont, textOrDash(datos.terreno.area), CELLS.terreno.area, { verticalAlign: "center" });
  }

  const terrenoPrecio = formatCurrencyValue(datos.terreno.precioLista ?? datos.precios.precioLista, proforma.moneda);
  if (!setFieldText(fields, "terreno_precio_lista", terrenoPrecio)) {
    drawTextInBounds(page, regularFont, terrenoPrecio || textOrDash(null), CELLS.terreno.precioLista, {
      verticalAlign: "center",
    });
  }

  const precioLista = formatCurrencyValue(datos.precios.precioLista, proforma.moneda);
  if (!setFieldText(fields, "precio_lista", precioLista)) {
    drawTextInBounds(page, regularFont, precioLista || textOrDash(null), CELLS.precios.lista, { verticalAlign: "center" });
  }

  const precioDesc = formatCurrencyValue(datos.precios.descuento, proforma.moneda);
  if (!setFieldText(fields, "precio_descuento", precioDesc)) {
    drawTextInBounds(page, regularFont, precioDesc || textOrDash(null), CELLS.precios.descuento, {
      verticalAlign: "center",
    });
  }

  const precioFinal = formatCurrencyValue(datos.precios.precioFinal ?? proforma.total, proforma.moneda);
  if (!setFieldText(fields, "precio_final", precioFinal)) {
    drawTextInBounds(page, regularFont, precioFinal || textOrDash(null), CELLS.precios.final, { verticalAlign: "center" });
  }

  const separacion = formatCurrencyValue(datos.formaPago.separacion, proforma.moneda);
  if (!setFieldText(fields, "forma_separacion", separacion)) {
    drawTextInBounds(page, regularFont, separacion || textOrDash(null), CELLS.formaPago.separacion, {
      verticalAlign: "center",
    });
  }

  const abono = formatCurrencyValue(datos.formaPago.abonoPrincipal, proforma.moneda);
  if (!setFieldText(fields, "forma_abono_principal", abono)) {
    drawTextInBounds(page, regularFont, abono || textOrDash(null), CELLS.formaPago.abonoPrincipal, {
      verticalAlign: "center",
    });
  }

  const cuotas = datos.formaPago.numeroCuotas != null ? `${datos.formaPago.numeroCuotas}` : "";
  if (!setFieldText(fields, "forma_numero_cuotas", cuotas)) {
    drawTextInBounds(page, regularFont, textOrDash(cuotas), CELLS.formaPago.cuotas, { verticalAlign: "center" });
  }

  // Etiquetas de medios de pago junto a los checkboxes
  // Checkbox Soles en x=297, Checkbox Dólares en x=348 (coords PDF)
  page.drawText("S/.", {
    x: 283,
    y: 333,
    font: regularFont,
    size: 8,
    color: COLOR_TEXT,
  });
  page.drawText("US$", {
    x: 368,
    y: 333,
    font: regularFont,
    size: 8,
    color: COLOR_TEXT,
  });

  // Extraer y configurar cuentas bancarias
  const cuentasBancarias = extraerCuentasBancarias(datos.cuentasEmpresa);

  // Cuenta en Soles
  if (cuentasBancarias.soles) {
    setFieldText(fields, "tipo_cuenta_soles", cuentasBancarias.soles.tipo);
    setFieldText(fields, "numero_cuenta_soles", cuentasBancarias.soles.numero);
  }

  // Cuenta en Dólares
  if (cuentasBancarias.dolares) {
    setFieldText(fields, "tipo_cuenta_dolares", cuentasBancarias.dolares.tipo);
    setFieldText(fields, "numero_cuenta_dolares", cuentasBancarias.dolares.numero);
  }

  if (datos.comentariosAdicionales) {
    drawParagraph(page, regularFont, datos.comentariosAdicionales, CELLS.comentarios, {
      fontSize: 9,
      paddingPx: 12,
    });
  }

  if (!setFieldText(fields, "firma_cliente", datos.cliente.nombre)) {
    drawTextInBounds(page, regularFont, textOrDash(datos.cliente.nombre), CELLS.firmas.cliente, {
      fontSize: 9,
      paddingPx: 6,
      verticalAlign: "center",
    });
  }
  if (!setFieldText(fields, "firma_asesor", datos.asesor.nombre)) {
    drawTextInBounds(page, regularFont, textOrDash(datos.asesor.nombre), CELLS.firmas.asesor, {
      fontSize: 9,
      paddingPx: 6,
      verticalAlign: "center",
    });
  }

  // Nota de validez: no se dibuja manualmente, ya está en el template

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

function _pxY(pixelY: number) {
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
  const value = sanitizeForWinAnsi(rawValue) || "";
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
  const sanitizedText = sanitizeForWinAnsi(text);
  const rect = boundsToRect(boundsPx);
  const padding = px(options.paddingPx ?? CELL_PADDING_PX);
  const fontSize = options.fontSize ?? 9;
  const maxWidth = rect.width - padding * 2;
  const maxLines = options.maxLines ?? Math.floor((rect.height - padding * 2) / (fontSize + LINE_GAP));
  const lines = wrapText(sanitizedText, font, fontSize, maxWidth, maxLines);

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

function _drawText(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  options: { fontSize?: number; color?: ReturnType<typeof rgb> } = {},
) {
  if (!text) return;
  const sanitizedText = sanitizeForWinAnsi(text);
  page.drawText(sanitizedText, {
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

/**
 * Sanitiza texto para que sea compatible con WinAnsi encoding (Latin-1).
 * Remueve o reemplaza caracteres que no pueden ser codificados por fuentes estándar PDF.
 */
function sanitizeForWinAnsi(text: string | null | undefined): string {
  if (!text) return "";

  // Normalizar y remover diacríticos
  let sanitized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Reemplazar caracteres fuera del rango WinAnsi (0x00-0xFF)
  // con su equivalente más cercano o removerlos
  sanitized = sanitized.replace(/[^\x00-\xFF]/g, "");

  return sanitized;
}

interface CuentaBancaria {
  tipo: string;
  numero: string;
}

interface CuentasBancarias {
  soles: CuentaBancaria | null;
  dolares: CuentaBancaria | null;
}

function extraerCuentasBancarias(valores: string[] | undefined): CuentasBancarias {
  const resultado: CuentasBancarias = {
    soles: null,
    dolares: null,
  };

  // Valores por defecto
  const DEFAULT_SOLES = { tipo: "CCI BCP Soles", numero: "002-123-45678901234-56" };
  const DEFAULT_DOLARES = { tipo: "CCI BCP Dólares", numero: "002-987-65432109876-54" };

  if (!valores || valores.length === 0) {
    return {
      soles: DEFAULT_SOLES,
      dolares: DEFAULT_DOLARES,
    };
  }

  // Buscar cuentas en soles y dólares
  valores.forEach((linea) => {
    if (!linea || linea.trim().length === 0) return;

    const lineaNormalizada = linea.toLowerCase();

    // Detectar si es cuenta en soles o dólares
    const esSoles = lineaNormalizada.includes("sole") || lineaNormalizada.includes("pen");
    const esDolares = lineaNormalizada.includes("dólar") || lineaNormalizada.includes("dolar") || lineaNormalizada.includes("usd");

    // Extraer tipo y número separados por ":"
    const partes = linea.split(":");
    if (partes.length >= 2) {
      const tipo = partes[0].trim();
      const numero = partes.slice(1).join(":").trim();

      if (esSoles && !resultado.soles) {
        resultado.soles = { tipo, numero };
      } else if (esDolares && !resultado.dolares) {
        resultado.dolares = { tipo, numero };
      }
    }
  });

  // Si no se encontraron cuentas, usar las por defecto
  if (!resultado.soles) {
    resultado.soles = DEFAULT_SOLES;
  }
  if (!resultado.dolares) {
    resultado.dolares = DEFAULT_DOLARES;
  }

  return resultado;
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
  const sanitizedValue = value ? sanitizeForWinAnsi(value.toString()) : "";
  field.setText(sanitizedValue);
  return true;
}

function fillField(
  fields: Map<string, PDFTextField>,
  name: string,
  value: string | null | undefined,
  fallback: () => void,
) {
  if (!setFieldText(fields, name, value)) {
    fallback();
  }
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
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
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
