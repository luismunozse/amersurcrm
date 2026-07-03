/**
 * Adapter sobre ExcelJS que reemplaza el uso de la librería `xlsx` (SheetJS),
 * vulnerable a prototype pollution + ReDoS (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9).
 *
 * Centraliza la lectura/escritura de archivos .xlsx en un único lugar testeable.
 * Solo las funciones de descarga usan APIs de browser (document/URL); el resto
 * es isomórfico y seguro de importar tanto en server como en cliente.
 */
import ExcelJS from "exceljs";

type ExcelInput = ArrayBuffer | Buffer | Uint8Array;
export type CellPrimitive = string | number | boolean | Date | null;

/**
 * Convierte el valor de una celda ExcelJS a un primitivo plano.
 * ExcelJS devuelve objetos para fórmulas, hipervínculos y rich text.
 */
function unwrapCellValue(value: unknown): CellPrimitive {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if ("result" in v) return unwrapCellValue(v.result); // fórmula { formula, result }
    if ("text" in v && "hyperlink" in v) return String(v.text ?? ""); // hipervínculo
    if (Array.isArray(v.richText)) {
      return v.richText.map((r) => (r as { text?: string })?.text ?? "").join("");
    }
    if ("error" in v) return String(v.error ?? ""); // celda con error
    return String(value);
  }
  return value as CellPrimitive;
}

async function loadFirstWorksheet(data: ExcelInput): Promise<ExcelJS.Worksheet> {
  const workbook = new ExcelJS.Workbook();
  // ExcelJS.load acepta ArrayBuffer y Buffer.
  await workbook.xlsx.load(data as ArrayBuffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("El archivo no contiene hojas");
  }
  return worksheet;
}

/**
 * Reemplaza `XLSX.utils.sheet_to_json(ws, { header: 1 })`.
 * Devuelve una matriz fila→celdas (valores crudos) preservando la posición de
 * columna; descarta filas completamente vacías.
 */
export async function parseExcelMatrix(data: ExcelInput): Promise<CellPrimitive[][]> {
  const worksheet = await loadFirstWorksheet(data);
  const matrix: CellPrimitive[][] = [];

  worksheet.eachRow({ includeEmpty: true }, (row) => {
    const cells: CellPrimitive[] = [];
    let hasValue = false;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const value = unwrapCellValue(cell.value);
      cells[colNumber - 1] = value;
      if (value !== null && String(value).trim() !== "") hasValue = true;
    });
    if (hasValue) {
      // Rellenar huecos (celdas no iteradas) con null para alinear columnas.
      for (let i = 0; i < cells.length; i++) {
        if (cells[i] === undefined) cells[i] = null;
      }
      matrix.push(cells);
    }
  });

  return matrix;
}

export interface ParseObjectsOptions {
  /** Valor para celdas ausentes o vacías. Equivale a `defval` de SheetJS. */
  defaultValue?: CellPrimitive;
}

/**
 * Reemplaza `XLSX.utils.sheet_to_json(ws, { defval, raw: false })`.
 * Usa la primera fila como encabezados y devuelve objetos con valores
 * formateados como texto (equivalente a `raw: false`).
 */
export async function parseExcelObjects(
  data: ExcelInput,
  options: ParseObjectsOptions = {},
): Promise<Record<string, CellPrimitive>[]> {
  const defaultValue = options.defaultValue ?? null;
  const worksheet = await loadFirstWorksheet(data);
  const result: Record<string, CellPrimitive>[] = [];
  let headers: string[] | null = null;

  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: (ExcelJS.Cell | undefined)[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cells[colNumber - 1] = cell;
    });

    if (!headers) {
      headers = cells.map((cell) =>
        cell ? String(unwrapCellValue(cell.value) ?? "").trim() : "",
      );
      return;
    }

    const obj: Record<string, CellPrimitive> = {};
    headers.forEach((header, index) => {
      if (!header) return;
      const cell = cells[index];
      if (!cell || cell.value === null || cell.value === undefined) {
        obj[header] = defaultValue;
      } else {
        // `cell.text` aplica el formato de la celda (equivalente a raw: false).
        // Celdas vacías ("") se tratan como ausentes y reciben defaultValue.
        const text = cell.text;
        obj[header] = text === "" || text === null || text === undefined ? defaultValue : text;
      }
    });

    const allEmpty = headers.every((header) => {
      if (!header) return true;
      const value = obj[header];
      return value === defaultValue || value === "" || value === null;
    });
    if (!allEmpty) result.push(obj);
  });

  return result;
}

