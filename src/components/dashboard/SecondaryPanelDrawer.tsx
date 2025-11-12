"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { XMarkIcon, ViewColumnsIcon } from "@heroicons/react/24/outline";

type PulseItem = {
  label: string;
  value: string;
  tone: "primary" | "success" | "info" | "warning";
  icon: ReactNode;
};

type FocusArea = {
  title: string;
  description: string;
  href: string;
};

const toneClasses: Record<PulseItem["tone"], string> = {
  primary: "bg-crm-primary/10 text-crm-primary",
  success: "bg-crm-success/10 text-crm-success",
  info: "bg-crm-info/10 text-crm-info",
  warning: "bg-crm-warning/10 text-crm-warning",
};

interface SecondaryPanelDrawerProps {
  pulseItems: PulseItem[];
  focusAreas: FocusArea[];
  children?: ReactNode;
}

export default function SecondaryPanelDrawer({
  pulseItems,
  focusAreas,
  children,
}: SecondaryPanelDrawerProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body;
    if (open) {
      body.style.overflow = "hidden";
    } else {
      body.style.overflow = "";
    }
    return () => {
      body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="xl:hidden">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-crm-primary/30 bg-crm-primary/10 px-4 py-2 text-sm font-semibold text-crm-primary shadow-sm hover:bg-crm-primary/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-crm-primary/40"
        >
          <ViewColumnsIcon className="h-4 w-4" />
          Panel detallado
        </button>
      </div>

      <div
        className={`fixed inset-0 z-40 transition ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setOpen(false)}
        />

        <aside
          className={`absolute left-0 top-0 h-full w-full max-w-lg transform bg-white shadow-2xl transition-transform duration-300 dark:bg-crm-card ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between border-b border-crm-border/70 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-crm-text-primary">Resumen en detalle</h2>
              <p className="text-xs text-crm-text-secondary">
                Indicadores, prioridades y actividad reciente del equipo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-crm-border/60 text-crm-text-secondary hover:bg-crm-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-crm-primary/40"
              aria-label="Cerrar panel"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="flex h-[100dvh] flex-col overflow-y-auto px-5 pb-10">
            <section className="py-6 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-crm-text-muted">
                Estado del día
              </h3>
              <div className="space-y-3">
                {pulseItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-3 rounded-2xl border border-crm-border/70 bg-crm-card/60 p-4"
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClasses[item.tone]}`}>
                      {item.icon}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-crm-text-primary">{item.label}</p>
                      <p className="text-xs text-crm-text-secondary">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="py-6 border-t border-crm-border/60 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-crm-text-muted">
                Prioridades del equipo
              </h3>
              <div className="space-y-3">
                {focusAreas.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="flex items-start gap-3 rounded-2xl border border-crm-border/60 bg-crm-card p-4 transition hover:border-crm-primary/40 hover:shadow-crm focus:outline-none focus-visible:ring-2 focus-visible:ring-crm-primary/40"
                  >
                    <span className="mt-1 inline-flex h-2 w-2 shrink-0 rounded-full bg-crm-primary" />
                    <div>
                      <p className="text-sm font-semibold text-crm-text-primary">{item.title}</p>
                      <p className="text-xs text-crm-text-secondary">{item.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {children && (
              <section className="py-6 border-t border-crm-border/60 space-y-6">
                {children}
              </section>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
