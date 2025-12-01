"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { getErrorMessage } from "@/lib/errors";
import { downloadTemplate } from "@/lib/generateTemplate";

interface ImportarClientesProps {
  onClose: () => void;
}

interface ClienteImportData {
  nombre: string;
  apellido: string;
  telefono: string;
  proyecto_interes?: string;
  // Campos internos para validación
  _proyecto_id?: string;
  _proyecto_nombre?: string;
}

interface ImportResult {
  total: number;
  success: number;
  errors: number;
  duplicates: number;
  warnings: number;
  errorsList: Array<{
    row: number;
    data: ClienteImportData;
    errors: string[];
  }>;
  warningsList: Array<{
    row: number;
    data: ClienteImportData;
    warnings: string[];
  }>;
}

type RawCell = string | number | boolean | Date | null | undefined;
type RawRow = RawCell[];

const MAX_RECORDS = 20000; // Límite máximo de registros por importación

const IMPORTABLE_FIELDS: Array<keyof ClienteImportData> = [
  'nombre',
  'apellido',
  'telefono',
  'proyecto_interes',
];

export default function ImportarClientes({ onClose }: ImportarClientesProps) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<ClienteImportData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [validationResult, setValidationResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setStep(2);
    parseFile(selectedFile);
  };

  const parseFile = async (file: File) => {
    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      let rawData: RawRow[] = [];

      if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // Parsear Excel
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json<RawCell[]>(worksheet, { header: 1 });
        rawData = sheetData.map((row) => row as RawRow);
      } else if (fileExtension === 'csv') {
        // Parsear CSV
        const text = await file.text();
        const result = Papa.parse<RawCell[]>(text, { header: false, skipEmptyLines: true });
        rawData = result.data.map((row) => row as RawRow);
      } else {
        throw new Error('Formato de archivo no soportado. Use .xlsx, .xls o .csv');
      }

      if (rawData.length === 0) {
        throw new Error('El archivo está vacío');
      }

      // Validar límite de registros
      if (rawData.length - 1 > MAX_RECORDS) {
        throw new Error(`El archivo excede el límite de ${MAX_RECORDS.toLocaleString()} registros. Encontrados: ${(rawData.length - 1).toLocaleString()}`);
      }

      // Convertir a formato esperado
      const headerRow = rawData[0] ?? [];
      const headers = headerRow.map((cell) => String(cell ?? '').trim());
      const rows = rawData.slice(1);

      const parsedData: ClienteImportData[] = rows.map((row) => {
        const rowData: Partial<ClienteImportData> = {};
        headers.forEach((header, colIndex) => {
          const cellValue = row[colIndex];
          if (!header || cellValue === undefined || cellValue === null) {
            return;
          }

          // Normalizar nombres de columnas para ser más flexibles
          const normalizedHeader = normalizeColumnName(header);
          if (!IMPORTABLE_FIELDS.includes(normalizedHeader as keyof ClienteImportData)) {
            return;
          }

          const targetKey = normalizedHeader as keyof ClienteImportData;
          const stringValue =
            typeof cellValue === 'string'
              ? cellValue.trim()
              : cellValue instanceof Date
                ? cellValue.toISOString()
                : String(cellValue);

          rowData[targetKey] = stringValue as ClienteImportData[typeof targetKey];
        });
        return rowData as ClienteImportData;
      }).filter((row) => Object.values(row).some((value) => value !== undefined && value !== null && String(value).trim() !== ''));

      setData(parsedData);
      setStep(3);
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Error al procesar el archivo');
      setStep(1);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const normalizeColumnName = (header: string): string => {
    if (!header) return header;

    const normalized = header.toLowerCase()
      .trim()
      .replace(/[áéíóú]/g, (char) => {
        const map: Record<string, string> = {
          'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u'
        };
        return map[char] || char;
      })
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

    // Mapeo de nombres comunes a nombres esperados (simplificado)
    const columnMapping: Record<string, string> = {
      'nombre': 'nombre',
      'nombres': 'nombre',
      'name': 'nombre',
      'primer_nombre': 'nombre',
      'apellido': 'apellido',
      'apellidos': 'apellido',
      'last_name': 'apellido',
      'surname': 'apellido',
      'celular': 'telefono',
      'telefono': 'telefono',
      'phone': 'telefono',
      'movil': 'telefono',
      'whatsapp': 'telefono',
      'proyecto': 'proyecto_interes',
      'proyecto_interes': 'proyecto_interes',
      'interes': 'proyecto_interes',
      'proyecto_de_interes': 'proyecto_interes',
    };

    return columnMapping[normalized] || normalized;
  };

  const validateData = async (data: ClienteImportData[]): Promise<ImportResult> => {
    const errors: ImportResult['errorsList'] = [];
    const warnings: ImportResult['warningsList'] = [];
    let success = 0;
    let duplicates = 0;

    // Obtener teléfonos existentes en la BD
    const existingPhones = await checkExistingPhones(data.map(d => d.telefono).filter(Boolean));

    // Buscar proyectos para cada row con proyecto_interes
    toast.loading('Validando proyectos...', { id: 'validating-projects' });

    for (let index = 0; index < data.length; index++) {
      const row = data[index];

      if (row.proyecto_interes && row.proyecto_interes.trim()) {
        const proyecto = await searchProyecto(row.proyecto_interes);
        if (proyecto) {
          // Guardar ID y nombre del proyecto encontrado
          row._proyecto_id = proyecto.id;
          row._proyecto_nombre = proyecto.nombre;
        }
      }
    }

    toast.dismiss('validating-projects');

    // Validar cada fila
    data.forEach((row, index) => {
      const rowErrors: string[] = [];
      const rowWarnings: string[] = [];

      // Validar campos requeridos
      if (!row.nombre || String(row.nombre).trim() === '') {
        rowErrors.push('Nombre es requerido');
      }

      if (!row.apellido || String(row.apellido).trim() === '') {
        rowErrors.push('Apellido es requerido');
      }

      if (!row.telefono || String(row.telefono).trim() === '') {
        rowErrors.push('Teléfono es requerido');
      } else if (!isValidPhone(String(row.telefono))) {
        rowErrors.push('Teléfono inválido');
      } else if (existingPhones.has(normalizePhoneForKey(row.telefono))) {
        rowErrors.push('Teléfono ya existe en la base de datos');
        duplicates++;
      }

      // Validar proyecto (warning, no error)
      if (row.proyecto_interes && row.proyecto_interes.trim()) {
        if (!row._proyecto_id) {
          rowWarnings.push(`Proyecto "${row.proyecto_interes}" no encontrado, se guardará como texto en notas`);
        }
      }

      // Agregar a listas según tenga errores o no
      if (rowErrors.length > 0) {
        errors.push({
          row: index + 2, // +2 porque index es 0-based y la primera fila es header
          data: row,
          errors: rowErrors
        });
      } else {
        success++;
      }

      // Agregar warnings si los hay (independiente de errores)
      if (rowWarnings.length > 0) {
        warnings.push({
          row: index + 2,
          data: row,
          warnings: rowWarnings
        });
      }
    });

    return {
      total: data.length,
      success,
      errors: errors.length,
      duplicates,
      warnings: warnings.length,
      errorsList: errors,
      warningsList: warnings
    };
  };

  const searchProyecto = async (nombre: string): Promise<{ id: string; nombre: string } | null> => {
    try {
      const response = await fetch('/api/proyectos/search-by-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim() }),
      });

      if (!response.ok) return null;

      const data = await response.json();

      if (data.found && data.proyecto) {
        return {
          id: data.proyecto.id,
          nombre: data.proyecto.nombre
        };
      }

      return null;
    } catch (error) {
      console.error('Error searching proyecto:', error);
      return null;
    }
  };

  const checkExistingPhones = async (phones: string[]): Promise<Set<string>> => {
    try {
      const response = await fetch('/api/clientes/check-phones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phones: phones.map(normalizePhoneForKey) }),
      });

      if (!response.ok) return new Set();

      const data = await response.json();
      return new Set(data.existingPhones || []);
    } catch (error) {
      console.error('Error checking phones:', error);
      return new Set();
    }
  };

  const normalizePhoneForKey = (value: unknown): string => {
    return String(value || '').replace(/\D/g, '');
  };

  const isValidPhone = (phone: string): boolean => {
    const raw = String(phone || '');
    const minimal = raw.replace(/[\s\-\(\)]/g, '');

    // Detectar candidatos peruanos: 51..., +51..., 0051...
    const isPeruCandidate = minimal.startsWith('51') || minimal.startsWith('+51') || minimal.startsWith('0051');

    // Reglas de limpieza avanzadas SOLO para Perú
    let cleanForCheck = minimal;
    if (isPeruCandidate) {
      const withoutExtension = raw.replace(/(?:\s|^)(?:ext|anexo|x|int)\.?\s*\d+.*/i, '');
      cleanForCheck = withoutExtension
        .replace(/[\s\-\(\)\.\/,;:_]/g, '')
        .replace(/\D/g, ''); // dejar solo dígitos
    }

    const peruvianPhoneRegex = /^51[0-9]{9}$/; // 51 + 9 dígitos
    const internationalPhoneRegex = /^[\+]?[0-9]{7,15}$/; // 7–15 dígitos, opcional +

    return peruvianPhoneRegex.test(cleanForCheck) || internationalPhoneRegex.test(minimal);
  };

  const handleValidate = async () => {
    setIsProcessing(true);
    try {
      const validation = await validateData(data);
      setValidationResult(validation);
      setStep(3.5); // Paso intermedio para mostrar preview de errores
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Error durante la validación');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!file || !validationResult) return;

    setIsProcessing(true);
    try {
      // Filtrar filas válidas
      const invalidRowNumbers = new Set(validationResult.errorsList.map(e => e.row));
      const validRows = data.filter((_row, idx) => {
        return !invalidRowNumbers.has(idx + 2);
      });

      if (validRows.length === 0) {
        toast.error('No hay filas válidas para importar');
        setStep(4);
        setResult(validationResult);
        return;
      }

      // Deduplicar por teléfono dentro del lote
      const seenPhones = new Set<string>();
      const dedupedRows = validRows.filter((row) => {
        if (!row.telefono) return true;
        const key = normalizePhoneForKey(row.telefono);
        if (!key) return true;
        if (seenPhones.has(key)) return false;
        seenPhones.add(key);
        return true;
      });

      // Importar
      await importData(dedupedRows);

      const finalResult: ImportResult = {
        total: data.length,
        success: dedupedRows.length,
        errors: validationResult.errors,
        duplicates: validationResult.duplicates + (validRows.length - dedupedRows.length),
        warnings: validationResult.warnings,
        errorsList: validationResult.errorsList,
        warningsList: validationResult.warningsList
      };

      setResult(finalResult);

      if (validationResult.errors > 0) {
        toast.success(`Importados ${dedupedRows.length} registros. Omitidos ${validationResult.errors} con errores.`);
      } else {
        toast.success(`Importación exitosa: ${dedupedRows.length} clientes importados`);
      }

      router.refresh();
      setStep(4);
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Error durante la importación');
    } finally {
      setIsProcessing(false);
    }
  };

  const importData = async (data: ClienteImportData[]) => {
    const BATCH_SIZE = 100;
    let totalImported = 0;
    let totalSkippedDuplicates = 0;

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);

      const formData = new FormData();
      formData.append('data', JSON.stringify(batch));

      const response = await fetch('/api/clientes/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let msg = `Error en el lote de importación (HTTP ${response.status} ${response.statusText})`;
        try {
          const clone = response.clone();
          const contentType = clone.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const payload = await clone.json();
            const apiMsg = payload?.error || payload?.message || '';
            const details = payload?.details || '';
            const firstErrors = Array.isArray(payload?.errors) && payload.errors.length > 0
              ? ` | Ejemplo: ${payload.errors[0].errors?.join(', ')}`
              : '';
            msg = [msg, apiMsg, details, firstErrors].filter(Boolean).join(' - ');
          }
        } catch {
          // Ignorar fallo al leer cuerpo
        }
        toast.dismiss('import-progress');
        throw new Error(msg);
      }

      try {
        const payload = await response.json();
        totalImported += Number(payload?.imported || 0);
        totalSkippedDuplicates += Number(payload?.skippedDuplicates || 0);
      } catch {
        // si no es JSON, ignorar
      }

      const progress = Math.round(((i + batch.length) / data.length) * 100);
      toast.loading(`Importando... ${progress}%`, { id: 'import-progress' });
    }

    toast.dismiss('import-progress');
  };

  const exportErrors = () => {
    if (!validationResult || validationResult.errorsList.length === 0) return;

    const errorsData = validationResult.errorsList.map(error => ({
      Fila: error.row,
      Nombre: error.data.nombre || '',
      Apellido: error.data.apellido || '',
      Telefono: error.data.telefono || '',
      Proyecto: error.data.proyecto_interes || '',
      Errores: error.errors.join('; ')
    }));

    const csv = Papa.unparse(errorsData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `errores_importacion_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success('Errores exportados correctamente');
  };

  const getExcelHeaders = () => {
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  };

  const resetImport = () => {
    setStep(1);
    setFile(null);
    setData([]);
    setResult(null);
    setValidationResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-crm-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-crm-primary rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/>
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-crm-text-primary">Importar Clientes</h2>
            </div>
            <button
              onClick={onClose}
              className="text-crm-text-muted hover:text-crm-text-primary transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              {[1, 2, 3, 4].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    Math.floor(step) >= stepNumber
                      ? 'bg-crm-primary text-white'
                      : 'bg-crm-card-hover text-crm-text-muted'
                  }`}>
                    {stepNumber}
                  </div>
                  {stepNumber < 4 && (
                    <div className={`w-16 h-1 mx-2 ${
                      Math.floor(step) > stepNumber ? 'bg-crm-primary' : 'bg-crm-border'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step 1: File Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-crm-text-primary mb-2">Seleccionar Archivo</h3>
                <p className="text-crm-text-muted mb-6">
                  Selecciona un archivo Excel (.xlsx, .xls) o CSV (.csv) con los datos de los clientes
                </p>
              </div>

              <div className="border-2 border-dashed border-crm-border rounded-lg p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="crm-button-primary px-6 py-3 rounded-lg"
                >
                  Seleccionar Archivo
                </button>
                <p className="text-sm text-crm-text-muted mt-4">
                  Formatos soportados: .xlsx, .xls, .csv
                </p>
              </div>

              <div className="bg-crm-primary/5 rounded-lg p-4">
                <h4 className="font-medium text-crm-text-primary mb-2">Formato del archivo:</h4>
                <div className="text-sm text-crm-text-muted space-y-1">
                  <p><strong>Columnas requeridas:</strong></p>
                  <ul className="list-disc list-inside ml-2">
                    <li>Nombre</li>
                    <li>Apellido</li>
                    <li>Teléfono / Celular</li>
                    <li>Proyecto de Interés (opcional)</li>
                  </ul>
                  <p className="mt-2"><strong>Límite:</strong> Hasta {MAX_RECORDS.toLocaleString()} registros por importación</p>
                </div>
                <div className="mt-3">
                  <button
                    onClick={downloadTemplate}
                    className="text-sm text-crm-primary hover:text-crm-primary/80 transition-colors flex items-center space-x-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <span>Descargar plantilla con instrucciones</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Data Preview */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-crm-text-primary mb-2">Vista Previa de Datos</h3>
                <p className="text-crm-text-muted mb-4">
                  Se encontraron {data.length} registros. Revisa los datos antes de continuar.
                </p>
              </div>

              <div className="overflow-x-auto max-h-96 border border-crm-border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-crm-card-hover sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      {getExcelHeaders().map((header, index) => (
                        <th key={index} className="px-3 py-2 text-left">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.slice(0, 10).map((row, index) => (
                      <tr key={index} className="border-t border-crm-border">
                        <td className="px-3 py-2">{index + 1}</td>
                        {getExcelHeaders().map((header, colIndex) => (
                          <td key={colIndex} className="px-3 py-2">
                            {row[header as keyof ClienteImportData] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={resetImport}
                  className="px-4 py-2 text-crm-text-muted hover:text-crm-text-primary transition-colors"
                >
                  ← Seleccionar otro archivo
                </button>
                <button
                  onClick={handleValidate}
                  disabled={isProcessing}
                  className="crm-button-primary px-6 py-2 rounded-lg disabled:opacity-50"
                >
                  {isProcessing ? 'Validando...' : 'Validar y Continuar →'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3.5: Validation Preview */}
          {step === 3.5 && validationResult && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-crm-text-primary mb-2">Resultado de la Validación</h3>
                <p className="text-crm-text-muted mb-4">
                  Revisa los errores antes de importar
                </p>
              </div>

              <div className="grid grid-cols-5 gap-3">
                <div className="text-center p-4 bg-crm-card-hover rounded-lg">
                  <div className="text-2xl font-bold text-crm-text-primary">{validationResult.total}</div>
                  <div className="text-sm text-crm-text-muted">Total</div>
                </div>
                <div className="text-center p-4 bg-green-100 rounded-lg">
                  <div className="text-2xl font-bold text-green-800">{validationResult.success}</div>
                  <div className="text-sm text-green-600">Válidos</div>
                </div>
                <div className="text-center p-4 bg-red-100 rounded-lg">
                  <div className="text-2xl font-bold text-red-800">{validationResult.errors}</div>
                  <div className="text-sm text-red-600">Con errores</div>
                </div>
                <div className="text-center p-4 bg-yellow-100 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-800">{validationResult.duplicates}</div>
                  <div className="text-sm text-yellow-600">Duplicados</div>
                </div>
                <div className="text-center p-4 bg-orange-100 rounded-lg">
                  <div className="text-2xl font-bold text-orange-800">{validationResult.warnings}</div>
                  <div className="text-sm text-orange-600">Avisos</div>
                </div>
              </div>

              {validationResult.errorsList.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-crm-text-primary">❌ Errores encontrados:</h4>
                    <button
                      onClick={exportErrors}
                      className="text-sm text-crm-primary hover:text-crm-primary/80 transition-colors flex items-center space-x-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                      <span>Exportar errores a CSV</span>
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto border border-crm-border rounded-lg">
                    {validationResult.errorsList.slice(0, 20).map((error, index) => (
                      <div key={index} className="p-3 border-b border-crm-border last:border-b-0">
                        <div className="text-sm font-medium text-crm-text-primary">
                          Fila {error.row}: {error.data.nombre || 'Sin nombre'} {error.data.apellido || ''}
                        </div>
                        <div className="text-sm text-red-600">
                          {error.errors.join(', ')}
                        </div>
                      </div>
                    ))}
                    {validationResult.errorsList.length > 20 && (
                      <div className="p-3 text-center text-sm text-crm-text-muted">
                        ... y {validationResult.errorsList.length - 20} errores más
                      </div>
                    )}
                  </div>
                </div>
              )}

              {validationResult.warningsList.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium text-crm-text-primary">⚠️ Avisos (no bloquean importación):</h4>
                  <div className="max-h-64 overflow-y-auto border border-orange-300 rounded-lg bg-orange-50">
                    {validationResult.warningsList.slice(0, 20).map((warning, index) => (
                      <div key={index} className="p-3 border-b border-orange-200 last:border-b-0">
                        <div className="text-sm font-medium text-orange-900">
                          Fila {warning.row}: {warning.data.nombre || 'Sin nombre'} {warning.data.apellido || ''}
                        </div>
                        <div className="text-sm text-orange-700">
                          {warning.warnings.join(', ')}
                        </div>
                      </div>
                    ))}
                    {validationResult.warningsList.length > 20 && (
                      <div className="p-3 text-center text-sm text-orange-600">
                        ... y {validationResult.warningsList.length - 20} avisos más
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  {validationResult.success > 0
                    ? `Se importarán ${validationResult.success} registro${validationResult.success !== 1 ? 's' : ''} válido${validationResult.success !== 1 ? 's' : ''}. Los registros con errores serán omitidos.`
                    : 'No hay registros válidos para importar. Corrige los errores y vuelve a intentar.'}
                </p>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={resetImport}
                  className="px-4 py-2 text-crm-text-muted hover:text-crm-text-primary transition-colors"
                >
                  ← Seleccionar otro archivo
                </button>
                <button
                  onClick={handleImport}
                  disabled={isProcessing || validationResult.success === 0}
                  className="crm-button-primary px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Importando...' : 'Confirmar Importación'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Results */}
          {step === 4 && result && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-crm-text-primary mb-2">Resultado de la Importación</h3>
              </div>

              <div className="grid grid-cols-5 gap-3">
                <div className="text-center p-4 bg-crm-card-hover rounded-lg">
                  <div className="text-2xl font-bold text-crm-text-primary">{result.total}</div>
                  <div className="text-sm text-crm-text-muted">Total</div>
                </div>
                <div className="text-center p-4 bg-green-100 rounded-lg">
                  <div className="text-2xl font-bold text-green-800">{result.success}</div>
                  <div className="text-sm text-green-600">Importados</div>
                </div>
                <div className="text-center p-4 bg-red-100 rounded-lg">
                  <div className="text-2xl font-bold text-red-800">{result.errors}</div>
                  <div className="text-sm text-red-600">Con errores</div>
                </div>
                <div className="text-center p-4 bg-yellow-100 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-800">{result.duplicates}</div>
                  <div className="text-sm text-yellow-600">Duplicados</div>
                </div>
                <div className="text-center p-4 bg-orange-100 rounded-lg">
                  <div className="text-2xl font-bold text-orange-800">{result.warnings}</div>
                  <div className="text-sm text-orange-600">Avisos</div>
                </div>
              </div>

              {result.errorsList.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-crm-text-primary">❌ Errores encontrados:</h4>
                    <button
                      onClick={exportErrors}
                      className="text-sm text-crm-primary hover:text-crm-primary/80 transition-colors flex items-center space-x-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                      <span>Exportar errores a CSV</span>
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto border border-crm-border rounded-lg">
                    {result.errorsList.slice(0, 20).map((error, index) => (
                      <div key={index} className="p-3 border-b border-crm-border last:border-b-0">
                        <div className="text-sm font-medium text-crm-text-primary">
                          Fila {error.row}: {error.data.nombre || 'Sin nombre'} {error.data.apellido || ''}
                        </div>
                        <div className="text-sm text-red-600">
                          {error.errors.join(', ')}
                        </div>
                      </div>
                    ))}
                    {result.errorsList.length > 20 && (
                      <div className="p-3 text-center text-sm text-crm-text-muted">
                        ... y {result.errorsList.length - 20} errores más
                      </div>
                    )}
                  </div>
                </div>
              )}

              {result.warningsList.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium text-crm-text-primary">⚠️ Avisos (registros importados con avisos):</h4>
                  <div className="max-h-64 overflow-y-auto border border-orange-300 rounded-lg bg-orange-50">
                    {result.warningsList.slice(0, 20).map((warning, index) => (
                      <div key={index} className="p-3 border-b border-orange-200 last:border-b-0">
                        <div className="text-sm font-medium text-orange-900">
                          Fila {warning.row}: {warning.data.nombre || 'Sin nombre'} {warning.data.apellido || ''}
                        </div>
                        <div className="text-sm text-orange-700">
                          {warning.warnings.join(', ')}
                        </div>
                      </div>
                    ))}
                    {result.warningsList.length > 20 && (
                      <div className="p-3 text-center text-sm text-orange-600">
                        ... y {result.warningsList.length - 20} avisos más
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <button
                  onClick={resetImport}
                  className="px-4 py-2 text-crm-text-muted hover:text-crm-text-primary transition-colors"
                >
                  ← Importar otro archivo
                </button>
                <button
                  onClick={onClose}
                  className="crm-button-primary px-6 py-2 rounded-lg"
                >
                  Finalizar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
