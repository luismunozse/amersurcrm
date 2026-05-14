/**
 * Lightweight CSV export para tablas del módulo Reportes.
 * Sin dependencias externas: arma string CSV con BOM UTF-8 (para Excel)
 * y dispara descarga vía Blob.
 */

export type CSVColumn<T> = {
  /** Header visible en el CSV. */
  header: string;
  /** Selector de valor desde la fila. */
  accessor: (row: T) => string | number | null | undefined;
};

const QUOTE = '"';
const SEPARATOR = ",";
const NEWLINE = "\r\n";
const BOM = "﻿";

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Si contiene separador, comilla, salto de línea o empieza/termina con espacio: encerrar y escapar comillas.
  const needsQuote =
    str.includes(SEPARATOR) ||
    str.includes(QUOTE) ||
    str.includes("\n") ||
    str.includes("\r") ||
    /^\s|\s$/.test(str);
  if (!needsQuote) return str;
  return QUOTE + str.replace(/"/g, '""') + QUOTE;
}

export function buildCSV<T>(rows: T[], columns: CSVColumn<T>[]): string {
  const headerLine = columns.map((c) => escapeCell(c.header)).join(SEPARATOR);
  const dataLines = rows.map((row) =>
    columns.map((c) => escapeCell(c.accessor(row))).join(SEPARATOR),
  );
  return BOM + [headerLine, ...dataLines].join(NEWLINE);
}

export function downloadCSV<T>(
  rows: T[],
  columns: CSVColumn<T>[],
  filename: string,
): void {
  if (typeof window === "undefined") return;

  const safeName = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  const csv = buildCSV(rows, columns);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = safeName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
