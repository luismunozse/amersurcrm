"use client";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { ProformaDatos, ProformaMoneda, ProformaRecord } from "@/types/proforma";

const TEMPLATE_PATH = "/proforma/plantilla-proforma.pdf";
const PAGE_WIDTH = 595.2; // pts
const PAGE_HEIGHT = 841.92; // pts
const ORIGINAL_WIDTH = 1240; // px medidos del diseño
const SCALE = PAGE_WIDTH / ORIGINAL_WIDTH;
const DEFAULT_FONT_SIZE = 10;
const CELL_PADDING_PX = 14;

type BoundsPx = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type DrawOptions = {
  fontSize?: number;
  paddingPx?: number;
  maxLines?: number;
  color?: ReturnType<typeof rgb>;
  verticalAlign?: "bottom" | "center";
};

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
    email: bounds(704, 434, 1131, 473),
    observacion: bounds(704, 473, 1131, 512),
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

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const datos = mergeDatos(DEFAULT_DATOS, proforma.datos);

  // Cabecera
  if (proforma.numero) {
    drawTextInBounds(page, regularFont, `N° ${proforma.numero}`, CELLS.numeroProforma, {
      fontSize: 11,
      paddingPx: 6,
      maxLines: 1,
    });
  }
  drawTextInBounds(
    page,
    regularFont,
    `Emitida el ${formatFecha(proforma.created_at ?? proforma.updated_at ?? new Date())}`,
    CELLS.fechaEmision,
    { fontSize: 9, paddingPx: 6, maxLines: 1 },
  );

  // Datos cliente
  drawTextInBounds(page, boldFont, textOrDash(datos.cliente.nombre), CELLS.cliente.nombre, {
    verticalAlign: "center",
  });
  drawTextInBounds(page, regularFont, textOrDash(datos.cliente.dni), CELLS.cliente.dni, {
    verticalAlign: "center",
  });
  drawTextInBounds(page, regularFont, textOrDash(datos.cliente.telefono), CELLS.cliente.telefono, {
    verticalAlign: "center",
  });
  drawTextInBounds(page, regularFont, textOrDash(datos.cliente.email), CELLS.cliente.email, {
    verticalAlign: "center",
  });

  // Asesor
  drawTextInBounds(page, boldFont, textOrDash(datos.asesor.nombre), CELLS.asesor.nombre, {
    verticalAlign: "center",
  });
  drawTextInBounds(page, regularFont, textOrDash(datos.asesor.celular), CELLS.asesor.celular, {
    verticalAlign: "center",
  });
  drawTextInBounds(page, regularFont, "", CELLS.asesor.email, { verticalAlign: "center" });
  drawTextInBounds(page, regularFont, "", CELLS.asesor.observacion, { verticalAlign: "center" });

  // Terreno
  drawTextInBounds(page, boldFont, textOrDash(datos.terreno.proyecto), CELLS.terreno.proyecto, {
    verticalAlign: "center",
  });
  drawTextInBounds(page, regularFont, textOrDash(datos.terreno.lote), CELLS.terreno.lote, {
    verticalAlign: "center",
  });
  drawTextInBounds(page, regularFont, textOrDash(datos.terreno.etapa), CELLS.terreno.etapa, {
    verticalAlign: "center",
  });
  drawTextInBounds(page, regularFont, textOrDash(datos.terreno.area), CELLS.terreno.area, {
    verticalAlign: "center",
  });
  drawTextInBounds(
    page,
    boldFont,
    formatCurrency(datos.terreno.precioLista ?? datos.precios.precioLista, proforma.moneda),
    CELLS.terreno.precioLista,
    { verticalAlign: "center" },
  );

  // Precios
  drawTextInBounds(
    page,
    regularFont,
    formatCurrency(datos.precios.precioLista, proforma.moneda),
    CELLS.precios.lista,
    { verticalAlign: "center" },
  );
  drawTextInBounds(
    page,
    regularFont,
    formatCurrency(datos.precios.descuento, proforma.moneda),
    CELLS.precios.descuento,
    { verticalAlign: "center" },
  );
  drawTextInBounds(
    page,
    boldFont,
    formatCurrency(datos.precios.precioFinal ?? proforma.total, proforma.moneda),
    CELLS.precios.final,
    { verticalAlign: "center" },
  );

  // Forma de pago
  drawTextInBounds(
    page,
    regularFont,
    formatCurrency(datos.formaPago.separacion, proforma.moneda),
    CELLS.formaPago.separacion,
    { verticalAlign: "center" },
  );
  drawTextInBounds(
    page,
    regularFont,
    formatCurrency(datos.formaPago.abonoPrincipal, proforma.moneda),
    CELLS.formaPago.abonoPrincipal,
    { verticalAlign: "center" },
  );
  drawTextInBounds(
    page,
    regularFont,
    textOrDash(datos.formaPago.numeroCuotas?.toString()),
    CELLS.formaPago.cuotas,
    { verticalAlign: "center" },
  );

  // Medios de pago
  drawTextInBounds(page, regularFont, textOrDash(datos.mediosPago.soles), CELLS.mediosPago.soles, {
    verticalAlign: "center",
  });
  drawTextInBounds(page, regularFont, textOrDash(datos.mediosPago.dolares), CELLS.mediosPago.dolares, {
    verticalAlign: "center",
  });

  // Comentarios
  if (datos.comentariosAdicionales) {
    drawParagraph(page, regularFont, datos.comentariosAdicionales, CELLS.comentarios, {
      fontSize: 9,
      paddingPx: 12,
    });
  }

  // Firmas sugeridas
  drawTextInBounds(page, regularFont, textOrDash(datos.cliente.nombre), CELLS.firmas.cliente, {
    fontSize: 9,
    paddingPx: 6,
    verticalAlign: "center",
  });
  drawTextInBounds(page, regularFont, textOrDash(datos.asesor.nombre), CELLS.firmas.asesor, {
    fontSize: 9,
    paddingPx: 6,
    verticalAlign: "center",
  });

  // Nota
  const nota = `Oferta válida por ${datos.validezDias ?? 3} día(s) hábil(es) desde la fecha de emisión.`;
  drawText(page, regularFont, nota, px(103), pxY(1275), { fontSize: 8 });

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

