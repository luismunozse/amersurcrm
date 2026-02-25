"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Spinner } from '@/components/ui/Spinner';

type Rol = { id: string; nombre: string };

type ParsedRow = {
  nombre_completo: string;
  email: string;
  dni: string;
  telefono: string;
  rol_nombre: string;
  meta_mensual: string;
  comision: string;
  errors: string[];
};

type ImportResult = {
  creados: number;
  errores: { fila: number; error: string }[];
};

interface Props {
  open: boolean;
  roles: Rol[];
  onClose: () => void;
  onImportComplete: () => void;
}

const EXPECTED_HEADERS = [
  "nombre_completo",
  "email",
  "dni",
  "telefono",
  "rol",
  "meta_mensual",
  "comision",
];

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  return lines.map((line) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((ch === "," || ch === ";") && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  });
}

function validateRow(row: string[], roles: Rol[], allEmails: Set<string>, allDnis: Set<string>): ParsedRow {
  const [nombre, email, dni, telefono, rolNombre, meta, comision] = row.map((v) => v?.trim() || "");
  const errors: string[] = [];

  if (!nombre || nombre.length < 3) errors.push("Nombre requerido (min 3 chars)");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Email inválido");
  else if (allEmails.has(email.toLowerCase())) errors.push("Email duplicado en CSV");
  if (!dni || !/^\d{8}$/.test(dni)) errors.push("DNI: 8 dígitos");
  else if (allDnis.has(dni)) errors.push("DNI duplicado en CSV");

  const matchedRol = roles.find(
    (r) => r.nombre.toLowerCase().includes(rolNombre.toLowerCase()) || rolNombre.toLowerCase().includes(r.nombre.replace("ROL_", "").toLowerCase())
  );
  if (!matchedRol && rolNombre) errors.push(`Rol "${rolNombre}" no encontrado`);

  if (meta && (isNaN(Number(meta)) || Number(meta) < 0)) errors.push("Meta inválida");
  if (comision && (isNaN(Number(comision)) || Number(comision) < 0 || Number(comision) > 100)) errors.push("Comisión 0-100");

  if (email) allEmails.add(email.toLowerCase());
  if (dni) allDnis.add(dni);

  return {
    nombre_completo: nombre,
    email: email.toLowerCase(),
    dni,
    telefono,
    rol_nombre: matchedRol?.nombre || rolNombre,
    meta_mensual: meta,
    comision,
    errors,
  };
}

