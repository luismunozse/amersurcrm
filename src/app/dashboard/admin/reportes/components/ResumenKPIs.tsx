"use client";

import { useEffect, useState } from "react";
import { Users, TrendingUp, Clock, DollarSign, CheckCircle2, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  obtenerResumenKPIs,
  type ResumenKPIsConDelta,
  type DeltaKPI,
} from "@/app/dashboard/admin/reportes/_actions";
import ModalDetalleKPI, { type TipoDetalleKPI } from "./ModalDetalleKPI";

interface ResumenKPIsProps {
  periodo: string;
  fechaInicio?: string;
  fechaFin?: string;
}

type KPIItemKey = "leadsCaptados" | "tasaConversion" | "tiempo" | "ventasPeriodo" | "ventasCerradas";

type KPIItem = {
  key: KPIItemKey;
  label: string;
  icon: typeof Users;
  valor: string;
  esVacio: boolean;
  delta: DeltaKPI | null;
  formatDelta: (d: DeltaKPI) => string;
  /** Si está seteado, la card abre modal drill-down con este tipo. */
  drillTipo?: TipoDetalleKPI;
};

function formatearMonedaPEN(valor: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
}

function formatearEntero(valor: number): string {
  return new Intl.NumberFormat("es-PE").format(valor);
}

function formatearPorcentajeDelta(d: DeltaKPI): string {
  if (d.porcentaje === null) {
    return d.absoluto > 0 ? "Nuevo" : "—";
  }
  const signo = d.porcentaje >= 0 ? "+" : "";
  return `${signo}${d.porcentaje.toFixed(1)}%`;
}

function formatDeltaEntero(d: DeltaKPI): string {
  const base = formatearPorcentajeDelta(d);
  if (base === "—" || base === "Nuevo") return base;
  return `${base} (${d.absoluto >= 0 ? "+" : ""}${formatearEntero(d.absoluto)})`;
}

function formatDeltaMoneda(d: DeltaKPI): string {
  const base = formatearPorcentajeDelta(d);
  if (base === "—" || base === "Nuevo") return base;
  return `${base} (${d.absoluto >= 0 ? "+" : ""}${formatearMonedaPEN(d.absoluto)})`;
}

function formatDeltaPorcentaje(d: DeltaKPI): string {
  const base = formatearPorcentajeDelta(d);
  if (base === "—" || base === "Nuevo") return base;
  return `${base} (${d.absoluto >= 0 ? "+" : ""}${d.absoluto.toFixed(1)}pp)`;
}

function formatDeltaHoras(d: DeltaKPI): string {
  const base = formatearPorcentajeDelta(d);
  if (base === "—" || base === "Nuevo") return base;
  const sign = d.absoluto >= 0 ? "+" : "";
  return `${base} (${sign}${d.absoluto.toFixed(1)}h)`;
}

function construirItems(data: ResumenKPIsConDelta | null): KPIItem[] {
  const a = data?.actual;
  const d = data?.delta;
  const leads = a?.leadsCaptados ?? 0;
  const conv = a?.tasaConversion ?? 0;
  const horas = a?.tiempoRespuestaPromedio.totalHoras ?? 0;
  const etiquetaTiempo = a?.tiempoRespuestaPromedio.etiqueta ?? "—";
  const ventas = a?.ventasPeriodo ?? 0;
  const cerradas = a?.ventasCerradas ?? 0;
  const convEsVacio = leads === 0;

  return [
    {
      key: "leadsCaptados",
      label: "Leads captados",
      icon: Users,
      valor: leads > 0 ? formatearEntero(leads) : "—",
      esVacio: leads === 0,
      delta: d?.leadsCaptados ?? null,
      formatDelta: formatDeltaEntero,
      drillTipo: "leads",
    },
    {
      key: "tasaConversion",
      label: "Tasa de conversión",
      icon: TrendingUp,
      valor: convEsVacio ? "—" : `${conv.toFixed(1)}%`,
      esVacio: convEsVacio,
      delta: d?.tasaConversion ?? null,
      formatDelta: formatDeltaPorcentaje,
    },
    {
      key: "tiempo",
      label: "Tiempo resp. promedio",
      icon: Clock,
      valor: horas > 0 ? etiquetaTiempo : "—",
      esVacio: horas <= 0,
      delta: d?.tiempoRespuestaPromedio ?? null,
      formatDelta: formatDeltaHoras,
    },
    {
      key: "ventasPeriodo",
      label: "Ventas del período",
      icon: DollarSign,
      valor: ventas > 0 ? formatearMonedaPEN(ventas) : "—",
      esVacio: ventas === 0,
      delta: d?.ventasPeriodo ?? null,
      formatDelta: formatDeltaMoneda,
      drillTipo: "ventas",
    },
    {
      key: "ventasCerradas",
      label: "Ventas cerradas",
      icon: CheckCircle2,
      valor: cerradas > 0 ? formatearEntero(cerradas) : "—",
      esVacio: cerradas === 0,
      delta: d?.ventasCerradas ?? null,
      formatDelta: formatDeltaEntero,
      drillTipo: "ventas",
    },
  ];
}

