"use client";

import { useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ImageOff, X } from "lucide-react";
import { estadoColor } from "@/lib/masterplan/geometry";
import { MasterplanViewer } from "@/components/masterplan/MasterplanViewer";
import type { PlanoLoteDTO, PlanoPresentacionDTO } from "@/lib/masterplan/dto";

const ESTADO_LABEL: Record<PlanoLoteDTO["estado"], string> = {
  disponible: "Disponible",
  reservado: "Reservado",
  vendido: "Vendido",
};

const LEYENDA_ESTADOS: PlanoLoteDTO["estado"][] = ["disponible", "reservado", "vendido"];

/**
 * Fullscreen, price-free presentation view for a proyecto's masterplan.
 * Pure function of `dto` + local UI state (selected lote, only). No DB or
 * session access here — this is the reuse boundary the deferred public
 * `/p/[token]` route composes verbatim, per design.md section 7.
 */
interface PlanoPresentacionProps {
  dto: PlanoPresentacionDTO | null;
  onClose?: () => void;
}

export function PlanoPresentacion({ dto, onClose }: PlanoPresentacionProps) {
  const [loteSeleccionado, setLoteSeleccionado] = useState<PlanoLoteDTO | null>(null);

  function handleLoteClick(loteId: string) {
    const encontrado = dto?.lotes.find((l) => l.id === loteId) ?? null;
    setLoteSeleccionado(encontrado);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-crm-bg-primary dark:bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="Modo presentación del masterplan"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-crm-border/60 bg-crm-card/90 px-4 py-3 pt-[max(env(safe-area-inset-top),0.75rem)] backdrop-blur-sm">
        <h2 className="text-sm font-semibold text-crm-text-primary">Modo presentación</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modo presentación"
            className="rounded-full p-2 text-crm-text-muted transition-colors ease-out-strong hover:bg-crm-card-hover hover:text-crm-text-primary active:scale-90"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="relative flex-1 overflow-hidden">
        {dto ? (
          <>
            <TransformWrapper minScale={1} maxScale={6} doubleClick={{ disabled: true }}>
              <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%" }}>
                <MasterplanViewer imageUrl={dto.imageUrl} lotes={dto.lotes} onLoteClick={handleLoteClick} />
              </TransformComponent>
            </TransformWrapper>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-[max(env(safe-area-inset-bottom),0.75rem)]">
              <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-crm-border bg-crm-card/90 px-4 py-2 shadow-crm-lg backdrop-blur-sm">
                {LEYENDA_ESTADOS.map((estado) => {
                  const { stroke } = estadoColor(estado);
                  return (
                    <span key={estado} className="flex items-center gap-1.5 text-xs font-medium text-crm-text-secondary">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stroke }} aria-hidden />
                      {ESTADO_LABEL[estado]}
                    </span>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-crm-card-hover">
              <ImageOff className="h-8 w-8 text-crm-text-muted" />
            </div>
            <p className="text-sm font-medium text-crm-text-primary">
              Aún no hay un masterplan cargado para este proyecto.
            </p>
            <p className="max-w-xs text-xs text-crm-text-muted">
              Cargue una imagen o PDF del plano desde la sección Masterplan para habilitar el modo presentación.
            </p>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="mt-2 rounded-lg border border-crm-border px-4 py-2 text-sm font-medium text-crm-text-primary transition-colors ease-out-strong hover:bg-crm-card-hover active:scale-[0.98]"
              >
                Cerrar modo presentación
              </button>
            )}
          </div>
        )}
      </div>

      {loteSeleccionado && (
        <div
          className="fixed inset-0 z-10 flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Detalle del lote ${loteSeleccionado.codigo}`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setLoteSeleccionado(null);
          }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            data-testid="detalle-lote-panel"
            className="relative z-10 w-full rounded-t-2xl border-t-2 border-crm-border bg-crm-card p-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] shadow-2xl sm:max-w-sm sm:rounded-2xl sm:border-2 sm:pb-5"
          >
            <div className="mb-3 flex justify-center sm:hidden">
              <span className="h-1 w-10 rounded-full bg-crm-border" aria-hidden />
            </div>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-crm-text-primary">Lote {loteSeleccionado.codigo}</p>
                <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-crm-text-secondary">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: estadoColor(loteSeleccionado.estado).stroke }}
                    aria-hidden
                  />
                  {ESTADO_LABEL[loteSeleccionado.estado]}
                </span>
              </div>
              <button
                type="button"
                data-testid="cerrar-detalle-lote"
                onClick={() => setLoteSeleccionado(null)}
                aria-label="Cerrar detalle del lote"
                className="-m-2 rounded-full p-2 text-crm-text-muted transition-colors ease-out-strong hover:bg-crm-card-hover hover:text-crm-text-primary active:scale-90"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-crm-card-hover p-3">
                <dt className="text-[10px] uppercase tracking-wide text-crm-text-muted">Área</dt>
                <dd className="font-medium text-crm-text-primary">
                  {loteSeleccionado.area ? `${loteSeleccionado.area} m²` : "No especificada"}
                </dd>
              </div>
              <div className="rounded-xl bg-crm-card-hover p-3">
                <dt className="text-[10px] uppercase tracking-wide text-crm-text-muted">Manzana</dt>
                <dd className="font-medium text-crm-text-primary">{loteSeleccionado.manzana ?? "No especificada"}</dd>
              </div>
              <div className="col-span-2 rounded-xl bg-crm-card-hover p-3">
                <dt className="text-[10px] uppercase tracking-wide text-crm-text-muted">Etapa</dt>
                <dd className="font-medium text-crm-text-primary">{loteSeleccionado.etapa ?? "No especificada"}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
