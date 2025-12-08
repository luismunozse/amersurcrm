"use client";

import { useState, useEffect } from "react";
import { AlertCircle, Download, RefreshCw, Search } from "lucide-react";
import toast from "react-hot-toast";

interface ExtensionLog {
  id: string;
  usuario_id: string | null;
  level: string;
  context: string;
  message: string;
  data: any;
  error_name: string | null;
  error_message: string | null;
  error_stack: string | null;
  user_agent: string | null;
  url: string | null;
  timestamp: string;
  created_at: string;
}

interface ExtensionMetrics {
  metric_type: string;
  metric_name: string;
  count: number;
  avg: number;
  median: number;
  min: number;
  max: number;
}

export default function ExtensionLogsPage() {
  const [logs, setLogs] = useState<ExtensionLog[]>([]);
  const [metrics, setMetrics] = useState<ExtensionMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"logs" | "metrics">("logs");
  const [filters, setFilters] = useState({
    level: "",
    context: "",
    limit: 50,
    offset: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (activeTab === "logs") {
      loadLogs();
    } else {
      loadMetrics();
    }
  }, [activeTab, filters]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.level) params.set("level", filters.level);
      if (filters.context) params.set("context", filters.context);
      params.set("limit", filters.limit.toString());
      params.set("offset", filters.offset.toString());

      const response = await fetch(`/api/logs/extension?${params}`);
      const data = await response.json();

      if (data.success) {
        setLogs(data.logs || []);
      } else {
        toast.error("Error cargando logs");
      }
    } catch (error) {
      console.error("Error cargando logs:", error);
      toast.error("Error cargando logs");
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/metrics/extension?days=7");
      const data = await response.json();

      if (data.success) {
        setMetrics(data.aggregated || []);
      } else {
        toast.error("Error cargando métricas");
      }
    } catch (error) {
      console.error("Error cargando métricas:", error);
      toast.error("Error cargando métricas");
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.message.toLowerCase().includes(search) ||
      log.context.toLowerCase().includes(search) ||
      (log.error_message && log.error_message.toLowerCase().includes(search))
    );
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case "ERROR":
        return "bg-red-100 text-red-800 border-red-200";
      case "WARN":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "INFO":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "DEBUG":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const exportLogs = () => {
    const csv = [
      ["Timestamp", "Level", "Context", "Message", "Error", "URL"].join(","),
      ...filteredLogs.map((log) =>
        [
          log.timestamp,
          log.level,
          log.context,
          `"${log.message.replace(/"/g, '""')}"`,
          log.error_message ? `"${log.error_message.replace(/"/g, '""')}"` : "",
          log.url || "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extension-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-crm-bg-primary">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-crm-text-primary">
            Logs de Extensión Chrome
          </h1>
          <p className="text-crm-text-secondary mt-2">
            Monitoreo y análisis de logs y métricas de la extensión AmersurChat
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-crm-border">
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "logs"
                ? "border-b-2 border-crm-primary text-crm-primary"
                : "text-crm-text-muted hover:text-crm-text-primary"
            }`}
          >
            Logs
          </button>
          <button
            onClick={() => setActiveTab("metrics")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "metrics"
                ? "border-b-2 border-crm-primary text-crm-primary"
                : "text-crm-text-muted hover:text-crm-text-primary"
            }`}
          >
            Métricas de Performance
          </button>
        </div>

        {activeTab === "logs" ? (
          <>
            {/* Filtros y búsqueda */}
            <div className="crm-card p-4 mb-6 space-y-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-crm-text-primary mb-1">
                    Buscar
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crm-text-muted" />
                    <input
                      type="text"
                      placeholder="Buscar en logs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-crm-border rounded-lg bg-white text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-crm-text-primary mb-1">
                    Nivel
                  </label>
                  <select
                    value={filters.level}
                    onChange={(e) =>
                      setFilters({ ...filters, level: e.target.value, offset: 0 })
                    }
                    className="px-3 py-2 border border-crm-border rounded-lg bg-white text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary/20"
                  >
                    <option value="">Todos</option>
                    <option value="ERROR">ERROR</option>
                    <option value="WARN">WARN</option>
                    <option value="INFO">INFO</option>
                    <option value="DEBUG">DEBUG</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-crm-text-primary mb-1">
                    Contexto
                  </label>
                  <input
                    type="text"
                    placeholder="Contexto..."
                    value={filters.context}
                    onChange={(e) =>
                      setFilters({ ...filters, context: e.target.value, offset: 0 })
                    }
                    className="px-3 py-2 border border-crm-border rounded-lg bg-white text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary/20"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={loadLogs}
                    className="px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover transition-colors flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Actualizar
                  </button>
                  <button
                    onClick={exportLogs}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Exportar
                  </button>
                </div>
              </div>
            </div>

            {/* Lista de logs */}
            <div className="crm-card overflow-hidden">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-crm-primary mx-auto"></div>
                  <p className="mt-4 text-crm-text-muted">Cargando logs...</p>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-crm-text-muted mx-auto mb-4" />
                  <p className="text-crm-text-muted">No se encontraron logs</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-crm-card-hover">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-crm-text-secondary uppercase">
                          Timestamp
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-crm-text-secondary uppercase">
                          Nivel
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-crm-text-secondary uppercase">
                          Contexto
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-crm-text-secondary uppercase">
                          Mensaje
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-crm-text-secondary uppercase">
                          Error
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-crm-border">
                      {filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-crm-card-hover">
                          <td className="px-4 py-3 text-sm text-crm-text-secondary">
                            {formatDate(log.timestamp)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getLevelColor(
                                log.level
                              )}`}
                            >
                              {log.level}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-crm-text-primary font-mono">
                            {log.context}
                          </td>
                          <td className="px-4 py-3 text-sm text-crm-text-primary">
                            {log.message}
                          </td>
                          <td className="px-4 py-3 text-sm text-crm-text-secondary">
                            {log.error_message ? (
                              <details className="cursor-pointer">
                                <summary className="text-red-600 hover:text-red-700">
                                  {log.error_name || "Error"}
                                </summary>
                                <div className="mt-2 p-2 bg-red-50 rounded text-xs font-mono text-red-800 max-w-md">
                                  {log.error_message}
                                  {log.error_stack && (
                                    <pre className="mt-2 text-xs overflow-x-auto">
                                      {log.error_stack}
                                    </pre>
                                  )}
                                </div>
                              </details>
                            ) : (
                              <span className="text-crm-text-muted">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="crm-card p-6">
            {loading ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-crm-primary mx-auto"></div>
                <p className="mt-4 text-crm-text-muted">Cargando métricas...</p>
              </div>
            ) : metrics.length === 0 ? (
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-crm-text-muted mx-auto mb-4" />
                <p className="text-crm-text-muted">No hay métricas disponibles</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-crm-card-hover">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-crm-text-secondary uppercase">
                        Tipo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-crm-text-secondary uppercase">
                        Métrica
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-crm-text-secondary uppercase">
                        Muestras
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-crm-text-secondary uppercase">
                        Promedio
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-crm-text-secondary uppercase">
                        Mediana
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-crm-text-secondary uppercase">
                        Mín
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-crm-text-secondary uppercase">
                        Máx
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-crm-border">
                    {metrics.map((metric, index) => (
                      <tr key={index} className="hover:bg-crm-card-hover">
                        <td className="px-4 py-3 text-sm text-crm-text-primary font-mono">
                          {metric.metric_type}
                        </td>
                        <td className="px-4 py-3 text-sm text-crm-text-primary">
                          {metric.metric_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-crm-text-secondary text-right">
                          {metric.count}
                        </td>
                        <td className="px-4 py-3 text-sm text-crm-text-secondary text-right">
                          {metric.avg.toFixed(2)}ms
                        </td>
                        <td className="px-4 py-3 text-sm text-crm-text-secondary text-right">
                          {metric.median.toFixed(2)}ms
                        </td>
                        <td className="px-4 py-3 text-sm text-crm-text-secondary text-right">
                          {metric.min.toFixed(2)}ms
                        </td>
                        <td className="px-4 py-3 text-sm text-crm-text-secondary text-right">
                          {metric.max.toFixed(2)}ms
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

