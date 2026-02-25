"use client";

import { useCallback, useState, useRef } from "react";
import toast from "react-hot-toast";
import { Spinner } from "@/components/ui/Spinner";
// xlsx se carga dinámicamente al descargar plantilla (~600KB ahorrados en carga inicial)
import type * as XLSXType from "xlsx";

interface ImportarLotesModalProps {
  proyectoId: string;
  proyectoNombre: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportResult {
  success: boolean;
  total: number;
  imported: number;
  errors: Array<{
    row: number;
    codigo: string;
    error: string;
  }>;
  duplicados: string[];
}

export default function ImportarLotesModal({
  proyectoId,
  proyectoNombre,
  onClose,
  onSuccess,
}: ImportarLotesModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preload xlsx on hover (~600KB cargado antes de necesitarlo)
  const handlePreloadXlsx = useCallback(() => {
    import("xlsx").catch(() => {});
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validar que sea un archivo Excel
      const validTypes = [
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls)$/)) {
        toast.error("Por favor selecciona un archivo Excel válido (.xlsx o .xls)");
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Por favor selecciona un archivo");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("proyecto_id", proyectoId);

    try {
      const response = await fetch("/api/lotes/importar", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al importar lotes");
      }

      setResult(data);

      if (data.success && data.imported > 0) {
        toast.success(
          `Se importaron ${data.imported} de ${data.total} lotes correctamente`
        );
        // Esperar un momento antes de cerrar para que el usuario vea el resultado
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        toast.error("No se pudo importar ningún lote. Revisa los errores.");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al importar lotes"
      );
    } finally {
      setIsUploading(false);
    }
  };

  const descargarPlantilla = async () => {
    // Crear datos de ejemplo
    const data = [
      {
        codigo: "SC-1",
        tipo_unidad: "Lote",
        sup_m2: 200.00,
        precio: 62000.00,
        precio_m2: 310,
        moneda: "PEN",
        estado: "disponible",
      },
      {
        codigo: "SC-2",
        tipo_unidad: "Lote",
        sup_m2: 200.00,
        precio: 62000.00,
        precio_m2: 310,
        moneda: "PEN",
        estado: "vendido",
      },
      {
        codigo: "SC-15",
        tipo_unidad: "Lote",
        sup_m2: 200.00,
        precio: 52000.00,
        precio_m2: 260,
        moneda: "PEN",
        estado: "disponible",
      },
      {
        codigo: "SC-28",
        tipo_unidad: "Lote",
        sup_m2: 200.46,
        precio: 62142.60,
        precio_m2: 310,
        moneda: "PEN",
        estado: "disponible",
      },
    ];

    // Crear workbook y worksheet (dynamic import)
    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Lotes");

    // Ajustar ancho de columnas
    worksheet["!cols"] = [
      { wch: 15 }, // codigo
      { wch: 12 }, // tipo_unidad
      { wch: 10 }, // sup_m2
      { wch: 12 }, // precio
      { wch: 12 }, // precio_m2
      { wch: 8 },  // moneda
      { wch: 12 }, // estado
    ];

    // Descargar archivo
    XLSX.writeFile(workbook, `plantilla_lotes_${proyectoNombre.replace(/\s+/g, "_")}.xlsx`);
    toast.success("Plantilla descargada correctamente");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-crm-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-crm-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-crm-border">
          <div>
            <h2 className="text-xl font-bold text-crm-text-primary">
              Importar Lotes Masivamente
            </h2>
            <p className="text-sm text-crm-text-muted mt-1">
              Proyecto: {proyectoNombre}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-crm-text-muted hover:text-crm-text-primary transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Instrucciones */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
              Instrucciones:
            </h3>
            <ol className="text-xs text-blue-800 dark:text-blue-300 space-y-1 list-decimal list-inside">
              <li>Descarga la plantilla de Excel haciendo clic en el botón de abajo</li>
              <li>Completa los datos de los lotes en el archivo</li>
              <li>El campo <strong>codigo</strong> es obligatorio y debe ser único</li>
              <li>El campo <strong>tipo_unidad</strong> es opcional (ej: "Lote", "Casa", "Departamento")</li>
              <li>Los campos <strong>sup_m2</strong>, <strong>precio</strong> y <strong>precio_m2</strong> son opcionales</li>
              <li>El <strong>estado</strong> puede ser: disponible, reservado o vendido</li>
              <li>La <strong>moneda</strong> por defecto es PEN (puedes usar USD, EUR, etc.)</li>
              <li>Sube el archivo completado y presiona "Importar"</li>
            </ol>
          </div>

          {/* Botón descargar plantilla */}
          <button
            onClick={descargarPlantilla}
            onMouseEnter={handlePreloadXlsx}
            className="w-full crm-button-secondary py-3 rounded-lg text-sm font-medium flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Descargar Plantilla de Excel</span>
          </button>

          {/* Selector de archivo */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-crm-text-primary">
              Seleccionar archivo Excel
            </label>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="flex-1 px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-crm-primary/10 file:text-crm-primary hover:file:bg-crm-primary/20"
              />
            </div>
            {file && (
              <p className="text-xs text-crm-text-muted">
                Archivo seleccionado: {file.name}
              </p>
            )}
          </div>

          {/* Resultado de la importación */}
          {result && (
            <div className={`rounded-lg p-4 border ${
              result.success
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
            }`}>
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 ${
                  result.success ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                }`}>
                  {result.success ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className={`text-sm font-semibold ${
                    result.success
                      ? "text-green-900 dark:text-green-200"
                      : "text-red-900 dark:text-red-200"
                  }`}>
                    {result.success
                      ? `Importación completada: ${result.imported}/${result.total} lotes`
                      : "Error en la importación"}
                  </h4>

                  {result.errors.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-crm-text-secondary">
                        Errores encontrados:
                      </p>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {result.errors.map((error, idx) => (
                          <div
                            key={idx}
                            className="text-xs bg-white/50 dark:bg-black/20 rounded p-2"
                          >
                            <span className="font-medium">Fila {error.row}</span>
                            {error.codigo && (
                              <span className="text-crm-text-muted"> - {error.codigo}</span>
                            )}
                            <p className="text-red-600 dark:text-red-400 mt-1">
                              {error.error}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-crm-border">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-crm-text-secondary bg-crm-card-hover hover:bg-crm-border rounded-lg transition-all"
            disabled={isUploading}
          >
            {result?.success ? "Cerrar" : "Cancelar"}
          </button>
          {!result?.success && (
            <button
              onClick={handleImport}
              disabled={!file || isUploading}
              className="crm-button-primary px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isUploading ? (
                <>
                  <Spinner size="sm" color="white" />
                  <span>Importando...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>Importar Lotes</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
