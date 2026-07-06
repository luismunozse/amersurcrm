import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { obtenerResumenCobranza } from "@/app/dashboard/cobranza/_actions-cobranza";
import { getAlertasSinGestionarCount } from "@/lib/dashboard/command-center.server";
import { formatearMoneda } from "@/lib/types/crm-flujo";

interface MoraAlertasBlockProps {
  esGlobal: boolean;
}

type ResumenCobranza = {
  monto_mora_total: number;
  en_mora: number;
};

/**
 * Command center block ④ — total mora + unmanaged collection alerts
 * (design.md §2, §4; spec.md "Every surfaced number reuses its module's
 * source of truth" — mora total must match the cobranza hub). Reuses
 * `obtenerResumenCobranza()` exactly as `_CobranzaList.tsx` does, including
 * the same `formatearMoneda(total, 'PEN')` currency assumption — the
 * underlying `v_cobranza` aggregate has no per-row `moneda` column, so the
 * cobranza hub itself already renders this total hardcoded to PEN.
 */
export async function MoraAlertasBlock({ esGlobal }: MoraAlertasBlockProps) {
  let resumen: ResumenCobranza;
  let alertasSinGestionar: number;
  try {
    const [resultResumen, resultAlertas] = await Promise.all([
      obtenerResumenCobranza(),
      getAlertasSinGestionarCount(esGlobal),
    ]);
    resumen = resultResumen.success
      ? (resultResumen.data as ResumenCobranza)
      : { monto_mora_total: 0, en_mora: 0 };
    alertasSinGestionar = resultAlertas;
  } catch (error) {
    console.error("Error cargando mora y alertas sin gestionar:", error);
    return (
      <Card variant="elevated">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-crm-text-primary">Mora y alertas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-crm-text-muted">No se pudo cargar esta sección. Intente nuevamente.</p>
        </CardContent>
      </Card>
    );
  }

  const sinPendientes = resumen.monto_mora_total <= 0 && alertasSinGestionar === 0;

  if (sinPendientes) {
    return (
      <Card variant="elevated">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-crm-text-primary">Mora y alertas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 py-1 text-sm font-medium text-crm-success">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Sin mora pendiente
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-crm-text-primary">
          <AlertTriangle className="h-4 w-4 text-crm-danger" aria-hidden="true" />
          Mora y alertas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold text-crm-danger">
            {formatearMoneda(resumen.monto_mora_total, "PEN")}
          </span>
          <span className="text-xs text-crm-text-muted">{resumen.en_mora} cuotas en mora</span>
        </div>
        <Link
          href="/dashboard/cobranza?tab=alertas"
          className="flex items-center justify-between gap-2 rounded-lg border border-crm-border/60 bg-crm-card px-3 py-2 text-sm transition-colors hover:border-crm-primary/40"
        >
          <span className="text-crm-text-primary">{alertasSinGestionar} alertas sin gestionar</span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-crm-text-muted" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}
