import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { obtenerResumenCobranzaScoped } from "@/app/dashboard/cobranza/_actions-cobranza";
import { getAlertasSinGestionarCount } from "@/lib/dashboard/command-center.server";
import { formatearMoneda } from "@/lib/types/crm-flujo";
import type { EquipoScope } from "@/lib/auth/equipo-scope.server";

interface MoraAlertasBlockProps {
  scope: EquipoScope;
}

type ResumenCobranza = {
  monto_mora_total: number;
  en_mora: number;
};

/**
 * Command center block ④ — total mora + unmanaged collection alerts
 * (design.md §2, §4; spec.md "Every surfaced number reuses its module's
 * source of truth" — mora total must match the coordinador's own team
 * scope, same as the alertasSinGestionar count rendered next to it).
 * Uses `obtenerResumenCobranzaScoped()` (Task 4b — NOT the same function
 * `_CobranzaList.tsx` uses, which is permission-gated rather than
 * team-scoped), including the same `formatearMoneda(total, 'PEN')`
 * currency assumption — the underlying `v_cobranza` aggregate has no
 * per-row `moneda` column, so the cobranza hub itself already renders this
 * total hardcoded to PEN.
 */
export async function MoraAlertasBlock({ scope }: MoraAlertasBlockProps) {
  let resumen: ResumenCobranza;
  let alertasSinGestionar: number;
  try {
    const [resultResumen, resultAlertas] = await Promise.all([
      obtenerResumenCobranzaScoped(scope),
      getAlertasSinGestionarCount(scope),
    ]);
    resumen = resultResumen.success
      ? (resultResumen.data as ResumenCobranza)
      : { monto_mora_total: 0, en_mora: 0 };
    alertasSinGestionar = resultAlertas;
  } catch (error) {
    console.error("Error cargando mora y alertas sin gestionar:", error);
    return (
      <Card variant="elevated">
        <CardContent className="flex items-center gap-3 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-crm-danger/10 text-crm-danger">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-crm-text-primary">No se pudo cargar esta sección</p>
            <p className="text-xs text-crm-text-muted">Intente nuevamente en unos momentos.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sinPendientes = resumen.monto_mora_total <= 0 && alertasSinGestionar === 0;

  if (sinPendientes) {
    return (
      <Card variant="elevated" className="flex h-full flex-col">
        <CardContent className="flex flex-1 items-center gap-3 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-crm-success/10 text-crm-success">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-crm-text-primary">Sin mora pendiente</p>
            <p className="text-xs text-crm-text-muted">Las cuotas de sus clientes están al día.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated" className="flex h-full flex-col border-l-4 border-l-crm-danger/70">
      <CardContent className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-crm-danger/10 text-crm-danger">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-3xl font-bold leading-none tabular-nums text-crm-danger">
              {formatearMoneda(resumen.monto_mora_total, "PEN")}
            </p>
            <p className="mt-1.5 text-xs font-medium text-crm-text-muted">
              Mora total · {resumen.en_mora} cuotas
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/cobranza?tab=alertas"
          className="mt-auto flex items-center justify-between gap-2 rounded-lg border border-crm-border/60 bg-crm-card px-3 py-2 text-sm transition-colors hover:border-crm-primary/40"
        >
          <span className="text-crm-text-primary">{alertasSinGestionar} alertas sin gestionar</span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-crm-text-muted" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}
