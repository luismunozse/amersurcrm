"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Users, ClipboardList } from "lucide-react";
import { PageLoader } from "@/components/ui/PageLoader";
import { obtenerScorecardVendedores, type ScorecardVendedorRow } from "../_actions";
import { useTableSort, SortableHeader } from "@/components/reportes/useTableSort";
import toast from "react-hot-toast";

interface Props {
  periodo: string;
  fechaInicio?: string;
  fechaFin?: string;
}

type SortKey =
  | "nombre"
  | "leadsAsignados"
  | "contactados"
  | "conversionPct"
  | "interacciones"
  | "ventasMonto"
  | "metaCumplimientoPct"
  | "comisionGenerada";

function formatPEN(n: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export default function ScorecardVendedores({ periodo, fechaInicio, fechaFin }: Props) {
  const [filas, setFilas] = useState<ScorecardVendedorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await obtenerScorecardVendedores(periodo, fechaInicio, fechaFin);
    if (res.error) {
      setError(res.error);
      toast.error(res.error);
    } else {
      setFilas(res.data?.filas ?? []);
    }
    setLoading(false);
  }, [periodo, fechaInicio, fechaFin]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const sort = useTableSort<ScorecardVendedorRow, SortKey>(
    filas,
    {
      nombre: (f) => f.nombre,
      leadsAsignados: (f) => f.leadsAsignados,
      contactados: (f) => f.contactados,
      conversionPct: (f) => f.conversionPct,
      interacciones: (f) => f.interacciones,
      ventasMonto: (f) => f.ventasMonto,
      metaCumplimientoPct: (f) => f.metaCumplimientoPct,
      comisionGenerada: (f) => f.comisionGenerada,
    },
    { defaultKey: "ventasMonto", defaultDir: "desc", ascByDefault: ["nombre"] },
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <PageLoader size="sm" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>
        <Button onClick={cargar}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" data-pdf-ignore>
        <div>
          <h2 className="text-2xl font-bold text-crm-text-primary flex items-center gap-2">
            <ClipboardList className="w-6 h-6" />
            Scorecard de Vendedores
          </h2>
          <p className="text-crm-text-secondary mt-1">
            Una fila por vendedor activo: leads, conversión, interacciones, ventas, meta y comisiones del período.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen por vendedor</CardTitle>
          <CardDescription>
            Cada columna reutiliza el mismo cálculo que su pestaña correspondiente — los valores nunca difieren.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filas.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
              <Users className="w-8 h-8 text-crm-text-muted" />
              <p className="text-sm text-crm-text-muted">
                No hay vendedores activos para mostrar en este período.
              </p>
              <Link href="/dashboard/admin/usuarios">
                <Button variant="outline" size="sm">Gestionar vendedores</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-crm-card-hover">
                  <tr className="text-left text-crm-text-secondary">
                    <SortableHeader label="Vendedor" sortKey="nombre" align="left" current={sort.sortKey} dir={sort.sortDir} onSort={sort.handleSort} />
                    <SortableHeader label="Leads" sortKey="leadsAsignados" current={sort.sortKey} dir={sort.sortDir} onSort={sort.handleSort} />
                    <SortableHeader label="Contactados" sortKey="contactados" current={sort.sortKey} dir={sort.sortDir} onSort={sort.handleSort} />
                    <SortableHeader label="Conversión" sortKey="conversionPct" current={sort.sortKey} dir={sort.sortDir} onSort={sort.handleSort} />
                    <th className="px-4 py-2 font-medium text-right">T. Respuesta</th>
                    <SortableHeader label="Interacciones" sortKey="interacciones" current={sort.sortKey} dir={sort.sortDir} onSort={sort.handleSort} />
                    <SortableHeader label="Ventas" sortKey="ventasMonto" current={sort.sortKey} dir={sort.sortDir} onSort={sort.handleSort} />
                    <SortableHeader label="Meta vs. Real" sortKey="metaCumplimientoPct" current={sort.sortKey} dir={sort.sortDir} onSort={sort.handleSort} />
                    <SortableHeader label="Comisiones" sortKey="comisionGenerada" current={sort.sortKey} dir={sort.sortDir} onSort={sort.handleSort} />
                  </tr>
                </thead>
                <tbody>
                  {sort.sortedData.map((f) => (
                    <tr key={f.username} className="border-t border-crm-border hover:bg-crm-card-hover/40">
                      <td className="px-4 py-2 text-crm-text-primary font-medium">{f.nombre}</td>
                      <td className="px-4 py-2 text-right text-crm-text-primary">{f.leadsAsignados}</td>
                      <td className="px-4 py-2 text-right text-crm-text-secondary">{f.contactados}</td>
                      <td className="px-4 py-2 text-right text-crm-text-secondary">{f.conversionPct.toFixed(1)}%</td>
                      <td className="px-4 py-2 text-right text-crm-text-muted">
                        {f.tiempoRespuestaHoras !== null ? `${f.tiempoRespuestaHoras.toFixed(1)}h` : "Sin datos"}
                      </td>
                      <td className="px-4 py-2 text-right text-crm-text-secondary">{f.interacciones}</td>
                      <td className="px-4 py-2 text-right font-medium text-emerald-700 dark:text-emerald-300">
                        {formatPEN(f.ventasMonto)}
                        <span className="block text-xs text-crm-text-muted font-normal">{f.ventasCantidad} propiedad(es)</span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        {f.metaMonto === null ? (
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-crm-text-muted text-xs">
                            Sin meta asignada
                          </span>
                        ) : (
                          <>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              (f.metaCumplimientoPct ?? 0) >= 100
                                ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                                : (f.metaCumplimientoPct ?? 0) >= 80
                                ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                                : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                            }`}>
                              {f.metaCumplimientoPct ?? 0}% meta
                            </span>
                            <span className="block text-xs text-crm-text-muted mt-0.5">{formatPEN(f.metaMonto)}</span>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right text-crm-text-primary">
                        {formatPEN(f.comisionGenerada)}
                        <span className="block text-xs text-crm-text-muted font-normal">
                          {formatPEN(f.comisionPagada)} pagado
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
