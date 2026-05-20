"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  Banknote,
} from "lucide-react";

type Stats = {
  total: number;
  vendidos: number;
  reservados: number;
  disponibles: number;
  ingresosVendidosPEN: number;
  ingresosProyectadosPEN: number;
};

const fmtPEN = (n: number) =>
  `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtPct = (parte: number, total: number) =>
  total > 0 ? `${Math.round((parte / total) * 100)}%` : "0%";

type Placement = "top" | "bottom" | "right" | "left";

export default function StatsPopover({
  children,
  stats,
  nombreProyecto,
}: {
  children: React.ReactNode;
  stats: Stats;
  nombreProyecto: string;
}) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement>("right");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const avancePct = stats.total > 0 ? Math.round((stats.vendidos / stats.total) * 100) : 0;
  const cobradoPct =
    stats.ingresosProyectadosPEN > 0
      ? Math.round((stats.ingresosVendidosPEN / stats.ingresosProyectadosPEN) * 100)
      : 0;

  // Calcular placement óptimo al abrir
  useLayoutEffect(() => {
    if (!open || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const popW = 288; // w-72
    const popH = 360; // alto aprox
    const margin = 16;

    const spaceRight = vw - rect.right;
    const spaceLeft = rect.left;
    const spaceBottom = vh - rect.bottom;
    const spaceTop = rect.top;

    const fitsRight = spaceRight >= popW + margin;
    const fitsLeft = spaceLeft >= popW + margin;
    const fitsBottom = spaceBottom >= popH + margin;
    const fitsTop = spaceTop >= popH + margin;

    // Preferir lateral (no tapa cards siguientes en grid)
    if (fitsRight) setPlacement("right");
    else if (fitsLeft) setPlacement("left");
    else if (fitsBottom) setPlacement("bottom");
    else if (fitsTop) setPlacement("top");
    else {
      // Ninguno encaja perfecto: elegir el de mayor espacio
      const max = Math.max(spaceRight, spaceLeft, spaceBottom, spaceTop);
      if (max === spaceRight) setPlacement("right");
      else if (max === spaceLeft) setPlacement("left");
      else if (max === spaceBottom) setPlacement("bottom");
      else setPlacement("top");
    }
  }, [open]);

  // Cerrar popover si hace scroll (evita que quede flotando)
  useEffect(() => {
    if (!open) return;
    const handleScroll = () => setOpen(false);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [open]);

  const popoverPositionClasses: Record<Placement, string> = {
    right: "left-full top-1/2 -translate-y-1/2 ml-3",
    left: "right-full top-1/2 -translate-y-1/2 mr-3",
    bottom: "left-1/2 -translate-x-1/2 top-full mt-3",
    top: "left-1/2 -translate-x-1/2 bottom-full mb-3",
  };

  const arrowPositionClasses: Record<Placement, string> = {
    right: "left-[-6px] top-1/2 -translate-y-1/2 border-r-crm-border border-y-transparent border-l-transparent border-r-[6px] border-y-[6px] border-l-0",
    left: "right-[-6px] top-1/2 -translate-y-1/2 border-l-crm-border border-y-transparent border-r-transparent border-l-[6px] border-y-[6px] border-r-0",
    bottom: "top-[-6px] left-1/2 -translate-x-1/2 border-b-crm-border border-x-transparent border-t-transparent border-b-[6px] border-x-[6px] border-t-0",
    top: "bottom-[-6px] left-1/2 -translate-x-1/2 border-t-crm-border border-x-transparent border-b-transparent border-t-[6px] border-x-[6px] border-b-0",
  };

  return (
    <div
      ref={wrapperRef}
      className="relative inline-block w-full"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}

      {open && stats.total > 0 && (
        <div
          role="tooltip"
          className={`hidden md:block absolute z-50 w-72 rounded-xl border border-crm-border bg-crm-card shadow-[0_20px_50px_-12px_rgba(0,0,0,0.45)] p-4 text-xs animate-in fade-in zoom-in-95 duration-150 pointer-events-none ${popoverPositionClasses[placement]}`}
        >
          {/* Arrow apuntando al card origen */}
          <span
            aria-hidden
            className={`absolute w-0 h-0 ${arrowPositionClasses[placement]}`}
          />

          <p className="text-[11px] font-semibold text-crm-text-primary mb-3 truncate">
            {nombreProyecto}
          </p>

          <div className="space-y-2">
            <Row
              icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
              label="Disponibles"
              valor={`${stats.disponibles} (${fmtPct(stats.disponibles, stats.total)})`}
            />
            <Row
              icon={<Clock className="w-3.5 h-3.5 text-amber-500" />}
              label="Reservados"
              valor={`${stats.reservados} (${fmtPct(stats.reservados, stats.total)})`}
            />
            <Row
              icon={<XCircle className="w-3.5 h-3.5 text-rose-500" />}
              label="Vendidos"
              valor={`${stats.vendidos} (${fmtPct(stats.vendidos, stats.total)})`}
            />
          </div>

          <div className="my-3 border-t border-crm-border" />

          <div className="space-y-2">
            <Row
              icon={<Banknote className="w-3.5 h-3.5 text-crm-primary" />}
              label="Ingresos reales"
              valor={fmtPEN(stats.ingresosVendidosPEN)}
              bold
            />
            <Row
              icon={<TrendingUp className="w-3.5 h-3.5 text-crm-text-muted" />}
              label="Ingresos proyectados"
              valor={fmtPEN(stats.ingresosProyectadosPEN)}
            />
          </div>

          <div className="mt-3 pt-3 border-t border-crm-border space-y-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-crm-text-muted uppercase tracking-wide font-semibold">
                  Avance unidades
                </span>
                <span className="text-[11px] font-bold text-crm-text-primary">{avancePct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-crm-border/40 overflow-hidden">
                <div
                  className="h-full bg-rose-500"
                  style={{ width: `${avancePct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-crm-text-muted uppercase tracking-wide font-semibold">
                  Cobrado / Proyectado
                </span>
                <span className="text-[11px] font-bold text-crm-text-primary">{cobradoPct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-crm-border/40 overflow-hidden">
                <div
                  className="h-full bg-crm-primary"
                  style={{ width: `${cobradoPct}%` }}
                />
              </div>
            </div>
          </div>

          <p className="mt-3 text-[10px] text-crm-text-muted italic">
            USD convertido a PEN @ 3.8
          </p>
        </div>
      )}
    </div>
  );
}

function Row({
  icon,
  label,
  valor,
  bold = false,
}: {
  icon: React.ReactNode;
  label: string;
  valor: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-crm-text-secondary">
        {icon}
        <span>{label}</span>
      </div>
      <span className={`tabular-nums ${bold ? "font-bold text-crm-text-primary" : "text-crm-text-primary"}`}>
        {valor}
      </span>
    </div>
  );
}
