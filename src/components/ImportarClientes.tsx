"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { getErrorMessage } from "@/lib/errors";
import { downloadTemplate } from "@/lib/generateTemplate";
import { downloadAMERSURTemplate } from "@/lib/generateTemplateAMERSUR";
interface ImportarClientesProps {
  onClose: () => void;
}

interface ClienteImportData {
  codigo_cliente?: string;
  nombre: string;
  tipo_cliente?: string;
  documento_identidad?: string;
  email?: string;
  telefono?: string;
  telefono_whatsapp?: string;
  direccion_calle?: string;
  direccion_numero?: string;
  direccion_barrio?: string;
  direccion_ciudad?: string;
  direccion_provincia?: string;
  direccion_pais?: string;
  estado_cliente?: string;
  origen_lead?: string;
  vendedor_asignado?: string;
  proxima_accion?: string;
  interes_principal?: string;
  capacidad_compra_estimada?: number;
  forma_pago_preferida?: string;
  notas?: string;
}

interface ImportResult {
  total: number;
  success: number;
  errors: number;
  errorsList: Array<{
    row: number;
    data: ClienteImportData;
    errors: string[];
  }>;
}

type RawCell = string | number | boolean | Date | null | undefined;
type RawRow = RawCell[];
const IMPORTABLE_FIELDS: Array<keyof ClienteImportData> = [
  'codigo_cliente',
  'nombre',
  'tipo_cliente',
  'documento_identidad',
  'email',
  'telefono',
  'telefono_whatsapp',
  'direccion_calle',
  'direccion_numero',
  'direccion_barrio',
  'direccion_ciudad',
  'direccion_provincia',
  'direccion_pais',
  'estado_cliente',
  'origen_lead',
  'vendedor_asignado',
  'proxima_accion',
  'interes_principal',
  'capacidad_compra_estimada',
  'forma_pago_preferida',
  'notas',
];

