"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { GitCompare, Trophy, X, Plus, Crown } from "lucide-react";
import { PageLoader } from "@/components/ui/PageLoader";
import {
  obtenerComparacionVendedores,
  type ReporteComparacionData,
  type VendedorComparacionStats,
} from "../_actions";
import toast from "react-hot-toast";

interface Props {
  periodo: string;
  fechaInicio?: string;
  fechaFin?: string;
}

const MAX_VENDEDORES = 4;

function formatearMonedaPEN(valor: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
}

function formatearEntero(v: number): string {
  return new Intl.NumberFormat("es-PE").format(v);
}

export default function ReporteComparacionVendedores({ periodo, fechaInicio, fechaFin }: Props) {
  const [data, setData] = useState<ReporteComparacionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await obtenerComparacionVendedores(seleccionados, periodo, fechaInicio, fechaFin);
    if (r.error) {
      setError(r.error);
      toast.error(r.error);
    } else {
      setData(r.data);
    }
    setLoading(false);
  }, [seleccionados, periodo, fechaInicio, fechaFin]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <PageLoader size="sm" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 dark:text-red-400 mb-4">{error || "Sin datos"}</div>
        <Button onClick={cargar}>Reintentar</Button>
      </div>
    );
  }

  const disponiblesSinSeleccionar = data.vendedoresDisponibles.filter(
    (v) => !seleccionados.includes(v.username),
  );

  const agregar = (username: string) => {
    if (seleccionados.length >= MAX_VENDEDORES) {
      toast.error(`Máximo ${MAX_VENDEDORES} vendedores`);
      return;
    }
    setSeleccionados((prev) => [...prev, username]);
  };

  const quitar = (username: string) => {
    setSeleccionados((prev) => prev.filter((u) => u !== username));
  };

  // Calcular máximos para resaltar el "ganador" por métrica
  const max = {
    leads: Math.max(0, ...data.comparacion.map((v) => v.leadsAsignados)),
    contactados: Math.max(0, ...data.comparacion.map((v) => v.contactados)),
    interacciones: Math.max(0, ...data.comparacion.map((v) => v.interaccionesTotales)),
    ventas: Math.max(0, ...data.comparacion.map((v) => v.ventasCantidad)),
    monto: Math.max(0, ...data.comparacion.map((v) => v.ventasMonto)),
    ticket: Math.max(0, ...data.comparacion.map((v) => v.ticketPromedio)),
    conversion: Math.max(0, ...data.comparacion.map((v) => parseFloat(v.conversionPct))),
    contacto: Math.max(0, ...data.comparacion.map((v) => parseFloat(v.contactoPct))),
    cumplimiento: Math.max(0, ...data.comparacion.map((v) => parseFloat(v.cumplimientoPct))),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" data-pdf-ignore>
        <div>
          <h2 className="text-2xl font-bold text-crm-text-primary flex items-center gap-2">
            <GitCompare className="w-6 h-6" />
            Comparación entre Vendedores
          </h2>
          <p className="text-crm-text-secondary mt-1">
            Compare hasta {MAX_VENDEDORES} vendedores lado a lado en el período seleccionado.
          </p>
        </div>
      </div>

      {/* Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vendedores en comparación ({seleccionados.length}/{MAX_VENDEDORES})</CardTitle>
          <CardDescription>Click para quitar. Use el menú abajo para agregar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {seleccionados.length === 0 ? (
              <span className="text-sm text-crm-text-muted">Ningún vendedor seleccionado.</span>
            ) : (
              data.comparacion.map((v) => (
                <button
                  key={v.username}
                  onClick={() => quitar(v.username)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-crm-primary/10 text-crm-primary text-sm font-medium hover:bg-crm-primary/20 transition-colors"
                  title="Quitar"
                >
                  <span>{v.nombre}</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              ))
            )}
          </div>

          {disponiblesSinSeleccionar.length > 0 && seleccionados.length < MAX_VENDEDORES && (
            <details className="text-sm">
              <summary className="cursor-pointer text-crm-text-secondary hover:text-crm-text-primary inline-flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Agregar vendedor
              </summary>
              <div className="mt-2 flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                {disponiblesSinSeleccionar.map((v) => (
                  <button
                    key={v.username}
                    onClick={() => agregar(v.username)}
                    className="px-3 py-1.5 rounded-lg border border-crm-border text-crm-text-primary hover:bg-crm-card-hover transition-colors text-xs"
                  >
                    {v.nombre}
                  </button>
                ))}
              </div>
            </details>
          )}
        </CardContent>
      </Card>

      {/* Tabla comparativa */}
      {data.comparacion.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-crm-text-muted">
            Seleccione al menos un vendedor para ver la comparación.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Comparativa side-by-side</CardTitle>
            <CardDescription>
              <Crown className="inline w-3.5 h-3.5 mr-1 text-amber-500" /> Mejor de la fila
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-crm-card-hover">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-crm-text-secondary sticky left-0 bg-crm-card-hover z-10 min-w-[180px]">
                      Métrica
                    </th>
                    {data.comparacion.map((v) => (
                      <th key={v.username} className="text-right px-4 py-3 font-semibold text-crm-text-primary min-w-[140px]">
                        <div className="flex flex-col items-end">
                          <span>{v.nombre}</span>
                          <span className="text-xs font-normal text-crm-text-muted">@{v.username}</span>
                          <span className="inline-flex items-center gap-1 mt-1 text-xs">
                            <Trophy className="w-3 h-3 text-amber-500" />
                            <span className="text-crm-text-secondary">#{v.rankingVentas} en ventas</span>
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <FilaComparacion
                    label="Leads asignados"
                    valores={data.comparacion}
                    extraer={(v) => v.leadsAsignados}
                    formato={(n) => formatearEntero(n as number)}
                    maxValor={max.leads}
                  />
                  <FilaComparacion
                    label="Contactados"
                    valores={data.comparacion}
                    extraer={(v) => v.contactados}
                    formato={(n) => formatearEntero(n as number)}
                    maxValor={max.contactados}
                  />
                  <FilaComparacion
                    label="Tasa contacto"
                    valores={data.comparacion}
                    extraer={(v) => parseFloat(v.contactoPct)}
                    formato={(n) => `${(n as number).toFixed(1)}%`}
                    maxValor={max.contacto}
                  />
                  <FilaComparacion
                    label="Interacciones totales"
                    valores={data.comparacion}
                    extraer={(v) => v.interaccionesTotales}
                    formato={(n) => formatearEntero(n as number)}
                    maxValor={max.interacciones}
                  />
                  <FilaComparacion
                    label="Interacciones / lead"
                    valores={data.comparacion}
                    extraer={(v) => parseFloat(v.promedioInteraccionesPorLead)}
                    formato={(n) => (n as number).toFixed(1)}
                    maxValor={Math.max(0, ...data.comparacion.map((v) => parseFloat(v.promedioInteraccionesPorLead)))}
                  />
                  <FilaComparacion
                    label="Ventas (cantidad)"
                    valores={data.comparacion}
                    extraer={(v) => v.ventasCantidad}
                    formato={(n) => formatearEntero(n as number)}
                    maxValor={max.ventas}
                    destacar
                  />
                  <FilaComparacion
                    label="Ventas (monto)"
                    valores={data.comparacion}
                    extraer={(v) => v.ventasMonto}
                    formato={(n) => formatearMonedaPEN(n as number)}
                    maxValor={max.monto}
                    destacar
                  />
                  <FilaComparacion
                    label="Ticket promedio"
                    valores={data.comparacion}
                    extraer={(v) => v.ticketPromedio}
                    formato={(n) => formatearMonedaPEN(n as number)}
                    maxValor={max.ticket}
                  />
                  <FilaComparacion
                    label="Conversión"
                    valores={data.comparacion}
                    extraer={(v) => parseFloat(v.conversionPct)}
                    formato={(n) => `${(n as number).toFixed(1)}%`}
                    maxValor={max.conversion}
                    destacar
                  />
                  <FilaComparacion
                    label="Meta mensual"
                    valores={data.comparacion}
                    extraer={(v) => v.meta}
                    formato={(n) => ((n as number) > 0 ? formatearMonedaPEN(n as number) : "—")}
                    maxValor={Math.max(0, ...data.comparacion.map((v) => v.meta))}
                    sinResaltar
                  />
                  <FilaComparacion
                    label="% Cumplimiento meta"
                    valores={data.comparacion}
                    extraer={(v) => parseFloat(v.cumplimientoPct)}
                    formato={(n) => `${(n as number).toFixed(1)}%`}
                    maxValor={max.cumplimiento}
                  />

                  {/* Nivel interés - 4 sub-filas */}
                  <FilaComparacion
                    label="Nivel Alto"
                    valores={data.comparacion}
                    extraer={(v) => v.nivelInteres.alto}
                    formato={(n) => formatearEntero(n as number)}
                    maxValor={Math.max(0, ...data.comparacion.map((v) => v.nivelInteres.alto))}
                    seccionInicio
                  />
                  <FilaComparacion
                    label="Nivel Medio"
                    valores={data.comparacion}
                    extraer={(v) => v.nivelInteres.medio}
                    formato={(n) => formatearEntero(n as number)}
                    maxValor={Math.max(0, ...data.comparacion.map((v) => v.nivelInteres.medio))}
                  />
                  <FilaComparacion
                    label="Nivel Bajo"
                    valores={data.comparacion}
                    extraer={(v) => v.nivelInteres.bajo}
                    formato={(n) => formatearEntero(n as number)}
                    maxValor={Math.max(0, ...data.comparacion.map((v) => v.nivelInteres.bajo))}
                  />
                  <FilaComparacion
                    label="Sin clasificar"
                    valores={data.comparacion}
                    extraer={(v) => v.nivelInteres.sinClasificar}
                    formato={(n) => formatearEntero(n as number)}
                    maxValor={Math.max(0, ...data.comparacion.map((v) => v.nivelInteres.sinClasificar))}
                  />
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FilaComparacion({
  label,
  valores,
  extraer,
  formato,
  maxValor,
  destacar = false,
  sinResaltar = false,
  seccionInicio = false,
}: {
  label: string;
  valores: VendedorComparacionStats[];
  extraer: (v: VendedorComparacionStats) => number;
  formato: (n: number) => string;
  maxValor: number;
  destacar?: boolean;
  sinResaltar?: boolean;
  seccionInicio?: boolean;
}) {
  return (
    <tr
      className={
        "border-t border-crm-border hover:bg-crm-card-hover/40 " +
        (seccionInicio ? "border-t-2 border-t-crm-border" : "")
      }
    >
      <td
        className={
          "px-4 py-2.5 sticky left-0 bg-crm-card z-10 " +
          (destacar
            ? "font-semibold text-crm-text-primary"
            : "text-crm-text-secondary")
        }
      >
        {label}
      </td>
      {valores.map((v) => {
        const n = extraer(v);
        const esMax = !sinResaltar && maxValor > 0 && n === maxValor && valores.length > 1;
        return (
          <td
            key={v.username}
            className={
              "px-4 py-2.5 text-right tabular-nums " +
              (esMax
                ? "text-emerald-700 dark:text-emerald-300 font-bold"
                : destacar
                ? "text-crm-text-primary font-medium"
                : "text-crm-text-primary")
            }
          >
            <span className="inline-flex items-center gap-1.5 justify-end">
              {esMax && <Crown className="w-3.5 h-3.5 text-amber-500" />}
              <span>{formato(n)}</span>
            </span>
          </td>
        );
      })}
    </tr>
  );
}