function DeltaBadge({ delta, format, rangoAnterior }: {
  delta: DeltaKPI | null;
  format: (d: DeltaKPI) => string;
  rangoAnterior?: { inicio: string; fin: string };
}) {
  if (!delta) return null;

  const colorClass =
    delta.sentido === "positive"
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
      : delta.sentido === "negative"
      ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
      : "text-crm-text-muted bg-crm-card-hover";

  const Icon =
    delta.direccion === "up" ? ArrowUp : delta.direccion === "down" ? ArrowDown : Minus;

  const tooltip = rangoAnterior
    ? `vs ${new Date(rangoAnterior.inicio + "T00:00:00").toLocaleDateString("es-PE")} – ${new Date(rangoAnterior.fin + "T00:00:00").toLocaleDateString("es-PE")}`
    : "vs período anterior";

  return (
    <div
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium mt-1 ${colorClass}`}
      title={tooltip}
    >
      <Icon className="h-3 w-3" />
      <span>{format(delta)}</span>
    </div>
  );
}

export default function ResumenKPIs({ periodo, fechaInicio, fechaFin }: ResumenKPIsProps) {
  const [data, setData] = useState<ResumenKPIsConDelta | null>(null);
  const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState<{ tipo: TipoDetalleKPI; titulo: string } | null>(null);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);

    obtenerResumenKPIs(periodo, fechaInicio, fechaFin)
      .then((res) => {
        if (cancelado) return;
        setData(res.data);
      })
      .catch(() => {
        if (cancelado) return;
        setData(null);
      })
      .finally(() => {
        if (cancelado) return;
        setLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [periodo, fechaInicio, fechaFin]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} padding="md" className="animate-pulse">
            <div className="flex items-center justify-between mb-3">
              <div className="h-3 w-20 bg-crm-card-hover rounded" />
              <div className="h-4 w-4 bg-crm-card-hover rounded" />
            </div>
            <div className="h-7 w-24 bg-crm-card-hover rounded" />
          </Card>
        ))}
      </div>
    );
  }

  const items = construirItems(data);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {items.map((item) => {
          const Icon = item.icon;
          const clickable = !item.esVacio && !!item.drillTipo;
          const onClick = clickable
            ? () => setDrill({ tipo: item.drillTipo!, titulo: item.label })
            : undefined;

          return (
            <Card
              key={item.key}
              padding="md"
              className={
                clickable
                  ? "cursor-pointer hover:border-crm-primary/50 hover:shadow-md transition-all"
                  : undefined
              }
              onClick={onClick as any}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={
                clickable
                  ? (e: React.KeyboardEvent) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onClick?.();
                      }
                    }
                  : undefined
              }
              title={clickable ? "Click para ver detalle" : undefined}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-crm-text-secondary uppercase tracking-wide">
                  {item.label}
                </span>
                <Icon className="h-4 w-4 text-crm-text-muted" />
              </div>
              <div
                className={
                  item.esVacio
                    ? "text-2xl font-bold text-crm-text-muted"
                    : "text-2xl font-bold text-crm-text-primary"
                }
              >
                {item.valor}
              </div>
              {item.esVacio ? (
                <p className="text-xs text-crm-text-muted mt-1">Sin datos en este período</p>
              ) : (
                <DeltaBadge
                  delta={item.delta}
                  format={item.formatDelta}
                  rangoAnterior={data?.rangoAnterior}
                />
              )}
            </Card>
          );
        })}
      </div>

      <ModalDetalleKPI
        open={drill !== null}
        tipo={drill?.tipo ?? null}
        titulo={drill?.titulo ?? ""}
        periodo={periodo}
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
        onClose={() => setDrill(null)}
      />
    </>
  );
}