export default function ImportarClientes({ onClose }: ImportarClientesProps) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<ClienteImportData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
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
          if (targetKey === 'capacidad_compra_estimada') {
            const numericValue = typeof cellValue === 'number' ? cellValue : Number(cellValue);
            if (!Number.isNaN(numericValue)) {
              rowData[targetKey] = numericValue;
            }
            return;
          }

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
    
    // Mapeo de nombres comunes a nombres esperados
    const columnMapping: Record<string, string> = {
      'nombre': 'nombre',
      'nombres': 'nombre',
      'name': 'nombre',
      'celular': 'telefono',
      'telefono': 'telefono',
      'phone': 'telefono',
      'movil': 'telefono',
      'email': 'email',
      'correo': 'email',
      'mail': 'email',
      'e_mail': 'email',
      'tipo_cliente': 'tipo_cliente',
      'tipo': 'tipo_cliente',
      'documento': 'documento_identidad',
      'dni': 'documento_identidad',
      'ruc': 'documento_identidad',
      'cedula': 'documento_identidad',
      'direccion': 'direccion_calle',
      'direccion_calle': 'direccion_calle',
      'calle': 'direccion_calle',
      'direccion_numero': 'direccion_numero',
      'numero': 'direccion_numero',
      'direccion_barrio': 'direccion_barrio',
      'barrio': 'direccion_barrio',
      'direccion_ciudad': 'direccion_ciudad',
      'ciudad': 'direccion_ciudad',
      'direccion_provincia': 'direccion_provincia',
      'provincia': 'direccion_provincia',
      'direccion_pais': 'direccion_pais',
      'pais': 'direccion_pais',
      'estado': 'estado_cliente',
      'estado_cliente': 'estado_cliente',
      'origen': 'origen_lead',
      'origen_lead': 'origen_lead',
      'vendedor': 'vendedor_asignado',
      'vendedor_asignado': 'vendedor_asignado',
      'proxima_accion': 'proxima_accion',
      'accion': 'proxima_accion',
      'interes': 'interes_principal',
      'interes_principal': 'interes_principal',
      'capacidad': 'capacidad_compra_estimada',
      'capacidad_compra': 'capacidad_compra_estimada',
      'precio_maximo': 'capacidad_compra_estimada',
      'forma_pago': 'forma_pago_preferida',
      'pago': 'forma_pago_preferida',
      'notas': 'notas',
      'observaciones': 'notas',
      'comentarios': 'notas',
      'año': 'año',
      'year': 'año',
      'fecha': 'fecha_alta',
      'fecha_alta': 'fecha_alta'
    };
    
    return columnMapping[normalized] || normalized;
  };

  const validateData = (data: ClienteImportData[]): ImportResult => {
    const errors: ImportResult['errorsList'] = [];
    let success = 0;

    data.forEach((row, index) => {
      const rowErrors: string[] = [];

      // Validar campos requeridos - más flexible
      if (!row.nombre || String(row.nombre).trim() === '') {
        rowErrors.push('Nombre es requerido');
      }

      // Email es opcional pero si está presente debe ser válido
      if (row.email && String(row.email).trim() !== '' && !isValidEmail(String(row.email))) {
        rowErrors.push('Email inválido');
      }

      // Teléfono es opcional pero si está presente debe ser válido
      if (row.telefono && String(row.telefono).trim() !== '' && !isValidPhone(String(row.telefono))) {
        rowErrors.push('Teléfono inválido');
      }

      // Capacidad de compra debe ser número si está presente
      if (row.capacidad_compra_estimada && isNaN(Number(row.capacidad_compra_estimada))) {
        rowErrors.push('Capacidad de compra debe ser un número');
      }

      // Si no hay nombre, es un error crítico
      if (rowErrors.length > 0) {
        errors.push({
          row: index + 2, // +2 porque index es 0-based y la primera fila es header
          data: row,
          errors: rowErrors
        });
      } else {
        success++;
      }
    });

    return {
      total: data.length,
      success,
      errors: errors.length,
      errorsList: errors
    };
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPhone = (phone: string): boolean => {
    const raw = String(phone || '');
    const minimal = raw.replace(/[\s\-\(\)]/g, '');

    // Detectar candidatos peruanos: 51..., +51..., 0051...
    const isPeruCandidate = minimal.startsWith('51') || minimal.startsWith('+51') || minimal.startsWith('0051');

    // Reglas de limpieza avanzadas SOLO para Perú
    // - eliminar puntos, comas, slashes, guiones bajos, punto y coma, dos puntos
    // - eliminar extensiones: ext, anexo, x, int y lo que siga
    let cleanForCheck = minimal;
    if (isPeruCandidate) {
      const withoutExtension = raw.replace(/(?:\s|^)(?:ext|anexo|x|int)\.?\s*\d+.*/i, '');
      cleanForCheck = withoutExtension
        .replace(/[\s\-\(\)\.\/,;:_]/g, '')
        .replace(/\D/g, ''); // dejar solo dígitos
    }

    const peruvianPhoneRegex = /^51[0-9]{9}$/; // 51 + 9 dígitos
    const internationalPhoneRegex = /^[\+]?[0-9]{7,15}$/; // 7–15 dígitos, opcional +

    // Para Perú usamos la cadena super-limpia; para internacional respetamos formato con +
    return peruvianPhoneRegex.test(cleanForCheck) || internationalPhoneRegex.test(minimal);
  };

  const handleImport = async () => {
    if (!file) return;

    setIsProcessing(true);
    try {
      // Validar datos
      const validation = validateData(data);
      setResult(validation);

      // Filtrar filas válidas y continuar con importación parcial
      const invalidRowNumbers = new Set(validation.errorsList.map(e => e.row));
      const validRows = data.filter((row, idx) => {
        void row;
        return !invalidRowNumbers.has(idx + 2);
      });

      if (validRows.length === 0) {
        setStep(4);
        toast.error('No hay filas válidas para importar');
        return;
      }

      // Deduplicar por teléfono dentro del lote (normalizando a solo dígitos)
      const normalizePhoneForKey = (value: unknown): string => String(value || '').replace(/\D/g, '');
      const seenPhones = new Set<string>();
      const dedupedRows = validRows.filter((row) => {
        if (!row.telefono) return true; // sin teléfono no se deduplica
        const key = normalizePhoneForKey(row.telefono);
        if (!key) return true;
        if (seenPhones.has(key)) return false;
        seenPhones.add(key);
        return true;
      });

      // Importar solo las filas válidas y deduplicadas
      await importData(dedupedRows);

      if (validation.errors > 0) {
        const removedDup = validRows.length - dedupedRows.length;
        const suffix = removedDup > 0 ? ` (eliminados ${removedDup} duplicados por teléfono)` : '';
        toast.success(`Importados ${dedupedRows.length} registros. Omitidos ${validation.errors}.${suffix}`);
      } else {
        const removedDup = validRows.length - dedupedRows.length;
        const suffix = removedDup > 0 ? ` (eliminados ${removedDup} duplicados por teléfono)` : '';
        toast.success(`Importación exitosa: ${dedupedRows.length} clientes importados${suffix}`);
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
    const BATCH_SIZE = 100; // Procesar en lotes de 100
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
          let apiMsg = '';
          let details = '';
          let firstErrors = '';
          const contentType = clone.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const payload = await clone.json();
            apiMsg = payload?.error || payload?.message || '';
            details = payload?.details || '';
            if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
              firstErrors = ` | Ejemplo: ${payload.errors[0].errors?.join(', ')}`;
            }
            console.error('Import batch error payload:', payload);
          } else {
            const text = await clone.text();
            details = text?.slice(0, 500) || '';
            console.error('Import batch error text:', details);
          }
          msg = [msg, apiMsg, details, firstErrors].filter(Boolean).join(' - ');
        } catch {
          // Ignorar fallo al leer cuerpo y usar mensaje con status
        }
        toast.dismiss('import-progress');
        throw new Error(msg);
      }
      
      // Acumular métricas del backend
      try {
        const payload = await response.json();
        totalImported += Number(payload?.imported || 0);
        totalSkippedDuplicates += Number(payload?.skippedDuplicates || 0);
      } catch {
        // si no es JSON, ignorar
      }

      // Mostrar progreso
      const progress = Math.round(((i + batch.length) / data.length) * 100);
      toast.loading(`Importando... ${progress}%`, { id: 'import-progress' });
    }
    
    toast.dismiss('import-progress');
    // Mostrar resumen acumulado
    if (totalSkippedDuplicates > 0) {
      toast.success(`Importados ${totalImported}. Omitidos por duplicado existente: ${totalSkippedDuplicates}.`);
    }
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
                    step >= stepNumber 
                      ? 'bg-crm-primary text-white' 
                      : 'bg-crm-card-hover text-crm-text-muted'
                  }`}>
                    {stepNumber}
                  </div>
                  {stepNumber < 4 && (
                    <div className={`w-16 h-1 mx-2 ${
                      step > stepNumber ? 'bg-crm-primary' : 'bg-crm-border'
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
                <h4 className="font-medium text-crm-text-primary mb-2">Formato esperado del archivo:</h4>
                <div className="text-sm text-crm-text-muted space-y-1">
                  <p><strong>Formato mínimo:</strong> Nombre, Celular (como tu archivo actual)</p>
                  <p><strong>Formato completo:</strong> nombre, email, telefono, tipo_cliente, direccion, etc.</p>
                  <p><strong>Límite:</strong> Hasta 20,000 registros por importación</p>
                  <p><strong>Nota:</strong> El sistema mapea automáticamente &quot;Nombre&quot; → &quot;nombre&quot; y &quot;Celular&quot; → &quot;telefono&quot;</p>
                </div>
                <div className="mt-3 space-y-2">
                  <button
                    onClick={downloadTemplate}
                    className="text-sm text-crm-primary hover:text-crm-primary/80 transition-colors flex items-center space-x-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <span>Descargar plantilla completa Excel</span>
                  </button>
                  <button
                    onClick={downloadAMERSURTemplate}
                    className="text-sm text-crm-primary hover:text-crm-primary/80 transition-colors flex items-center space-x-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <span>Descargar plantilla AMERSUR (Nombre, Celular, Año)</span>
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
                      {getExcelHeaders().slice(0, 10).map((header, index) => (
                        <th key={index} className="px-3 py-2 text-left">{header}</th>
                      ))}
                      {getExcelHeaders().length > 10 && (
                        <th className="px-3 py-2 text-left">...</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {data.slice(0, 10).map((row, index) => (
                      <tr key={index} className="border-t border-crm-border">
                        <td className="px-3 py-2">{index + 1}</td>
                        {getExcelHeaders().slice(0, 10).map((header, colIndex) => (
                          <td key={colIndex} className="px-3 py-2">
                            {row[header as keyof ClienteImportData] || '-'}
                          </td>
                        ))}
                        {getExcelHeaders().length > 10 && (
                          <td className="px-3 py-2">...</td>
                        )}
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
                  onClick={() => setStep(3)}
                  className="crm-button-primary px-6 py-2 rounded-lg"
                >
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Validation */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-crm-text-primary mb-2">Validación de Datos</h3>
                <p className="text-crm-text-muted mb-4">
                  Validando {data.length} registros...
                </p>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleImport}
                  disabled={isProcessing}
                  className="crm-button-primary px-8 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Importando...' : 'Iniciar Importación'}
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

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-crm-card-hover rounded-lg">
                  <div className="text-2xl font-bold text-crm-text-primary">{result.total}</div>
                  <div className="text-sm text-crm-text-muted">Total</div>
                </div>
                <div className="text-center p-4 bg-green-100 rounded-lg">
                  <div className="text-2xl font-bold text-green-800">{result.success}</div>
                  <div className="text-sm text-green-600">Exitosos</div>
                </div>
                <div className="text-center p-4 bg-red-100 rounded-lg">
                  <div className="text-2xl font-bold text-red-800">{result.errors}</div>
                  <div className="text-sm text-red-600">Con errores</div>
                </div>
              </div>

              {result.errorsList.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium text-crm-text-primary">Errores encontrados:</h4>
                  <div className="max-h-64 overflow-y-auto border border-crm-border rounded-lg">
                    {result.errorsList.slice(0, 20).map((error, index) => (
                      <div key={index} className="p-3 border-b border-crm-border last:border-b-0">
                        <div className="text-sm font-medium text-crm-text-primary">
                          Fila {error.row}: {error.data.nombre || 'Sin nombre'}
                        </div>
                        <div className="text-sm text-crm-text-muted">
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
