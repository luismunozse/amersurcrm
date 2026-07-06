import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { SeguimientosHoy } from "@/components/SeguimientosHoy";

function SeguimientosHoySkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="space-y-4 p-6">
        <div className="h-5 w-40 rounded bg-crm-border" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-crm-border" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-32 rounded bg-crm-border" />
              <div className="h-2.5 w-20 rounded bg-crm-border" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Vendedor cockpit — "¿qué hago hoy?" (design.md §1, §4).
 *
 * PR1a scope: only `SeguimientosHoy` survives the home rewrite so far — it is
 * the sole widget kept from the old page. PR1b adds `CobranzaAlertasPropias`,
 * `LeadsSinContactar` and `MetaDelMes` around it, each in its own `Suspense`.
 */
export function VendedorCockpit() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold text-crm-text-primary">¿Qué hago hoy?</h1>
      <Suspense fallback={<SeguimientosHoySkeleton />}>
        <SeguimientosHoy />
      </Suspense>
    </div>
  );
}