function bounds(left: number, top: number, right: number, bottom: number): BoundsPx {
  return { left, top, right, bottom };
}

function px(value: number) {
  return value * SCALE;
}

function pxY(pixelY: number) {
  return PAGE_HEIGHT - pixelY * SCALE;
}

function boundsToRect(boundsPx: BoundsPx) {
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
  boundsPx: BoundsPx,
  options: DrawOptions = {},
) {
  const value = rawValue || "—";
  const rect = boundsToRect(boundsPx);
  const fontSize = options.fontSize ?? DEFAULT_FONT_SIZE;
  const padding = px(options.paddingPx ?? CELL_PADDING_PX);
  const maxWidth = rect.width - padding * 2;
  const lineGap = 2;
  const maxLines = options.maxLines ?? Math.max(1, Math.floor((rect.height - padding * 2) / (fontSize + lineGap)));

  const lines = wrapText(value, font, fontSize, maxWidth, maxLines);
  const lineHeight = fontSize + lineGap;
  const totalHeight = lineHeight * lines.length - lineGap;

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
  boundsPx: BoundsPx,
  options: DrawOptions = {},
) {
  const rect = boundsToRect(boundsPx);
  const padding = px(options.paddingPx ?? CELL_PADDING_PX);
  const fontSize = options.fontSize ?? 9;
  const lineGap = 2;
  const maxWidth = rect.width - padding * 2;
  const maxLines = options.maxLines ?? Math.floor((rect.height - padding * 2) / (fontSize + lineGap));
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
    cursorY -= fontSize + lineGap;
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
  if (!sanitized) return ["—"];

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

function formatCurrency(value: number | null | undefined, currency?: ProformaMoneda) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
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

function textOrDash(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "—";
  const str = typeof value === "number" ? value.toString() : value.trim();
  return str.length > 0 ? str : "—";
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

function formatFecha(value: string | Date | null | undefined) {
  try {
    const date = value instanceof Date ? value : new Date(value ?? Date.now());
    return date.toLocaleDateString("es-PE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return "";
  }
}
