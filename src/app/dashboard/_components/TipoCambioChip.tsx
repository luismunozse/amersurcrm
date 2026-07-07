import { DollarSign } from "lucide-react";
import { getTipoCambioUsdPen } from "@/lib/dashboard/tipo-cambio.server";
import { formatearMoneda } from "@/lib/types/crm-flujo";

/**
 * Compact USD→PEN rate chip for the dashboard header. Renders nothing when
 * the upstream rate is unavailable — this is a secondary affordance, never
 * worth degrading or blocking the header.
 */
export async function TipoCambioChip() {
  const tipoCambio = await getTipoCambioUsdPen();
  if (!tipoCambio) return null;

  return (
    <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-crm-border bg-crm-card px-3 py-1.5">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-crm-primary/10 text-crm-primary">
        <DollarSign className="h-3 w-3" aria-hidden="true" />
      </span>
      <span className="text-xs font-semibold text-crm-text-primary">
        USD <span className="tabular-nums">{formatearMoneda(tipoCambio.venta, "PEN")}</span>
      </span>
      <span className="hidden text-[10px] text-crm-text-muted sm:inline">tipo de cambio</span>
    </div>
  );
}