export interface ExcelSheetSpec {
  name: string;
  /** Datos como objetos; los encabezados se toman de las claves del primero. */
  objects?: Record<string, unknown>[];
  /** Datos como matriz (incluyendo la fila de encabezado si corresponde). */
  rows?: unknown[][];
  /** Anchos de columna en caracteres (equivale a `wch` de SheetJS). */
  columnWidths?: number[];
  /** Aplica negrita a la primera fila. */
  boldHeader?: boolean;
  /** Tamaño de fuente para la primera fila (combinable con boldHeader). */
  headerFontSize?: number;
}

function normalizeWriteValue(value: unknown): ExcelJS.CellValue {
  if (value === undefined || value === null) return null;
  return value as ExcelJS.CellValue;
}

function buildWorkbook(sheets: ExcelSheetSpec[]): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();

  for (const spec of sheets) {
    const worksheet = workbook.addWorksheet(spec.name);

    if (spec.objects) {
      const headers = spec.objects.length > 0 ? Object.keys(spec.objects[0]) : [];
      if (headers.length > 0) {
        worksheet.addRow(headers);
        for (const item of spec.objects) {
          worksheet.addRow(headers.map((key) => normalizeWriteValue(item[key])));
        }
      }
    } else if (spec.rows) {
      for (const row of spec.rows) {
        worksheet.addRow(row.map(normalizeWriteValue));
      }
    }

    if (spec.columnWidths) {
      spec.columnWidths.forEach((width, index) => {
        worksheet.getColumn(index + 1).width = width;
      });
    }

    if (spec.boldHeader || spec.headerFontSize) {
      worksheet.getRow(1).font = {
        bold: spec.boldHeader ?? false,
        ...(spec.headerFontSize ? { size: spec.headerFontSize } : {}),
      };
    }
  }

  return workbook;
}

/** Genera el workbook como ArrayBuffer (reemplaza `XLSX.write(wb, { type: 'array' })`). */
export async function buildExcelArrayBuffer(sheets: ExcelSheetSpec[]): Promise<ArrayBuffer> {
  const workbook = buildWorkbook(sheets);
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Genera el workbook como Blob descargable. */
export async function buildExcelBlob(sheets: ExcelSheetSpec[]): Promise<Blob> {
  const buffer = await buildExcelArrayBuffer(sheets);
  return new Blob([buffer], { type: XLSX_MIME });
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Construye y descarga un .xlsx en el browser (reemplaza `XLSX.writeFile`). */
export async function downloadExcel(
  sheets: ExcelSheetSpec[],
  fileName: string,
): Promise<void> {
  const blob = await buildExcelBlob(sheets);
  triggerDownload(blob, fileName);
}

/** Descarga contenido CSV ya armado en el browser. */
export function downloadCsv(content: string, fileName: string): void {
  triggerDownload(new Blob([content], { type: "text/csv;charset=utf-8;" }), fileName);
}

/**
 * Convierte un arreglo de objetos a CSV (reemplaza
 * `XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(data))`). Implementación
 * pura en JS: no requiere ExcelJS y elimina la dependencia vulnerable del flujo CSV.
 */
export function objectsToCsv(objects: Record<string, unknown>[]): string {
  if (objects.length === 0) return "";
  const headers = Object.keys(objects[0]);
  const escape = (value: unknown): string => {
    const str = value === null || value === undefined ? "" : String(value);
    return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [headers.map(escape).join(",")];
  for (const obj of objects) {
    lines.push(headers.map((header) => escape(obj[header])).join(","));
  }
  return lines.join("\n");
}
