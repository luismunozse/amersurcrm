"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { LoadingButton } from "@/components/form/LoadingButton";

interface Inconsistencia {
  tipo_inconsistencia: string;
  cantidad: number;
  detalles: Array<{
    cliente_id: string;
    cliente_nombre: string;
    vendedor_asignado?: string;
    vendedor_username?: string;
    mensaje?: string;
  }>;
}

interface ResultadoSync {
  total_clientes: number;
  clientes_sincronizados: number;
  clientes_corregidos: number;
  clientes_con_error: number;
  detalles: Array<{
    tipo: string;
    cliente_id: string;
    cliente_nombre: string;
    vendedor_id?: string;
    vendedor_username?: string;
    mensaje?: string;
  }>;
}

export default function SyncVendedorFieldsPage() {
  const [loading, setLoading] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [inconsistencias, setInconsistencias] = useState<Inconsistencia[]>([]);
  const [resultadoSync, setResultadoSync] = useState<ResultadoSync | null>(null);

  const verificarInconsistencias = async () => {
    setVerificando(true);
    try {
      const response = await fetch("/api/admin/sync-vendedor-fields");
      const data = await response.json();

      if (data.success) {
        setInconsistencias(data.inconsistencias || []);
        if (data.inconsistencias?.length === 0) {
          toast.success("No se encontraron inconsistencias. Todos los campos están sincronizados.");
        } else {
          const total = data.inconsistencias.reduce((sum: number, inc: Inconsistencia) => sum + inc.cantidad, 0);
          toast(`Se encontraron ${total} inconsistencias`, {
            icon: 'ℹ️',
            duration: 4000,
          });
        }
      } else {
        toast.error(data.error || "Error al verificar inconsistencias");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al verificar inconsistencias");
    } finally {
      setVerificando(false);
    }
  };

  const sincronizarCampos = async () => {
    if (inconsistencias.length === 0) {
      toast.error("Primero verifica las inconsistencias");
      return;
    }

    const confirmar = window.confirm(
      `¿Estás seguro de que deseas sincronizar los campos de vendedor?\n\n` +
      `Esto actualizará ${inconsistencias.reduce((sum, inc) => sum + inc.cantidad, 0)} clientes.`
    );

    if (!confirmar) return;

    setLoading(true);
    try {
      const response = await fetch("/api/admin/sync-vendedor-fields", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        setResultadoSync(data);
        toast.success(data.message || "Sincronización completada exitosamente");
        // Recargar inconsistencias
        await verificarInconsistencias();
      } else {
        toast.error(data.error || "Error al sincronizar campos");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al sincronizar campos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-crm-card border border-crm-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-crm-text-primary mb-2">
              Sincronizar Campos de Vendedor
            </h1>
            <p className="text-sm text-crm-text-muted">
              Verifica y sincroniza los campos vendedor_asignado y vendedor_username en la tabla cliente
            </p>
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="bg-crm-card border border-crm-border rounded-xl p-6 shadow-sm">
        <div className="flex gap-4">
          <button
            onClick={verificarInconsistencias}
            disabled={verificando}
            className="px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {verificando ? (
              <>
                <Spinner size="sm" />
                Verificando...
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4" />
                Verificar Inconsistencias
              </>
            )}
          </button>

          <LoadingButton
            onClick={sincronizarCampos}
            isLoading={loading}
            loadingText="Sincronizando..."
            disabled={inconsistencias.length === 0 || loading}
            variant="primary"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Sincronizar Campos
          </LoadingButton>
        </div>
      </div>

      {/* Resultado de sincronización */}
      {resultadoSync && (
        <div className="bg-crm-card border border-crm-border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-crm-text-primary mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Resultado de la Sincronización
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-crm-bg-primary dark:bg-crm-card rounded-lg border border-crm-border">
              <p className="text-xs text-crm-text-muted mb-1">Total Clientes</p>
              <p className="text-2xl font-bold text-crm-text-primary">{resultadoSync.total_clientes}</p>
            </div>
            <div className="p-4 bg-crm-bg-primary dark:bg-crm-card rounded-lg border border-crm-border">
              <p className="text-xs text-crm-text-muted mb-1">Ya Sincronizados</p>
              <p className="text-2xl font-bold text-green-600">{resultadoSync.clientes_sincronizados}</p>
            </div>
            <div className="p-4 bg-crm-bg-primary dark:bg-crm-card rounded-lg border border-crm-border">
              <p className="text-xs text-crm-text-muted mb-1">Corregidos</p>
              <p className="text-2xl font-bold text-blue-600">{resultadoSync.clientes_corregidos}</p>
            </div>
            <div className="p-4 bg-crm-bg-primary dark:bg-crm-card rounded-lg border border-crm-border">
              <p className="text-xs text-crm-text-muted mb-1">Con Error</p>
              <p className="text-2xl font-bold text-red-600">{resultadoSync.clientes_con_error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Inconsistencias encontradas */}
      {inconsistencias.length > 0 && (
        <div className="bg-crm-card border border-crm-border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-crm-text-primary mb-4">
            Inconsistencias Encontradas
          </h2>
          <div className="space-y-4">
            {inconsistencias.map((inc, idx) => (
              <div key={idx} className="p-4 bg-crm-bg-primary dark:bg-crm-card rounded-lg border border-crm-border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-crm-text-primary">{inc.tipo_inconsistencia}</h3>
                  <span className="px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
                    {inc.cantidad} cliente{inc.cantidad !== 1 ? 's' : ''}
                  </span>
                </div>
                {inc.detalles && inc.detalles.length > 0 && (
                  <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                    {inc.detalles.slice(0, 10).map((detalle, detIdx) => (
                      <div key={detIdx} className="text-xs text-crm-text-muted p-2 bg-crm-card rounded border border-crm-border">
                        <p className="font-medium text-crm-text-primary">{detalle.cliente_nombre}</p>
                        {detalle.vendedor_asignado && (
                          <p>Vendedor ID: {detalle.vendedor_asignado}</p>
                        )}
                        {detalle.vendedor_username && (
                          <p>Vendedor Username: {detalle.vendedor_username}</p>
                        )}
                        {detalle.mensaje && (
                          <p className="text-red-600 dark:text-red-400">{detalle.mensaje}</p>
                        )}
                      </div>
                    ))}
                    {inc.detalles.length > 10 && (
                      <p className="text-xs text-crm-text-muted italic">
                        ... y {inc.detalles.length - 10} más
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Información */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
              Información
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-400">
              Esta herramienta sincroniza los campos <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">vendedor_asignado</code> (UUID) 
              y <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">vendedor_username</code> (string) en la tabla cliente. 
              Los triggers automáticos deberían mantenerlos sincronizados, pero esta herramienta corrige datos existentes que puedan estar desincronizados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

