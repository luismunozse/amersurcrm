"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Banknote, AlertTriangle, Clock, TrendingDown, Wallet } from "lucide-react";
import { PageLoader } from "@/components/ui/PageLoader";
import { obtenerReporteCobranza } from "../_actions";
import type { ReporteCobranza } from "../_actions";
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

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  vencida: "Vencida",
  en_mora: "En Mora",
  parcial: "Parcial",
};

const ESTADO_COLOR: Record<string, string> = {
  pendiente: "bg-gray-100 text-gray-700",
  vencida: "bg-red-100 text-red-700",
  en_mora: "bg-red-200 text-red-800",
  parcial: "bg-orange-100 text-orange-700",
};

export default function ReporteCobranzaComp({ periodo, fechaInicio, fechaFin }: Props) {
  const [data, setData] = useState<ReporteCobranza | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await obtenerReporteCobranza(periodo, fechaInicio, fechaFin);
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
            <span className="text-xs text-crm-text-muted uppercase">Saldo por cobrar</span>
            <Wallet className="h-4 w-4 text-crm-text-muted" />
          </div>
          <div className="text-2xl font-bold text-crm-text-primary">{formatPEN(r.saldoTotalPorCobrar)}</div>
          <p className="text-xs text-crm-text-muted mt-0.5">Acumulado activo</p>
        </Card>
        <Card padding="md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-crm-text-muted uppercase">Recaudado período</span>
            <Banknote className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-700">{formatPEN(r.recaudadoEnPeriodo)}</div>
          <p className="text-xs text-crm-text-muted mt-0.5">{r.cuotasPagadasEnPeriodo} cuotas pagadas</p>
        </Card>
        <Card padding="md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-crm-text-muted uppercase">Mora total</span>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-700">{formatPEN(r.moraTotal)}</div>
          <p className="text-xs text-crm-text-muted mt-0.5">Acumulado</p>
        </Card>
        <Card padding="md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-crm-text-muted uppercase">Cuotas activas</span>
            <Clock className="h-4 w-4 text-crm-text-muted" />
          </div>
          <div className="text-2xl font-bold text-crm-text-primary">
            {r.cuotasPendientes + r.cuotasVencidas + r.cuotasEnMora}
          </div>
          <p className="text-xs text-crm-text-muted mt-0.5">
            {r.cuotasPendientes} pend · {r.cuotasVencidas} venc · {r.cuotasEnMora} mora
          </p>
        </Card>
      </div>

      {/* Por estado de cobranza */}
      {data.porEstadoCobranza.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por estado de cobranza</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {data.porEstadoCobranza.map((e) => (
                <div key={e.estado} className="border border-crm-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLOR[e.estado] ?? "bg-gray-100"}`}>
                      {ESTADO_LABEL[e.estado] ?? e.estado}
                    </span>
                    <span className="text-xs text-crm-text-muted">{e.count}</span>
                  </div>
                  <div className="text-lg font-bold text-crm-text-primary">{formatPEN(e.monto)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top deudores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-600" /> Top 10 deudores
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.topDeudores.length === 0 ? (
            <div className="text-center py-6 text-crm-text-muted text-sm">Sin saldos pendientes</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-crm-border text-left">
                    <th className="py-2 px-2 text-crm-text-muted font-medium">Cliente</th>
                    <th className="py-2 px-2 text-crm-text-muted font-medium text-center">Cuotas</th>
                    <th className="py-2 px-2 text-crm-text-muted font-medium text-right">Saldo</th>
                    <th className="py-2 px-2 text-crm-text-muted font-medium text-right">Mora</th>
                    <th className="py-2 px-2 text-crm-text-muted font-medium text-right">Días atraso</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topDeudores.map((d) => (
                    <tr key={d.cliente_id} className="border-b border-crm-border/50 hover:bg-crm-background/50">
                      <td className="py-2 px-2">
                        <a
                          href={`/dashboard/clientes/${d.cliente_id}`}
                          className="text-crm-primary hover:underline font-medium"
                        >
                          {d.cliente_nombre}
                        </a>
                      </td>
                      <td className="py-2 px-2 text-center text-crm-text">{d.cuotas_pendientes}</td>
                      <td className="py-2 px-2 text-right font-medium text-crm-text">
                        {formatPEN(d.saldo_total)}
                      </td>
                      <td className="py-2 px-2 text-right text-red-600">
                        {d.mora_total > 0 ? formatPEN(d.mora_total) : "—"}
                      </td>
                      <td className="py-2 px-2 text-right">
                        {d.dias_max_atraso > 0 ? (
                          <span className="text-red-700 font-bold">{d.dias_max_atraso}d</span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recaudación mensual */}
      {data.recaudacionMensual.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recaudación mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-crm-border text-left">
                    <th className="py-2 px-2 text-crm-text-muted font-medium">Mes</th>
                    <th className="py-2 px-2 text-crm-text-muted font-medium text-right">Recaudado</th>
                    <th className="py-2 px-2 text-crm-text-muted font-medium text-right">Vencido</th>
                    <th className="py-2 px-2 text-crm-text-muted font-medium text-center">Cuotas pagadas</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recaudacionMensual.map((m) => (
                    <tr key={m.month} className="border-b border-crm-border/50">
                      <td className="py-2 px-2 text-crm-text">{m.month}</td>
                      <td className="py-2 px-2 text-right font-medium text-green-700">
                        {formatPEN(m.recaudado)}
                      </td>
                      <td className="py-2 px-2 text-right text-red-600">
                        {m.vencido > 0 ? formatPEN(m.vencido) : "—"}
                      </td>
                      <td className="py-2 px-2 text-center text-crm-text">{m.cuotasPagadas}</td>
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
