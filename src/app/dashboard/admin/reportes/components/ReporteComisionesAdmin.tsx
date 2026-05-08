"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Wallet, Clock, ShieldCheck, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import { PageLoader } from "@/components/ui/PageLoader";
import { obtenerReporteComisiones } from "../_actions";
import type { ReporteComisiones } from "../_actions";
import toast from "react-hot-toast";

interface Props {
  periodo: string;
  fechaInicio?: string;
  fechaFin?: string;
}

function formatPEN(n: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export default function ReporteComisionesAdmin({ periodo, fechaInicio, fechaFin }: Props) {
  const [data, setData] = useState<ReporteComisiones | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await obtenerReporteComisiones(periodo, fechaInicio, fechaFin);
    if (res.error) {
      setError(res.error);
      toast.error(res.error);
    }
    setData(res.data);
    setLoading(false);
  }, [periodo, fechaInicio, fechaFin]);

  useEffect(() => { cargar(); }, [cargar]);

  if (loading) return <div className="flex items-center justify-center py-12"><PageLoader size="sm" /></div>;
  if (error) return <div className="text-center py-12 text-red-600">{error}</div>;
  if (!data) return null;

  const r = data.resumen;

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card padding="md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-crm-text-muted uppercase">Pendientes</span>
            <Clock className="h-4 w-4 text-gray-500" />
          </div>
          <div className="text-2xl font-bold text-gray-700">{r.pendientes.count}</div>
          <p className="text-xs text-crm-text-muted mt-0.5">{formatPEN(r.pendientes.monto)}</p>
        </Card>
        <Card padding="md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-crm-text-muted uppercase">Aprobadas</span>
            <ShieldCheck className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-700">{r.aprobadas.count}</div>
          <p className="text-xs text-crm-text-muted mt-0.5">{formatPEN(r.aprobadas.monto)}</p>
        </Card>
        <Card padding="md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-crm-text-muted uppercase">Pagadas</span>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-700">{r.pagadas.count}</div>
          <p className="text-xs text-crm-text-muted mt-0.5">{formatPEN(r.pagadas.monto)}</p>
        </Card>
        <Card padding="md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-crm-text-muted uppercase">Anuladas</span>
            <XCircle className="h-4 w-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-700">{r.anuladas.count}</div>
          <p className="text-xs text-crm-text-muted mt-0.5">{formatPEN(r.anuladas.monto)}</p>
        </Card>
      </div>

      {/* Cards período */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card padding="md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-crm-text-muted uppercase">Total generado (acumulado, no anuladas)</span>
            <Wallet className="h-4 w-4 text-crm-primary" />
          </div>
          <div className="text-3xl font-bold text-crm-text-primary">{formatPEN(r.totalGenerado)}</div>
        </Card>
        <Card padding="md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-crm-text-muted uppercase">Pagado en el período</span>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-green-700">{formatPEN(r.totalPagadoEnPeriodo)}</div>
        </Card>
      </div>

      {/* Por vendedor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comisiones por vendedor</CardTitle>
        </CardHeader>
        <CardContent>
          {data.porVendedor.length === 0 ? (
            <div className="text-center py-6 text-crm-text-muted text-sm">Sin comisiones generadas</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-crm-border text-left">
                    <th className="py-2 px-2 text-crm-text-muted font-medium">Vendedor</th>
                    <th className="py-2 px-2 text-crm-text-muted font-medium text-right">Pendiente</th>
                    <th className="py-2 px-2 text-crm-text-muted font-medium text-right">Aprobada</th>
                    <th className="py-2 px-2 text-crm-text-muted font-medium text-right">Pagada</th>
                    <th className="py-2 px-2 text-crm-text-muted font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.porVendedor.map((v) => (
                    <tr key={v.username} className="border-b border-crm-border/50 hover:bg-crm-background/50">
                      <td className="py-2 px-2">
                        <div className="font-medium text-crm-text">{v.nombre_completo ?? v.username}</div>
                        <div className="text-xs text-crm-text-muted">{v.username}</div>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <div className="font-medium text-gray-700">{formatPEN(v.pendiente_monto)}</div>
                        <div className="text-xs text-crm-text-muted">{v.pendiente_count}</div>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <div className="font-medium text-blue-700">{formatPEN(v.aprobada_monto)}</div>
                        <div className="text-xs text-crm-text-muted">{v.aprobada_count}</div>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <div className="font-medium text-green-700">{formatPEN(v.pagada_monto)}</div>
                        <div className="text-xs text-crm-text-muted">{v.pagada_count}</div>
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-crm-text-primary">
                        {formatPEN(v.total_generado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Por mes */}
      {data.porMes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolución mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-crm-border text-left">
                    <th className="py-2 px-2 text-crm-text-muted font-medium">Mes</th>
                    <th className="py-2 px-2 text-crm-text-muted font-medium text-right">Generado</th>
                    <th className="py-2 px-2 text-crm-text-muted font-medium text-right">Pagado</th>
                    <th className="py-2 px-2 text-crm-text-muted font-medium text-right">Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {data.porMes.map((m) => (
                    <tr key={m.month} className="border-b border-crm-border/50">
                      <td className="py-2 px-2 text-crm-text">{m.month}</td>
                      <td className="py-2 px-2 text-right font-medium text-crm-text-primary">
                        {formatPEN(m.generado)}
                      </td>
                      <td className="py-2 px-2 text-right font-medium text-green-700">
                        {formatPEN(m.pagado)}
                      </td>
                      <td className="py-2 px-2 text-right text-crm-text-muted">
                        {formatPEN(m.generado - m.pagado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
