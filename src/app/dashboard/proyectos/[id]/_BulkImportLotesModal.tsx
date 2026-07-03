"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  importarLotesMasivo,
  type ImportError,
  type LoteImportRow,
} from "./_actions";

interface BulkImportLotesModalProps {
  open: boolean;
  onClose: () => void;
  proyectoId: string;
  onSuccess?: () => void;
}

type Step = 1 | 2 | 3;

type RawRow = Record<string, string>;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const PREVIEW_ROWS = 10;

const ACCEPTED_MIME_TYPES = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

// Mapeo de aliases comunes a campos canónicos
const COLUMN_ALIASES: Record<string, string> = {
  codigo: "codigo",
  "código": "codigo",
  code: "codigo",
  cod: "codigo",
  manzana: "manzana",
  mz: "manzana",
  etapa: "etapa",
  fase: "etapa",
  sup_m2: "sup_m2",
  sup: "sup_m2",
  area: "sup_m2",
  "área": "sup_m2",
  superficie: "sup_m2",
  m2: "sup_m2",
  precio: "precio",
  monto: "precio",
  valor: "precio",
  moneda: "moneda",
  currency: "moneda",
  estado: "estado",
  status: "estado",
  tipo_unidad: "tipo_unidad",
  tipo: "tipo_unidad",
  unidad: "tipo_unidad",
  numero: "numero",
  "número": "numero",
  num: "numero",
  vendedor_asignado: "vendedor_asignado",
  vendedor: "vendedor_asignado",
};

const CANONICAL_FIELDS = [
  "codigo",
  "manzana",
  "etapa",
  "sup_m2",
  "precio",
  "moneda",
  "estado",
  "tipo_unidad",
  "numero",
  "vendedor_asignado",
] as const;

type CanonicalField = (typeof CANONICAL_FIELDS)[number];

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "_");
}

function autoMapHeaders(headers: string[]): Record<string, CanonicalField | ""> {
  const mapping: Record<string, CanonicalField | ""> = {};
  for (const h of headers) {
    const normalized = normalizeHeader(h);
    const canonical = COLUMN_ALIASES[normalized];
    mapping[h] = (canonical as CanonicalField) || "";
  }
  return mapping;
}

