"use client";

import { useEffect, useState } from "react";
import { Users, TrendingUp, Clock, DollarSign, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  obtenerResumenKPIs,
  type ResumenKPIs as ResumenKPIsData,
} from "@/app/dashboard/admin/reportes/_actions";

interface ResumenKPIsProps {
  periodo: string;
  fechaInicio?: string;
  fechaFin?: string;
}

type KPIItem = {
  key: keyof ResumenKPIsData | "tiempo";
  label: string;
  icon: typeof Users;
  valor: string;
  esVacio: boolean;
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

function construirItems(data: ResumenKPIsData | null): KPIItem[] {
  const leads = data?.leadsCaptados ?? 0;
  const conv = data?.tasaConversion ?? 0;
  const horas = data?.tiempoRespuestaPromedio.totalHoras ?? 0;
  const etiquetaTiempo = data?.tiempoRespuestaPromedio.etiqueta ?? "—";
  const ventas = data?.ventasPeriodo ?? 0;
  const cerradas = data?.ventasCerradas ?? 0;

  // La tasa de conversión es "válida" si hay leads como base de cálculo,
  // aunque el valor sea 0% (significa "hubo leads pero ninguno convirtió").
  const convEsVacio = leads === 0;

  return [
    {
      key: "leadsCaptados",
      label: "Leads captados",
      icon: Users,
      valor: leads > 0 ? formatearEntero(leads) : "—",
      esVacio: leads === 0,
    },
    {
      key: "tasaConversion",
      label: "Tasa de conversión",
      icon: TrendingUp,
      valor: convEsVacio ? "—" : `${conv.toFixed(1)}%`,
      esVacio: convEsVacio,
    },
    {
      key: "tiempo",
      label: "Tiempo resp. promedio",
      icon: Clock,
      valor: horas > 0 ? etiquetaTiempo : "—",
      esVacio: horas <= 0,
    },
    {
      key: "ventasPeriodo",
      label: "Ventas del período",
      icon: DollarSign,
      valor: ventas > 0 ? formatearMonedaPEN(ventas) : "—",
      esVacio: ventas === 0,
    },
    {
      key: "ventasCerradas",
      label: "Ventas cerradas",
      icon: CheckCircle2,
      valor: cerradas > 0 ? formatearEntero(cerradas) : "—",
      esVacio: cerradas === 0,
    },
  ];
}

export default function ResumenKPIs({ periodo, fechaInicio, fechaFin }: ResumenKPIsProps) {
  const [data, setData] = useState<ResumenKPIsData | null>(null);
  const [loading, setLoading] = useState(true);

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.key} padding="md">
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
            {item.esVacio && (
              <p className="text-xs text-crm-text-muted mt-1">Sin datos en este período</p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
