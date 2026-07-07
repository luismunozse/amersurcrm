"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  TrendingUp,
  AlertCircle,
  Users,
  DollarSign,
  Target,
  Phone,
  Home,
  ClipboardList,
  PartyPopper,
  type LucideIcon,
} from "lucide-react";
import { PageLoader } from "@/components/ui/PageLoader";
import {
  obtenerReporteFunnel,
  type EtapaFunnel,
  type ReporteFunnelData,
  type EtapaFunnelStat,
  type ConversionEntreEtapas,
} from "../_actions";
import toast from "react-hot-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ModalClientesEtapaFunnel from "./ModalClientesEtapaFunnel";

interface ReporteFunnelProps {
  periodo: string;
  fechaInicio?: string;
  fechaFin?: string;
}

// Covers exactly the 8 valid EstadoCliente values (src/lib/reportes/estados.ts)
// plus the `sin_estado` sentinel (funnel.ts's fallback bucket for a null
// estado_cliente). No dead legacy keys (spec: "Dead legacy labels are gone").
export const ESTADO_LABELS: Record<string, string> = {
  por_contactar:   'Por Contactar',
  contactado:      'Contactado',
  intermedio:      'Intermedio',
  potencial:       'Potencial',
  en_proceso:      'En Proceso',
  propietario:     'Propietario',
  desestimado:     'Desestimado',
  transferido:     'Transferido',
  sin_estado:      'Sin estado',
};

const ETAPA_ICONS: Record<string, LucideIcon> = {
  leads:       Users,
  contactados: Phone,
  visita:      Home,
  reserva:     ClipboardList,
  venta:       PartyPopper,
};

export const ESTADO_COLORS: Record<string, string> = {
  por_contactar:   'bg-yellow-100 text-yellow-800',
  contactado:      'bg-blue-100 text-blue-800',
  intermedio:      'bg-purple-100 text-purple-700',
  potencial:       'bg-teal-100 text-teal-700',
  en_proceso:      'bg-orange-100 text-orange-800',
  propietario:     'bg-green-100 text-green-800',
  desestimado:     'bg-red-100 text-red-600',
  transferido:     'bg-cyan-100 text-cyan-700',
  sin_estado:      'bg-gray-100 text-gray-500',
};

// ─── SVG layout constants ────────────────────────────────────────────────────
const W       = 680;   // total SVG width
const CX      = W / 2; // center X
const MAX_W   = 380;   // maximum bar width (centered at CX)
const MIN_W   = 14;    // minimum bar width (for 0-value stages)
const BAR_H   = 62;    // height of each trapezoid stage
const CONN_H  = 46;    // height of connector area between stages
const LBL_X   = CX - MAX_W / 2 - 14; // fixed left label X
const CNT_X   = CX + MAX_W / 2 + 14; // fixed right count X