function parseNumber(value: string): number | null {
  if (!value || !value.trim()) return null;
  const cleaned = value.replace(/,/g, ".").replace(/[^\d.\-]/g, "");
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function buildRowsFromMapping(
  rawRows: RawRow[],
  mapping: Record<string, CanonicalField | "">,
): LoteImportRow[] {
  return rawRows.map((raw) => {
    const row: LoteImportRow = { codigo: "" };
    for (const [header, value] of Object.entries(raw)) {
      const target = mapping[header];
      if (!target) continue;
      const v = (value ?? "").toString().trim();
      if (!v) continue;

      switch (target) {
        case "codigo":
          row.codigo = v;
          break;
        case "sup_m2":
          row.sup_m2 = parseNumber(v);
          break;
        case "precio":
          row.precio = parseNumber(v);
          break;
        case "moneda": {
          const upper = v.toUpperCase();
          if (upper === "PEN" || upper === "USD" || upper === "ARS") {
            row.moneda = upper;
          } else {
            row.moneda = upper as LoteImportRow["moneda"];
          }
          break;
        }
        case "estado": {
          const lower = v.toLowerCase();
          if (lower === "disponible" || lower === "reservado" || lower === "vendido") {
            row.estado = lower;
          } else {
            row.estado = lower as LoteImportRow["estado"];
          }
          break;
        }
        case "manzana":
          row.manzana = v;
          break;
        case "etapa":
          row.etapa = v;
          break;
        case "tipo_unidad":
          row.tipo_unidad = v;
          break;
        case "numero":
          row.numero = v;
          break;
        case "vendedor_asignado":
          row.vendedor_asignado = v;
          break;
      }
    }
    return row;
  });
}

function downloadPlantillaCSV() {
  const headers = [
    "codigo",
    "manzana",
    "etapa",
    "sup_m2",
    "precio",
    "moneda",
    "estado",
    "tipo_unidad",
    "numero",
    "vendedor_asignado",
  ];
  const ejemplos = [
    ["L-001", "A", "1", "120.50", "85000", "PEN", "disponible", "Lote", "1", ""],
    ["L-002", "A", "1", "150.00", "95000", "PEN", "disponible", "Lote", "2", "vendedor1"],
  ];
  const csv = [
    headers.join(","),
    ...ejemplos.map((row) => row.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plantilla_lotes.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function BulkImportLotesModal({
  open,
  onClose,
  proyectoId,
  onSuccess,
}: BulkImportLotesModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, CanonicalField | "">>({});
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [dryRunErrors, setDryRunErrors] = useState<ImportError[]>([]);
  const [dryRunWarnings, setDryRunWarnings] = useState<string[]>([]);
  const [resultado, setResultado] = useState<{
    insertados: number;
    errores: ImportError[];
    warnings: string[];
  } | null>(null);
  const [xlsxNotSupported, setXlsxNotSupported] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const resetState = () => {
    setStep(1);
    setFile(null);
    setHeaders([]);
    setRawRows([]);
    setMapping({});
    setLoading(false);
    setValidating(false);
    setDryRunErrors([]);
    setDryRunWarnings([]);
    setResultado(null);
    setXlsxNotSupported(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    if (loading) return;
    resetState();
    onClose();
  };

  const parseCsvFile = async (selectedFile: File) => {
    const text = await selectedFile.text();
    const Papa = (await import("papaparse")).default;
    const parsed = Papa.parse<RawRow>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
    });

    if (parsed.errors && parsed.errors.length > 0) {
      const firstError = parsed.errors[0];
      throw new Error(`Error al parsear CSV: ${firstError.message}`);
    }

    const data = (parsed.data || []) as RawRow[];
    if (data.length === 0) {
      throw new Error("El archivo está vacío");
    }

    const fields = parsed.meta?.fields ?? Object.keys(data[0] ?? {});
    return { fields, data };
  };

  const parseXlsxFile = async (selectedFile: File) => {
    try {
      const { parseExcelObjects } = await import("@/lib/excel/adapter");
      const arrayBuffer = await selectedFile.arrayBuffer();
      const json = (await parseExcelObjects(arrayBuffer, { defaultValue: "" })) as RawRow[];
      if (json.length === 0) {
        throw new Error("La hoja está vacía");
      }
      const fields = Object.keys(json[0] ?? {});
      return { fields, data: json };
    } catch (err) {
      // Si xlsx no está disponible, fallback a CSV
      throw new Error("No se pudo procesar el archivo XLSX. Por favor utilice CSV.");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error("El archivo supera el tamaño máximo de 5MB");
      return;
    }

    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    const isCsv = ext === "csv" || selectedFile.type === "text/csv";
    const isXlsx = ext === "xlsx" || ext === "xls";

    if (!isCsv && !isXlsx) {
      toast.error("Formato no soportado. Utilice CSV o XLSX.");
      return;
    }

    setFile(selectedFile);
    setLoading(true);

    try {
      const { fields, data } = isCsv
        ? await parseCsvFile(selectedFile)
        : await parseXlsxFile(selectedFile);

      setHeaders(fields);
      setRawRows(data);
      setMapping(autoMapHeaders(fields));
      setStep(2);
      // Ejecutar dryRun automáticamente
      await runDryRun(data, autoMapHeaders(fields));
    } catch (err) {
      if (err instanceof Error && err.message.includes("XLSX")) {
        setXlsxNotSupported(true);
      }
      toast.error(err instanceof Error ? err.message : "Error procesando archivo");
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const runDryRun = async (
    rowsToValidate: RawRow[],
    mappingToUse: Record<string, CanonicalField | "">,
  ) => {
    setValidating(true);
    try {
      const importRows = buildRowsFromMapping(rowsToValidate, mappingToUse);
      const res = await importarLotesMasivo(proyectoId, importRows, { dryRun: true });
      setDryRunErrors(res.errores || []);
      setDryRunWarnings(res.warnings || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error validando archivo");
      setDryRunErrors([{ fila: 0, mensaje: "Error inesperado durante validación" }]);
    } finally {
      setValidating(false);
    }
  };

  const handleMappingChange = (header: string, target: CanonicalField | "") => {
    const newMapping = { ...mapping, [header]: target };
    setMapping(newMapping);
    // Re-run dryRun con el nuevo mapping
    void runDryRun(rawRows, newMapping);
  };

  const handleConfirmImport = async () => {
    setLoading(true);
    setStep(3);
    try {
      const importRows = buildRowsFromMapping(rawRows, mapping);
      const res = await importarLotesMasivo(proyectoId, importRows);
      setResultado({
        insertados: res.insertados,
        errores: res.errores || [],
        warnings: res.warnings || [],
      });

      if (res.insertados > 0) {
        toast.success(`${res.insertados} lote(s) importado(s) correctamente`);
        if (res.errores.length === 0) {
          onSuccess?.();
        }
      }
      if (res.errores.length > 0) {
        toast.error(`${res.errores.length} fila(s) con errores`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error en la importación");
      setResultado({
        insertados: 0,
        errores: [{ fila: 0, mensaje: err instanceof Error ? err.message : "Error" }],
        warnings: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const previewRows = useMemo(() => rawRows.slice(0, PREVIEW_ROWS), [rawRows]);
  const codigoMapeado = useMemo(
    () => Object.values(mapping).includes("codigo"),
    [mapping],
  );
  const puedeContinuar = !validating && codigoMapeado && dryRunErrors.length === 0;

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-import-title"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative w-full sm:max-w-4xl bg-crm-card rounded-t-xl sm:rounded-xl shadow-2xl border-t sm:border border-crm-border overflow-hidden max-h-[92vh] flex flex-col pb-[env(safe-area-inset-bottom)] sm:pb-0 animate-in slide-in-from-bottom-4 sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-crm-primary/10 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-crm-primary" />
            </div>
            <div>
              <h3 id="bulk-import-title" className="text-lg font-semibold text-crm-text-primary">
                Importar lotes desde CSV/Excel
              </h3>
              <p className="text-xs text-crm-text-muted">
                Paso {step} de 3 ·{" "}
                {step === 1
                  ? "Seleccione el archivo"
                  : step === 2
                  ? "Previsualice y mapee columnas"
                  : "Resultado"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="p-2 hover:bg-crm-card-hover rounded-lg transition-colors disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5 text-crm-text-muted" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {step === 1 && (
            <div className="space-y-6">
              <div className="rounded-lg border-2 border-dashed border-crm-border p-8 text-center">
                <div className="mx-auto w-12 h-12 bg-crm-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Upload className="w-6 h-6 text-crm-primary" />
                </div>
                <p className="text-sm text-crm-text-primary font-medium mb-1">
                  Seleccione un archivo CSV o Excel
                </p>
                <p className="text-xs text-crm-text-muted mb-4">
                  Tamaño máximo: 5MB. Formatos: .csv, .xlsx
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileChange}
                  disabled={loading}
                  className="block w-full max-w-md mx-auto text-sm text-crm-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-crm-primary/10 file:text-crm-primary hover:file:bg-crm-primary/20 file:cursor-pointer cursor-pointer"
                />
                {loading && (
                  <p className="mt-4 text-xs text-crm-text-muted flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Procesando archivo...
                  </p>
                )}
                {xlsxNotSupported && (
                  <p className="mt-3 text-xs text-amber-600">
                    Solo CSV soportado por ahora. Por favor convierta el archivo a CSV.
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between rounded-lg border border-crm-border bg-crm-card-hover px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-crm-text-primary">¿No tiene la plantilla?</p>
                  <p className="text-xs text-crm-text-muted">
                    Descargue un CSV de ejemplo con los encabezados correctos.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={downloadPlantillaCSV}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Descargar plantilla CSV
                </Button>
              </div>

              <div className="rounded-lg border border-crm-border bg-crm-card-hover/50 p-4 text-xs text-crm-text-secondary space-y-1">
                <p className="font-medium text-crm-text-primary">Columnas reconocidas automáticamente:</p>
                <p>
                  <strong>codigo</strong> (requerido), manzana, etapa, sup_m2, precio, moneda
                  (PEN/USD/ARS), estado (disponible/reservado/vendido), tipo_unidad, numero,
                  vendedor_asignado.
                </p>
                <p className="text-crm-text-muted">
                  El sistema acepta variantes como "código", "mz", "área", "monto", etc.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              {/* Mapeo de columnas */}
              <div>
                <h4 className="text-sm font-semibold text-crm-text-primary mb-2">
                  Mapeo de columnas
                </h4>
                <p className="text-xs text-crm-text-muted mb-3">
                  Confirme a qué campo corresponde cada columna del archivo. El campo{" "}
                  <strong>código</strong> es obligatorio.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {headers.map((h) => (
                    <div key={h} className="flex items-center gap-2">
                      <span className="text-xs text-crm-text-secondary truncate flex-1" title={h}>
                        {h}
                      </span>
                      <span className="text-crm-text-muted">→</span>
                      <select
                        value={mapping[h] || ""}
                        onChange={(e) =>
                          handleMappingChange(h, e.target.value as CanonicalField | "")
                        }
                        className="rounded-md border border-crm-border bg-crm-card px-2 py-1 text-xs text-crm-text-primary flex-1 min-w-0"
                      >
                        <option value="">— Ignorar —</option>
                        {CANONICAL_FIELDS.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                {!codigoMapeado && (
                  <p className="mt-2 text-xs text-crm-danger flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Debe mapear alguna columna al campo <strong>codigo</strong>.
                  </p>
                )}
              </div>

              {/* Preview */}
              <div>
                <h4 className="text-sm font-semibold text-crm-text-primary mb-2">
                  Vista previa ({rawRows.length} filas totales)
                </h4>
                <div className="overflow-x-auto rounded-lg border border-crm-border">
                  <table className="min-w-full text-xs">
                    <thead className="bg-crm-card-hover">
                      <tr>
                        {headers.map((h) => (
                          <th
                            key={h}
                            className="px-3 py-2 text-left font-medium text-crm-text-secondary whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, idx) => (
                        <tr key={idx} className="border-t border-crm-border">
                          {headers.map((h) => (
                            <td
                              key={h}
                              className="px-3 py-2 text-crm-text-primary whitespace-nowrap"
                            >
                              {row[h] ?? ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rawRows.length > PREVIEW_ROWS && (
                  <p className="mt-1 text-xs text-crm-text-muted">
                    Mostrando primeras {PREVIEW_ROWS} filas de {rawRows.length}.
                  </p>
                )}
              </div>

              {/* Estado de validación */}
              <div>
                <h4 className="text-sm font-semibold text-crm-text-primary mb-2">
                  Validación previa
                </h4>
                {validating ? (
                  <p className="text-xs text-crm-text-muted flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Validando filas...
                  </p>
                ) : (
                  <div className="space-y-2">
                    {dryRunErrors.length === 0 && dryRunWarnings.length === 0 && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Todas las filas son válidas.
                      </p>
                    )}
                    {dryRunErrors.length > 0 && (
                      <div className="rounded-lg border border-crm-danger/30 bg-crm-danger/5 p-3">
                        <p className="text-xs font-medium text-crm-danger mb-1">
                          {dryRunErrors.length} error(es) encontrado(s):
                        </p>
                        <ul className="max-h-32 overflow-y-auto text-xs text-crm-text-secondary space-y-1">
                          {dryRunErrors.slice(0, 20).map((e, i) => (
                            <li key={i}>
                              Fila {e.fila}
                              {e.codigo ? ` (${e.codigo})` : ""}: {e.mensaje}
                            </li>
                          ))}
                          {dryRunErrors.length > 20 && (
                            <li className="text-crm-text-muted">
                              ...y {dryRunErrors.length - 20} más
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                    {dryRunWarnings.length > 0 && (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
                          {dryRunWarnings.length} advertencia(s):
                        </p>
                        <ul className="max-h-32 overflow-y-auto text-xs text-crm-text-secondary space-y-1">
                          {dryRunWarnings.slice(0, 20).map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                          {dryRunWarnings.length > 20 && (
                            <li className="text-crm-text-muted">
                              ...y {dryRunWarnings.length - 20} más
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 text-crm-primary animate-spin mx-auto mb-3" />
                  <p className="text-sm text-crm-text-primary font-medium">Importando lotes...</p>
                  <p className="text-xs text-crm-text-muted">Por favor espere.</p>
                </div>
              ) : resultado ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
                    <p className="text-sm font-semibold text-green-700 dark:text-green-400 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" />
                      {resultado.insertados} lote(s) importado(s) exitosamente
                    </p>
                  </div>

                  {resultado.warnings.length > 0 && (
                    <details className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                      <summary className="text-xs font-medium text-amber-700 dark:text-amber-400 cursor-pointer">
                        {resultado.warnings.length} advertencia(s) — clic para expandir
                      </summary>
                      <ul className="mt-2 max-h-40 overflow-y-auto text-xs text-crm-text-secondary space-y-1">
                        {resultado.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </details>
                  )}

                  {resultado.errores.length > 0 && (
                    <details className="rounded-lg border border-crm-danger/30 bg-crm-danger/5 p-3">
                      <summary className="text-xs font-medium text-crm-danger cursor-pointer">
                        {resultado.errores.length} error(es) — clic para expandir
                      </summary>
                      <ul className="mt-2 max-h-40 overflow-y-auto text-xs text-crm-text-secondary space-y-1">
                        {resultado.errores.map((e, i) => (
                          <li key={i}>
                            Fila {e.fila}
                            {e.codigo ? ` (${e.codigo})` : ""}: {e.mensaje}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-crm-border bg-crm-card-hover flex items-center justify-between gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            {step === 3 && resultado ? "Cerrar" : "Cancelar"}
          </Button>

          <div className="flex items-center gap-2">
            {step === 2 && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetState();
                  }}
                  disabled={loading}
                >
                  Cambiar archivo
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={!puedeContinuar || loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Importar {rawRows.length - dryRunWarnings.length - dryRunErrors.length > 0
                    ? rawRows.length - dryRunWarnings.length - dryRunErrors.length
                    : rawRows.length}{" "}
                  lote(s)
                </Button>
              </>
            )}
            {step === 3 && resultado && resultado.insertados > 0 && (
              <Button
                type="button"
                onClick={() => {
                  onSuccess?.();
                  handleClose();
                }}
              >
                Finalizar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