export default function ImportarUsuariosModal({ open, roles, onClose, onImportComplete }: Props) {
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setStep("upload");
      setParsedRows([]);
      setImportResult(null);
      setIsLoading(false);
      setFileName("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, isLoading]);

  if (!open) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);

      if (rows.length < 2) {
        alert("El archivo debe tener al menos una fila de cabecera y una de datos.");
        return;
      }

      // Skip header row
      const dataRows = rows.slice(1);
      const allEmails = new Set<string>();
      const allDnis = new Set<string>();
      const validated = dataRows.map((row) => validateRow(row, roles, allEmails, allDnis));
      setParsedRows(validated);
      setStep("preview");
    };
    reader.readAsText(file);
  };

  const validRows = parsedRows.filter((r) => r.errors.length === 0);
  const invalidRows = parsedRows.filter((r) => r.errors.length > 0);

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setIsLoading(true);

    const result: ImportResult = { creados: 0, errores: [] };

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        const formData = new FormData();
        formData.append("nombre_completo", row.nombre_completo);
        formData.append("email", row.email);
        formData.append("dni", row.dni);
        if (row.telefono) formData.append("telefono", row.telefono);
        const rolMatch = roles.find((r) => r.nombre === row.rol_nombre);
        if (rolMatch) formData.append("rol_id", rolMatch.id);
        if (row.meta_mensual) formData.append("meta_mensual", row.meta_mensual);
        if (row.comision) formData.append("comision_porcentaje", row.comision);
        // Auto-generate password
        formData.append("password", `Temp${row.dni}!`);

        const res = await fetch("/api/admin/usuarios", { method: "POST", body: formData });
        const data = await res.json();

        if (data.success) {
          result.creados++;
        } else {
          result.errores.push({ fila: i + 1, error: data.error || "Error desconocido" });
        }
      } catch {
        result.errores.push({ fila: i + 1, error: "Error de conexión" });
      }
    }

    setImportResult(result);
    setStep("result");
    setIsLoading(false);

    if (result.creados > 0) {
      onImportComplete();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" />

      <div className="relative z-10 w-full max-w-2xl max-h-[85vh] bg-crm-card border border-crm-border rounded-xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border flex-shrink-0">
          <h3 className="text-lg font-semibold text-crm-text-primary">
            {step === "upload" && "Importar Usuarios desde CSV"}
            {step === "preview" && `Vista Previa — ${fileName}`}
            {step === "result" && "Resultado de Importación"}
          </h3>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-crm-text-muted hover:text-crm-text-primary disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === "upload" && (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-crm-card-hover rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-crm-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-sm text-crm-text-primary mb-2 font-medium">
                Selecciona un archivo CSV
              </p>
              <p className="text-xs text-crm-text-muted mb-4">
                Columnas esperadas: {EXPECTED_HEADERS.join(", ")}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="crm-button-primary px-6 py-2 rounded-lg text-sm font-medium"
              >
                Seleccionar Archivo
              </button>
              <div className="mt-6 text-left bg-crm-card-hover rounded-lg p-4">
                <p className="text-xs font-medium text-crm-text-primary mb-2">Formato de ejemplo:</p>
                <code className="text-xs text-crm-text-muted block whitespace-pre">
{`nombre_completo,email,dni,telefono,rol,meta_mensual,comision
Juan Pérez,jperez@email.com,12345678,987654321,Vendedor,50000,2.5
María López,mlopez@email.com,87654321,987654322,Vendedor,60000,3`}
                </code>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-sm text-green-600 font-medium">
                  {validRows.length} válido(s)
                </span>
                {invalidRows.length > 0 && (
                  <span className="text-sm text-red-600 font-medium">
                    {invalidRows.length} con errores
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-crm-border">
                      <th className="text-left py-2 px-2 text-crm-text-muted font-medium">#</th>
                      <th className="text-left py-2 px-2 text-crm-text-muted font-medium">Nombre</th>
                      <th className="text-left py-2 px-2 text-crm-text-muted font-medium">Email</th>
                      <th className="text-left py-2 px-2 text-crm-text-muted font-medium">DNI</th>
                      <th className="text-left py-2 px-2 text-crm-text-muted font-medium">Rol</th>
                      <th className="text-left py-2 px-2 text-crm-text-muted font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={`border-b border-crm-border/50 ${
                          row.errors.length > 0 ? "bg-red-50 dark:bg-red-900/10" : ""
                        }`}
                      >
                        <td className="py-2 px-2 text-crm-text-muted">{idx + 1}</td>
                        <td className="py-2 px-2 text-crm-text-primary">{row.nombre_completo || "-"}</td>
                        <td className="py-2 px-2 text-crm-text-primary">{row.email || "-"}</td>
                        <td className="py-2 px-2 text-crm-text-primary">{row.dni || "-"}</td>
                        <td className="py-2 px-2 text-crm-text-primary">
                          {row.rol_nombre.replace("ROL_", "").replace("_", " ") || "-"}
                        </td>
                        <td className="py-2 px-2">
                          {row.errors.length === 0 ? (
                            <span className="text-green-600">OK</span>
                          ) : (
                            <span className="text-red-600" title={row.errors.join("; ")}>
                              {row.errors[0]}
                              {row.errors.length > 1 && ` (+${row.errors.length - 1})`}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-crm-text-muted mt-3">
                Las filas con errores serán omitidas. Se generará una contraseña temporal para cada usuario (Temp + DNI + !).
              </p>
            </div>
          )}

          {step === "result" && importResult && (
            <div className="text-center py-6">
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                importResult.errores.length === 0 ? "bg-green-100 dark:bg-green-900/30" : "bg-amber-100 dark:bg-amber-900/30"
              }`}>
                {importResult.errores.length === 0 ? (
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                  </svg>
                )}
              </div>

              <p className="text-lg font-semibold text-crm-text-primary mb-1">
                {importResult.creados} usuario(s) creado(s)
              </p>

              {importResult.errores.length > 0 && (
                <div className="mt-4 text-left">
                  <p className="text-sm font-medium text-red-600 mb-2">
                    {importResult.errores.length} error(es):
                  </p>
                  <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-3 max-h-40 overflow-y-auto">
                    {importResult.errores.map((e, i) => (
                      <p key={i} className="text-xs text-red-600 mb-1">
                        Fila {e.fila}: {e.error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-crm-border flex-shrink-0">
          {step === "preview" && (
            <>
              <button
                onClick={() => { setStep("upload"); setParsedRows([]); }}
                disabled={isLoading}
                className="px-4 py-2 text-sm text-crm-text-muted hover:text-crm-text-primary border border-crm-border rounded-lg transition-colors disabled:opacity-50"
              >
                Volver
              </button>
              <button
                onClick={handleImport}
                disabled={isLoading || validRows.length === 0}
                className="crm-button-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Spinner size="sm" color="white" />
                    Importando...
                  </div>
                ) : (
                  `Importar ${validRows.length} usuario(s)`
                )}
              </button>
            </>
          )}
          {step === "result" && (
            <button
              onClick={onClose}
              className="crm-button-primary px-4 py-2 rounded-lg text-sm font-medium"
            >
              Cerrar
            </button>
          )}
          {step === "upload" && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-crm-text-muted hover:text-crm-text-primary border border-crm-border rounded-lg transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