export default function ReporteFunnel({ periodo, fechaInicio, fechaFin }: ReporteFunnelProps) {
  const [data, setData] = useState<ReporteFunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [etapaActiva, setEtapaActiva] = useState<{
    id: EtapaFunnel;
    label: string;
  } | null>(null);

  const abrirModalEtapa = useCallback((id: string, label: string) => {
    if (id === "leads" || id === "contactados" || id === "visita" || id === "reserva" || id === "venta") {
      setEtapaActiva({ id, label });
    }
  }, []);

  const buildClientesLink = (estado: string) => {
    const params = new URLSearchParams({ estado });
    if (fechaInicio) params.set("fechaDesde", fechaInicio);
    if (fechaFin) params.set("fechaHasta", fechaFin);
    return `/dashboard/clientes?${params.toString()}`;
  };

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await obtenerReporteFunnel(periodo, fechaInicio, fechaFin);
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        setData(result.data);
      }
    } catch {
      setError('Error al cargar los datos del funnel');
    } finally {
      setLoading(false);
    }
  }, [periodo, fechaInicio, fechaFin]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <PageLoader size="sm" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-900/20">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data || data.totalLeads === 0) {
    return (
      <div className="text-center py-16 text-crm-text-muted">
        <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">Sin datos para el período seleccionado</p>
        <p className="text-sm mt-1">No se registraron nuevos leads en los últimos {periodo} días.</p>
      </div>
    );
  }

  const maxCantidad = data.etapas[0]?.cantidad || 1;

  const barW = (n: number) =>
    n === 0 ? MIN_W : Math.max((n / maxCantidad) * MAX_W, 28);

  const numStages = data.etapas.length;
  const totalH = numStages * BAR_H + (numStages - 1) * CONN_H + 8;

  return (
    <div className="space-y-6">

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="crm-card p-4 text-center">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg mx-auto mb-2">
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-crm-text-primary">{data.totalLeads}</p>
          <p className="text-xs text-crm-text-muted mt-1">Leads captados</p>
        </div>
        <div className="crm-card p-4 text-center">
          <div className="flex items-center justify-center w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg mx-auto mb-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-600">{data.totalVentas}</p>
          <p className="text-xs text-crm-text-muted mt-1">Ventas cerradas</p>
        </div>
        <div className="crm-card p-4 text-center">
          <div className="flex items-center justify-center w-8 h-8 bg-crm-primary/10 rounded-lg mx-auto mb-2">
            <Target className="w-4 h-4 text-crm-primary" />
          </div>
          <p className="text-3xl font-bold text-crm-primary">{data.tasaConversionFinal}%</p>
          <p className="text-xs text-crm-text-muted mt-1">Conversión lead→venta</p>
        </div>
        <div className="crm-card p-4 text-center">
          <div className="flex items-center justify-center w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg mx-auto mb-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-crm-text-primary">
            {data.valorVentas > 0
              ? new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(data.valorVentas)
              : '—'}
          </p>
          <p className="text-xs text-crm-text-muted mt-1">Valor generado</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Funnel SVG ── */}
        <div className="lg:col-span-2">
          <Card className="bg-crm-card border-crm-border">
            <CardHeader className="pb-1">
              <CardTitle className="text-base font-semibold text-crm-text-primary flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Embudo de conversión
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 px-3 pb-4">
              <svg
                viewBox={`0 0 ${W} ${totalH}`}
                className="w-full text-crm-text-primary"
                style={{ height: 'auto', display: 'block' }}
                role="img"
                aria-label="Embudo de conversión de ventas"
              >
                {data.etapas.map((etapa: EtapaFunnelStat, idx: number) => {
                  const yBase   = idx * (BAR_H + CONN_H);
                  const topW    = barW(etapa.cantidad);
                  const nextEt  = data.etapas[idx + 1];
                  const botW    = nextEt ? barW(nextEt.cantidad) : topW;
                  const yMid    = yBase + BAR_H / 2;
                  const connY   = yBase + BAR_H;
                  const Icon    = ETAPA_ICONS[etapa.id];

                  // Trapezoid (wider at top, narrower at bottom)
                  const trap = [
                    `${CX - topW / 2},${yBase}`,
                    `${CX + topW / 2},${yBase}`,
                    `${CX + botW / 2},${yBase + BAR_H}`,
                    `${CX - botW / 2},${yBase + BAR_H}`,
                  ].join(' ');

                  const conv      = data.conversiones[idx];
                  const perdidos  = nextEt ? etapa.cantidad - nextEt.cantidad : 0;
                  const convColor = conv?.tasa >= 50 ? '#16A34A'
                                  : conv?.tasa >= 25 ? '#D97706'
                                  : conv?.tasa  >  0 ? '#DC2626'
                                  : '#9CA3AF';

                  return (
                    <g
                      key={etapa.id}
                      onClick={() => abrirModalEtapa(etapa.id, etapa.label)}
                      style={{ cursor: "pointer" }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Ver clientes de la etapa ${etapa.label}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          abrirModalEtapa(etapa.id, etapa.label);
                        }
                      }}
                    >

                      {/* Hit area invisible sobre toda la fila de la etapa */}
                      <rect
                        x={0}
                        y={yBase}
                        width={W}
                        height={BAR_H}
                        fill="transparent"
                      />

                      {/* ─ Trapezoid fill ─ */}
                      <polygon
                        points={trap}
                        fill={etapa.color}
                        opacity={etapa.cantidad === 0 ? 0.28 : 1}
                      />
                      {/* Subtle inner highlight */}
                      <polygon
                        points={trap}
                        fill="none"
                        stroke="rgba(255,255,255,0.18)"
                        strokeWidth="1.5"
                      />

                      {/* ─ Count inside bar ─ */}
                      {etapa.cantidad > 0 && (
                        <text
                          x={CX}
                          y={yMid + 1}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="17"
                          fontWeight="800"
                          fill="white"
                          style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.45))' }}
                        >
                          {etapa.cantidad}
                        </text>
                      )}

                      {/* ─ Left: icon + stage label (fixed column) ─ */}
                      {Icon && (
                        <Icon
                          x={LBL_X - 16}
                          y={yMid - 15}
                          width={16}
                          height={16}
                          stroke="currentColor"
                          strokeWidth={2}
                          fill="none"
                        />
                      )}
                      <text
                        x={LBL_X - 22}
                        y={yMid - 8}
                        textAnchor="end"
                        dominantBaseline="middle"
                        fontSize="12"
                        fontWeight="600"
                        fill="currentColor"
                      >
                        {etapa.label}
                      </text>
                      <text
                        x={LBL_X - 22}
                        y={yMid + 11}
                        textAnchor="end"
                        dominantBaseline="middle"
                        fontSize="10"
                        fill="currentColor"
                        opacity="0.5"
                      >
                        del total
                      </text>

                      {/* ─ Right: count + percentage (fixed column) ─ */}
                      <text
                        x={CNT_X}
                        y={yMid - 8}
                        textAnchor="start"
                        dominantBaseline="middle"
                        fontSize="16"
                        fontWeight="800"
                        fill="currentColor"
                      >
                        {etapa.cantidad}
                      </text>
                      <text
                        x={CNT_X}
                        y={yMid + 11}
                        textAnchor="start"
                        dominantBaseline="middle"
                        fontSize="11"
                        fill="currentColor"
                        opacity="0.5"
                      >
                        {etapa.porcentaje}%
                      </text>

                      {/* ─ Connector between stages ─ */}
                      {idx < numStages - 1 && (
                        <g pointerEvents="none">
                          {/* Dashed vertical line */}
                          <line
                            x1={CX} y1={connY + 3}
                            x2={CX} y2={connY + CONN_H - 10}
                            stroke="#9CA3AF"
                            strokeWidth="1.5"
                            strokeDasharray="4,4"
                          />
                          {/* Arrow */}
                          <path
                            d={`M${CX - 5},${connY + CONN_H - 13} L${CX},${connY + CONN_H - 4} L${CX + 5},${connY + CONN_H - 13}`}
                            fill="none"
                            stroke="#9CA3AF"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* "−N salen" on left */}
                          {perdidos > 0 && (
                            <g>
                              <rect
                                x={CX - 14 - perdidos.toString().length * 5.5 - 36}
                                y={connY + CONN_H / 2 - 9}
                                width={perdidos.toString().length * 6 + 44}
                                height={18}
                                rx="9"
                                fill="#FEE2E2"
                                opacity="0.9"
                              />
                              <text
                                x={CX - 14}
                                y={connY + CONN_H / 2 + 1}
                                textAnchor="end"
                                dominantBaseline="middle"
                                fontSize="11"
                                fontWeight="600"
                                fill="#DC2626"
                              >
                                −{perdidos} salen
                              </text>
                            </g>
                          )}

                          {/* Conversion % on right */}
                          {conv && (
                            <g>
                              <rect
                                x={CX + 14}
                                y={connY + CONN_H / 2 - 9}
                                width={conv.tasa.toString().length * 7 + 62}
                                height={18}
                                rx="9"
                                fill={
                                  conv.tasa >= 50 ? '#DCFCE7' :
                                  conv.tasa >= 25 ? '#FEF9C3' :
                                  conv.tasa  >  0 ? '#FEE2E2' :
                                  '#F3F4F6'
                                }
                                opacity="0.9"
                              />
                              <text
                                x={CX + 14}
                                y={connY + CONN_H / 2 + 1}
                                textAnchor="start"
                                dominantBaseline="middle"
                                fontSize="11"
                                fontWeight="700"
                                fill={convColor}
                              >
                                {conv.tasa}% avanzan
                              </text>
                            </g>
                          )}
                        </g>
                      )}

                    </g>
                  );
                })}
              </svg>
            </CardContent>
          </Card>
        </div>

        {/* ── Panel derecho ── */}
        <div className="space-y-4">

          {/* Conversión por etapa */}
          <Card className="bg-crm-card border-crm-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-crm-text-primary">Conversión por etapa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.conversiones.map((conv: ConversionEntreEtapas, idx: number) => (
                <div key={idx}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-crm-text-secondary truncate max-w-[160px]">{conv.desde}</span>
                    <span className={`text-xs font-bold tabular-nums ${
                      conv.tasa >= 50 ? 'text-green-600' :
                      conv.tasa >= 25 ? 'text-yellow-600' :
                      conv.tasa  >  0 ? 'text-red-500' :
                      'text-crm-text-muted'
                    }`}>{conv.tasa}%</span>
                  </div>
                  <div className="h-2 bg-crm-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        conv.tasa >= 50 ? 'bg-green-500' :
                        conv.tasa >= 25 ? 'bg-yellow-400' :
                        conv.tasa  >  0 ? 'bg-red-400' :
                        'bg-crm-border'
                      }`}
                      style={{ width: `${Math.min(conv.tasa, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Estado de los leads */}
          <Card className="bg-crm-card border-crm-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-crm-text-primary">Estado de los leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {Object.entries(data.distribucionEstado as Record<string, number>)
                  .filter(([, count]) => (count as number) > 0)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([estado, count]) => {
                    const total = Object.values(data.distribucionEstado as Record<string, number>)
                      .reduce((s: number, v) => s + (v as number), 0);
                    const pct = total > 0 ? Math.round(((count as number) / total) * 100) : 0;
                    return (
                      <Link
                        key={estado}
                        href={buildClientesLink(estado)}
                        className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-crm-card-hover transition-colors group"
                        title={`Ver clientes en estado "${ESTADO_LABELS[estado] || estado}"`}
                      >
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                          ESTADO_COLORS[estado] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {ESTADO_LABELS[estado] || estado}
                        </span>
                        <div className="flex-1 h-1.5 bg-crm-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-crm-primary/50 rounded-full transition-all duration-700 group-hover:bg-crm-primary"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-crm-text-primary tabular-nums w-6 text-right shrink-0">
                          {count as number}
                        </span>
                      </Link>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      <ModalClientesEtapaFunnel
        open={etapaActiva !== null}
        etapa={etapaActiva?.id ?? null}
        etapaLabel={etapaActiva?.label ?? ""}
        periodo={periodo}
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
        onClose={() => setEtapaActiva(null)}
      />
    </div>
  );
}
